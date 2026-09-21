/**
 * Matching what a person typed against what the catalogue holds — the
 * browser's copy.
 *
 * THE RULES BELOW ARE A VERBATIM COPY of server/src/catalogSearch.js, from the
 * first rule down to the exported surface at the bottom, and
 * server/test/catalogSearch.test.js compares the two character for character.
 * Not "equivalent", not "kept in sync by hand" — identical text. Two searches
 * that disagree is a shop that finds a product on one screen and denies it on
 * another, and a comparison that allows for differences is a comparison that
 * eventually allows the wrong one.
 *
 * So: CHANGE server/src/catalogSearch.js AND PASTE THE RESULT HERE. Anything
 * edited only in this file fails its own test on the next run.
 *
 * What started it, and what the tests still open with, is the owner typing
 * three things into his own shop:
 *
 *   "מזון יבש לכלב"  -> nothing
 *   "מזון יבש כלב"   -> results
 *   "קוואטרו כלב"    -> results
 */

/**
 * What the search can read off a product.
 *
 * Both spellings of every renamed field, because Shop.tsx transforms the API's
 * rows before searching them — pet_type becomes petType, life_stage becomes
 * lifeStage — and a reader that knew only one of them searched a shape the
 * shop never produces.
 */
export interface SearchableProduct {
  name?: string | null;
  brand?: string | null;
  category?: string | null;
  category_name?: string | null;
  description?: string | null;
  /** An array in the API, a string in some imports. Joined either way. */
  benefits?: unknown;
  ingredients?: string | null;
  pet_type?: string | null;
  petType?: string | null;
  life_stage?: string | null;
  lifeStage?: string | null;
  dog_size?: string | null;
  dogSize?: string | null;
  special_diet?: string[] | null;
  medical_tags?: string[] | null;
  breed_tags?: string[] | null;
  flavors?: string[] | null;
}

/** What a search answered, and which of the typed words it actually used. */
export interface SearchOutcome<T> {
  results: T[];
  /** The words that found something. */
  used: string[];
  /** The words this catalogue has no product for. The screen should say so. */
  dropped: string[];
  /** The words matched only after allowing a typo. */
  corrected: string[];
  /** Whether the answer is to a narrower question than the one asked. */
  relaxed: boolean;
}

const FINAL_FORMS = { "ך": "כ", "ם": "מ", "ן": "נ", "ף": "פ", "ץ": "צ" };

const foldFinals = (value) => value.replace(/[ךםןףץ]/g, (letter) => FINAL_FORMS[letter]);

/** Letters Hebrew attaches to the FRONT of a noun: ל ב ה ו מ כ ש. */
const PREFIX_LETTERS = /^[לבהומכש]/;

/**
 * Endings Hebrew attaches to the BACK, already folded (ם -> מ).
 *
 * Longest first, and only ever one of them: "חטיפים" -> "חטיפ" and not on to
 * "חט". Tried in order, the first that fits wins.
 */
const SUFFIXES = ["יות", "יימ", "ימ", "ות", "י", "ה"];

/**
 * Words that are how a person talks rather than what they want.
 *
 * Every one of these was a REQUIRED word before, which is why a question got
 * fewer results than a keyword did - the exact opposite of what asking should
 * do. "שלי" and "הרבה" are two thirds of why the first chip returned nothing.
 *
 * NOT stop words, deliberately: "בלי" and "ללא" (they carry "ללא דגנים"),
 * "קטן" and "גדול" (they carry a size), "רך" (a texture a shopper chooses by).
 */
const STOP_WORDS = new Set([
  "אני", "אתה", "את", "שלי", "שלו", "שלה", "שלנו", "של", "לי", "לו", "לה",
  "יש", "לכם", "לכן", "לך", "מה", "מי", "איזה", "איזו", "אילו", "איך", "כמה",
  "האם", "צריך", "צריכה", "רוצה", "מחפש", "מחפשת", "ממליץ", "ממליצה", "המלצה",
  "בבקשה", "תודה", "הכי", "מאוד", "קצת", "הרבה", "טוב", "טובה", "יכול",
  "אפשר", "כדאי", "עם", "בשביל", "על", "זה", "זו", "כל", "גם", "או", "אבל",
  "היי", "שלום", "אולי", "בערך", "כמו", "רק", "עוד", "כבר", "משהו", "מישהו",
  // How a person frames a complaint. "בעיות עיכול" is a request for the
  // digestive supplement, and "בעיות" is not a word any product contains.
  "בעיה", "בעיות", "problem", "קורה", "עושה",
  "the", "for", "and", "with", "you", "any", "some", "what", "which", "best",
  // Folded, because toWords() folds the final forms before anything reads a
  // word - so an entry written "לכם" would be compared against "לכמ" and
  // never match. Every stop word ending in ך ם ן ף ץ was dead until this line:
  // "יש לכם משהו לעור ופרווה?" was reporting that it had dropped "לכם".
].map(foldFinals));

/**
 * Where the shopper's word and the catalogue's word are not the same word.
 *
 * Each group is one idea. Any word in a group matches any other, in either
 * direction, on either side - so this fixes the catalogue's own disagreement
 * with itself as well as the shopper's with it.
 *
 * The first group is the one the owner reported: the categories table holds
 * both "מזון" and "אוכל יבש", so the shop cannot answer "אוכל" without it.
 *
 * SYMPTOMS ARE IN HERE TOO, and that is the point of a shop that takes
 * sentences. "משיר" is not a product word - no product is called shedding -
 * but it is what a person says, and it belongs to the same idea as the coat
 * and skin supplement that answers it.
 */
const CONCEPTS = [
  ["מזון", "אוכל", "אכל", "food", "מזונות", "ארוחה"],
  ["יבש", "dry", "גרגרים"],
  ["רטוב", "wet", "שימורים", "פאוץ", "פאוצ", "נזיד"],
  ["חטיף", "חטיפים", "treat", "treats", "נשנוש", "ממתק", "עצם"],
  // "כדור" is NOT in here. It is a toy and it is also a hairball - the cat
  // food says "תמיכה בכדורי שיער" - and putting it in this group made a
  // salmon food an answer to "צעצוע". A ball finds the ball toy by its own
  // name; it does not need to be a synonym for play to do that.
  ["צעצוע", "משחק", "toy", "play", "בובה", "חבל", "נשכן"],
  ["מיטה", "מזרן", "מזרון", "bed", "מחצלת", "כרית"],
  ["קולר", "רצועה", "collar", "leash", "רתמה", "harness", "תג"],
  ["שמפו", "shampoo", "רחצה", "אמבטיה", "סבון"],
  ["טיפוח", "grooming", "מברשת", "מסרק", "brush", "comb", "גזיזה", "ציפורניים"],
  ["חול", "מצע", "litter", "ארגז", "משטח", "פד"],
  // NOT "יבשות" (dry skin), however much it belongs to the idea: it stems to
  // "יבש", which is how every DRY FOOD in the shop became an answer to "my dog
  // is shedding". A word whose stem is another word's whole meaning cannot go
  // in a group.
  ["נשירה", "משיר", "שיער", "פרווה", "coat", "shedding", "skin", "עור", "גרד"],
  ["מפרקים", "מפרק", "joint", "joints", "ניוון", "צליעה", "גלוקוזאמין"],
  ["עיכול", "digestive", "probiotic", "פרוביוטיקה", "קיבה", "שלשול", "בטן", "גזים"],
  ["שתן", "urinary", "כליות", "kidney", "שלפוחית", "אבנים"],
  ["שיניים", "שן", "dental", "אבנית", "נשימה", "ריח"],
  ["פרעושים", "פרעוש", "קרציות", "קרצייה", "flea", "tick", "תולעים", "הדברה", "אמפולה"],
  ["רזה", "דיאטה", "diet", "הרזיה", "משקל", "שומן", "light"],
  ["אלרגיה", "אלרגי", "allergy", "רגיש", "רגישות", "sensitive", "היפואלרגני"],
  ["ללא", "בלי", "free", "נטול"],
  ["דגנים", "דגן", "grain", "גלוטן"],
  ["גור", "גורים", "puppy", "kitten", "כלבלב", "חתלתול", "צעיר"],
  // "בינוני" is a SIZE, not a life stage, and belongs to neither.
  ["בוגר", "adult"],
  ["מבוגר", "סניור", "senior", "קשיש", "מזדקן", "וותיק"],
  ["עוף", "chicken", "הודו", "turkey"],
  ["בקר", "beef", "טלה", "lamb", "כבש"],
  ["סלמון", "salmon", "דגים", "fish", "טונה", "tuna", "סרדינים"],
  ["ויטמין", "vitamin", "תוסף", "supplement", "אומגה", "omega", "שמן", "oil"],
  ["מים", "water", "קערה", "bowl", "שתייה"],
  ["הובלה", "תיק", "crate", "כלוב", "carrier", "טיסה"],
];

/**
 * What a shopper calls the animal, against what the column stores.
 *
 * pet_type is an enum of exactly four values - dog, cat, other, all - which is
 * why the parrot chip returned nothing: there is no parrot in the column, and
 * a parrot toy is stored as 'other'. Only dog and cat can be named from the
 * column at all. Every other animal has to be found in the product's own
 * words, which is why PARROT, RABBIT and the rest are concepts further down
 * rather than entries here.
 */
const SPECIES_WORDS = {
  dog: ["כלב", "כלבה", "כלבים", "dog"],
  cat: ["חתול", "חתולה", "חתולים", "cat"],
  // 'all' is a product FOR EVERY ANIMAL - a collar, a bed, an omega-3. It
  // answers "כלב" and it answers "חתול", and mapping it to nothing is why
  // four of the ten classified products were unfindable by their animal.
  all: ["כלב", "כלבה", "כלבים", "dog", "חתול", "חתולה", "חתולים", "cat"],
  // 'other' is deliberately empty. It is a parrot AND a rabbit AND a hamster,
  // so naming any one of them from the column would be a guess, and naming all
  // of them would make a rabbit hutch answer "תוכי".
  other: [],
};

/** Animals with no column of their own, found in the product's own words. */
const ANIMAL_CONCEPTS = [
  ["תוכי", "תוכים", "ציפור", "ציפורים", "parrot", "bird", "קנרית", "פרפית"],
  ["ארנב", "ארנבת", "ארנבים", "rabbit", "שפן"],
  ["אוגר", "אוגרים", "hamster", "מרמיטה", "שרקן", "גינאה"],
  ["צב", "צבים", "לטאה", "זוחל", "turtle", "reptile"],
];

/**
 * Text to the words in it.
 *
 * Splitting on "not a letter or a digit" rather than on whitespace is what
 * makes "ללא-דגנים", "אומגה 3, טבעי" and "Skin & Coat" come apart into the
 * words a person would type. Splitting on spaces alone leaves "ללא-דגנים" as
 * one token that matches nothing.
 */
const splitWords = (value) => String(value ?? "").toLowerCase()
  // Hebrew abbreviation marks, typed and typographic, inside the word: ק״ג.
  .replace(/[״"'׳`]/g, "")
  .split(/[^\p{L}\p{N}]+/u)
  .filter(Boolean);

const toWords = (value) => splitWords(foldFinals(String(value ?? "")));

/**
 * A word and every shorter form of it that is still the same word.
 *
 * Applied to BOTH the query and the catalogue, which is the whole of fix (2):
 * "חטיפים" and "חטיף" both reduce to "חטיפ" and therefore find each other,
 * whichever one is typed.
 *
 * The length floors are there so stripping never manufactures a fragment. A
 * prefix comes off a word of four letters or more, so "כלב" is never reduced
 * to "לב"; a suffix leaves at least two, so "דגים" still reaches "דג".
 */
const stemsOf = (word) => {
  const forms = new Set([word]);
  const bases = [word];
  if (PREFIX_LETTERS.test(word) && word.length >= 4) bases.push(word.slice(1));

  for (const base of bases) {
    forms.add(base);
    for (const suffix of SUFFIXES) {
      if (base.endsWith(suffix) && base.length - suffix.length >= 2) {
        forms.add(base.slice(0, -suffix.length));
        break;
      }
    }
  }
  return forms;
};

/**
 * Every word in the vocabulary, indexed by stem, to the ideas it belongs to.
 *
 * Built from the stems so that a group listing "חטיף" also answers "חטיפים",
 * and so the table above can be written the way a person would say each word
 * rather than in every form of it.
 */
const CONCEPT_INDEX = new Map();
[...CONCEPTS, ...ANIMAL_CONCEPTS].forEach((group, index) => {
  for (const word of group) {
    for (const stem of stemsOf(foldFinals(word))) {
      if (!CONCEPT_INDEX.has(stem)) CONCEPT_INDEX.set(stem, new Set());
      CONCEPT_INDEX.get(stem).add(index);
    }
  }
});

const conceptsOf = (stems) => {
  const ideas = new Set();
  for (const stem of stems) {
    const found = CONCEPT_INDEX.get(stem);
    if (found) for (const idea of found) ideas.add(idea);
  }
  return ideas;
};

const intersects = (left, right) => {
  for (const value of left) if (right.has(value)) return true;
  return false;
};

// ─── the product, as words ──────────────────────────────────────────────────

/**
 * The fields worth matching, and what a match in each one is worth.
 *
 * A name is what a product IS; a description is what it mentions. Ranking by
 * that difference is what stops eleven products that mention a word from
 * burying the one product called it - which matters here because the shop
 * shows twelve cards and then stops.
 *
 * sku and source_url are absent on purpose: a warehouse code and a supplier's
 * address are not things a shopper names a product by, and matching them
 * produces results for reasons they cannot see on the card in front of them.
 */
const FIELD_WEIGHTS = { name: 100, brand: 60, category: 45, tags: 30, description: 12 };

/**
 * Both spellings of every field, and this is not defensive tidiness.
 *
 * Shop.tsx does not search the API's rows: it transforms them first, renaming
 * pet_type to petType and life_stage to lifeStage. A reader that knew only the
 * snake_case names found the species on NOTHING the shop actually searches,
 * while every test passed, because the tests used the API's shape. A test that
 * exercises a shape the caller never produces is the failure these lines exist
 * to have fixed - and catalogSearch.test.js now derives the field list from
 * Shop.tsx so the next rename is caught on its own commit.
 */
const productFields = (product) => ({
  name: [product?.name],
  brand: [product?.brand],
  category: [product?.category_name || product?.category],
  description: [product?.description],
  tags: [
    product?.life_stage ?? product?.lifeStage,
    product?.dog_size ?? product?.dogSize,
    product?.benefits,
    product?.ingredients,
    ...(Array.isArray(product?.flavors) ? product.flavors : []),
    ...(Array.isArray(product?.special_diet) ? product.special_diet : []),
    ...(Array.isArray(product?.medical_tags) ? product.medical_tags : []),
    ...(Array.isArray(product?.breed_tags) ? product.breed_tags : []),
    ...(SPECIES_WORDS[String(product?.pet_type ?? product?.petType ?? "").toLowerCase()] || []),
  ],
});

/**
 * A product reduced to the words it can be found by, per field.
 *
 * Memoised on the product object: a keystroke re-runs the search over the
 * whole catalogue, and stemming every word of every product on every letter
 * typed is the difference between a search that feels instant and one that
 * does not.
 */
const wordCache = new WeakMap();

const productWords = (product) => {
  if (product && typeof product === "object") {
    const cached = wordCache.get(product);
    if (cached) return cached;
  }

  const fields = productFields(product);
  const built = Object.entries(fields).map(([field, values]) => ({
    field,
    weight: FIELD_WEIGHTS[field],
    words: toWords(values.filter(Boolean).join(" ")).map((word) => {
      const stems = stemsOf(word);
      return { word, stems, concepts: conceptsOf(stems) };
    }),
  }));

  if (product && typeof product === "object") wordCache.set(product, built);
  return built;
};

/** Every word of a product, flattened - what the old haystack was for. */
const haystackOf = (product) => productWords(product)
  .flatMap((field) => field.words.map((entry) => entry.word))
  .join(" ");

// ─── the query, as intent ───────────────────────────────────────────────────

/**
 * How far two words may differ and still be the same word.
 *
 * Only ever consulted for a token that matches NOTHING, so a spelling that is
 * right is never second-guessed. The floors are what keep "חול" from becoming
 * "כול": three letters and under, a single edit is a different word.
 */
const editDistanceWithin = (left, right, limit) => {
  if (Math.abs(left.length - right.length) > limit) return false;
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    const current = [i];
    let best = i;
    for (let j = 1; j <= right.length; j += 1) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost);
      best = Math.min(best, current[j]);
    }
    if (best > limit) return false;
    previous = current;
  }
  return previous[right.length] <= limit;
};

const fuzzyLimit = (word) => (word.length >= 8 ? 2 : word.length >= 5 ? 1 : 0);

/**
 * Whether two words are close enough to be worth calling the same word.
 *
 * The length floor and the shared opening are both there because of "אוכף":
 * four letters, one edit away from "אוכל", and a saddle was answering with dog
 * food. A typo lands in the middle or the end of a word far more often than in
 * its first two letters, and a word short enough for one edit to reach another
 * word is short enough that the other word is simply a different word.
 */
const couldBeTheSameWord = (typed, found) => {
  const limit = fuzzyLimit(typed);
  if (limit === 0) return false;
  if (typed.slice(0, 2) !== found.slice(0, 2)) return false;
  return editDistanceWithin(typed, found, limit);
};

/**
 * The words of a query, each carrying what it could mean.
 *
 * Stop words come out here. If a query is NOTHING BUT stop words - "מה יש
 * לכם" - they go back in rather than leaving nothing to search, because an
 * empty token list would silently answer a real question with a blank screen.
 */
const tokensOf = (query) => {
  // Folding is a letter-for-letter map, so it never moves a word boundary and
  // the two splits line up exactly. Both are kept because they answer two
  // different questions: the folded word is what MATCHES, and the word as
  // typed is what the screen may have to SAY.
  //
  // Reporting the folded one is a visible bug - a shopper who typed "אוכף" was
  // told "אין לנו אוכפ", a word that is not Hebrew and that they did not type.
  const folded = toWords(query);
  const typed = splitWords(query);

  const all = folded
    .map((word, index) => ({ word, raw: typed[index] ?? word }))
    .filter((entry) => entry.word.length > 1 || /\p{N}/u.test(entry.word));
  const meaningful = all.filter((entry) => !STOP_WORDS.has(entry.word));
  const words = meaningful.length > 0 ? meaningful : all;

  return words.map(({ word, raw }) => {
    const stems = stemsOf(word);
    return { word, raw, stems, concepts: conceptsOf(stems) };
  });
};

/**
 * What one query word is worth against one product: the best field it hits.
 *
 * Best rather than sum, so a word repeated through a long description cannot
 * outscore a word in the name.
 */
const scoreToken = (token, fields, { fuzzy = false } = {}) => {
  let best = 0;
  for (const field of fields) {
    for (const entry of field.words) {
      let hit = 0;
      if (intersects(token.stems, entry.stems)) hit = field.weight;
      else if (token.concepts.size > 0 && intersects(token.concepts, entry.concepts)) hit = field.weight * 0.8;
      // Typing the start of a word is how a search box is used. Anchored to
      // the front of a WHOLE word - never the middle, which is how "דור"
      // matched "בכדורי שיער" and returned a cat food for "כדור".
      else if (token.word.length >= 3 && entry.word.startsWith(token.word)) hit = field.weight * 0.6;
      else if (fuzzy && couldBeTheSameWord(token.word, entry.word)) hit = field.weight * 0.5;

      if (hit > best) best = hit;
    }
  }
  return best;
};

// ─── the search ─────────────────────────────────────────────────────────────

/**
 * The catalogue, answered.
 *
 * Returns what was matched AND what was not, because the screen has to be able
 * to say so. A search that quietly ignores a word the person typed is telling
 * them their word was understood.
 *
 * The order of the attempts is the whole design:
 *
 *   1. EVERY token must match. The precise answer, when there is one.
 *   2. Tokens that match NOTHING IN THE CATALOGUE are dropped and reported.
 *      This is what makes a sentence work: in "הכלב שלי משיר הרבה", the stop
 *      words are already gone and "משיר" either finds the coat supplement
 *      through its concept group or is dropped as a word this shop has no
 *      product for - and either way "כלב" still answers.
 *   3. Anything still unmatched is retried allowing one typo.
 *
 * Note what is NOT here: falling back to OR. Relaxing to "any word matches"
 * turns an unanswerable question into a page of unrelated products, which
 * reads as a broken search rather than an honest one.
 */
const searchDetailed = (products = [], query) => {
  const tokens = queryTokens(query);
  const list = Array.isArray(products) ? products : [];
  const empty = { results: [], used: [], dropped: [], corrected: [], relaxed: false };
  if (tokens.length === 0 || list.length === 0) return { ...empty, results: [] };

  const prepared = list.map((product) => ({ product, fields: productWords(product) }));

  const scoreAll = (token, options = {}) => prepared.map((entry) => scoreToken(token, entry.fields, options));

  /**
   * A word that describes half the shop describes nothing.
   *
   * In a pet shop "מזון" and "כלב" are in a large share of the catalogue, so a
   * product with either in its NAME would otherwise outrank a product that
   * actually answers the rest of the sentence. Scaling each word by how rare
   * it is in this catalogue is what makes "הכלב שלי משיר" a question about
   * shedding that happens to be filtered to dogs, rather than a question about
   * dogs that happens to mention shedding.
   *
   * Measured against the catalogue in hand rather than fixed in a table, so it
   * stays true as the shop's stock changes.
   */
  const rarity = (matches) => Math.log(1 + list.length / Math.max(matches, 1));

  let used = [];
  const dropped = [];
  const corrected = [];
  const scores = new Map();

  const keep = (token, row) => {
    const weight = rarity(row.filter((value) => value > 0).length);
    used.push(token);
    scores.set(token, row.map((value) => value * weight));
  };

  for (const token of tokens) {
    let row = scoreAll(token);
    if (row.some((value) => value > 0)) {
      keep(token, row);
      continue;
    }

    // Nothing at all matched this word. Before giving up on it, allow a typo -
    // one wrong letter is the most common reason a real query finds nothing.
    row = scoreAll(token, { fuzzy: true });
    if (row.some((value) => value > 0)) {
      keep(token, row);
      corrected.push(token.raw);
      continue;
    }

    dropped.push(token.raw);
  }

  // Every word was a word this catalogue has no product for. Answering with
  // the whole catalogue would be worse than answering with nothing.
  if (used.length === 0) return { ...empty, dropped };

  const answer = (chosen) => prepared
    .map((entry, index) => {
      let total = 0;
      for (const token of chosen) {
        const value = scores.get(token)[index];
        // AND, still: one missing word and the product is not an answer.
        if (value === 0) return null;
        total += value;
      }
      return { product: entry.product, score: total, index };
    })
    .filter(Boolean)
    // Score first, catalogue order second, so the list is stable between
    // keystrokes instead of reshuffling equal matches.
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((entry) => entry.product);

  // THE RUNG THAT WAS MISSING, and "אוכל יבש לגור" - the shop's own second
  // suggestion chip - is what it was missing for.
  //
  // Every word there matches SOMETHING, so nothing is dropped above, and yet
  // no single product matches all of them: the catalogue has dry food and has
  // nothing for a puppy. The honest answer is dry food, said out loud. The
  // broken one is a blank screen.
  //
  // WHICH WORD TO GIVE UP is the whole question, and the two obvious answers
  // are each wrong half the time. Give up the rarest word and "מברשת לחתול"
  // answers a brush query with cat food. Give up the commonest and "אוכל יבש
  // לגור" throws away the words it can actually serve.
  //
  // So neither is guessed at: every single-word removal is TRIED, only the
  // ones that actually produce an answer are considered, and among those the
  // word given up is the one that describes the most of the shop - the least
  // informative thing the person typed. "מברשת לחתול" gives up the animal and
  // keeps the brush; "אוכל יבש לגור" gives up the puppy because giving up
  // anything else answers nothing.
  let results = answer(used);
  while (results.length === 0 && used.length > 1) {
    const options = used
      .map((token, index) => ({ token, index, found: answer(used.filter((_, at) => at !== index)) }))
      .filter((option) => option.found.length > 0);

    if (options.length === 0) {
      // No single removal helps. Give up the commonest word and try again -
      // two words may have to go before anything is left that the shop has.
      const counts = used.map((token) => scores.get(token).filter((value) => value > 0).length);
      const commonest = counts.indexOf(Math.max(...counts));
      dropped.push(used[commonest].raw);
      used = used.filter((_, index) => index !== commonest);
      results = answer(used);
      continue;
    }

    const give = options.reduce((worst, option) => {
      const count = (entry) => scores.get(entry.token).filter((value) => value > 0).length;
      return count(option) > count(worst) ? option : worst;
    });

    dropped.push(give.token.raw);
    used = used.filter((_, index) => index !== give.index);
    results = give.found;
  }

  return {
    results,
    used: used.map((token) => token.raw),
    dropped,
    corrected,
    relaxed: dropped.length > 0 || corrected.length > 0,
  };
};

// ─── exported surface ───────────────────────────────────────────────────────
//
// EVERYTHING ABOVE THIS LINE IS SHARED VERBATIM with the server module. Only
// this tail differs, and only to carry the types. Nothing that decides a
// result belongs below here.

/** Every word of a product, flattened. */
export const productHaystack = (product: SearchableProduct): string => haystackOf(product);

/** The words of a query, each carrying what it could mean. */
export const queryTokens = (query?: string | null) => tokensOf(query);

/** The catalogue, answered - with what was matched and what was not. */
export const searchCatalogDetailed = <T extends SearchableProduct>(
  products: T[] = [],
  query?: string | null,
): SearchOutcome<T> => searchDetailed(products, query) as SearchOutcome<T>;

/** Does this product answer that query. */
export const productMatchesQuery = (product: SearchableProduct, query?: string | null): boolean =>
  searchDetailed([product], query).results.length > 0;

/** The catalogue, filtered and ranked. */
export const searchCatalog = <T extends SearchableProduct>(products: T[] = [], query?: string | null): T[] =>
  searchDetailed(products, query).results as T[];
