// M-022. The live model is not called here. These tests pin the two things
// that can be checked without a provider: the safety text interpolated into
// the pet-chat system prompt, and the product-card filter applied to the
// reply before it reaches the client.
//
// B1-B8 (dosages, urgent vet referrals, no product cards on a real reply)
// need a signed-in session and a live model. They are manual and listed on
// the pull request. Nothing in this file reads GEMINI_API_KEY.

import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  bannedBrandNames,
  chatProductPayload,
  isUrgentVetReferral,
  petAiPromptInsert,
  petSexForPrompt,
} from "../src/petAiPrompt.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const indexSource = readFileSync(path.join(repoRoot, "server/src/index.js"), "utf8");

const promptFunction = () => {
  const start = indexSource.indexOf("const buildPetAiPrompt");
  const end = indexSource.indexOf("const createAiChatReply");
  assert.ok(start !== -1 && end > start, "buildPetAiPrompt is missing from index.js");
  return indexSource.slice(start, end);
};

test("the prompt forbids dosages, medications, and diagnosis", () => {
  const prompt = petAiPromptInsert;
  assert.match(prompt, /Do not give a dosage\./);
  assert.match(prompt, /mg\/kg/);
  assert.match(prompt, /Do not recommend, name, or suggest a medication, drug, or home remedy\./);
  assert.match(prompt, /Do not diagnose\./);
  assert.equal(prompt.includes("with certainty"), false);
  assert.doesNotMatch(prompt, /\d+(?:\.\d+)?\s*(?:mg|ml)\b/i);
  assert.match(prompt, /not an instruction to repeat/);
});

test("the prompt sends every urgent symptom to an emergency veterinarian with no product cards", () => {
  const prompt = petAiPromptInsert;
  for (const symptom of [
    "poisoning",
    "breathing trouble",
    "seizures",
    "heavy bleeding",
    "collapse",
    "inability to urinate",
    "severe pain",
    "rapidly worsening",
  ]) {
    assert.equal(prompt.includes(symptom), true, symptom);
  }
  assert.match(prompt, /contact an emergency veterinarian immediately/);
  assert.match(prompt, /Set urgentVetReferral to true and leave products as an empty array/);
  assert.match(prompt, /Do not include product cards/);
  assert.match(prompt, /Do not use a store or shopping action when urgentVetReferral is true/);
});

test("the prompt does not guess the pet's sex", () => {
  assert.match(petAiPromptInsert, /Do not guess the pet's sex\./);
  assert.match(
    petAiPromptInsert,
    /When gender is unknown, do not use he, she, or a gendered Hebrew form for the pet/,
  );
  assert.equal(petSexForPrompt(undefined), "unknown");
  assert.equal(petSexForPrompt(null), "unknown");
  assert.equal(petSexForPrompt(""), "unknown");
  assert.equal(petSexForPrompt("זכר"), "male");
  assert.equal(petSexForPrompt("נקבה"), "female");
  assert.equal(petSexForPrompt("male"), "male");
  assert.equal(petSexForPrompt("female"), "female");
});

test("the prompt shows the model the banned brand strings without storing them as literals", () => {
  const source = readFileSync(path.join(repoRoot, "server/src/petAiPrompt.js"), "utf8");
  const testSource = readFileSync(path.join(repoRoot, "server/test/petAiPrompt.test.js"), "utf8");
  assert.equal(bannedBrandNames.length, 4);
  assert.equal(bannedBrandNames[0].codePointAt(5), 0x05F3);
  assert.equal(bannedBrandNames[1].codePointAt(5), 0x27);
  assert.equal(bannedBrandNames[2].codePointAt(0), 0x54);
  assert.equal(bannedBrandNames[2].length, 10);
  assert.equal(bannedBrandNames[3], bannedBrandNames[2].toLowerCase());
  for (const name of bannedBrandNames) {
    assert.equal(petAiPromptInsert.includes(name), true);
    assert.equal(source.includes(name), false);
    assert.equal(testSource.includes(name), false);
    assert.equal(indexSource.includes(name), false);
  }
  assert.match(petAiPromptInsert, /Forbidden strings:/);
  assert.match(petAiPromptInsert, /including when refusing or quoting the user/);
});

test("index.js interpolates the safety text and does not keep the old diagnosis loophole", () => {
  const fn = promptFunction();
  assert.match(fn, /\$\{petAiPromptInsert\}/);
  assert.equal(fn.includes("with certainty"), false);
  assert.match(fn, /urgent veterinary referral, products must be an empty array/);
  assert.match(fn, /"urgentVetReferral": false/);
  assert.match(indexSource, /gender: petSexForPrompt\(pet\.gender\)/);
});

test("an urgent vet referral drops the product payload", () => {
  const cards = [
    { id: "p1", name: "מזון יבש", price: 89 },
    { id: "p2", name: "חטיף", price: 19 },
  ];
  const urgentReplies = [
    { urgentVetReferral: true, content: "הנה כמה מוצרים" },
    { urgent_vet_referral: "true", content: "shopping" },
    { urgentVetReferral: false, content: "פנו לוטרינר חירום מיד" },
    { content: "Contact an emergency veterinarian immediately." },
    { content: "הכלב מפרכס. פנו לוטרינר." },
    { content: "This may be poisoning. Call your vet." },
    { content: "Heavy bleeding. Go to a veterinarian right away." },
    { content: "החתול לא מצליח להטיל שתן. צרו קשר עם וטרינר." },
  ];
  for (const reply of urgentReplies) {
    assert.equal(isUrgentVetReferral(reply), true, JSON.stringify(reply));
    assert.deepEqual(chatProductPayload(reply, cards), []);
  }
});

test("a shopping reply and a calm vet mention keep product cards", () => {
  const cards = [
    { id: "p1", name: "מזון יבש", price: 89 },
  ];
  const kept = [
    { urgentVetReferral: false, content: "הנה מזון יבש לגורים" },
    { content: "כדאי לשאול את הווטרינר איזה מזון מתאים, ובינתיים אלה אפשרויות מהחנות" },
    { content: "תמיד שווה בדיקה שנתית אצל וטרינר. הנה רתמות." },
    { content: "" },
  ];
  for (const reply of kept) {
    assert.equal(isUrgentVetReferral(reply), false, JSON.stringify(reply));
    assert.deepEqual(chatProductPayload(reply, cards), cards);
  }
  assert.deepEqual(chatProductPayload({ content: "מזון" }, null), []);
  assert.deepEqual(chatProductPayload(null, cards), []);
});

test("the chat handler sends catalogue rows through the urgent-referral filter", () => {
  assert.match(indexSource, /chatProductPayload\(\s*\{ \.\.\.result, content \}/);
  assert.match(indexSource, /from "\.\/petAiPrompt\.js"/);
});
