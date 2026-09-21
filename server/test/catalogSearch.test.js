// What people type into the shop, and what it gives them back.
//
// Every test here is a real query, and most of them are real failures. Two
// rounds of them:
//
// ROUND ONE - the owner, within a minute of opening his own shop:
//
//   "מזון יבש לכלב"  -> nothing
//   "מזון יבש כלב"   -> results
//   "קוואטרו כלב"    -> results
//
// ROUND TWO - measured against the real catalogue rows after fixing round one.
// All three of the shop's OWN suggestion chips - the buttons on the resting
// screen, the first thing a visitor taps - returned nothing:
//
//   "הכלב שלי משיר הרבה"  -> 0
//   "אוכל יבש לגור"        -> 0
//   "צעצוע לתוכי"          -> 0
//
// and "כדור" returned a cat food.
//
// A bug found by the person using the product is the best test case there is:
// it is a real sentence somebody really typed, which no amount of imagining
// cases produces. So they are all kept, by name, forever.

import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

import {
  productHaystack,
  productMatchesQuery,
  queryTokens,
  searchCatalog,
  searchCatalogDetailed,
} from "../src/catalogSearch.js";

const names = (products) => products.map((product) => product.name);

// ─── the catalogue, shaped like the real one ─────────────────────────────────
//
// Field for field what /api/products returns, including the parts that caused
// the failures: "יבש" only ever in a description, a pet_type enum of exactly
// dog/cat/other/all, categories that call the same thing both "מזון" and
// "אוכל יבש", and benefits as the array the API actually sends.

const dryDogFood = {
  name: "קוואטרו אדולט עוף 7 ק״ג",
  brand: "QUATTRO",
  category: "אוכל יבש",
  description: "מזון יבש מלא לכלבים בוגרים על בסיס עוף טרי",
  pet_type: "dog",
  life_stage: "adult",
};

const puppyFood = {
  name: "קוואטרו פאפי עוף 3 ק״ג",
  brand: "QUATTRO",
  category: "אוכל יבש",
  description: "מזון יבש לגורי כלבים",
  pet_type: "dog",
  life_stage: "puppy",
};

const catTreat = {
  name: "חטיף סלמון רך",
  brand: "MIPO",
  category: "חטיפים",
  description: "חטיף רך לחתולים",
  pet_type: "cat",
};

const dogBrush = {
  name: "מברשת טיפוח לפרווה ארוכה",
  brand: "MIPO",
  category: "טיפוח",
  description: "מברשת לכלבים בעלי פרווה ארוכה",
  pet_type: "dog",
};

// pet_type 'all' - a product for every animal. Mapping it to no species words
// at all is what made four of the ten classified products in the real
// catalogue unfindable by the animal they are for.
const omega = {
  name: "Skin & Coat אומגה 3",
  brand: "MIPO Vet",
  category: "בריאות",
  description: "שמן אומגה 3 לעור ופרווה מבריקה, מתאים לכלבים וחתולים",
  pet_type: "all",
  benefits: ["עור בריא", "פרווה מבריקה", "הפחתת נשירה"],
};

const ball = {
  name: "כדור משחק עמיד",
  brand: "MIPO",
  category: "צעצועים",
  description: "כדור גומי קשיח למשחק ממושך",
  pet_type: "all",
};

// The product that made "כדור" return a cat food: its description contains
// "בכדורי שיער", and a fragment matched inside it.
const hairballFood = {
  name: "MIPO Salmon Indoor לחתולים",
  brand: "MIPO",
  category: "מזון",
  description: "מזון יבש לחתולי בית עם סלמון, טאורין ותמיכה בכדורי שיער",
  pet_type: "cat",
};

const catalog = [dryDogFood, puppyFood, catTreat, dogBrush, omega, ball, hairballFood];

// ─── round one: the owner's own three queries ────────────────────────────────

test('"מזון יבש לכלב" finds the dry dog food', () => {
  // THE ONE THAT RETURNED NOTHING. Three reasons at once: "יבש" is only in the
  // description, the whole query was matched as one substring, and "לכלב" is
  // "כלב" with a preposition glued to the front.
  assert.deepEqual(names(searchCatalog(catalog, "מזון יבש לכלב")), [dryDogFood.name, puppyFood.name]);
});

test('"מזון יבש כלב" gives the same answer as the sentence a person would say', () => {
  // This one worked before, by accident. The two must not diverge again.
  assert.deepEqual(
    names(searchCatalog(catalog, "מזון יבש כלב")),
    names(searchCatalog(catalog, "מזון יבש לכלב")),
  );
});

test('"קוואטרו כלב" finds it by brand and species together', () => {
  assert.deepEqual(names(searchCatalog(catalog, "קוואטרו כלב")), [dryDogFood.name, puppyFood.name]);
});

// ─── round two: the shop's own three suggestion chips ────────────────────────

test('the chip "הכלב שלי משיר הרבה" answers with the things you buy for shedding', () => {
  // ZERO before. "שלי" and "הרבה" were required words, and "משיר" is not a
  // word any product contains - no product is called shedding. It has to be
  // understood as the idea.
  //
  // The answer is BOTH the brush and the supplement, and which of them leads
  // is not something this test should decide: a grooming brush is at least as
  // good an answer to a shedding dog as an omega-3 is. What it does decide is
  // that the dry food is not in the list at all, because that is the failure
  // this catalogue produced once - "יבשות" stemmed to "יבש" and made every
  // dry food an answer to a skin complaint.
  const found = names(searchCatalog(catalog, "הכלב שלי משיר הרבה"));
  assert.ok(found.length > 0, "the shop's own first suggestion returned nothing");
  assert.deepEqual(found.sort(), [dogBrush.name, omega.name].sort());
});

test('the chip "אוכל יבש לגור" answers, and says so when it has to narrow', () => {
  // ZERO before, for a reason that is not about Hebrew at all: the catalogue
  // says "מזון" and the shopper says "אוכל". The categories table holds BOTH
  // - "מזון" and "אוכל יבש" - so the catalogue disagrees with itself.
  const outcome = searchCatalogDetailed(catalog, "אוכל יבש לגור");
  assert.deepEqual(names(outcome.results), [puppyFood.name]);
  assert.deepEqual(outcome.dropped, [], "a word was given up on a query that has an exact answer");
});

test('the chip "צעצוע לתוכי" gives the toy and admits the parrot went unused', () => {
  // ZERO before. pet_type is an enum of dog/cat/other/all - there is no parrot
  // in it - so a parrot can only ever be found in a product's own words, and
  // this catalogue has no parrot product. The honest answer is the toy, plus
  // the fact that "לתוכי" was not used. A blank screen is the dishonest one.
  const outcome = searchCatalogDetailed(catalog, "צעצוע לתוכי");
  assert.deepEqual(names(outcome.results), [ball.name]);
  assert.deepEqual(outcome.dropped, ["לתוכי"]);
  assert.equal(outcome.relaxed, true);
});

test('"כדור" does not return a cat food', () => {
  // The false positive that proved substring matching was the wrong shape.
  // "כדור" was prefix-stripped to the fragment "דור", and "דור" appears in the
  // MIDDLE of "בכדורי שיער". Words match words now, so the ball is the answer
  // and the hairball food can only follow it, never lead.
  const found = searchCatalog(catalog, "כדור");
  assert.equal(found[0].name, ball.name);
});

// ─── Hebrew is glued together at both ends ───────────────────────────────────

test("a singular and its plural find each other, whichever is typed", () => {
  // "חטיף" returned NOTHING while "חטיפים" returned the treats, because only
  // the query was stemmed and `includes` runs one way.
  //
  // The PLURAL typed against a SINGULAR stored is the direction that proves
  // it. The other way round is matched by the start of the word anyway - a
  // shopper part-way through typing "מגבונ" gets "מגבונים" without any
  // stemming at all - so testing that direction tests nothing. And the word
  // here is deliberately one that belongs to no concept group, or the groups
  // would answer instead of the stemmer and the test would pass with the
  // stemmer deleted. It did.
  const wipes = { name: "מגבון לחות", brand: "MIPO", category: "טיפוח", pet_type: "all" };

  assert.equal(productMatchesQuery(wipes, "מגבונים"), true, "the plural did not find the singular");
  assert.equal(productMatchesQuery(wipes, "מגבון"), true);
});

test("a final letter is a letter", () => {
  // ן and נ are one letter for matching, and without folding "מגבון" and
  // "מגבונים" share no stem at all. Same fact as the test above, stated on the
  // half of it that folding alone is responsible for: the suffix list is
  // written folded ("ימ"), so an unfolded "מגבונים" ends in nothing the
  // stemmer recognises.
  const wipes = { name: "מגבון לחות", brand: "MIPO", category: "טיפוח", pet_type: "all" };
  assert.equal(productMatchesQuery(wipes, "מגבונים"), true);
  assert.equal(productMatchesQuery(catTreat, "חטיפים"), true);
});

test("a preposition prefix is tried with and without", () => {
  for (const query of ["לכלב", "בכלב", "הכלב", "כלב"]) {
    assert.equal(productMatchesQuery(dryDogFood, query), true, `"${query}" did not find the dog food`);
  }
});

test("stripping never manufactures a fragment", () => {
  // The length floors. "כלב" must not become "לב" and "מזון" must not become
  // "זון" - and "דור" must never be a word at all, which is what returned a
  // cat food for "כדור".
  assert.equal(productMatchesQuery(dryDogFood, "מזון"), true);
  assert.equal(productMatchesQuery(hairballFood, "דור"), false, '"דור" still matches mid-word');
  assert.equal(productMatchesQuery(catTreat, "לב"), false, '"כלב" was reduced to "לב"');
});

test("a word is found by its own letters", () => {
  assert.equal(productMatchesQuery(omega, "עור"), true);
  assert.equal(productMatchesQuery(dogBrush, "טיפוח"), true);
});

test("typographic and typed quotes are the same character to a search", () => {
  // The catalogue holds ק״ג with a gershayim; a phone keyboard produces ".
  assert.equal(productMatchesQuery(dryDogFood, 'ק"ג'), true);
  assert.equal(productMatchesQuery(dryDogFood, "ק״ג"), true);
});

test("a word split by punctuation is still two words", () => {
  // Splitting on whitespace alone leaves "ללא-דגנים" as one token that matches
  // nothing at all.
  assert.deepEqual(
    queryTokens("ללא-דגנים").map((token) => token.word),
    queryTokens("ללא דגנים").map((token) => token.word),
  );
});

// ─── a query is a sentence ───────────────────────────────────────────────────

test("the words that are how a person talks are not required words", () => {
  // Before this, a question got FEWER results than a keyword - the exact
  // opposite of what asking is supposed to do, because every filler word was
  // a word the product had to contain.
  const asked = searchCatalog(catalog, "מה הכי טוב לכלב שלי");
  const plain = searchCatalog(catalog, "כלב");
  assert.deepEqual(names(asked), names(plain));
  assert.ok(asked.length > 0);
});

test("a query of nothing but filler still searches", () => {
  // If every word is dropped there is nothing left to match, and the screen
  // goes blank on a real question. The filler goes back in rather than that.
  assert.ok(queryTokens("מה יש לכם").length > 0);
});

test("a stop word ending in a final letter is still a stop word", () => {
  // It was not. toWords folds ם to מ before anything reads a word, so the
  // entry "לכם" was being compared against "לכמ" and never matched - and
  // "יש לכם משהו לעור ופרווה" reported that it had dropped "לכם".
  const outcome = searchCatalogDetailed(catalog, "יש לכם משהו לעור ופרווה");
  assert.deepEqual(outcome.dropped, [], `dropped ${outcome.dropped.join(",")}`);
  assert.ok(outcome.results.length > 0);
});

test("the catalogue's word and the shopper's word are the same word", () => {
  // The categories table holds "מזון" AND "אוכל יבש".
  assert.deepEqual(names(searchCatalog(catalog, "אוכל לכלב")), names(searchCatalog(catalog, "מזון לכלב")));
});

test("a symptom finds the product for it", () => {
  // No product is called "מגרד". This is the whole difference between a shop
  // that takes sentences and a shop that takes keywords.
  assert.ok(names(searchCatalog(catalog, "הכלב שלי מגרד")).includes(omega.name));
  assert.deepEqual(names(searchCatalog(catalog, "פרווה מבריקה")), [omega.name]);
});

// ─── every word narrows, and a word that cannot is given up out loud ─────────

test("every word narrows the answer rather than making it less likely", () => {
  // THE PROPERTY THE FIRST SEARCH INVERTED. It matched the whole query as one
  // substring, so each word a person added to be more specific made the answer
  // less likely to exist at all.
  const broad = searchCatalog(catalog, "כלב");
  const narrow = searchCatalog(catalog, "כלב מזון");
  const narrower = searchCatalog(catalog, "כלב מזון קוואטרו");

  assert.ok(broad.length > narrow.length);
  assert.ok(narrow.length >= narrower.length);
  assert.ok(narrow.every((product) => broad.includes(product)), "narrowing returned something the broad query did not");
});

test("one common word does not return the catalogue", () => {
  // The objection to searching descriptions, and why it does not apply: it is
  // true of OR matching and backwards for AND.
  assert.ok(searchCatalog(catalog, "סלמון").length < catalog.length);
  assert.deepEqual(names(searchCatalog(catalog, "מברשת")), [dogBrush.name]);
});

test("a word this shop has no product for is reported, not swallowed", () => {
  const outcome = searchCatalogDetailed(catalog, "מזון יבש לארנב");
  assert.deepEqual(outcome.dropped, ["לארנב"]);
  assert.ok(outcome.results.length > 0);
  assert.equal(outcome.relaxed, true);
});

test("a query about nothing in the shop returns nothing", () => {
  // Never OR. Relaxing to "any word matches" would answer "אוכף לסוס" with a
  // page of dog food, which reads as broken rather than honest.
  const outcome = searchCatalogDetailed(catalog, "אוכף לסוס");
  assert.deepEqual(outcome.results, []);
  assert.deepEqual(
    outcome.dropped,
    // AS TYPED, with the final ף. Matching folds ף to פ, and reporting the
    // folded form told a shopper "אין לנו אוכפ" - a word that is not Hebrew
    // and that they did not type.
    ["אוכף", "לסוס"],
  );
});

test("an impossible combination gives up the right word", () => {
  // Every word matches something, but no product matches all of them. This is
  // the rung "אוכל יבש לגור" fell through.
  //
  // WHICH word is given up is the test, not THAT one was. The first rule tried
  // here gave up the rarest word, which answers "a brush for my cat" with cat
  // food - a perfectly relaxed search returning the wrong half of the
  // question. The word to give up is the one describing the most of the shop.
  const outcome = searchCatalogDetailed(catalog, "מברשת לחתול");
  assert.deepEqual(names(outcome.results), [dogBrush.name]);
  assert.deepEqual(outcome.dropped, ["לחתול"], "gave up the brush instead of the animal");
  assert.equal(outcome.relaxed, true);
});

test("an empty query is not a match-everything", () => {
  for (const query of ["", "   ", null, undefined]) {
    assert.deepEqual(searchCatalog(catalog, query), []);
  }
});

// ─── one wrong letter ────────────────────────────────────────────────────────

test("a typo still finds the product, and is reported as a typo", () => {
  const outcome = searchCatalogDetailed(catalog, "קואטרו");
  assert.ok(outcome.results.length > 0, "one missing letter returned nothing");
  assert.deepEqual(outcome.corrected, ["קואטרו"]);
});

test("a spelling that is right is never second-guessed", () => {
  // Fuzzy matching is only ever reached by a word that matched NOTHING, so a
  // correct query cannot be widened into a wrong one.
  const outcome = searchCatalogDetailed(catalog, "מברשת");
  assert.deepEqual(outcome.corrected, []);
});

test("a short word is not fuzzy-matched into a different word", () => {
  // Under five letters, one edit reaches a different word rather than a
  // misspelling of the same one. "אוכף" is four letters and one edit from
  // "אוכל", and a saddle was being answered with dog food.
  assert.equal(productMatchesQuery(ball, "חול"), false);
  assert.deepEqual(searchCatalog(catalog, "אוכף"), []);
});

test("a typo is not allowed in the first two letters of a word", () => {
  // The other half of the same guard. Length alone would let a six-letter word
  // one edit from a catalogue word through no matter WHERE the edit fell, and
  // a word that starts differently is a different word far more often than it
  // is a misspelling - people mistype the middle and the end of a word, not
  // its opening.
  assert.deepEqual(searchCatalog(catalog, "כתולים"), [], '"כתולים" was read as "חתולים"');
});

// ─── what the answer is ordered by ───────────────────────────────────────────

test("a product named for the word beats a product that mentions it", () => {
  // The shop shows twelve cards and then stops, so catalogue order can hide
  // the exact match behind eleven products that merely mention it.
  //
  // The catalogue here is deliberately in the WRONG order - the product that
  // only mentions salmon is first - because a catalogue whose own order
  // already agrees with the ranking cannot tell whether anything is ranking.
  // The first version of this test was exactly that, and passed with the sort
  // deleted.
  const backwards = [hairballFood, catTreat];
  assert.equal(searchCatalog(backwards, "סלמון")[0].name, catTreat.name);
  assert.deepEqual(names(searchCatalog(backwards, "סלמון")), [catTreat.name, hairballFood.name]);
});

test("a word that describes most of the shop does not decide the order", () => {
  // Rarity, on the arrangement that shows it: both products answer both words,
  // one has the NEAR-UNIVERSAL word in its name and the other has the RARE
  // word in its name. Scored on field weight alone the common word wins, and
  // the answer is ordered by the least informative thing the person typed.
  // Both products match both words in exactly mirrored places - one in the
  // name and the other in the description - so on field weight alone they TIE,
  // and the tie goes to whichever is first in the catalogue. The food is first
  // on purpose. Only weighting by rarity separates them, and pet_type is left
  // off both so the species tag does not quietly score the animal twice.
  const shelf = [
    { name: "מזון כלבים פרימיום", description: "מפחית נשירה בעונת המעבר" },
    { name: "תוסף נגד נשירה", description: "מתאים לכלבים" },
    ...Array.from({ length: 6 }, (_, index) => ({
      name: `מזון כלבים ${index}`, description: "לכלבים",
    })),
  ];

  assert.equal(searchCatalog(shelf, "כלב נשירה")[0].name, "תוסף נגד נשירה");
});

test("a word that describes half the shop narrows without reordering", () => {
  // "כלב" is in most of a dog shop, so it is a FILTER and not a topic. Adding
  // it to a query should remove the products it excludes and leave the rest in
  // the order the real question put them in.
  //
  // Weighting each word by how rare it is in the catalogue is what buys that.
  // Without it, a product with the near-universal word in its NAME scores a
  // full name match on a word that distinguishes nothing, and the answer is
  // ordered by the least informative thing the person typed.
  const topic = names(searchCatalog(catalog, "משיר"));
  const filtered = names(searchCatalog(catalog, "כלב משיר"));

  assert.ok(filtered.length > 0);
  assert.deepEqual(filtered, topic.filter((name) => filtered.includes(name)));
});

test("equal matches keep the catalogue's own order between keystrokes", () => {
  const once = names(searchCatalog(catalog, "כלב"));
  const again = names(searchCatalog([...catalog], "כלב"));
  assert.deepEqual(once, again);
});

// ─── the animal, against the column that stores it ───────────────────────────

test("the animal is searchable by the word a person uses", () => {
  // pet_type holds "dog". Nobody types "dog".
  assert.equal(productMatchesQuery(dryDogFood, "כלב"), true);
  assert.equal(productMatchesQuery(dryDogFood, "כלבים"), true);
  assert.equal(productMatchesQuery(dryDogFood, "חתול"), false);
  assert.equal(productMatchesQuery(catTreat, "חתולים"), true);
});

test("a product for every animal answers about every animal", () => {
  // pet_type 'all'. Mapped to nothing, a collar and an omega-3 were unfindable
  // by the animal they are for - four of ten classified products in the real
  // catalogue.
  assert.equal(productMatchesQuery(ball, "כלב"), true);
  assert.equal(productMatchesQuery(ball, "חתול"), true);
});

test("'other' does not claim an animal it cannot know", () => {
  // 'other' is a parrot AND a rabbit AND a hamster. Naming any one of them
  // from the column would be a guess.
  const rabbitHutch = { name: "כלוב", category: "אביזרים", pet_type: "other" };
  assert.equal(productMatchesQuery(rabbitHutch, "תוכי"), false);
  assert.equal(productMatchesQuery(rabbitHutch, "כלב"), false);
});

// ─── a word that cancels the word beside it ──────────────────────────────────

const grainFood = {
  name: "קוואטרו אדולט עוף",
  brand: "QUATTRO",
  category: "אוכל יבש",
  description: "מזון יבש עם דגנים ועוף",
  pet_type: "dog",
};

const grainFree = {
  name: "אקאנה גרנפרי",
  brand: "ACANA",
  category: "אוכל יבש",
  description: "מזון יבש לכלבים",
  pet_type: "dog",
  special_diet: ["grain free"],
};

const shelf = [grainFood, grainFree];

test('"ללא דגנים" does not answer with the grain food', () => {
  // THE WORST ANSWER THE SEARCH EVER GAVE, and it was not a blank screen: the
  // relaxation gave up "ללא" AND "דגנים" as words it could not use, and
  // returned the grain food. Not a weaker answer - THE OPPOSITE ANSWER, to the
  // one shopper who cannot afford it, whose dog is allergic to the thing they
  // typed.
  assert.deepEqual(names(searchCatalog(shelf, "מזון ללא דגנים")), [grainFree.name]);
  assert.deepEqual(names(searchCatalog(shelf, "בלי דגנים")), [grainFree.name]);
});

test("a catalogue states it the other way round, and that counts too", () => {
  // special_diet holds "grain free". English puts the marker behind the word
  // and Hebrew in front, so the two directions are separate - and getting that
  // wrong is not a near miss: marking both neighbours negated "מזון" in "מזון
  // ללא דגנים", and the query became a request for food that is not food.
  assert.equal(productMatchesQuery(grainFree, "ללא דגנים"), true);
  assert.equal(productMatchesQuery(grainFree, "מזון ללא דגנים"), true);
  assert.equal(productMatchesQuery(grainFood, "ללא דגנים"), false);
});

test("asking WITH something still works", () => {
  assert.deepEqual(names(searchCatalog(shelf, "מזון עם דגנים")), [grainFood.name]);
});

test("narrowing never narrows by throwing the negation away", () => {
  // THE DANGEROUS PATH, and the one a blanket "give up a word" rule walks
  // straight into. The shop has grain-free food for DOGS and grain food for
  // CATS, and somebody asks for grain-free food for a cat. Every word matches
  // something; no product matches all of them; the ladder must give one up.
  //
  // Giving up "לחתול" is a smaller answer. Giving up "דגנים" hands back the
  // grain cat food - which is the one product in the shop the query was
  // written to avoid.
  const mixed = [
    { name: "מזון יבש לחתולים", category: "אוכל יבש", description: "עם דגנים", pet_type: "cat" },
    { name: "אקאנה גרנפרי", category: "אוכל יבש", description: "לכלבים", pet_type: "dog", special_diet: ["grain free"] },
  ];

  const outcome = searchCatalogDetailed(mixed, "מזון ללא דגנים לחתול");
  assert.ok(
    !names(outcome.results).includes("מזון יבש לחתולים"),
    "the grain cat food was returned to a query that excluded grain",
  );
  assert.ok(!outcome.dropped.includes("דגנים"), "the negated word was given up to find an answer");
});

test("a negation that cannot be met is said out loud, never given up", () => {
  // No product here declares itself chicken-free. The relaxation ladder gives
  // up any word it must to find an answer - EXCEPT this one. Returning chicken
  // food to somebody who typed "ללא עוף" is the failure this rule exists for,
  // so the answer is nothing, plus the word that could not be honoured.
  const outcome = searchCatalogDetailed(shelf, "מזון ללא עוף");
  assert.deepEqual(outcome.results, []);
  assert.deepEqual(outcome.unmet, ["עוף"]);
  assert.deepEqual(outcome.dropped, [], "a negation was treated as a droppable word");
});

// ─── the values the columns really hold ──────────────────────────────────────

test("a Hebrew word reaches the English code the column stores", () => {
  // MEASURED, not imagined. The tag columns the search matches verbatim hold
  // English codes - life_stage 'adult'/'senior', dog_size 'medium',
  // special_diet 'digestive'/'joint'/'urinary'/'skin'/'low fat' - while
  // medical_tags holds Hebrew. Nobody types 'urinary' into a Hebrew shop.
  //
  // Every value below was read off the database rather than invented, and each
  // is paired with the word a person would actually say. A code that stops
  // being reachable is a column that may as well not be searched.
  const reachable = [
    ["adult", "בוגר"],
    ["senior", "מבוגר"],
    ["puppy", "גור"],
    ["medium", "בינוני"],
    ["small", "קטן"],
    ["large", "גדול"],
    ["digestive", "עיכול"],
    ["joint", "מפרקים"],
    ["urinary", "שתן"],
    ["skin", "עור"],
  ];

  for (const [code, said] of reachable) {
    const product = { name: "מוצר", category: "בריאות", life_stage: code, special_diet: [code], dog_size: code };
    assert.equal(
      productMatchesQuery(product, said),
      true,
      `the column holds "${code}" and a shopper says "${said}" - and the two do not meet`,
    );
  }
});

test("two sizes are not the same size", () => {
  // The group that would have been one group. Small and large as synonyms
  // means "מזון לכלב קטן" answers with food for a great dane.
  const smallBreed = { name: "מזון לגזע קטן", dog_size: "small" };
  assert.equal(productMatchesQuery(smallBreed, "קטן"), true);
  assert.equal(productMatchesQuery(smallBreed, "גדול"), false);
});

// ─── what is deliberately not searched ───────────────────────────────────────

test("internal fields are not searchable", () => {
  // A warehouse code and a supplier's URL are not things a shopper names a
  // product by, and matching them produces results for reasons they cannot see
  // on the card in front of them.
  const haystack = productHaystack({
    ...dryDogFood,
    sku: "MP-DC-3K",
    source_url: "https://supplier.example/p/12345",
  });

  assert.ok(!haystack.includes("mp"), "the sku is searchable");
  assert.ok(!haystack.includes("supplier"), "the supplier url is searchable");
});

// ─── the shape the shop actually hands it ────────────────────────────────────

test("the shop's transformed product is searchable by species", () => {
  // THIS IS THE TEST THAT WAS MISSING, and its absence let a live defect
  // through a green suite. Shop.tsx does not search the API's rows: it
  // transforms them first, and the transform renames pet_type to petType. The
  // species lookup therefore found nothing on the only shape that is ever
  // searched in production, while every test passed, because the tests used
  // the API's shape.
  const asShopTransformsIt = {
    id: "1",
    name: "קוואטרו אדולט עוף 7 ק״ג",
    description: "מזון יבש מלא לכלבים בוגרים על בסיס עוף טרי",
    category: "אוכל יבש",
    petType: "dog",
    lifeStage: "adult",
    brand: "QUATTRO",
    flavors: [],
  };

  assert.equal(productMatchesQuery(asShopTransformsIt, "כלב"), true);
  assert.equal(productMatchesQuery(asShopTransformsIt, "מזון יבש לכלב"), true);
  assert.equal(productMatchesQuery(asShopTransformsIt, "חתול"), false);
});

test("every field the search reads is one the shop's transform produces", () => {
  // Derived rather than listed, so a field renamed in the transform tomorrow
  // is caught on that commit instead of the day someone notices the search is
  // quietly worse. This is the test that found lifeStage missing.
  const shop = readFileSync(new URL("../../src/pages/Shop.tsx", import.meta.url), "utf8");
  const transform = shop.slice(shop.indexOf("const products = useMemo"), shop.indexOf("}, [dbProducts]);"));
  assert.ok(transform.length > 200, "the shop's product transform was not found");

  const source = readFileSync(new URL("../src/catalogSearch.js", import.meta.url), "utf8");
  const read = [...source.matchAll(/product\?\.(\w+)/g)].map((match) => match[1]);
  assert.ok(read.length > 5, "no fields were parsed out of the product reader");

  const produced = new Set([...transform.matchAll(/^\s*(\w+):/gm)].map((match) => match[1]));

  const missing = [...new Set(read)].filter((field) => !produced.has(field));
  assert.deepEqual(
    missing.sort(),
    // Each of these is read only BESIDE a sibling the transform does produce:
    // category_name beside category, pet_type beside petType, life_stage
    // beside lifeStage, dog_size beside dogSize. A name appearing here that is
    // not one half of such a pair is a field no shopper can search by.
    ["category_name", "dog_size", "life_stage", "pet_type"],
    "The search reads a field the shop's transform does not produce, and the list of\n" +
      "known-absent ones has changed. Each name here is a field the search looks for\n" +
      "and the shop never supplies - harmless only while a sibling spelling is read\n" +
      "beside it, which is exactly how petType was missed.",
  );
});

test("the browser's copy is the same rules, character for character", () => {
  // Not "equivalent" - identical. The previous version of this test compared
  // the two files after stripping TypeScript syntax with a list of regexes,
  // and every regex in that list was a place the comparison stopped looking.
  // The rules now live in one block of text that both files carry verbatim,
  // and the types are confined to an export tail below it that decides
  // nothing.
  const region = (source, label) => {
    const start = source.indexOf("const FINAL_FORMS");
    const end = source.indexOf("// ─── exported surface");
    assert.ok(start > 0 && end > start, `the shared region was not found in ${label}`);
    return source.slice(start, end).trimEnd();
  };

  const server = region(readFileSync(new URL("../src/catalogSearch.js", import.meta.url), "utf8"), "the server copy");
  const client = region(readFileSync(new URL("../../src/lib/catalogSearch.ts", import.meta.url), "utf8"), "the browser copy");

  assert.ok(server.length > 5000, "the shared region is too small to be the rules");
  assert.equal(client, server, "the shop's search and the server module have drifted apart");
});
