// deploy/aws/api-images.sh against a fake `docker` on PATH. It checks which
// tags `promote` removes and that `rollback` refuses an image that is not on
// the host. No real Docker is involved.

import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const script = path.join(repoRoot, "deploy/aws/api-images.sh");

const images = [
  "2026-09-30 10:00:00 +0000 UTC|aaaaaaaaaaa6",
  "2026-09-30 09:00:00 +0000 UTC|aaaaaaaaaaa5",
  "2026-09-29 10:00:00 +0000 UTC|latest",
  "2026-09-29 09:00:00 +0000 UTC|aaaaaaaaaaa4",
  "2026-09-28 10:00:00 +0000 UTC|dryrun-123",
  "2026-09-28 09:00:00 +0000 UTC|aaaaaaaaaaa3",
  "2026-09-27 09:00:00 +0000 UTC|aaaaaaaaaaa2",
  "2026-09-26 09:00:00 +0000 UTC|<none>",
  "2026-09-25 09:00:00 +0000 UTC|aaaaaaaaaaa1",
];

const run = (args, { running = "aaaaaaaaaaa6", present = true } = {}) => {
  const dir = mkdtempSync(path.join(tmpdir(), "api-images-"));
  const log = path.join(dir, "docker.log");
  const fake = path.join(dir, "docker");
  writeFileSync(fake, `#!/usr/bin/env bash
echo "$*" >> "${log}"
case "$1 $2" in
  "image ls") printf '%s\\n' ${images.map((line) => `'${line}'`).join(" ")} ;;
  "compose -f") if [[ " $* " == *" ps -q "* ]]; then echo cid; fi ;;
  "image inspect") ${present ? "exit 0" : "exit 1"} ;;
esac
if [ "$1" = inspect ]; then echo "mipo-api:${running}"; fi
exit 0
`);
  chmodSync(fake, 0o755);
  const result = spawnSync("bash", [script, ...args], {
    env: { ...process.env, PATH: `${dir}:${process.env.PATH}` },
    encoding: "utf8",
  });
  let calls = [];
  try { calls = readFileSync(log, "utf8").trim().split("\n"); } catch { /* no calls */ }
  return { ...result, calls };
};

test("promote tags latest and keeps the newest three SHA tags", () => {
  const { status, calls, stderr } = run(["promote", "/opt/mipo", "aaaaaaaaaaa6"]);
  assert.equal(status, 0, stderr);
  assert.ok(calls.includes("tag mipo-api:aaaaaaaaaaa6 mipo-api:latest"));
  const removed = calls.filter((call) => call.startsWith("image rm")).map((call) => call.split(" ").pop());
  assert.deepEqual(removed, ["mipo-api:aaaaaaaaaaa3", "mipo-api:aaaaaaaaaaa2", "mipo-api:aaaaaaaaaaa1"]);
});

test("promote never removes the tag the running container uses", () => {
  const { status, calls } = run(["promote", "/opt/mipo", "aaaaaaaaaaa6"], { running: "aaaaaaaaaaa2" });
  assert.equal(status, 0);
  const removed = calls.filter((call) => call.startsWith("image rm")).map((call) => call.split(" ").pop());
  assert.deepEqual(removed, ["mipo-api:aaaaaaaaaaa3", "mipo-api:aaaaaaaaaaa1"]);
});

test("promote and rollback refuse a tag that is not a SHA", () => {
  for (const action of ["promote", "rollback"]) {
    const { status, calls } = run([action, "/opt/mipo", "latest; rm -rf /"]);
    assert.equal(status, 1);
    assert.deepEqual(calls, []);
  }
});

test("rollback refuses an image that is not on the host", () => {
  const { status, calls } = run(["rollback", "/opt/mipo", "aaaaaaaaaaa9"], { present: false });
  assert.equal(status, 1);
  assert.ok(!calls.some((call) => call.includes(" up ")));
});

test("rollback recreates only the API from the stored tag, without a build", () => {
  const { status, calls, stderr } = run(["rollback", "/opt/mipo", "aaaaaaaaaaa5"]);
  assert.equal(status, 0, stderr);
  const up = calls.find((call) => call.includes(" up "));
  assert.match(up, /up -d --no-build --force-recreate --no-deps --wait --wait-timeout 60 mipo-api$/);
  assert.ok(calls.includes("tag mipo-api:aaaaaaaaaaa5 mipo-api:latest"));
});

test("the compose file and the deploy use the SHA tag", () => {
  const compose = readFileSync(path.join(repoRoot, "deploy/aws/docker-compose.yml"), "utf8");
  assert.match(compose, /image: mipo-api:\$\{MIPO_IMAGE_TAG:-latest\}/);
  const deploy = readFileSync(path.join(repoRoot, ".github/workflows/deploy-aws.yml"), "utf8");
  assert.match(deploy, /export MIPO_IMAGE_TAG="\$\{MIPO_DEPLOY_SHA\}"/);
  assert.match(deploy, /api-images\.sh" promote "\$MIPO_REMOTE_PATH" "\$MIPO_IMAGE_TAG"/);
});
