import {
  ImportParseError,
  hashFile,
  normalizeHeader,
  parseSpreadsheet,
  summarizeColumns,
} from "./importParser.js";
import { recordEvent } from "./events.js";

// Turning an uploaded file into rows in the database.
//
// This stage deliberately does not decide what any column means. It records the
// run, stores every row exactly as it arrived, and writes down what it found in
// the file. Mapping comes next and reads from what is stored here, so a mapping
// corrected in three months can be replayed against the original rows without
// asking the supplier to send the file again.

const ROW_INSERT_BATCH = 200;

export const IMPORT_JOB_TYPE = "import.parse";

const asJson = (value) => JSON.stringify(value ?? null);

/**
 * Registers an upload and queues the work. Returns immediately: a 267-row file
 * takes a moment, a 50,000-row file does not, and neither should hold an HTTP
 * request open.
 */
export const createImport = async (pool, {
  buffer,
  filename,
  supplierId = null,
  profileId = null,
  sheetName = null,
  adminUserId = null,
  contentType = null,
}) => {
  const checksum = hashFile(buffer);
  const client = await pool.connect();

  try {
    await client.query("begin");

    const importResult = await client.query(
      `
        insert into public.imports (
          supplier_id, profile_id, status, source_type, filename,
          file_size_bytes, file_checksum, sheet_name, created_by_admin_user_id
        )
        values ($1, $2, 'uploaded', 'file', $3, $4, $5, $6, $7)
        returning *
      `,
      [supplierId, profileId, filename || null, buffer.length, checksum, sheetName, adminUserId],
    );

    const importRow = importResult.rows[0];

    // The bytes outlive the request so the worker can pick them up, and so a
    // run can be parsed again under a corrected profile later.
    await client.query(
      "insert into public.import_files (import_id, content, content_type) values ($1, $2, $3)",
      [importRow.id, buffer, contentType],
    );

    await client.query(
      `
        insert into public.jobs (job_type, payload, idempotency_key)
        values ($1, $2::jsonb, $3)
        on conflict (idempotency_key) where idempotency_key is not null do nothing
      `,
      [IMPORT_JOB_TYPE, asJson({ import_id: importRow.id }), `${IMPORT_JOB_TYPE}:${importRow.id}`],
    );

    await recordEvent(client, {
      event_type: "supplier.import_started",
      actor_admin_user_id: adminUserId,
      entity_type: "import",
      entity_id: importRow.id,
      source: "import",
      idempotency_key: `supplier.import_started:${importRow.id}`,
      payload: { filename, supplier_id: supplierId, file_size_bytes: buffer.length },
    });

    await client.query("commit");
    return importRow;
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Parses the file and stores every row. Called by the worker, not by a request.
 *
 * The buffer is passed in rather than read from disk: uploads are held in
 * memory for the life of the job, which is the simpler and safer choice while
 * files are measured in megabytes.
 */
export const runImportParse = async (pool, importId, buffer) => {
  const client = await pool.connect();

  try {
    const importResult = await client.query(
      "select * from public.imports where id = $1",
      [importId],
    );
    const importRow = importResult.rows[0];
    if (!importRow) throw new Error(`Import ${importId} not found`);

    const profileResult = importRow.profile_id
      ? await client.query(
        "select * from public.supplier_import_profiles where id = $1",
        [importRow.profile_id],
      )
      : { rows: [] };
    const profile = profileResult.rows[0] || null;

    await client.query(
      "update public.imports set status = 'parsing', started_at = now(), updated_at = now() where id = $1",
      [importId],
    );

    const parsed = parseSpreadsheet(buffer, {
      sheetName: importRow.sheet_name || profile?.sheet_name || null,
      headerRow: profile?.header_row || 1,
    });

    const columns = summarizeColumns(parsed.headers, parsed.rows);
    const warnings = [];

    if (parsed.truncated) {
      warnings.push({
        code: "ROWS_TRUNCATED",
        message: "The file has more rows than the engine will read in one run",
      });
    }

    if (parsed.formulaCells.length > 0) {
      // Recorded rather than rejected: the values are kept and neutralised, and
      // a person should know the supplier is sending formulas.
      warnings.push({
        code: "FORMULA_CELLS_NEUTRALIZED",
        message: `${parsed.formulaCells.length} cells began with a formula character and were escaped`,
        sample: parsed.formulaCells.slice(0, 10),
      });
    }

    const emptyColumns = columns.filter((column) => column.is_empty);
    if (emptyColumns.length > 0) {
      warnings.push({
        code: "EMPTY_COLUMNS",
        message: `${emptyColumns.length} of ${columns.length} columns hold no data in this file`,
        columns: emptyColumns.map((column) => column.source_field),
      });
    }

    // Rows go in in batches. One statement per row would be 267 round trips for
    // the reference file and far worse for a real catalogue.
    for (let offset = 0; offset < parsed.rows.length; offset += ROW_INSERT_BATCH) {
      const batch = parsed.rows.slice(offset, offset + ROW_INSERT_BATCH);
      const values = [];
      const placeholders = batch.map((row, index) => {
        const base = index * 4;
        values.push(importId, row.rowNumber, asJson(row.raw), row.rawHash);
        return `($${base + 1}, $${base + 2}, $${base + 3}::jsonb, $${base + 4})`;
      });

      await client.query(
        `
          insert into public.import_rows (import_id, row_number, raw, raw_hash)
          values ${placeholders.join(", ")}
          on conflict (import_id, row_number) do nothing
        `,
        values,
      );
    }

    // Columns are recorded on the profile when there is one, so the next
    // delivery starts from what was learned about this one. Without a profile
    // the accounting still lands on the run itself.
    if (profile) {
      for (const column of columns) {
        await client.query(
          `
            insert into public.import_field_mappings (
              profile_id, source_field, normalized_source_field, target_kind, ignore_reason, notes
            )
            values ($1, $2, $3, $4, $5, $6)
            on conflict (profile_id, normalized_source_field) do update set
              notes = excluded.notes,
              updated_at = now()
          `,
          [
            profile.id,
            column.source_field,
            column.normalized_source_field,
            column.is_empty ? "ignored" : "unmapped",
            column.is_empty ? "Empty in every row of the source file" : null,
            `filled ${column.filled_count}/${column.total_rows}`,
          ],
        );
      }
    }

    const mappedFields = 0;
    const ignoredFields = emptyColumns.length;
    const unmappedFields = columns.length - ignoredFields;

    await client.query(
      `
        update public.imports set
          status = 'mapped',
          sheet_name = $2,
          total_rows = $3,
          valid_rows = 0,
          invalid_rows = 0,
          mapped_fields = $4,
          unmapped_fields = $5,
          ignored_fields = $6,
          warnings = $7::jsonb,
          updated_at = now()
        where id = $1
      `,
      [
        importId,
        parsed.sheetName,
        parsed.rows.length,
        mappedFields,
        unmappedFields,
        ignoredFields,
        asJson(warnings),
      ],
    );

    if (profile) {
      await client.query(
        "update public.supplier_import_profiles set last_import_at = now(), updated_at = now() where id = $1",
        [profile.id],
      );
    }

    return {
      import_id: importId,
      sheet_name: parsed.sheetName,
      total_rows: parsed.rows.length,
      total_columns: columns.length,
      empty_columns: emptyColumns.length,
      warnings,
    };
  } catch (error) {
    const isParseError = error instanceof ImportParseError;
    await client.query(
      `
        update public.imports set
          status = 'failed',
          errors = $2::jsonb,
          completed_at = now(),
          updated_at = now()
        where id = $1
      `,
      [
        importId,
        asJson([{ code: isParseError ? error.code : "PARSE_FAILED", message: error.message }]),
      ],
    ).catch(() => {});
    throw error;
  } finally {
    client.release();
  }
};

/** Reads back the stored upload so a queued or repeated parse can run. */
export const loadImportFile = async (pool, importId) => {
  const result = await pool.query(
    "select content from public.import_files where import_id = $1",
    [importId],
  );
  return result.rows[0]?.content || null;
};

/**
 * The report the acceptance test asks for: what was mapped, what was not, what
 * was ignored and why.
 */
export const getImportReport = async (pool, importId) => {
  const importResult = await pool.query("select * from public.imports where id = $1", [importId]);
  const importRow = importResult.rows[0];
  if (!importRow) return null;

  const [rowStates, fields] = await Promise.all([
    pool.query(
      "select status, count(*)::int as count from public.import_rows where import_id = $1 group by status order by count desc",
      [importId],
    ),
    importRow.profile_id
      ? pool.query(
        `
          select source_field, target_kind, target_field, ignore_reason, notes
          from public.import_field_mappings
          where profile_id = $1
          order by target_kind, source_field
        `,
        [importRow.profile_id],
      )
      : Promise.resolve({ rows: [] }),
  ]);

  return {
    import: importRow,
    row_states: rowStates.rows,
    fields: fields.rows,
    field_summary: {
      mapped: fields.rows.filter((field) => field.target_kind === "domain" || field.target_kind === "attribute").length,
      unmapped: fields.rows.filter((field) => field.target_kind === "unmapped").length,
      ignored: fields.rows.filter((field) => field.target_kind === "ignored").length,
    },
  };
};

export { normalizeHeader };
