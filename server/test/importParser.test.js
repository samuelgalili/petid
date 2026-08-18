import assert from "node:assert/strict";
import { test } from "node:test";
import * as XLSX from "@e965/xlsx";

import {
  MAX_FILE_BYTES,
  hashRow,
  isFormulaLike,
  neutralizeFormula,
  normalizeHeader,
  parseSpreadsheet,
  summarizeColumns,
} from "../src/importParser.js";

const sheetToBuffer = (rows, sheetName = "DataSheet") => {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), sheetName);
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
};

test("headers spelled differently between exports normalise to the same key", () => {
  // The reference file writes מק"ט with a straight quote; an earlier importer
  // looked for it with a Hebrew gershayim and matched nothing, so every row
  // failed for a missing SKU.
  assert.equal(normalizeHeader('מק"ט'), normalizeHeader("מק״ט"));
  assert.equal(normalizeHeader("  Price  "), "price");
  assert.equal(normalizeHeader("מחיר   בסיס"), "מחיר בסיס");
});

test("cells that a spreadsheet would execute are neutralised", () => {
  assert.equal(isFormulaLike("=cmd|'/c calc'!A1"), true);
  assert.equal(isFormulaLike("@SUM(1)"), true);
  assert.equal(isFormulaLike("+1+1"), true);
  assert.equal(isFormulaLike("מוצר רגיל"), false);
  assert.equal(neutralizeFormula("@SUM(1)"), "'@SUM(1)");
  assert.equal(neutralizeFormula("מוצר רגיל"), "מוצר רגיל");
});

test("every column is kept, including the ones nothing maps yet", () => {
  const buffer = sheetToBuffer([
    ['מק"ט', "תאור", "מחיר", "עמודה ריקה"],
    ["A1", "מוצר ראשון", 10, null],
    ["A2", "מוצר שני", 20, null],
  ]);

  const parsed = parseSpreadsheet(buffer);
  assert.equal(parsed.headers.length, 4);
  assert.equal(parsed.rows.length, 2);
  assert.deepEqual(Object.keys(parsed.rows[0].raw).length, 4, "a row carries every column, mapped or not");
  assert.equal(parsed.rows[0].raw['מק"ט'], "A1");
});

test("repeated headers stay distinct instead of overwriting each other", () => {
  // The reference file has two columns called מטבע and two called מטבע המחירון.
  const buffer = sheetToBuffer([
    ["מטבע", "מטבע", "תאור"],
    ["ILS", "USD", "מוצר"],
  ]);

  const parsed = parseSpreadsheet(buffer);
  assert.deepEqual(parsed.headers, ["מטבע", "מטבע.1", "תאור"]);
  assert.equal(parsed.rows[0].raw["מטבע"], "ILS");
  assert.equal(parsed.rows[0].raw["מטבע.1"], "USD", "the second column must not be lost to the first");
});

test("a formula-shaped string reaching a cell is escaped and reported", () => {
  const buffer = sheetToBuffer([
    ['מק"ט', "תאור"],
    ["A1", "@SUM(1+9)*cmd|'/c calc'!A1"],
    ["A2", "מוצר תמים"],
  ]);

  const parsed = parseSpreadsheet(buffer);
  assert.equal(parsed.formulaCells.length, 1);
  assert.equal(parsed.rows[0].raw["תאור"], "'@SUM(1+9)*cmd|'/c calc'!A1");
  assert.equal(parsed.rows[1].raw["תאור"], "מוצר תמים");
});

test("spacer rows between sections are not products", () => {
  const buffer = sheetToBuffer([
    ['מק"ט', "תאור"],
    ["A1", "מוצר"],
    [null, null],
    ["A2", "מוצר נוסף"],
  ]);

  const parsed = parseSpreadsheet(buffer);
  assert.equal(parsed.rows.length, 2);
  // Row numbers stay those of the spreadsheet, so an error can be looked up.
  assert.deepEqual(parsed.rows.map((row) => row.rowNumber), [2, 4]);
});

test("an identical row hashes identically and a changed one does not", () => {
  const first = hashRow({ sku: "A1", price: 10 });
  assert.equal(first, hashRow({ sku: "A1", price: 10 }));
  assert.notEqual(first, hashRow({ sku: "A1", price: 11 }));
});

test("column accounting separates empty columns from unmapped ones", () => {
  const buffer = sheetToBuffer([
    ['מק"ט', "תאור", "פרמטר 6 למוצר"],
    ["A1", "מוצר", null],
    ["A2", "מוצר נוסף", null],
  ]);

  const parsed = parseSpreadsheet(buffer);
  const columns = summarizeColumns(parsed.headers, parsed.rows);

  assert.equal(columns.filter((column) => column.is_empty).length, 1);
  assert.equal(columns.find((column) => column.source_field === "פרמטר 6 למוצר").filled_count, 0);
  assert.equal(columns.find((column) => column.source_field === "תאור").filled_count, 2);
});

test("an unusable file is refused with a reason, not a stack trace", () => {
  assert.throws(() => parseSpreadsheet(Buffer.alloc(0)), /empty/i);
  assert.throws(
    () => parseSpreadsheet(Buffer.alloc(MAX_FILE_BYTES + 1)),
    /larger than/i,
  );
  // Loose text parses as a single-column sheet rather than failing outright, so
  // the useful signal is that it carries no rows.
  assert.throws(
    () => parseSpreadsheet(Buffer.from("this is not a spreadsheet")),
    /no data rows/i,
  );
});
