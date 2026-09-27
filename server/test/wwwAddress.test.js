// MIPO_WWW_ADDRESS is classified, never echoed, and an unexpected value
// cannot take Caddy or the deploy down.

import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const script = path.join(repoRoot, "deploy/aws/www-address.sh");
const entry = path.join(repoRoot, "deploy/aws/caddy-entrypoint.sh");
const read = (relative) => readFileSync(path.join(repoRoot, relative), "utf8");

const classify = (args, env = {}) => spawnSync("sh", [script, ...args], {
  encoding: "utf8",
  env: { ...process.env, ...env },
});

test("accepted www addresses print only their classification", () => {
  const unset = classify(["classify"]);
  assert.equal(unset.status, 0);
  assert.equal(unset.stdout, "unset\n");

  const empty = classify(["classify", ""]);
  assert.equal(empty.status, 0);
  assert.equal(empty.stdout, "unset\n");

  const quoted = classify(["classify", "'www.mipo.pet'"]);
  assert.equal(quoted.status, 0);
  assert.equal(quoted.stdout, "www.mipo.pet\n");

  const placeholder = classify(["classify", "http://localhost:8081"]);
  assert.equal(placeholder.status, 0);
  assert.equal(placeholder.stdout, "placeholder\n");

  const apex = classify(["classify", "www.mipo.pet"]);
  assert.equal(apex.status, 0);
  assert.equal(apex.stdout, "www.mipo.pet\n");
});

test("an unexpected www address prints length and a name check, not the value", () => {
  const value = "https://secret.example/www";
  const result = classify(["classify", value]);
  assert.equal(result.status, 1);
  assert.equal(result.stdout, `other\nlength=${value.length}\ncontains_mipo_pet=no\n`);
  assert.doesNotMatch(result.stdout, /secret/);
  assert.doesNotMatch(result.stderr, /secret/);

  const namedValue = "https://www.mipo.pet";
  const named = classify(["classify", namedValue]);
  assert.equal(named.status, 1);
  assert.equal(named.stdout, `other\nlength=${namedValue.length}\ncontains_mipo_pet=yes\n`);
  assert.doesNotMatch(named.stdout, /https:\/\//);
});

test("the env file's last definition is classified, and a missing file is unset", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "mipo-www-"));
  const missing = classify(["classify-file", path.join(dir, "absent.env")]);
  assert.equal(missing.status, 0);
  assert.equal(missing.stdout, "unset\n");

  const file = path.join(dir, ".env");
  writeFileSync(file, [
    "DATABASE_URL='postgres://user:secret@db/mipo'",
    "MIPO_WWW_ADDRESS=http://localhost:8081",
    "MIPO_WWW_ADDRESS='www.mipo.pet'",
    "OWNER_WHATSAPP_TO='+972500000000'",
  ].join("\n"));
  const result = classify(["classify-file", file]);
  assert.equal(result.status, 0);
  assert.equal(result.stdout, "www.mipo.pet\n");
  assert.doesNotMatch(result.stdout, /secret/);
  assert.doesNotMatch(result.stdout, /972/);
});

test("the entrypoint skips an unexpected www value and still resolves the accepted ones", () => {
  const run = (env) => spawnSync("sh", [entry, "--print"], {
    encoding: "utf8",
    env: { ...process.env, ...env },
  });
  const bad = run({ MIPO_SITE_ADDRESS: "mipo.pet", MIPO_WWW_ADDRESS: "www.example.test" });
  assert.equal(bad.status, 0);
  assert.match(bad.stderr, /MIPO_WWW_ADDRESS is other \(length=16 contains_mipo_pet=no\)/);
  assert.match(bad.stderr, /www site left out so the apex can start/);
  assert.equal(bad.stdout, "other\nlength=16\ncontains_mipo_pet=no\nall\n");
  assert.doesNotMatch(`${bad.stdout}${bad.stderr}`, /www\.example\.test/);

  const rendered = spawnSync("sh", [entry, "--render"], {
    encoding: "utf8",
    env: {
      ...process.env,
      MIPO_SITE_ADDRESS: "mipo.pet",
      MIPO_WWW_ADDRESS: "www.example.test",
      MIPO_CADDYFILE: path.join(repoRoot, "deploy/aws/Caddyfile"),
      MIPO_CADDYFILE_OUT: path.join(tmpdir(), `caddy-other-${process.pid}.caddy`),
    },
  });
  assert.equal(rendered.status, 0);
  assert.doesNotMatch(rendered.stdout, /www\.example\.test/);
  assert.match(rendered.stdout, /mipo\.pet/);

  const production = run({ MIPO_SITE_ADDRESS: "mipo.pet", MIPO_WWW_ADDRESS: "" });
  assert.equal(production.stdout.split("\n")[0], "www.mipo.pet");
  const named = run({ MIPO_SITE_ADDRESS: "mipo.pet", MIPO_WWW_ADDRESS: "www.mipo.pet" });
  assert.equal(named.stdout.split("\n")[0], "www.mipo.pet");
  const staging = run({ MIPO_SITE_ADDRESS: "staging.mipo.pet", MIPO_WWW_ADDRESS: "http://localhost:8081" });
  assert.equal(staging.stdout.split("\n")[0], "http://localhost:8081");
});

test("the deploy classifies the www address before it recreates a container", () => {
  const workflow = read(".github/workflows/deploy-aws.yml");
  const classifyAt = workflow.indexOf("name: Classify MIPO_WWW_ADDRESS");
  const migrateAt = workflow.indexOf("name: Run migrations and restart the API");
  const caddyAt = workflow.indexOf("force-recreate --no-deps caddy");
  const apiAt = workflow.indexOf("force-recreate --no-deps --wait");
  assert.ok(classifyAt > 0);
  assert.ok(classifyAt < migrateAt);
  assert.ok(classifyAt < apiAt);
  assert.ok(classifyAt < caddyAt);
  assert.match(workflow, /classify-file '\$\{MIPO_REMOTE_PATH\}\/\.env'/);
  assert.match(workflow, /deploy\/aws\/www-address\.sh/);
  assert.match(workflow, /Production stays on the previous build/);
  const step = workflow.slice(classifyAt, migrateAt);
  assert.doesNotMatch(step, /echo "\$\{?MIPO_WWW_ADDRESS/);
});
