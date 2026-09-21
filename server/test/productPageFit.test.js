// The product page opens with "מתאים ל[החיה]", and the rows that used to be
// above it are gone.
//
// The design canvas calls the fit card "הדבר היחיד שאף חנות אחרת לא יכולה
// לומר", and it is the reason the safety score stayed on the page at all. Its
// note on the old treatment is blunt: "ציון בטיחות חשוף — מספר בלי הקשר
// מפחיד. נשאר — אבל בתוך ״מתאים לרקסי״, שם הוא אומר משהו."
//
// The rules below are about what the page may claim and where it may send
// someone, which are the two things a screenshot does not check.

import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (relative) => readFileSync(path.join(repoRoot, relative), "utf8");

const FIT_CARD = "src/components/shop/PetFitCard.tsx";
const PRODUCT_PAGE = "src/pages/ProductDetailAws.tsx";

test("every link out of the fit card is a route the router defines", () => {
  // THE ONE A SCREENSHOT CANNOT CATCH, and it had already happened: the
  // invitation pointed at `/pet/${id}/edit`, and the router matches that with
  //   { path: "/pet/:petId/*", element: <Navigate to="/" replace /> }
  // so a shopper who tapped "הוסיפו את המשקל" mid-purchase landed on the home
  // page with their basket abandoned and no error anywhere.
  //
  // MATCHED SEGMENT BY SEGMENT, and the first version of this was not: it took
  // the literal prefix before the first `${` - "/pet" for that broken link -
  // found `path: "/pet/:petId"` in the router and passed. A guard that checks
  // the first segment of a path is checking that the app has a /pet route,
  // which was never in doubt.
  const card = read(FIT_CARD);
  const routes = read("src/routes/index.tsx");

  const links = [...card.matchAll(/<Link\s+to=\{`([^`]+)`\}/g)].map((match) => match[1]);
  assert.ok(links.length > 0, "the fit card no longer links anywhere; this test is asserting nothing");

  // { path: "...", element: <Something ... } — the element matters, because a
  // route whose element is a <Navigate> is a redirect, and a redirect is how
  // the broken link failed silently in the first place.
  const declared = [...routes.matchAll(/\{\s*path:\s*"([^"]+)"\s*,\s*element:\s*<(\w+)/g)]
    .map(([, routePath, element]) => ({ routePath, element }));
  assert.ok(declared.length > 10, `only ${declared.length} routes parsed out of src/routes/index.tsx`);

  const segmentsOf = (value) => value.split("/").filter(Boolean);

  for (const link of links) {
    // `/edit-pet/${pet.id}` -> ["edit-pet", ":param"]
    const wanted = segmentsOf(link.replace(/\$\{[^}]*\}/g, ":param"));

    const hit = declared.find(({ routePath }) => {
      const route = segmentsOf(routePath);
      if (route.length !== wanted.length) return false;
      return route.every((segment, index) => (
        segment.startsWith(":") ? wanted[index] === ":param" : segment === wanted[index]
      ));
    });

    assert.ok(
      hit,
      `The fit card links to ${link}, and src/routes/index.tsx declares no route of that\n` +
        "shape. /edit-pet/:petId is not /pet/:id/edit, and a link the router does not\n" +
        "match redirects instead of failing, so nothing says so.",
    );
    assert.notEqual(
      hit.element,
      "Navigate",
      `The fit card links to ${link}, which the router answers with a <Navigate>. The\n` +
        "shopper is redirected away mid-purchase and no error is raised anywhere.",
    );
  }
});

test("the estimated bag duration never claims to be the manufacturer's", () => {
  // feedingGuidance.ts already holds this line for the catalogue's own guide:
  // only `manufacturer_confirmed` may claim a manufacturer. A figure derived
  // from the animal's body weight has less right to it, not more, and this is
  // the sentence an owner will act on when deciding how much to buy.
  const card = read(FIT_CARD);
  assert.match(
    card,
    /הערכה לפי משקל, לא הנחיית יצרן/,
    "The bag-duration sentence no longer says it is an estimate. It is arithmetic on\n" +
      "body weight, and an owner reading it beside a product's own feeding guide has\n" +
      "no way to tell them apart unless the page does it.",
  );
});

test("a score never appears on the product page outside the fit card", () => {
  // A bare "8.2/10" is the treatment the canvas rejected. The rule is about
  // WHERE the number may be, not whether it exists.
  const page = read(PRODUCT_PAGE);
  assert.doesNotMatch(
    page,
    /safetyScore\.toFixed/,
    "The product page is printing the safety score itself again. It belongs inside\n" +
      "PetFitCard, under the animal's name and above the facts it was computed from -\n" +
      "\"מספר בלי הקשר מפחיד\".",
  );
});

test("the warehouse code is off the page a shopper reads", () => {
  // "קוד מחסן. היום הוא השורה הראשונה בטבלה. לקוח מעולם לא הכריע בזכותו."
  // Still on the product and still in the admin; not a fact about whether to
  // buy, and certainly not the first one.
  const page = read(PRODUCT_PAGE);
  const specBlock = page.slice(page.indexOf("ALWAYS_SPEC_LABELS"), page.indexOf("NOT_SPECIFIED"));
  assert.doesNotMatch(specBlock, /key:\s*"sku"/, "מק״ט is back in the product page's spec table.");
  assert.doesNotMatch(specBlock, /key:\s*"kcal_per_kg"/, "קלוריות לק״ג is back; it exists on 3 products out of 375.");
});

test("the fit card says what the verdict was computed from", () => {
  // A score a shopper cannot audit is a claim. A score with its inputs printed
  // under it is an argument they can disagree with, which is the whole reason
  // the number was allowed to stay.
  // Comments stripped first. The file's own doc comment quotes the example
  // line - "כלב בוגר · 18 ק״ג · ללא רגישויות ידועות" - so a version of this
  // that read the raw file passed with the string deleted from the code and
  // left only in the prose above it.
  const card = read(FIT_CARD)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((line) => !/^\s*(\/\/|\*)/.test(line))
    .join("\n");
  assert.match(card, /basisOf/, "the basis line is gone from the fit card");
  assert.match(
    card,
    /ללא רגישויות ידועות/,
    "An empty conditions list must read as a STATEMENT - the profile says there are\n" +
      "none - rather than as a missing row. Dropping it makes a known-clean profile\n" +
      "indistinguishable from an unfilled one.",
  );
});
