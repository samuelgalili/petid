import assert from "node:assert/strict";
import test from "node:test";

import { appearanceFromPet, isWeakDevice } from "./petAvatarAppearance.js";

const channelSum = (rgb) => rgb[0] + rgb[1] + rgb[2];

test("a cat with no colour is a pointed cat in the warm default coat", () => {
  const look = appearanceFromPet({ type: "cat", name: "ציפסר" });
  assert.equal(look.species, "cat");
  assert.equal(look.ears, "pointed");
  assert.ok(look.coat[0] > 0.4 && look.coat[0] < 0.85);
  assert.ok(look.bodyLength === 1);
});

test("a dog with no breed is floppy-eared", () => {
  const look = appearanceFromPet({ type: "dog", name: "לוקה" });
  assert.equal(look.species, "dog");
  assert.equal(look.ears, "floppy");
});

test("a Hebrew golden retriever is a long gold dog with floppy ears", () => {
  const look = appearanceFromPet({ type: "dog", breed: "גולדן רטריבר", name: "לוקה" });
  assert.equal(look.species, "dog");
  assert.equal(look.ears, "floppy");
  assert.ok(look.bodyLength > 1.1);
  assert.ok(look.coat[0] > look.coat[2] + 0.25);
  assert.ok(look.coat[0] > 0.65);
});

test("an explicit colour wins over the breed coat and keeps the breed shape", () => {
  const look = appearanceFromPet({
    type: "dog",
    breed: "גולדן רטריבר",
    color: "שחור",
    name: "לוקה",
  });
  assert.equal(look.ears, "floppy");
  assert.ok(look.bodyLength > 1.1);
  assert.ok(look.coat.every((channel) => channel < 0.35));
});

test("a Siamese cat keeps dark points on a light coat", () => {
  const look = appearanceFromPet({ breed: "סיאמי", name: "מיקה" });
  assert.equal(look.species, "cat");
  assert.equal(look.ears, "pointed");
  assert.ok(channelSum(look.markings) < channelSum(look.coat) - 0.4);
});

test("a corgi is long and short-legged", () => {
  const look = appearanceFromPet({ type: "כלב", breed: "קורגי", name: "פיסטוק" });
  assert.equal(look.species, "dog");
  assert.equal(look.ears, "pointed");
  assert.ok(look.bodyLength > 1.2);
  assert.ok(look.legScale < 0.7);
});

test("the same record always maps to the same look", () => {
  const input = { type: "cat", breed: "פרסי", color: "לבן", name: "שלג" };
  assert.deepEqual(appearanceFromPet(input), appearanceFromPet(input));
});

test("two names of the same breed are not the same coat", () => {
  const mica = appearanceFromPet({ type: "dog", breed: "מעורב", name: "מיקה" });
  const loki = appearanceFromPet({ type: "dog", breed: "מעורב", name: "לוקי" });
  assert.notDeepEqual(mica.coat, loki.coat);
  assert.equal(mica.species, loki.species);
  assert.equal(mica.ears, loki.ears);
});

test("a registered dog stays a dog even when the breed text mentions a cat", () => {
  const look = appearanceFromPet({ type: "dog", breed: "חתול פרסי", name: "בדיקה" });
  assert.equal(look.species, "dog");
});

test("an empty record still produces a usable dog", () => {
  const look = appearanceFromPet(null);
  assert.equal(look.species, "dog");
  assert.equal(look.ears, "floppy");
  for (const channel of [...look.coat, ...look.markings]) {
    assert.ok(channel >= 0 && channel <= 1);
  }
});

test("a hex colour is used as the coat", () => {
  const look = appearanceFromPet({ type: "cat", color: "#2244aa", name: "כחול" });
  assert.ok(look.coat[2] > look.coat[0]);
});

test("weak-device detection follows memory, not core count", () => {
  assert.equal(isWeakDevice({ deviceMemory: 2 }), true);
  assert.equal(isWeakDevice({ deviceMemory: 1 }), true);
  assert.equal(isWeakDevice({ deviceMemory: 4 }), false);
  assert.equal(isWeakDevice({}), false);
  assert.equal(isWeakDevice(undefined), false);
});
