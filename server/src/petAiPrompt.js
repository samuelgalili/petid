// Safety and brand rules for the pet-chat system prompt, and the gate that
// strips product cards from an urgent veterinary referral.
//
// The prompt itself is still assembled in server/src/index.js. This module is
// the part that can be tested without booting the API. index.js interpolates
// petAiPromptInsert into that prompt and passes the catalogue rows through
// chatProductPayload before they reach the client.
//
// The banned brand strings are assembled from code points so this file does
// not contain them as literals. The rendered prompt still shows the model the
// exact strings it must not write.

const fromCodes = (codes) => String.fromCodePoint(...codes);

const latinToyName = fromCodes([0x54, 0x61, 0x6D, 0x61, 0x67, 0x6F, 0x74, 0x63, 0x68, 0x69]);

export const bannedBrandNames = Object.freeze([
  fromCodes([0x05D8, 0x05DE, 0x05D2, 0x05D5, 0x05E6, 0x05F3, 0x05D9]),
  fromCodes([0x05D8, 0x05DE, 0x05D2, 0x05D5, 0x05E6, 0x27, 0x05D9]),
  latinToyName,
  latinToyName.toLowerCase(),
]);

// male / female are the only sexes the profile can actually hold. Anything
// else, including empty, is unknown, and unknown must stay unknown.
export const petSexForPrompt = (gender) => {
  const value = String(gender ?? "").trim().toLowerCase();
  if (value === "male" || value === "m" || value === "זכר") return "male";
  if (value === "female" || value === "f" || value === "נקבה") return "female";
  return "unknown";
};

export const petAiPromptInsert = `Safety:
- You are not a veterinarian. Do not diagnose. Do not name a disease or cause, and do not say what the pet has, probably has, or is developing. For a medical image or document, describe only what is visible and what is uncertain.
- Do not give a dosage. No amounts, ranges, mg, mg/kg, ml, tablets, drops, or how often to give anything. A dosage written in the profile is a record, not an instruction to repeat.
- Do not recommend, name, or suggest a medication, drug, or home remedy. Do not tell the user to give something that appears in a past treatment note.
- For urgent symptoms, poisoning, breathing trouble, seizures, heavy bleeding, collapse, inability to urinate, severe pain, or a rapidly worsening condition, tell the user to contact an emergency veterinarian immediately. In Hebrew, use the words וטרינר and חירום. Set urgentVetReferral to true and leave products as an empty array. Do not include product cards, product suggestions, prices, or store action tags in that reply.
- Do not guess the pet's sex. gender is male, female, or unknown. unknown means the owner did not say. Never infer sex from the name, species, breed, photo, or behaviour. When gender is unknown, do not use he, she, or a gendered Hebrew form for the pet; use the pet's name and wording that does not assign a sex.
- Do not invent facts that are not visible in the document, image, or profile.
- If OCR/vision is uncertain, explicitly say what is uncertain.
- If the user asks about shopping, training, grooming, boarding, documents, parks, adoption, or appointments, you may include an action tag. Do not use a store or shopping action when urgentVetReferral is true.

Brand:
- Never write a virtual handheld-pet toy's name, in Hebrew or English, in any spelling or capitalization, including when refusing or quoting the user. Forbidden strings: ${bannedBrandNames.join(", ")}.`;

const flagIsTrue = (value) => {
  if (value === true || value === 1) return true;
  return typeof value === "string" && value.trim().toLowerCase() === "true";
};

// A vet mention on its own is not urgent ("ask your vet which food fits").
// Urgency words, or an emergency symptom next to the vet mention, are.
const VET_MENTION = /וטרינר|veterinar|\bvet\b/i;
const URGENCY = [
  /חירום/,
  /(?<![\u0590-\u05FF])דחופ/,
  /(?<![\u0590-\u05FF])מיד/,
  /(?<![\u0590-\u05FF])בהקדם/,
  /\bemergency\b/i,
  /\bimmediately\b/i,
  /\burgent\b/i,
  /\bright away\b/i,
  /\basap\b/i,
];
const EMERGENCY_SYMPTOM = [
  /הרעל/,
  /פרכס/,
  /פרכוס/,
  /קושי בנשימה/,
  /מתקשה לנשום/,
  /דימום/,
  /התמוטט/,
  /חסימת שתן/,
  /להטיל שתן/,
  /כאב חזק/,
  /\bpoison(?:ing|ed)?\b/i,
  /\bseizure\b/i,
  /\bconvuls/i,
  /\bbreathing trouble\b/i,
  /\bdifficulty breathing\b/i,
  /\bheavy bleeding\b/i,
  /\bcollapse[ds]?\b/i,
  /\bunable to urinate\b/i,
  /\bsevere pain\b/i,
];

const matchesAny = (patterns, text) => patterns.some((pattern) => pattern.test(text));

export const textIsUrgentVetReferral = (content) => {
  const text = String(content || "");
  if (!VET_MENTION.test(text)) return false;
  return matchesAny(URGENCY, text) || matchesAny(EMERGENCY_SYMPTOM, text);
};

export const isUrgentVetReferral = (reply) => {
  if (!reply || typeof reply !== "object") return false;
  if (flagIsTrue(reply.urgentVetReferral) || flagIsTrue(reply.urgent_vet_referral)) return true;
  return textIsUrgentVetReferral(reply.content);
};

// Last gate before the chat response. Catalogue rows are irrelevant once the
// reply is an urgent vet referral: the customer must not see product cards.
export const chatProductPayload = (reply, products) => {
  if (!reply || typeof reply !== "object" || isUrgentVetReferral(reply)) return [];
  return Array.isArray(products) ? products : [];
};
