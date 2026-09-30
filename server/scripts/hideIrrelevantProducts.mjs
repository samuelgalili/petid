// Hide, and later restore, products the owner judged irrelevant to this shop
// or duplicates of a product we keep.
//
// The allowlist is the JSON array below, in CSV order. Each id has a line
// comment with its product name. Dry-run is the default and writes nothing.
// hide records the current shop_hidden value and sets it true. unhide writes
// that recorded value back.
import path from "node:path";
import { pathToFileURL } from "node:url";
import pg from "pg";
import { scriptPoolOptions } from "./scriptPoolSsl.mjs";

const { Pool } = pg;

export const EXPECTED_ALLOWLIST_COUNT = 42;

export const IRRELEVANT_HIDE_REASON = "irrelevant-or-duplicate-2026-09-30";

// Product name for each allowlisted id, in CSV order.
// 9da533d7-2d45-4ba8-9379-fea2b6c4b031 אספסת כופתיות בשקי 20 ק"ג
// 118a1a53-3cbd-48da-aa7d-062716e1eb03 אפרוחות 16 -9 שלב 3 פרגיות בשקי 20 ק"ג
// 826aa047-f7df-40ad-b0c6-191fd5fa1f71 אפרוחים 0-4 שלב 1 בשקי 20 ק"ג
// f543ae18-32cc-441e-9ea2-7b5ce437d2d3 השריה בשקי 20 ק"ג
// 53dd23a5-8ab1-4ada-ba31-ee1620e7b329 חלבית 335 בשקי 25 ק"ג
// 9d202e14-95e3-41f7-93c1-44110266192e חריע בשקי 25 ק"ג
// 36c3e363-cbc2-482f-a33c-9b203f857d00 טלאים %16 כופתיות בשקי 25 ק"ג
// d2b618ae-23fb-44b8-ab67-648d79e744d6 טלאים %18 חלטה בשקי 25 ק"ג
// a87e8ca6-7a0f-48c5-a1e7-77c6cbf0b0e2 טלאים %18 כופתיות בשקי 25 ק"ג
// dca0a8b1-b8fb-449e-a5eb-b1e32a80b3ec כוספא סויה בשקי 25 ק"ג
// 683b1ad1-9f3f-4ac1-bb6d-9253d8b58a63 כלי אוכל גדול לעופות 8 ק"ג
// 501c432f-6bfe-4f56-9b69-943cb29ea157 כלי אוכל לעופות קטן 4 ק"ג
// 8b4bef6c-4a20-4fed-9596-3fd56c22cc44 כלי מים לעופות גדול 14 ליטר
// 644a4d8b-34b1-447f-a1b6-8163cc256308 כלי מים לעופות קטן 6 ליטר
// 92227576-8726-4127-a9ea-749b38053db7 לול הולנדי
// 5b2507b2-7c9e-4d1d-86d0-3402dc19dfc8 לול קפריסאי
// bc75f0f6-79f5-453d-bae3-ea0312e8cffb לול תאילנדי
// dab2e4f0-2ca6-4f37-a27d-5e5fe0a24637 מטילות %17 לחוצה בשקי 20 ק"ג
// f99086a8-b68d-43fc-80ef-3dca110505cd מטילות %17 פירורים בשקי 20 ק"ג
// 771e189b-24b1-4cc1-a044-1edc587ff36f מטילות %17 פרימיום לחוצה בשקי 20 ק"ג
// a517c294-241d-4950-ae81-d237c8797423 מטילות %17 פרימיום פירורים בשקי 20 ק"ג
// 2acc022a-5451-410a-be7a-463ff4c6dd85 נסורת בשקים גדולים
// d8e297b5-dd46-43b8-8405-2ccd371866ee סובין בשקי 25 ק"ג
// 13641206-a831-4cbb-8a16-1cfa482819a5 סוסים חלטה בשקי 25 ק"ג
// d2375616-7b22-4aa4-8015-e37de9a6ee2f סוסים חלטה פרימיום  בשקי 25 ק"ג
// 4f748675-7588-4fc1-aae8-fe22c5ddec50 סוסים כופתיות  בשקי 25 ק"ג
// 551e9780-34bc-43b5-b2ad-fdf5b8cb64da סטרטר פטם פירורים שלב 1 בשקי 25 ק"ג
// 3401c2e1-3a9b-4fd1-9a51-933d97a5aa8e עגלים %16 כופתיות בשקי 25 ק"ג
// 8b06d779-4424-415b-bc4a-6d8404f75960 עיזים %18 חלטה בשקי 25 ק"ג
// 0bad7c64-cf2c-4b27-a8c1-0be321ed847f צאן חלטה בשקי 25 ק"ג
// e35ff6e8-c068-4c9b-919c-96a9fd57d136 ש.ח.ת בשקי 25 ק"ג
// 2c63c8cd-8f31-4e06-b451-f75dea5d68f1 באפס טבעי גיד בקר ללעיסה 100 גרם
// 683bf594-15b5-4f4c-bdf2-e4a7c00a76f8 באפס טבעי ושט בקר ללעיסה 70 גרם
// 87a8bedd-511f-4b80-96ef-cc447df82b9e גארד כלבים מינטיננס מוצר כפול בדיקה
// ea803fe5-fb25-4450-9981-b154a60b5249 גארד פלוס כלב בוגר כבש ואורז 14 קג מוצר כפול בדיקה
// 4f590900-3995-46e3-bfe4-f1c355292cb4 מזון יבש לכלבים גורים גארד פאפי אוכל לכלב גור 20 קג בדיקה !
// 3d90d763-8746-40e1-9829-1befe950546f מזון לפסיונים 5 קג אלתא אנרגי מוצר כפול לבדיקה ...
// 66e6b0ce-cb5a-4dfc-a9e6-316e125eda0d קוואטרו חתולים אקסטרה עוף 7 ק"ג
// aae695b1-efdc-4909-8a3d-c75b8c760db1 קוואטרו כלבים גוניור כל הגזעים עוף 7 ק"ג
// 70a94302-93b3-4ecd-aff8-4336a3078900 קוואטרו כלבים כל הגזעים אקסטרה עוף 12ק"ג
// 817057ec-b019-4dcd-8fff-74154108e5a4 אקסטרה עוף 1.5 ק"ג מוצר נסיון לא למכירה
// 8caedd0f-9460-4a4e-8b39-283842d11117 חטיפי אילוף עוף רכים מוצר בדיקה
const IRRELEVANT_PRODUCTS_JSON = "[\n  {\n    \"id\": \"9da533d7-2d45-4ba8-9379-fea2b6c4b031\",\n    \"name\": \"אספסת כופתיות בשקי 20 ק\\\"ג\",\n    \"candidate_category\": \"לא רלוונטי\",\n    \"keep_instead_id\": null\n  },\n  {\n    \"id\": \"118a1a53-3cbd-48da-aa7d-062716e1eb03\",\n    \"name\": \"אפרוחות 16 -9 שלב 3 פרגיות בשקי 20 ק\\\"ג\",\n    \"candidate_category\": \"לא רלוונטי\",\n    \"keep_instead_id\": null\n  },\n  {\n    \"id\": \"826aa047-f7df-40ad-b0c6-191fd5fa1f71\",\n    \"name\": \"אפרוחים 0-4 שלב 1 בשקי 20 ק\\\"ג\",\n    \"candidate_category\": \"לא רלוונטי\",\n    \"keep_instead_id\": null\n  },\n  {\n    \"id\": \"f543ae18-32cc-441e-9ea2-7b5ce437d2d3\",\n    \"name\": \"השריה בשקי 20 ק\\\"ג\",\n    \"candidate_category\": \"לא רלוונטי\",\n    \"keep_instead_id\": null\n  },\n  {\n    \"id\": \"53dd23a5-8ab1-4ada-ba31-ee1620e7b329\",\n    \"name\": \"חלבית 335 בשקי 25 ק\\\"ג\",\n    \"candidate_category\": \"לא רלוונטי\",\n    \"keep_instead_id\": null\n  },\n  {\n    \"id\": \"9d202e14-95e3-41f7-93c1-44110266192e\",\n    \"name\": \"חריע בשקי 25 ק\\\"ג\",\n    \"candidate_category\": \"לא רלוונטי\",\n    \"keep_instead_id\": null\n  },\n  {\n    \"id\": \"36c3e363-cbc2-482f-a33c-9b203f857d00\",\n    \"name\": \"טלאים %16 כופתיות בשקי 25 ק\\\"ג\",\n    \"candidate_category\": \"לא רלוונטי\",\n    \"keep_instead_id\": null\n  },\n  {\n    \"id\": \"d2b618ae-23fb-44b8-ab67-648d79e744d6\",\n    \"name\": \"טלאים %18 חלטה בשקי 25 ק\\\"ג\",\n    \"candidate_category\": \"לא רלוונטי\",\n    \"keep_instead_id\": null\n  },\n  {\n    \"id\": \"a87e8ca6-7a0f-48c5-a1e7-77c6cbf0b0e2\",\n    \"name\": \"טלאים %18 כופתיות בשקי 25 ק\\\"ג\",\n    \"candidate_category\": \"לא רלוונטי\",\n    \"keep_instead_id\": null\n  },\n  {\n    \"id\": \"dca0a8b1-b8fb-449e-a5eb-b1e32a80b3ec\",\n    \"name\": \"כוספא סויה בשקי 25 ק\\\"ג\",\n    \"candidate_category\": \"לא רלוונטי\",\n    \"keep_instead_id\": null\n  },\n  {\n    \"id\": \"683b1ad1-9f3f-4ac1-bb6d-9253d8b58a63\",\n    \"name\": \"כלי אוכל גדול לעופות 8 ק\\\"ג\",\n    \"candidate_category\": \"לא רלוונטי\",\n    \"keep_instead_id\": null\n  },\n  {\n    \"id\": \"501c432f-6bfe-4f56-9b69-943cb29ea157\",\n    \"name\": \"כלי אוכל לעופות קטן 4 ק\\\"ג\",\n    \"candidate_category\": \"לא רלוונטי\",\n    \"keep_instead_id\": null\n  },\n  {\n    \"id\": \"8b4bef6c-4a20-4fed-9596-3fd56c22cc44\",\n    \"name\": \"כלי מים לעופות גדול 14 ליטר\",\n    \"candidate_category\": \"לא רלוונטי\",\n    \"keep_instead_id\": null\n  },\n  {\n    \"id\": \"644a4d8b-34b1-447f-a1b6-8163cc256308\",\n    \"name\": \"כלי מים לעופות קטן 6 ליטר\",\n    \"candidate_category\": \"לא רלוונטי\",\n    \"keep_instead_id\": null\n  },\n  {\n    \"id\": \"92227576-8726-4127-a9ea-749b38053db7\",\n    \"name\": \"לול הולנדי\",\n    \"candidate_category\": \"לא רלוונטי\",\n    \"keep_instead_id\": null\n  },\n  {\n    \"id\": \"5b2507b2-7c9e-4d1d-86d0-3402dc19dfc8\",\n    \"name\": \"לול קפריסאי\",\n    \"candidate_category\": \"לא רלוונטי\",\n    \"keep_instead_id\": null\n  },\n  {\n    \"id\": \"bc75f0f6-79f5-453d-bae3-ea0312e8cffb\",\n    \"name\": \"לול תאילנדי\",\n    \"candidate_category\": \"לא רלוונטי\",\n    \"keep_instead_id\": null\n  },\n  {\n    \"id\": \"dab2e4f0-2ca6-4f37-a27d-5e5fe0a24637\",\n    \"name\": \"מטילות %17 לחוצה בשקי 20 ק\\\"ג\",\n    \"candidate_category\": \"לא רלוונטי\",\n    \"keep_instead_id\": null\n  },\n  {\n    \"id\": \"f99086a8-b68d-43fc-80ef-3dca110505cd\",\n    \"name\": \"מטילות %17 פירורים בשקי 20 ק\\\"ג\",\n    \"candidate_category\": \"לא רלוונטי\",\n    \"keep_instead_id\": null\n  },\n  {\n    \"id\": \"771e189b-24b1-4cc1-a044-1edc587ff36f\",\n    \"name\": \"מטילות %17 פרימיום לחוצה בשקי 20 ק\\\"ג\",\n    \"candidate_category\": \"לא רלוונטי\",\n    \"keep_instead_id\": null\n  },\n  {\n    \"id\": \"a517c294-241d-4950-ae81-d237c8797423\",\n    \"name\": \"מטילות %17 פרימיום פירורים בשקי 20 ק\\\"ג\",\n    \"candidate_category\": \"לא רלוונטי\",\n    \"keep_instead_id\": null\n  },\n  {\n    \"id\": \"2acc022a-5451-410a-be7a-463ff4c6dd85\",\n    \"name\": \"נסורת בשקים גדולים\",\n    \"candidate_category\": \"לא רלוונטי\",\n    \"keep_instead_id\": null\n  },\n  {\n    \"id\": \"d8e297b5-dd46-43b8-8405-2ccd371866ee\",\n    \"name\": \"סובין בשקי 25 ק\\\"ג\",\n    \"candidate_category\": \"לא רלוונטי\",\n    \"keep_instead_id\": null\n  },\n  {\n    \"id\": \"13641206-a831-4cbb-8a16-1cfa482819a5\",\n    \"name\": \"סוסים חלטה בשקי 25 ק\\\"ג\",\n    \"candidate_category\": \"לא רלוונטי\",\n    \"keep_instead_id\": null\n  },\n  {\n    \"id\": \"d2375616-7b22-4aa4-8015-e37de9a6ee2f\",\n    \"name\": \"סוסים חלטה פרימיום  בשקי 25 ק\\\"ג\",\n    \"candidate_category\": \"לא רלוונטי\",\n    \"keep_instead_id\": null\n  },\n  {\n    \"id\": \"4f748675-7588-4fc1-aae8-fe22c5ddec50\",\n    \"name\": \"סוסים כופתיות  בשקי 25 ק\\\"ג\",\n    \"candidate_category\": \"לא רלוונטי\",\n    \"keep_instead_id\": null\n  },\n  {\n    \"id\": \"551e9780-34bc-43b5-b2ad-fdf5b8cb64da\",\n    \"name\": \"סטרטר פטם פירורים שלב 1 בשקי 25 ק\\\"ג\",\n    \"candidate_category\": \"לא רלוונטי\",\n    \"keep_instead_id\": null\n  },\n  {\n    \"id\": \"3401c2e1-3a9b-4fd1-9a51-933d97a5aa8e\",\n    \"name\": \"עגלים %16 כופתיות בשקי 25 ק\\\"ג\",\n    \"candidate_category\": \"לא רלוונטי\",\n    \"keep_instead_id\": null\n  },\n  {\n    \"id\": \"8b06d779-4424-415b-bc4a-6d8404f75960\",\n    \"name\": \"עיזים %18 חלטה בשקי 25 ק\\\"ג\",\n    \"candidate_category\": \"לא רלוונטי\",\n    \"keep_instead_id\": null\n  },\n  {\n    \"id\": \"0bad7c64-cf2c-4b27-a8c1-0be321ed847f\",\n    \"name\": \"צאן חלטה בשקי 25 ק\\\"ג\",\n    \"candidate_category\": \"לא רלוונטי\",\n    \"keep_instead_id\": null\n  },\n  {\n    \"id\": \"e35ff6e8-c068-4c9b-919c-96a9fd57d136\",\n    \"name\": \"ש.ח.ת בשקי 25 ק\\\"ג\",\n    \"candidate_category\": \"לא רלוונטי\",\n    \"keep_instead_id\": null\n  },\n  {\n    \"id\": \"2c63c8cd-8f31-4e06-b451-f75dea5d68f1\",\n    \"name\": \"באפס טבעי גיד בקר ללעיסה 100 גרם\",\n    \"candidate_category\": \"כפילות\",\n    \"keep_instead_id\": \"744f4a67-7df5-461d-8b02-8513302dca64\"\n  },\n  {\n    \"id\": \"683bf594-15b5-4f4c-bdf2-e4a7c00a76f8\",\n    \"name\": \"באפס טבעי ושט בקר ללעיסה 70 גרם\",\n    \"candidate_category\": \"כפילות\",\n    \"keep_instead_id\": \"40c529cd-5303-43a2-9a2e-a85ab19658b1\"\n  },\n  {\n    \"id\": \"87a8bedd-511f-4b80-96ef-cc447df82b9e\",\n    \"name\": \"גארד כלבים מינטיננס מוצר כפול בדיקה\",\n    \"candidate_category\": \"כפילות\",\n    \"keep_instead_id\": \"4da218ab-466d-492f-be21-e5a7f3dfe71e\"\n  },\n  {\n    \"id\": \"ea803fe5-fb25-4450-9981-b154a60b5249\",\n    \"name\": \"גארד פלוס כלב בוגר כבש ואורז 14 קג מוצר כפול בדיקה\",\n    \"candidate_category\": \"כפילות\",\n    \"keep_instead_id\": \"908cd383-d121-4930-8bc6-9a5b5b818a1b\"\n  },\n  {\n    \"id\": \"4f590900-3995-46e3-bfe4-f1c355292cb4\",\n    \"name\": \"מזון יבש לכלבים גורים גארד פאפי אוכל לכלב גור 20 קג בדיקה !\",\n    \"candidate_category\": \"כפילות\",\n    \"keep_instead_id\": \"a0a87fdc-e468-44c5-8ac6-badbfd2b6361\"\n  },\n  {\n    \"id\": \"3d90d763-8746-40e1-9829-1befe950546f\",\n    \"name\": \"מזון לפסיונים 5 קג אלתא אנרגי מוצר כפול לבדיקה ...\",\n    \"candidate_category\": \"כפילות\",\n    \"keep_instead_id\": \"a9be43ea-0ead-46bf-a236-d916e77be172\"\n  },\n  {\n    \"id\": \"66e6b0ce-cb5a-4dfc-a9e6-316e125eda0d\",\n    \"name\": \"קוואטרו חתולים אקסטרה עוף 7 ק\\\"ג\",\n    \"candidate_category\": \"כפילות\",\n    \"keep_instead_id\": \"1401800c-6f07-4014-b4ce-99868795cd9e\"\n  },\n  {\n    \"id\": \"aae695b1-efdc-4909-8a3d-c75b8c760db1\",\n    \"name\": \"קוואטרו כלבים גוניור כל הגזעים עוף 7 ק\\\"ג\",\n    \"candidate_category\": \"כפילות\",\n    \"keep_instead_id\": \"1dd64743-4ff9-4a2d-b283-0744e702f5eb\"\n  },\n  {\n    \"id\": \"70a94302-93b3-4ecd-aff8-4336a3078900\",\n    \"name\": \"קוואטרו כלבים כל הגזעים אקסטרה עוף 12ק\\\"ג\",\n    \"candidate_category\": \"כפילות\",\n    \"keep_instead_id\": \"1029adc8-183e-4b8c-be6d-eee17b3d397c\"\n  },\n  {\n    \"id\": \"817057ec-b019-4dcd-8fff-74154108e5a4\",\n    \"name\": \"אקסטרה עוף 1.5 ק\\\"ג מוצר נסיון לא למכירה\",\n    \"candidate_category\": \"אחר\",\n    \"keep_instead_id\": null\n  },\n  {\n    \"id\": \"8caedd0f-9460-4a4e-8b39-283842d11117\",\n    \"name\": \"חטיפי אילוף עוף רכים מוצר בדיקה\",\n    \"candidate_category\": \"אחר\",\n    \"keep_instead_id\": null\n  }\n]";

export const IRRELEVANT_PRODUCTS = Object.freeze(
  JSON.parse(IRRELEVANT_PRODUCTS_JSON).map((entry) => Object.freeze({
    id: String(entry.id).toLowerCase(),
    name: String(entry.name),
    candidate_category: String(entry.candidate_category),
    keep_instead_id: entry.keep_instead_id ? String(entry.keep_instead_id).toLowerCase() : null,
  })),
);

export const KEEP_INSTEAD_IDS = Object.freeze(
  IRRELEVANT_PRODUCTS.map((entry) => entry.keep_instead_id).filter(Boolean),
);

const ALLOWLIST = new Map(IRRELEVANT_PRODUCTS.map((entry) => [entry.id, entry]));
const KEEP_INSTEAD = new Set(KEEP_INSTEAD_IDS);

const UUID = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g;
const UUID_EXACT = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const badAllowlist = (message) => {
  const error = new Error(message);
  error.code = "BAD_ALLOWLIST";
  return error;
};

/** The constant itself: 42 unique ids, no keep-target, every duplicate names one. */
export const validateAllowlist = () => {
  if (IRRELEVANT_PRODUCTS.length !== EXPECTED_ALLOWLIST_COUNT) {
    throw badAllowlist(`allowlist_count=${IRRELEVANT_PRODUCTS.length}; expected ${EXPECTED_ALLOWLIST_COUNT}`);
  }
  const ids = IRRELEVANT_PRODUCTS.map((entry) => entry.id);
  if (new Set(ids).size !== ids.length) {
    throw badAllowlist("allowlist ids are not unique");
  }
  if (new Set(KEEP_INSTEAD_IDS).size !== KEEP_INSTEAD_IDS.length) {
    throw badAllowlist("keep_instead_id values are not unique");
  }
  for (const entry of IRRELEVANT_PRODUCTS) {
    if (!UUID_EXACT.test(entry.id)) throw badAllowlist(`allowlist id is not a uuid: ${entry.id}`);
    if (!entry.name) throw badAllowlist(`allowlist id has no name: ${entry.id}`);
    if (KEEP_INSTEAD.has(entry.id)) {
      throw badAllowlist(`refusing to hide a product we keep (keep_instead_id): ${entry.id}`);
    }
    if (entry.candidate_category === "כפילות") {
      if (!entry.keep_instead_id || !UUID_EXACT.test(entry.keep_instead_id)) {
        throw badAllowlist(`duplicate row has no keep_instead_id: ${entry.id}`);
      }
    } else if (entry.keep_instead_id) {
      throw badAllowlist(`keep_instead_id set on a row that is not a duplicate: ${entry.id}`);
    }
  }
  for (const keepId of KEEP_INSTEAD_IDS) {
    if (!UUID_EXACT.test(keepId)) throw badAllowlist(`keep_instead_id is not a uuid: ${keepId}`);
    if (ALLOWLIST.has(keepId)) {
      throw badAllowlist(`refusing to hide a product we keep (keep_instead_id): ${keepId}`);
    }
  }
  return IRRELEVANT_PRODUCTS;
};

export const assertAllowlisted = (id) => {
  const key = String(id || "").toLowerCase();
  if (KEEP_INSTEAD.has(key)) {
    const error = new Error(`refusing to hide a product we keep (keep_instead_id): ${id}`);
    error.code = "KEEP_INSTEAD";
    throw error;
  }
  if (!ALLOWLIST.has(key)) {
    const error = new Error(`refusing id that is not on the irrelevant-product list: ${id}`);
    error.code = "NOT_ALLOWLISTED";
    throw error;
  }
  return ALLOWLIST.get(key);
};

/** Uuids named on the command line that this script must not touch. */
export const unexpectedIds = (argv) => {
  const found = [];
  for (const arg of argv) {
    const matches = String(arg).match(UUID) || [];
    for (const id of matches) {
      if (!ALLOWLIST.has(id.toLowerCase())) found.push(id.toLowerCase());
    }
  }
  return found;
};

export const parseMode = (argv) => {
  const found = argv.find((value) => value.startsWith("--mode="));
  if (!found) return "dry-run";
  const mode = found.slice("--mode=".length);
  if (!["dry-run", "hide", "unhide"].includes(mode)) {
    const error = new Error("mode must be dry-run, hide or unhide");
    error.code = "BAD_MODE";
    throw error;
  }
  return mode;
};

/**
 * What to do for each allowlisted id, given the rows and holds just read.
 * Pure: the dry-run and the write path both call it, so they cannot disagree.
 * A hold recorded by another workflow is never overwritten and never deleted.
 */
export const planShopVisibility = (mode, rowsById, holdsById) => {
  if (!["dry-run", "hide", "unhide"].includes(mode)) {
    const error = new Error("mode must be dry-run, hide or unhide");
    error.code = "BAD_MODE";
    throw error;
  }
  return IRRELEVANT_PRODUCTS.map((entry) => {
    const row = rowsById.get(entry.id) || null;
    const hold = holdsById.get(entry.id) || null;
    const ownHold = Boolean(hold) && hold.reason === IRRELEVANT_HIDE_REASON;
    const foreignHold = Boolean(hold) && hold.reason !== IRRELEVANT_HIDE_REASON;
    const base = {
      id: entry.id,
      name: entry.name,
      candidate_category: entry.candidate_category,
      keep_instead_id: entry.keep_instead_id,
      found: Boolean(row),
      in_stock: row ? row.in_stock : null,
      shop_hidden: row ? row.shop_hidden === true : null,
      recorded_previous_shop_hidden: hold ? hold.previous_shop_hidden === true : null,
      has_hold: Boolean(hold),
      hold_reason: hold ? hold.reason : null,
      write: false,
      restore_to: ownHold ? hold.previous_shop_hidden === true : null,
    };
    if (!row) return { ...base, action: "missing" };
    if (mode === "dry-run") return { ...base, action: "report" };
    if (foreignHold) return { ...base, action: "refuse-other-hold", restore_to: null };
    if (mode === "hide") {
      if (ownHold && row.shop_hidden === true) return { ...base, action: "already-hidden" };
      if (ownHold) return { ...base, action: "hold-already-recorded" };
      if (row.shop_hidden === true) return { ...base, action: "hidden-without-record" };
      return {
        ...base,
        action: "hide",
        write: true,
        restore_to: row.shop_hidden === true,
      };
    }
    if (!ownHold && row.shop_hidden !== true) return { ...base, action: "already-visible" };
    if (!ownHold) return { ...base, action: "refuse-no-record", restore_to: null };
    return {
      ...base,
      action: "unhide",
      write: true,
      restore_to: hold.previous_shop_hidden === true,
    };
  });
};

export const blockingActions = new Set([
  "missing",
  "hidden-without-record",
  "refuse-no-record",
  "refuse-other-hold",
  "hold-already-recorded",
]);

export const formatShopVisibilityReport = (mode, plans) => {
  const lines = [`allowlist_count=${plans.length}`];
  for (const plan of plans) {
    const stock = plan.found ? String(plan.in_stock) : "absent";
    const hidden = plan.found ? String(plan.shop_hidden) : "absent";
    const recorded = plan.has_hold ? "true" : "false";
    const reason = plan.has_hold && plan.hold_reason ? ` hold_reason=${plan.hold_reason}` : "";
    lines.push(
      `${plan.id}  shop_hidden=${hidden}  stock_flag=${stock}  hold_recorded=${recorded}${reason}  action=${plan.action}  name=${plan.name}`,
    );
  }
  const missing = plans.filter((plan) => !plan.found).length;
  const writes = plans.filter((plan) => plan.write).length;
  lines.push(
    `summary mode=${mode} products=${plans.length} found=${plans.length - missing} missing=${missing} writes=${writes}`,
  );
  return lines.join("\n");
};

/**
 * After the catalogue has been read. Exits non-zero, via the caller, when the
 * allowlist is not 42 or any id is absent. The report is printed first.
 */
export const assertRuntimeAllowlist = (plans) => {
  if (plans.length !== EXPECTED_ALLOWLIST_COUNT) {
    throw badAllowlist(`allowlist_count=${plans.length}; expected ${EXPECTED_ALLOWLIST_COUNT}`);
  }
  const missing = plans.filter((plan) => !plan.found);
  if (missing.length > 0) {
    const error = new Error(
      `allowlisted products not in business_products (${missing.length}): ${missing.map((plan) => plan.id).join(", ")}`,
    );
    error.code = "MISSING_PRODUCT";
    throw error;
  }
};

const printPlan = (mode, plans) => {
  console.log(formatShopVisibilityReport(mode, plans));
};

const rowsByIdFrom = (rows) => new Map(rows.map((row) => [String(row.id).toLowerCase(), row]));
const holdsByIdFrom = (rows) => new Map(rows.map((row) => [String(row.product_id).toLowerCase(), row]));

const applyOne = async (client, mode, plan) => {
  assertAllowlisted(plan.id);
  const { rows } = await client.query(
    `select id, in_stock, shop_hidden
       from public.business_products
      where id = $1
      for update`,
    [plan.id],
  );
  const row = rows[0];
  if (!row) {
    const error = new Error(`product not found: ${plan.id}`);
    error.code = "MISSING_PRODUCT";
    throw error;
  }
  const holdResult = await client.query(
    `select product_id, previous_shop_hidden, reason
       from public.product_shop_visibility_holds
      where product_id = $1
      for update`,
    [plan.id],
  );
  const decision = planShopVisibility(
    mode,
    rowsByIdFrom([{ ...row, name: plan.name }]),
    holdsByIdFrom(holdResult.rows),
  ).find((entry) => entry.id === plan.id);
  if (!decision || blockingActions.has(decision.action)) {
    const error = new Error(`${decision ? decision.action : "missing"}: ${plan.id}`);
    error.code = decision ? decision.action : "MISSING_PRODUCT";
    throw error;
  }
  if (!decision.write) return decision;

  const stockBefore = row.in_stock;
  if (decision.action === "hide") {
    await client.query(
      `insert into public.product_shop_visibility_holds
         (product_id, previous_shop_hidden, reason)
       values ($1, $2, $3)`,
      [plan.id, row.shop_hidden === true, IRRELEVANT_HIDE_REASON],
    );
    const updated = await client.query(
      `update public.business_products
          set shop_hidden = true,
              updated_at = now()
        where id = $1
          and shop_hidden is not true
        returning id, in_stock, shop_hidden`,
      [plan.id],
    );
    if (updated.rowCount !== 1 || updated.rows[0].shop_hidden !== true) {
      throw new Error(`hide did not update ${plan.id}`);
    }
    if (updated.rows[0].in_stock !== stockBefore) {
      throw new Error(`stock flag changed for ${plan.id}`);
    }
    await client.query(
      `insert into public.product_shop_visibility_events
         (product_id, action, previous_shop_hidden, resulting_shop_hidden)
       values ($1, 'hide', $2, true)`,
      [plan.id, row.shop_hidden === true],
    );
    return decision;
  }

  const restoreTo = decision.restore_to === true;
  const updated = await client.query(
    `update public.business_products
        set shop_hidden = $2,
            updated_at = now()
      where id = $1
      returning id, in_stock, shop_hidden`,
    [plan.id, restoreTo],
  );
  if (updated.rowCount !== 1 || updated.rows[0].shop_hidden !== restoreTo) {
    throw new Error(`unhide did not restore ${plan.id}`);
  }
  if (updated.rows[0].in_stock !== stockBefore) {
    throw new Error(`stock flag changed for ${plan.id}`);
  }
  const removed = await client.query(
    `delete from public.product_shop_visibility_holds
      where product_id = $1
        and reason = $2`,
    [plan.id, IRRELEVANT_HIDE_REASON],
  );
  if (removed.rowCount !== 1) {
    throw new Error(`unhide did not clear the hold for ${plan.id}`);
  }
  await client.query(
    `insert into public.product_shop_visibility_events
       (product_id, action, previous_shop_hidden, resulting_shop_hidden)
     values ($1, 'unhide', $2, $3)`,
    [plan.id, row.shop_hidden === true, restoreTo],
  );
  return decision;
};

export const runHideIrrelevantProducts = async ({ pool, mode, argv = [] }) => {
  validateAllowlist();
  const stray = unexpectedIds(argv);
  if (stray.length > 0) {
    const error = new Error(`refusing id that is not on the irrelevant-product list: ${stray.join(", ")}`);
    error.code = "NOT_ALLOWLISTED";
    throw error;
  }
  const ids = IRRELEVANT_PRODUCTS.map((entry) => entry.id);
  for (const id of ids) assertAllowlisted(id);

  const ready = await pool.query(
    `select
       to_regclass('public.product_shop_visibility_holds') is not null as holds,
       exists (
         select 1 from information_schema.columns
          where table_schema = 'public'
            and table_name = 'business_products'
            and column_name = 'shop_hidden'
       ) as shop_hidden`,
  );
  if (ready.rows[0]?.holds !== true || ready.rows[0]?.shop_hidden !== true) {
    const error = new Error("0061_product_shop_visibility.sql is not applied. Deploy aws-migration first.");
    error.code = "SCHEMA";
    throw error;
  }

  const { rows } = await pool.query(
    `select id, name, in_stock, shop_hidden
       from public.business_products
      where id = any($1::uuid[])`,
    [ids],
  );
  const holds = await pool.query(
    `select product_id, previous_shop_hidden, reason
       from public.product_shop_visibility_holds
      where product_id = any($1::uuid[])`,
    [ids],
  );
  const plans = planShopVisibility(mode, rowsByIdFrom(rows), holdsByIdFrom(holds.rows));
  printPlan(mode, plans);
  assertRuntimeAllowlist(plans);
  if (mode === "dry-run") return { plans, wrote: false };

  const blocked = plans.filter((plan) => blockingActions.has(plan.action));
  if (blocked.length > 0) {
    const error = new Error(`refusing to write: ${blocked.map((plan) => `${plan.action} ${plan.id}`).join("; ")}`);
    error.code = "BLOCKED";
    throw error;
  }

  const client = await pool.connect();
  try {
    await client.query("begin");
    for (const plan of plans) {
      if (plan.write) await applyOne(client, mode, plan);
    }
    await client.query("commit");
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
  return { plans, wrote: true };
};

const invokedDirectly = process.argv[1]
  && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (invokedDirectly) {
  const main = async () => {
    let mode;
    try {
      validateAllowlist();
      mode = parseMode(process.argv.slice(2));
    } catch (error) {
      console.error(error.message);
      process.exit(2);
    }
    const stray = unexpectedIds(process.argv.slice(2));
    if (stray.length > 0) {
      console.error(`refusing id that is not on the irrelevant-product list: ${stray.join(", ")}`);
      console.error("Nothing was written.");
      process.exit(2);
    }
    if (!process.env.DATABASE_URL) {
      console.error("DATABASE_URL is required");
      process.exit(2);
    }
    const pool = new Pool(scriptPoolOptions());
    try {
      await runHideIrrelevantProducts({ pool, mode, argv: process.argv.slice(2) });
    } catch (error) {
      console.error(error.message);
      process.exit(error.code === "BAD_MODE" || error.code === "BAD_ALLOWLIST" || error.code === "NOT_ALLOWLISTED" || error.code === "KEEP_INSTEAD" ? 2 : 1);
    } finally {
      await pool.end();
    }
  };
  main();
}
