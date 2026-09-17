// A maintenance script must connect the way the API connects.
//
// Every script in server/scripts built its pool with
//
//     ssl: process.env.DB_SSL === "false" ? false : undefined
//
// and `undefined` is not "use the default" - node-postgres reads it as NO TLS.
// The API does the opposite: an object with rejectUnauthorized. Production is
// RDS and RDS refuses an unencrypted connection, so all EIGHT scripts died at
// their first query with
//
//     no pg_hba.conf entry for host "...", user "mipo_app", database "mipo",
//     no encryption
//
// That is why no maintenance script had ever run against production. Not the
// workflow guards, not the Dockerfile, not permissions - they could not open a
// connection. And the error names pg_hba first, so it reads like a security
// group problem; the operative words are the last two.
//
// Unit tests never caught it because they run against a local postgres where
// DB_SSL=false, which is the one branch that was correct.

import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const scriptsDir = path.join(repoRoot, "server/scripts");
const helper = "scriptPoolSsl.mjs";

const codeOf = (file) =>
  readFileSync(file, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((line) => !/^\s*(\/\/|\*)/.test(line))
    .join("\n");

const scripts = () =>
  readdirSync(scriptsDir)
    .filter((name) => name.endsWith(".mjs") && name !== helper)
    .map((name) => ({ name, code: codeOf(path.join(scriptsDir, name)) }));

test("no script disables TLS by leaving ssl undefined", () => {
  const offenders = [];
  for (const { name, code } of scripts()) {
    // `ssl:` set to undefined, however it is spelled.
    if (/\bssl\s*:\s*[^,\n]*\bundefined\b/.test(code)) {
      offenders.push(name);
    }
  }
  assert.deepEqual(
    offenders,
    [],
    "a script sets ssl to undefined, which node-postgres treats as no TLS.\n" +
      "RDS refuses that connection. Use scriptPoolOptions() from\n" +
      "server/scripts/scriptPoolSsl.mjs, which mirrors the API:\n" +
      offenders.join("\n"),
  );
});

test("every script that opens a pool uses the shared options", () => {
  // Or says `ssl: false` in so many words.
  //
  // seed-workbench.mjs does, and it is right to: it seeds the local work
  // environment, a postgres that does not speak TLS. A first version of this
  // test flagged it, which would have been answered by making a local-only
  // script pretend it might run against RDS.
  //
  // The line is between an EXPLICIT opt-out and a silent default. `ssl: false`
  // is a decision someone made and can be read back; an omitted or undefined
  // ssl is the accident that took eight scripts down.
  const offenders = [];
  for (const { name, code } of scripts()) {
    if (!/new\s+(?:pg\.)?Pool\s*\(/.test(code)) continue;
    if (/\bscriptPoolOptions\s*\(/.test(code)) continue;
    if (/\bssl\s*:\s*false\b/.test(code)) continue;
    offenders.push(name);
  }
  assert.deepEqual(
    offenders,
    [],
    "a script builds a pool without scriptPoolOptions(). Spelling the\n" +
      "connection out again is how the eight of them drifted from the API in\n" +
      "the first place:\n" +
      offenders.join("\n"),
  );
});

test("the shared options match the API's own SSL decision", () => {
  // Both sides read the same two variables in the same direction. If the API's
  // rule changes, this fails rather than letting the scripts keep the old one.
  const api = codeOf(path.join(repoRoot, "server/src/index.js"));
  const shared = codeOf(path.join(scriptsDir, helper));

  for (const [label, pattern] of [
    ["DB_SSL=false disables TLS", /DB_SSL\s*===\s*["']false["']/],
    ["otherwise an object with rejectUnauthorized", /rejectUnauthorized/],
    ["DB_SSL_REJECT_UNAUTHORIZED is the escape hatch", /DB_SSL_REJECT_UNAUTHORIZED\s*!==\s*["']false["']/],
  ]) {
    assert.match(api, pattern, `the API no longer says: ${label}`);
    assert.match(shared, pattern, `scriptPoolSsl.mjs no longer says: ${label}`);
  }
});
