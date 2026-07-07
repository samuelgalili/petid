import { randomBytes, scryptSync } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { Pool } from "pg";

const sourceUrl = process.env.SUPABASE_DB_URL;
const targetUrl = process.env.DATABASE_URL;
const sourceExportFile = process.env.SUPABASE_EXPORT_FILE;
const exportOnlyFile = process.env.SUPABASE_EXPORT_ONLY_FILE;

if (!sourceUrl && !sourceExportFile) {
  throw new Error("SUPABASE_DB_URL is required");
}
if (!targetUrl && !exportOnlyFile) {
  throw new Error("DATABASE_URL is required");
}

const source = sourceUrl && !sourceExportFile
  ? new Pool({
    connectionString: sourceUrl,
    ssl: { rejectUnauthorized: false },
    max: 3,
  })
  : null;

const target = targetUrl
  ? new Pool({
    connectionString: targetUrl,
    ssl: process.env.DB_SSL === "false" ? false : { rejectUnauthorized: false },
    max: 3,
  })
  : null;

const quoteIdent = (value) => `"${String(value).replaceAll('"', '""')}"`;
const tableRef = (schema, table) => `${quoteIdent(schema)}.${quoteIdent(table)}`;
const normalizeEmail = (email) => String(email || "").trim().toLowerCase();
const asText = (value) => {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text || null;
};
const asDateValue = (value) => value || null;
const asInteger = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? Math.trunc(number) : null;
};
const asNumber = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};
const asBoolean = (value, fallback = null) => {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  const text = String(value).trim().toLowerCase();
  if (["true", "t", "yes", "y", "1"].includes(text)) return true;
  if (["false", "f", "no", "n", "0"].includes(text)) return false;
  return fallback;
};
const asTextArray = (value) => {
  if (!value) return null;
  if (Array.isArray(value)) return value.map(asText).filter(Boolean);
  if (typeof value === "string") {
    const text = value.trim();
    if (!text) return null;
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) return parsed.map(asText).filter(Boolean);
    } catch {
      // Fall back to comma-separated text.
    }
    return text.split(",").map(asText).filter(Boolean);
  }
  return null;
};
const normalizePetType = (value) => {
  const text = String(value || "").trim().toLowerCase();
  if (["dog", "cat", "other"].includes(text)) return text;
  if (["dogs", "כלב", "כלבים"].includes(text)) return "dog";
  if (["cats", "חתול", "חתולים"].includes(text)) return "cat";
  return "other";
};

const hashPassword = (password) => {
  const salt = randomBytes(16).toString("base64url");
  const hash = scryptSync(String(password), salt, 64).toString("base64url");
  return `scrypt$${salt}$${hash}`;
};

const getColumns = async (pool, schema, table) => {
  const result = await pool.query(
    `
      select column_name
      from information_schema.columns
      where table_schema = $1
        and table_name = $2
    `,
    [schema, table],
  );

  return new Set(result.rows.map((row) => row.column_name));
};

const selectRows = async (pool, schema, table, columns) => {
  const available = await getColumns(pool, schema, table);
  if (available.size === 0) return [];

  const selectList = columns.map((column) => {
    const definition = typeof column === "string" ? { source: column, alias: column } : column;
    const fallback = definition.fallback || "null";
    const expression = available.has(definition.source)
      ? quoteIdent(definition.source)
      : fallback;
    return `${expression} as ${quoteIdent(definition.alias || definition.source)}`;
  });

  const result = await pool.query(`select ${selectList.join(", ")} from ${tableRef(schema, table)}`);
  return result.rows;
};

const upsertById = async (client, table, columns, values, options = {}) => {
  const placeholders = columns.map((_, index) => `$${index + 1}`);
  const updateColumns = columns.filter((column) => column !== "id");
  const assignments = updateColumns.map((column) => {
    if (options.replaceNulls) return `${quoteIdent(column)} = excluded.${quoteIdent(column)}`;
    return `${quoteIdent(column)} = coalesce(excluded.${quoteIdent(column)}, ${quoteIdent(table)}.${quoteIdent(column)})`;
  });

  await client.query(
    `
      insert into public.${quoteIdent(table)} (${columns.map(quoteIdent).join(", ")})
      values (${placeholders.join(", ")})
      on conflict (id) do update set
        ${assignments.join(",\n        ")}
    `,
    values,
  );
};

const profileColumns = [
  "id",
  "email",
  "full_name",
  "first_name",
  "last_name",
  "bio",
  "phone",
  "whatsapp_number",
  "avatar_url",
  "birthdate",
  "street",
  "city",
  "id_number_last4",
  "points",
  "location_blur_enabled",
  "profile_visibility",
  "show_location",
  "show_email",
  "allow_messages_from",
  "favorite_breeds",
  "interests",
  "blocked_at",
  "blocked_by",
  "blocked_reason",
  "last_active_at",
  "show_activity_status",
  "quiet_mode_until",
  "last_seen_at",
  "is_online",
  "region",
  "house_number",
  "apartment_number",
  "building_code",
  "postal_code",
  "id_number_encrypted",
  "ai_consent_given",
  "ai_consent_date",
  "marketing_consent",
  "marketing_consent_date",
  "marketing_unsubscribed_at",
  "consent_method",
  "created_at",
  "updated_at",
];

const petColumns = [
  "id",
  "user_id",
  "name",
  "type",
  "breed",
  "secondary_breed",
  "is_mixed",
  "breed_confidence",
  "avatar_url",
  "weight",
  "birth_date",
  "gender",
  "is_neutered",
  "medical_conditions",
  "health_notes",
  "personality_tags",
  "favorite_activities",
  "activities",
  "theme_color",
  "archived",
  "archived_at",
  "has_insurance",
  "insurance_company",
  "insurance_expiry_date",
  "current_food",
  "last_vet_visit",
  "next_vet_visit",
  "vet_clinic",
  "vet_clinic_name",
  "vet_clinic_phone",
  "vet_clinic_address",
  "microchip_number",
  "color",
  "is_dangerous_breed",
  "license_conditions",
  "license_expiry_date",
  "age",
  "weight_unit",
  "insurance_policy_number",
  "vet_name",
  "vet_phone",
  "size",
  "current_mood",
  "mood_score",
  "mood_updated_at",
  "license_number",
  "license_renewal_date",
  "is_lost",
  "lost_since",
  "lost_reward_text",
  "lost_temperament",
  "lost_medication_note",
  "lost_allergy_note",
  "lost_show_phone",
  "lost_contact_phone",
  "created_at",
  "updated_at",
];

const breedColumns = [
  "id",
  "breed_name",
  "breed_name_he",
  "pet_type",
  "description",
  "description_he",
  "origin_country",
  "size_category",
  "weight_range_kg",
  "height_range_cm",
  "life_expectancy_years",
  "temperament",
  "temperament_he",
  "exercise_needs",
  "grooming_needs",
  "health_issues",
  "health_issues_he",
  "dietary_notes",
  "training_difficulty",
  "good_with_children",
  "good_with_other_pets",
  "apartment_friendly",
  "source_references",
  "image_url",
  "is_active",
  "created_at",
  "updated_at",
  "affection_family",
  "kids_friendly",
  "dog_friendly",
  "shedding_level",
  "grooming_freq",
  "drooling_level",
  "stranger_openness",
  "playfulness",
  "watchdog_nature",
  "trainability",
  "energy_level",
  "barking_level",
  "mental_needs",
];

const dogParkColumns = [
  "id",
  "name",
  "city",
  "address",
  "latitude",
  "longitude",
  "google_maps_link",
  "status",
  "size",
  "fencing",
  "water",
  "shade",
  "agility",
  "parking",
  "lighting",
  "notes",
  "source",
  "verified",
  "rating",
  "total_reviews",
  "created_at",
  "updated_at",
  "created_by",
  "updated_by",
];

const loadSourceData = async () => {
  if (sourceExportFile) {
    return JSON.parse(await readFile(sourceExportFile, "utf8"));
  }

  const [authUsers, sourceProfiles, sourcePetRows, sourceBreedRows, sourceDogParkRows] = await Promise.all([
    selectRows(source, "auth", "users", [
      "id",
      "email",
      "phone",
      "raw_user_meta_data",
      "created_at",
      "updated_at",
      "last_sign_in_at",
      "deleted_at",
      "banned_until",
    ]),
    selectRows(source, "public", "profiles", profileColumns),
    selectRows(source, "public", "pets", [
      ...petColumns,
      { source: "pet_type", alias: "pet_type" },
    ]),
    selectRows(source, "public", "breed_information", breedColumns),
    selectRows(source, "public", "dog_parks", dogParkColumns),
  ]);

  return {
    authUsers,
    sourceProfiles,
    sourcePetRows,
    sourceBreedRows,
    sourceDogParkRows,
  };
};

const writeSourceExport = async (filePath, sourceData) => {
  await writeFile(filePath, JSON.stringify(sourceData, null, 2), { mode: 0o600 });
  return {
    auth_users: sourceData.authUsers.length,
    profiles: sourceData.sourceProfiles.length,
    pets: sourceData.sourcePetRows.length,
    breeds: sourceData.sourceBreedRows.length,
    dog_parks: sourceData.sourceDogParkRows.length,
  };
};

const importUsersAndProfiles = async (client, sourceData) => {
  const { authUsers, sourceProfiles } = sourceData;
  const profilesById = new Map(sourceProfiles.map((profile) => [String(profile.id), profile]));
  const userIdMap = new Map();
  let usersImported = 0;
  let usersSkipped = 0;
  let profilesImported = 0;

  for (const user of authUsers) {
    const sourceUserId = String(user.id || "");
    const profile = profilesById.get(sourceUserId) || {};
    const metadata = user.raw_user_meta_data && typeof user.raw_user_meta_data === "object"
      ? user.raw_user_meta_data
      : {};
    const email = normalizeEmail(user.email || profile.email);
    if (!sourceUserId || !email) {
      usersSkipped += 1;
      continue;
    }

    const fullName = asText(profile.full_name || metadata.full_name || metadata.name);
    const isActive = !user.deleted_at && !user.banned_until;
    const result = await client.query(
      `
        insert into public.app_users (
          id,
          email,
          password_hash,
          full_name,
          phone,
          birthdate,
          is_active,
          created_at,
          updated_at,
          last_login_at,
          legacy_auth_provider,
          legacy_user_id,
          password_reset_required,
          imported_at
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'supabase', $1, true, now())
        on conflict (email) do update set
          full_name = coalesce(excluded.full_name, app_users.full_name),
          phone = coalesce(excluded.phone, app_users.phone),
          birthdate = coalesce(excluded.birthdate, app_users.birthdate),
          is_active = app_users.is_active and excluded.is_active,
          updated_at = now(),
          last_login_at = coalesce(app_users.last_login_at, excluded.last_login_at),
          legacy_auth_provider = excluded.legacy_auth_provider,
          legacy_user_id = excluded.legacy_user_id,
          imported_at = now()
        returning id
      `,
      [
        sourceUserId,
        email,
        hashPassword(randomBytes(32).toString("base64url")),
        fullName,
        asText(profile.phone || user.phone),
        asDateValue(profile.birthdate),
        isActive,
        asDateValue(user.created_at) || new Date(),
        asDateValue(user.updated_at) || asDateValue(user.created_at) || new Date(),
        asDateValue(user.last_sign_in_at),
      ],
    );

    userIdMap.set(sourceUserId, result.rows[0].id);
    usersImported += 1;
  }

  for (const sourceProfile of sourceProfiles) {
    const targetUserId = userIdMap.get(String(sourceProfile.id || ""));
    if (!targetUserId) continue;

    const authUser = authUsers.find((user) => String(user.id || "") === String(sourceProfile.id || ""));
    const valuesByColumn = {
      ...sourceProfile,
      id: targetUserId,
      email: normalizeEmail(sourceProfile.email || authUser?.email),
      phone: asText(sourceProfile.phone || authUser?.phone),
      points: asInteger(sourceProfile.points) || 0,
      favorite_breeds: asTextArray(sourceProfile.favorite_breeds),
      interests: asTextArray(sourceProfile.interests),
      location_blur_enabled: asBoolean(sourceProfile.location_blur_enabled),
      show_location: asBoolean(sourceProfile.show_location),
      show_email: asBoolean(sourceProfile.show_email),
      show_activity_status: asBoolean(sourceProfile.show_activity_status),
      is_online: asBoolean(sourceProfile.is_online),
      ai_consent_given: asBoolean(sourceProfile.ai_consent_given),
      marketing_consent: asBoolean(sourceProfile.marketing_consent),
      created_at: asDateValue(sourceProfile.created_at) || new Date(),
      updated_at: asDateValue(sourceProfile.updated_at) || asDateValue(sourceProfile.created_at) || new Date(),
    };

    if (!valuesByColumn.email) continue;
    await upsertById(
      client,
      "profiles",
      profileColumns,
      profileColumns.map((column) => valuesByColumn[column] ?? null),
    );
    profilesImported += 1;
  }

  return { userIdMap, usersImported, usersSkipped, profilesImported };
};

const importPets = async (client, userIdMap, sourcePetRows) => {
  let imported = 0;
  let skipped = 0;

  for (const pet of sourcePetRows) {
    const targetUserId = userIdMap.get(String(pet.user_id || ""));
    const name = asText(pet.name);
    if (!targetUserId || !pet.id || !name) {
      skipped += 1;
      continue;
    }

    const valuesByColumn = {
      ...pet,
      user_id: targetUserId,
      name,
      type: normalizePetType(pet.type || pet.pet_type),
      is_mixed: asBoolean(pet.is_mixed, false),
      breed_confidence: asInteger(pet.breed_confidence),
      weight: asNumber(pet.weight),
      is_neutered: asBoolean(pet.is_neutered),
      medical_conditions: asTextArray(pet.medical_conditions),
      personality_tags: asTextArray(pet.personality_tags),
      favorite_activities: asTextArray(pet.favorite_activities),
      activities: asTextArray(pet.activities),
      archived: asBoolean(pet.archived, false),
      has_insurance: asBoolean(pet.has_insurance),
      is_dangerous_breed: asBoolean(pet.is_dangerous_breed, false),
      age: asInteger(pet.age),
      mood_score: asInteger(pet.mood_score),
      is_lost: asBoolean(pet.is_lost, false),
      lost_show_phone: asBoolean(pet.lost_show_phone, false),
      created_at: asDateValue(pet.created_at) || new Date(),
      updated_at: asDateValue(pet.updated_at) || asDateValue(pet.created_at) || new Date(),
    };

    await upsertById(
      client,
      "pets",
      petColumns,
      petColumns.map((column) => valuesByColumn[column] ?? null),
      { replaceNulls: true },
    );
    imported += 1;
  }

  return { imported, skipped };
};

const importBreeds = async (client, sourceBreedRows) => {
  let imported = 0;
  let skipped = 0;

  for (const breed of sourceBreedRows) {
    if (!breed.id || !asText(breed.breed_name) || !asText(breed.pet_type)) {
      skipped += 1;
      continue;
    }

    const valuesByColumn = {
      ...breed,
      breed_name: asText(breed.breed_name),
      breed_name_he: asText(breed.breed_name_he),
      pet_type: asText(breed.pet_type),
      temperament: asTextArray(breed.temperament),
      temperament_he: asTextArray(breed.temperament_he),
      health_issues: asTextArray(breed.health_issues),
      health_issues_he: asTextArray(breed.health_issues_he),
      source_references: asTextArray(breed.source_references),
      good_with_children: asBoolean(breed.good_with_children),
      good_with_other_pets: asBoolean(breed.good_with_other_pets),
      apartment_friendly: asBoolean(breed.apartment_friendly),
      is_active: asBoolean(breed.is_active, true),
      affection_family: asInteger(breed.affection_family),
      kids_friendly: asInteger(breed.kids_friendly),
      dog_friendly: asInteger(breed.dog_friendly),
      shedding_level: asInteger(breed.shedding_level),
      grooming_freq: asInteger(breed.grooming_freq),
      drooling_level: asInteger(breed.drooling_level),
      stranger_openness: asInteger(breed.stranger_openness),
      playfulness: asInteger(breed.playfulness),
      watchdog_nature: asInteger(breed.watchdog_nature),
      trainability: asInteger(breed.trainability),
      energy_level: asInteger(breed.energy_level),
      barking_level: asInteger(breed.barking_level),
      mental_needs: asInteger(breed.mental_needs),
      created_at: asDateValue(breed.created_at) || new Date(),
      updated_at: asDateValue(breed.updated_at) || asDateValue(breed.created_at) || new Date(),
    };

    await upsertById(
      client,
      "breed_information",
      breedColumns,
      breedColumns.map((column) => valuesByColumn[column] ?? null),
      { replaceNulls: true },
    );
    imported += 1;
  }

  return { imported, skipped };
};

const importDogParks = async (client, sourceDogParkRows) => {
  let imported = 0;
  let skipped = 0;

  for (const dogPark of sourceDogParkRows) {
    if (!dogPark.id || !asText(dogPark.name) || !asText(dogPark.city)) {
      skipped += 1;
      continue;
    }

    const valuesByColumn = {
      ...dogPark,
      name: asText(dogPark.name),
      city: asText(dogPark.city),
      address: asText(dogPark.address) || "",
      latitude: asNumber(dogPark.latitude),
      longitude: asNumber(dogPark.longitude),
      status: asText(dogPark.status) || "active",
      fencing: asBoolean(dogPark.fencing),
      water: asBoolean(dogPark.water),
      shade: asBoolean(dogPark.shade),
      agility: asBoolean(dogPark.agility),
      parking: asBoolean(dogPark.parking),
      lighting: asBoolean(dogPark.lighting),
      verified: asBoolean(dogPark.verified),
      rating: asNumber(dogPark.rating),
      total_reviews: asInteger(dogPark.total_reviews),
      created_at: asDateValue(dogPark.created_at) || new Date(),
      updated_at: asDateValue(dogPark.updated_at) || asDateValue(dogPark.created_at) || new Date(),
    };

    await upsertById(
      client,
      "dog_parks",
      dogParkColumns,
      dogParkColumns.map((column) => valuesByColumn[column] ?? null),
      { replaceNulls: true },
    );
    imported += 1;
  }

  return { imported, skipped };
};

const main = async () => {
  const sourceData = await loadSourceData();

  if (exportOnlyFile) {
    const counts = await writeSourceExport(exportOnlyFile, sourceData);
    console.log(JSON.stringify({ ok: true, exported: counts }, null, 2));
    return;
  }

  const client = await target.connect();
  try {
    await client.query("begin");

    const users = await importUsersAndProfiles(client, sourceData);
    const pets = await importPets(client, users.userIdMap, sourceData.sourcePetRows);
    const breeds = await importBreeds(client, sourceData.sourceBreedRows);
    const dogParks = await importDogParks(client, sourceData.sourceDogParkRows);

    await client.query("commit");

    console.log(JSON.stringify({
      ok: true,
      users: {
        imported: users.usersImported,
        skipped: users.usersSkipped,
      },
      profiles: {
        imported: users.profilesImported,
      },
      pets,
      breeds,
      dog_parks: dogParks,
    }, null, 2));
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
}).finally(async () => {
  await Promise.all([
    source?.end(),
    target?.end(),
  ]);
});
