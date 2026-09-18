// The generated character is not cropped. The photograph still is.
//
// server/src/petCharacter.js asks the generator for "one full-body character"
// on "a PNG with a real alpha channel ... no backdrop, no ground plane and no
// cast shadow", and refuses JPEG in its MIME allowlist precisely so that alpha
// is guaranteed. The home screen then wrapped that art in
// `overflow-hidden rounded-full` with a 5px white ring and drew it with
// `object-cover`.
//
// So the pipeline produced a standing, full-body, transparent character and
// the one screen that shows it cut the legs off and filled the background back
// in. Nothing failed: the image loaded, the circle rendered, every class was
// valid. The only symptom was that the pet looked like a cropped photo.
//
// Two rules, and they pull in opposite directions on purpose:
//
//   1. A CHARACTER is never clipped, never covered, and casts a shadow.
//   2. A PHOTOGRAPH is still clipped, because a real photo has a real
//      background and un-cropping it leaves a rectangle over the glow.
//
// Asserting only the first would be satisfied by deleting the circle entirely,
// which breaks every pet that has no character pack yet.

import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (relative) => readFileSync(path.join(repoRoot, relative), "utf8");

const orbit = () =>
  read("src/components/home/PetOrbit.tsx")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((line) => !/^\s*(\/\/|\*)/.test(line))
    .join("\n");

// ─── the generator's promise ─────────────────────────────────────────────────

test("the generator still produces a full-body cut-out character", () => {
  // If the pipeline ever stops producing a cut-out, the treatment below is
  // wrong and the circle should come back. The rule and its premise are pinned
  // together so they cannot drift apart silently.
  //
  // The premise changed shape once already: the prompt used to ask for a
  // transparent background and the model painted one. It now asks for flat
  // magenta and chromaKey.js makes the alpha. What must remain true is the
  // OUTCOME - a full-body animal on real transparency - not the wording.
  const generator = read("server/src/petCharacter.js");
  assert.match(generator, /chromaKeyToAlpha/, "the background is no longer cut out");
  assert.match(generator, /full-body character/);
  assert.doesNotMatch(
    generator,
    /allowedGeneratedMimeTypes = new Set\(\[[^\]]*jpeg/i,
    "JPEG has no alpha channel. Accepting one stores a background baked in.",
  );
});

// ─── the character is free ───────────────────────────────────────────────────

test("the character is not clipped to a circle", () => {
  const code = orbit();
  // The clip must be conditional on NOT being a character. An unconditional
  // `overflow-hidden rounded-full` on the avatar element is the bug.
  assert.match(
    code,
    /!standsFree\s*\n?\s*&&\s*"overflow-hidden rounded-full/,
    "the avatar wrapper clips unconditionally. A full-body character in a\n" +
      "circle loses its legs, and the alpha channel the whole pipeline\n" +
      "guarantees is discarded by one `overflow-hidden`.",
  );
});

test("the character is drawn with object-contain, not object-cover", () => {
  const code = orbit();
  assert.match(
    code,
    /standsFree\s*\n?\s*\?\s*"object-contain/,
    "object-cover crops the animal inside its own square - a second crop on\n" +
      "top of the circle, and the one that survives removing the circle.",
  );
  assert.match(code, /:\s*"object-cover"/, "the photograph path lost object-cover");
});

test("the un-cropped treatment is granted on evidence, not on the flag", () => {
  const code = orbit();
  // isCharacter says the PACK is ready. It says nothing about whether the
  // picture in it is actually cut out, and the generator returned one where
  // the transparency was DRAWN - a chequerboard, as opaque pixels. That
  // shipped, because petCharacter.js checks the MIME type and a PNG can be
  // entirely opaque.
  //
  // So the decision must depend on an inspection of the image. Every branch
  // that removes the circle has to read standsFree; a single one left on
  // isCharacter puts the chequerboard back on that path only.
  assert.match(code, /useImageHasAlpha/, "the image is no longer inspected at all");
  assert.match(
    code,
    /const standsFree = isCharacter && alpha === "alpha"/,
    "standsFree is not derived from the inspection",
  );

  for (const branch of [
    /!standsFree\s*\n?\s*&& "overflow-hidden rounded-full/,
    /standsFree \? "pointer-events-none absolute -inset-\[12px\]"/,
    /standsFree\s*\n?\s*\? "object-contain/,
  ]) {
    assert.match(
      code,
      branch,
      "a branch that removes the circle still reads isCharacter rather than\n" +
        "standsFree. That path will render an opaque square again.",
    );
  }
});

test("the safe treatment is what renders before the answer arrives", () => {
  // The verdict starts at "unknown", and standsFree is only true for "alpha".
  // If it were written as `alpha !== "opaque"` the chequerboard would flash on
  // screen for as long as the decode takes, which on a cold cache is visible.
  const hook = read("src/hooks/useImageHasAlpha.ts");
  assert.match(hook, /"unknown" \| "alpha" \| "opaque"/);
  assert.match(
    hook,
    /return "opaque";[\s\S]{0,400}getImageData/,
    "a canvas that cannot be read must answer opaque, not alpha",
  );
  assert.doesNotMatch(
    orbit(),
    /standsFree = isCharacter && alpha !== "opaque"/,
    "unknown is being treated as transparent, so the square shows while the\n" +
      "image is still being inspected",
  );
});

test("the character casts a shadow and stands on something", () => {
  const code = orbit();
  assert.match(code, /drop-shadow-\[/, "a cut-out with no shadow reads as a sticker");
  assert.match(
    code,
    /standsFree && !loading && \(/,
    "the pedestal is gone, or is no longer conditional on there being a character",
  );
  assert.match(code, /mipo-pet-pedestal"/, "the lit disc is gone");
  assert.match(code, /mipo-pet-pedestal-contact"/, "the contact shadow is gone");
});

test("the pedestal cannot grow into the orbit buttons", () => {
  // The reference the owner sent has the avatar owning the whole area. Our
  // home screen has four navigation targets circling it, and the two bottom
  // ones start 19px below the 166px avatar box. The disc's geometry is fixed
  // in index.css for that reason, and these are the numbers that keep it
  // clear of them.
  const css = read("src/index.css");
  const disc = css.slice(css.indexOf(".mipo-pet-pedestal {"), css.indexOf(".mipo-pet-pedestal-contact"));

  assert.ok(disc.length > 0, "the pedestal rule is gone from index.css");

  const height = Number(/height:\s*(\d+)px/.exec(disc)?.[1]);
  const bottom = Number(/bottom:\s*-(\d+)px/.exec(disc)?.[1]);
  const width = Number(/width:\s*(\d+)px/.exec(disc)?.[1]);

  // How far below the avatar box the disc reaches.
  //
  // `bottom: -Npx` puts the element's BOTTOM edge N px below the container;
  // its height then extends UPWARD from there, back inside the box. So the
  // downward reach is `bottom` alone. The first version of this test added the
  // height and reported 32px for a disc that reaches 10px, which is the kind
  // of arithmetic that gets a correct change reverted.
  const reach = bottom;
  assert.ok(
    reach < 19,
    `the disc reaches ${reach}px below the avatar box and the bottom orbit\n` +
      "buttons begin at 19px. Making it reach further means moving navigation.",
  );
  assert.ok(height > 12, "the disc is a smudge again rather than a lit platform");

  // Horizontally the buttons sit at x 34-90 and 250-306 inside a 340px box,
  // and the disc is centred at 170.
  assert.ok(
    170 - width / 2 > 90 && 170 + width / 2 < 250,
    `a ${width}px disc centred at 170 overlaps an orbit button`,
  );
});

test("the character art cannot swallow a tap meant for an orbit button", () => {
  const code = orbit();
  // It now extends past the circle it used to be confined to, over the
  // bounding boxes of the corner buttons - with transparent pixels, which are
  // still hit targets.
  assert.match(
    code,
    /standsFree \? "pointer-events-none absolute/,
    "the enlarged character layer is not pointer-events-none",
  );
});

// ─── the photograph keeps its circle ─────────────────────────────────────────

test("a pet with no character pack still gets the circle and the ring", () => {
  const code = orbit();
  assert.match(
    code,
    /overflow-hidden rounded-full border-\[5px\] border-white/,
    "the circle treatment was deleted rather than made conditional. Every pet\n" +
      "whose character pack is not ready falls back to avatar_url - a real\n" +
      "photograph with a real background - and without the circle that is a\n" +
      "rectangle floating over the aurora.",
  );
});

// ─── the scope lock ──────────────────────────────────────────────────────────

test("the orbit's geometry and its four destinations are untouched", () => {
  const code = orbit();
  // The brief for this change was explicit: the avatar's presentation only.
  // The orbit box, the button size and the four fixed corner positions are
  // navigation, and the pet grew into the space between them rather than by
  // moving them.
  assert.match(code, /h-\[340px\] w-\[340px\]/, "the orbit box was resized");
  assert.match(code, /"top-\[26px\] right-\[34px\]"/, "an orbit position moved");
  assert.match(code, /"bottom-\[12px\] left-\[34px\]"/, "an orbit position moved");
  assert.match(code, /h-14 w-14 items-center justify-center rounded-full/, "the orbit buttons changed size");
  assert.match(code, /slots\.slice\(0, 4\)/, "the orbit no longer renders exactly four destinations");
});

test("navigation paints above the art, whatever the art turns out to be", () => {
  const code = orbit();

  // The art layer is z-[1]. The four destinations had no z-index, so the
  // character was painted OVER them - invisible while the art was a circle
  // inside the ring, and plain the moment an opaque square arrived: two
  // labels lost a character each.
  //
  // The overlap is real geometry, not a rendering accident: the 190px art
  // frame centred at 170 spans x 75-265 and the top-end label sits at
  // 255-300. With a transparent character nothing is hidden - which is the
  // problem, because that is a dependency on what the picture contains.
  assert.match(
    code,
    /"absolute z-\[2\] flex flex-col items-center gap-1\.5"/,
    "the orbit destinations lost their z-index. They sit under the art layer\n" +
      "again, and whether that shows depends on the image rather than on the\n" +
      "stacking order.",
  );

  // Stated as a relationship, so raising the art layer is caught too.
  const artLayer = Number(/relative z-\[(\d+)\] h-full w-full/.exec(code)?.[1]);
  const navLayer = Number(/absolute z-\[(\d+)\] flex flex-col/.exec(code)?.[1]);
  assert.ok(Number.isFinite(artLayer) && Number.isFinite(navLayer), "could not read the layers");
  assert.ok(navLayer > artLayer, `navigation is at z-${navLayer} and the art at z-${artLayer}`);
});

test("the idle breathes but does not tilt", () => {
  // The sway was invisible while the avatar was a circle - a rotated circle is
  // the same circle - and became a picture leaning over the moment the
  // character was freed from that crop.
  //
  // It is gone rather than reduced because the character will carry its own
  // animation. A CSS sway underneath a generated animation is two motions
  // arguing, and the cheap one wins.
  const css = read("src/index.css");
  const start = css.indexOf("@keyframes presence-idle-neutral {");
  const end = css.indexOf("@media (prefers-reduced-motion: reduce) {", start);
  assert.ok(start > 0 && end > start, "the idle keyframes are gone from index.css");

  const keyframes = css.slice(start, end);
  assert.doesNotMatch(
    keyframes,
    /rotate\(/,
    "the idle rotates again. On a cut-out character that is a tilt, not a sway.",
  );

  // Breath must survive the removal. Deleting the whole animation would also
  // satisfy the rule above, and presence-visual.aws.spec.ts asserts the
  // transform keeps changing while live - so this states the intent here too,
  // where the reason is written down.
  assert.match(keyframes, /scale\(/, "the breath went with the tilt");
  assert.match(keyframes, /translateY\(/, "the rise went with the tilt");
});

test("the idle tokens and the stylesheet describe the same motion", () => {
  // presenceIdle.ts is the documented source for these curves. A token file
  // that still lists a rotation the stylesheet no longer runs is a lie that
  // reads like documentation, and the next person implements the lie.
  const tokens = read("src/components/home/presenceIdle.ts");
  assert.doesNotMatch(tokens, /rotate/, "the tokens still describe a rotation");
  assert.match(tokens, /scale: \[/);
  assert.match(tokens, /y: \[/);
});

test("the aurora is unchanged and still the only place the brand glow lives", () => {
  const code = orbit();
  assert.match(code, /<PresenceAurora still=\{still\} isCharacter=\{isCharacter\}/);
  // No second glow was added next to it. The owner asked for the soft aurora
  // alone, with no coloured line, and that was settled.
  const aurora = read("src/components/home/PresenceAurora.tsx");
  assert.doesNotMatch(aurora, /presence-aurora__rim/, "the rim came back");
});

test("MipoHome still renders everything it rendered before", () => {
  // The change is inside PetOrbit. If it leaked upward into the home screen,
  // one of these is the first thing to disappear.
  const home = read("src/pages/MipoHome.tsx");
  for (const required of ["<PetOrbit", "<PetMoodRow", "avatarUrl={characterImage}", "isCharacter={characterReady}"]) {
    assert.ok(home.includes(required), `MipoHome no longer contains ${required}`);
  }
});
