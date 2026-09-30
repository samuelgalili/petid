// The manual production email-env workflow.
//
// The rewriter is embedded in the workflow file. These tests extract it and
// run it against a temp env file, and check the workflow text for the
// confirmation gate, the existing SSH secret, and that values are not echoed.

import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const workflow = readFileSync(path.join(repoRoot, ".github/workflows/set-email-env.yml"), "utf8");

const quoteEnv = (value) => "'" + String(value).split("'").join("\\'") + "'";
const FROM = "MIPO <no-reply@mipo.pet>";

function dedent(text) {
  const lines = text.replace(/^\n/, "").replace(/\n$/, "").split("\n");
  const indents = lines.filter((line) => line.trim()).map((line) => line.match(/^ */)[0].length);
  const width = Math.min(...indents);
  return lines.map((line) => (line.startsWith(" ".repeat(width)) ? line.slice(width) : line)).join("\n") + "\n";
}

function heredocs(source) {
  const bodies = [];
  let rest = source;
  while (rest.includes("<<'PY'\n")) {
    const at = rest.indexOf("<<'PY'\n");
    const after = rest.slice(at + "<<'PY'\n".length);
    const end = after.match(/\n[ ]*PY\n/);
    assert.ok(end, "a python heredoc is missing its terminator");
    bodies.push(dedent(after.slice(0, end.index) + "\n"));
    rest = after.slice(end.index + end[0].length);
  }
  return bodies;
}

const scripts = heredocs(workflow);
const maskScript = scripts.find((body) => body.includes("::add-mask::"));
const remoteScript = scripts.find((body) => body.includes("FROM_EMAIL"));
const healthScript = scripts.find((body) => body.includes('["email"]["configured"]'));

function writeScript(body) {
  const dir = mkdtempSync(path.join(tmpdir(), "mipo-email-env-"));
  const file = path.join(dir, "run.py");
  writeFileSync(file, body);
  return { dir, file };
}

function runPython(file, { env, input, args = [] } = {}) {
  return spawnSync("python3", [file, ...args], {
    input,
    encoding: "utf8",
    env: {
      PATH: process.env.PATH,
      HOME: process.env.HOME,
      ...env,
    },
  });
}

function installDocker(dir, { failFirst = false } = {}) {
  const bin = path.join(dir, "bin");
  mkdirSync(bin);
  const log = path.join(dir, "docker.log");
  const count = path.join(dir, "docker.count");
  writeFileSync(path.join(bin, "docker"), `#!/bin/sh
printf '%s\\n' "$*" >> "$DOCKER_LOG"
case " $* " in
  *" printenv MIPO_DEPLOY_SHA "*)
    printf '%s\\n' "abc1234dead"
    exit 0
    ;;
esac
if [ -n "\${RESEND_API_KEY:-}" ]; then
  printf '%s\\n' "resend_in_env=yes" >> "$DOCKER_LOG"
fi
case " $* " in
  *" up "*)
    if [ -n "\${MIPO_DEPLOY_SHA:-}" ]; then
      printf '%s\\n' "sha_passed=yes" >> "$DOCKER_LOG"
    else
      printf '%s\\n' "sha_passed=no" >> "$DOCKER_LOG"
    fi
    if [ "\${DOCKER_FAIL_FIRST:-}" = "1" ]; then
      n=0
      if [ -f "$DOCKER_COUNT" ]; then
        n=$(cat "$DOCKER_COUNT")
      fi
      n=$((n + 1))
      printf '%s' "$n" > "$DOCKER_COUNT"
      if [ "$n" -eq 1 ]; then
        exit 1
      fi
    fi
    ;;
esac
exit 0
`);
  chmodSync(path.join(bin, "docker"), 0o755);
  return {
    bin,
    log,
    count,
    env: {
      DOCKER_LOG: log,
      DOCKER_COUNT: count,
      DOCKER_FAIL_FIRST: failFirst ? "1" : "",
      PATH: `${bin}:${process.env.PATH}`,
    },
  };
}

function layout(contents) {
  const remote = mkdtempSync(path.join(tmpdir(), "mipo-remote-"));
  writeFileSync(path.join(remote, ".env"), contents);
  chmodSync(path.join(remote, ".env"), 0o640);
  mkdirSync(path.join(remote, "deploy", "aws"), { recursive: true });
  writeFileSync(path.join(remote, "deploy", "aws", "docker-compose.yml"), "services: {}\n");
  return remote;
}

test("the workflow confirms a write before SSH and does not echo secrets", () => {
  assert.match(workflow, /name: Set production email env/);
  assert.match(workflow, /type: boolean\n {8}default: true/);
  assert.match(workflow, /confirm:/);
  assert.match(workflow, /\[ "\$CONFIRM" != "SET-EMAIL-ENV" \]/);
  assert.match(workflow, /\[ "\$DRY_RUN" = "false" \]/);
  assert.match(workflow, /group: aws-production/);
  assert.match(workflow, /cancel-in-progress: false/);
  assert.match(workflow, /environment: production/);
  assert.match(workflow, /secrets\.MIPO_AWS_SSH_PRIVATE_KEY/);
  assert.match(workflow, /secrets\.RESEND_API_KEY/);
  assert.match(workflow, /printf '%s\\n' "\$SSH_PRIVATE_KEY" > ~\/\.ssh\/mipo_aws_key/);
  assert.match(workflow, /secrets\.MIPO_AWS_KNOWN_HOSTS/);
  assert.match(workflow, /ssh-keygen -F "\$MIPO_AWS_HOST" -f ~\/\.ssh\/known_hosts/);
  assert.match(workflow, /StrictHostKeyChecking=yes/);
  assert.doesNotMatch(workflow, /StrictHostKeyChecking=accept-new/);
  assert.match(workflow, /< "\$key_file"/);
  assert.match(workflow, /::add-mask::/);
  assert.match(workflow, /https:\/\/mipo\.pet\/api\/health/);
  assert.match(workflow, /--force-recreate/);
  assert.match(workflow, /--no-deps/);
  assert.match(workflow, /--wait-timeout 60 mipo-api/);
  assert.match(workflow, /\/mipo\/prod\/RESEND_API_KEY/);
  assert.match(workflow, /\/mipo\/prod\/PASSWORD_RESET_FROM_EMAIL/);
  assert.match(workflow, /sync-ssm-env\.sh/);
  assert.match(workflow, /Deploy AWS does not refresh/);
  assert.match(workflow, /Deploy AWS לא מרענן/);
  assert.match(workflow, /chmod 600/);
  assert.match(workflow, /0o600/);

  const secretNames = [...workflow.matchAll(/secrets\.([A-Z0-9_]+)/g)].map((match) => match[1]);
  assert.deepEqual([...new Set(secretNames)].sort(), ["MIPO_AWS_KNOWN_HOSTS", "MIPO_AWS_SSH_PRIVATE_KEY", "RESEND_API_KEY"]);
  const varNames = [...workflow.matchAll(/vars\.([A-Z0-9_]+)/g)].map((match) => match[1]);
  assert.deepEqual([...new Set(varNames)].sort(), ["MIPO_AWS_HOST", "MIPO_AWS_USER", "MIPO_REMOTE_PATH"]);

  assert.equal(workflow.includes("set -x"), false);
  assert.equal(workflow.includes("set -o xtrace"), false);
  assert.equal(/\bsed\b/.test(workflow), false);
  assert.equal(workflow.includes("shell=True"), false);
  assert.equal(workflow.includes("echo \"$RESEND_API_KEY\""), false);
  assert.doesNotMatch(workflow, /\bcat\b[^\n]*\.env/);
  assert.doesNotMatch(workflow, /ssh[^\n]*RESEND_API_KEY/);

  const confirmAt = workflow.indexOf('"$CONFIRM" != "SET-EMAIL-ENV"');
  const emptyAt = workflow.indexOf("RESEND_API_KEY is empty or invalid");
  const sshAt = workflow.indexOf("name: Configure SSH");
  const scpAt = workflow.indexOf("scp -q");
  assert.ok(confirmAt > 0 && confirmAt < emptyAt, "confirmation is checked before the secret is required");
  assert.ok(emptyAt < sshAt, "an empty key fails before SSH");
  assert.ok(sshAt < scpAt, "SSH is configured before the env file is touched");
  const reportAt = workflow.indexOf("printf '%s\\n' \"$report\"");
  const statusAt = workflow.indexOf('if [ "$status" -ne 0 ]');
  assert.ok(reportAt > 0 && reportAt < statusAt, "the remote report is printed even when the write fails");

  assert.ok(maskScript);
  assert.ok(remoteScript);
  assert.ok(healthScript);
  assert.equal(remoteScript.includes("--build"), false);
  assert.match(remoteScript, /--force-recreate", "--no-deps"/);
  assert.equal(remoteScript.includes("FROM_EMAIL = \"MIPO <no-reply@mipo.pet>\""), true);
});

test("the mask step hides a real key and rejects an empty one without printing it", () => {
  const { dir, file } = writeScript(maskScript);
  try {
    const keyFile = path.join(dir, "key");
    const key = "re_mask_canary_value";
    const ok = runPython(file, {
      args: [keyFile],
      env: { RESEND_API_KEY: `${key}\n` },
    });
    assert.equal(ok.status, 0, ok.stderr);
    assert.equal(ok.stdout, `::add-mask::${key}\n`);
    assert.equal(ok.stderr, "");
    assert.equal(readFileSync(keyFile, "utf8"), key);
    assert.equal(statSync(keyFile).mode & 0o777, 0o600);

    const missing = path.join(dir, "missing");
    const bad = runPython(file, {
      args: [missing],
      env: { RESEND_API_KEY: "re_hidden\nstill_hidden" },
    });
    assert.equal(bad.status, 1);
    assert.equal(bad.stdout, "");
    assert.match(bad.stderr, /RESEND_API_KEY is empty or invalid/);
    assert.match(bad.stderr, /ריק או לא תקין/);
    assert.equal(bad.stderr.includes("re_hidden"), false);
    assert.equal(bad.stderr.includes("still_hidden"), false);
    assert.equal(statSync(missing, { throwIfNoEntry: false }), undefined);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("health parsing prints only the boolean", () => {
  const { dir, file } = writeScript(healthScript);
  try {
    const body = path.join(dir, "health.json");
    writeFileSync(body, JSON.stringify({
      ok: true,
      service: "mipo-api",
      version: "abc1234dead",
      email: { configured: true },
    }));
    const yes = runPython(file, { args: [body] });
    assert.equal(yes.status, 0);
    assert.equal(yes.stdout, "true\n");
    assert.equal(yes.stdout.includes("abc1234dead"), false);

    writeFileSync(body, JSON.stringify({ email: { configured: false } }));
    const no = runPython(file, { args: [body] });
    assert.equal(no.status, 0);
    assert.equal(no.stdout, "false\n");

    writeFileSync(body, JSON.stringify({ email: { configured: "true" } }));
    const text = runPython(file, { args: [body] });
    assert.equal(text.status, 2);
    assert.equal(text.stdout, "");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("dry-run reports booleans and does not write or print values", () => {
  const { dir, file } = writeScript(remoteScript);
  const key = "re_CANARY_'\\`$<>&";
  const remote = layout([
    "# kept comment",
    "KEEP_ME='postgres://secret-host/db'",
    "RESEND_API_KEY_OLD='leave-this'",
    "PASSWORD_RESET_FROM_EMAIL='MIPO <onboarding@resend.dev>'",
    "RESEND_API_KEY='re_old_value'",
    "",
  ].join("\n"));
  const envPath = path.join(remote, ".env");
  const before = readFileSync(envPath);
  const inode = statSync(envPath).ino;
  try {
    const result = runPython(file, {
      input: key,
      env: {
        DRY_RUN: "true",
        MIPO_REMOTE_PATH: remote,
        RESEND_API_KEY: "POISON_SHOULD_NOT_BE_WRITTEN",
        PASSWORD_RESET_FROM_EMAIL: "POISON <poison@example.com>",
      },
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, "");
    assert.equal(
      result.stdout,
      [
        "PASSWORD_RESET_FROM_EMAIL present=true absent=false different=true",
        "RESEND_API_KEY present=true absent=false different=true",
        "",
      ].join("\n"),
    );
    assert.equal(result.stdout.includes(key), false);
    assert.equal(result.stdout.includes("secret-host"), false);
    assert.equal(result.stdout.includes("no-reply@mipo.pet"), false);
    assert.equal(result.stdout.includes("POISON"), false);
    assert.deepEqual(readFileSync(envPath), before);
    assert.equal(statSync(envPath).ino, inode);
  } finally {
    rmSync(dir, { recursive: true, force: true });
    rmSync(remote, { recursive: true, force: true });
  }
});

test("apply rewrites only the two keys, keeps mode and inode, and quotes like the sync script", () => {
  const { dir, file } = writeScript(remoteScript);
  const docker = installDocker(dir);
  const key = "re_CANARY_'\\`$<>&";
  const remote = layout([
    "# kept comment",
    "KEEP_ME='postgres://secret-host/db'",
    "export RESEND_API_KEY='re_old_value'",
    "RESEND_API_KEY_OLD='leave-this'",
    "",
  ].join("\n"));
  const envPath = path.join(remote, ".env");
  const beforeStat = statSync(envPath);
  try {
    const result = runPython(file, {
      input: key,
      env: {
        ...docker.env,
        DRY_RUN: "false",
        MIPO_REMOTE_PATH: remote,
        RESEND_API_KEY: "POISON_SHOULD_NOT_BE_WRITTEN",
        PASSWORD_RESET_FROM_EMAIL: "POISON <poison@example.com>",
      },
    });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /^backup=.*\.env\.backup-\d{8}-\d{6}\nrestarted=true\n$/);
    assert.equal(result.stdout.includes(key), false);
    assert.equal(result.stdout.includes("abc1234dead"), false);
    assert.equal(result.stdout.includes("secret-host"), false);
    assert.equal(result.stderr.includes(key), false);
    assert.equal(result.stderr.includes("abc1234dead"), false);

    const after = readFileSync(envPath, "utf8");
    assert.equal(after.includes("POISON"), false);
    assert.match(after, /^# kept comment\n/);
    assert.match(after, /KEEP_ME='postgres:\/\/secret-host\/db'\n/);
    assert.match(after, /RESEND_API_KEY_OLD='leave-this'\n/);
    assert.equal(after.includes("export RESEND_API_KEY"), false);
    assert.ok(after.includes(`PASSWORD_RESET_FROM_EMAIL=${quoteEnv(FROM)}`));
    assert.ok(after.includes(`RESEND_API_KEY=${quoteEnv(key)}`));
    const afterStat = statSync(envPath);
    assert.equal(afterStat.ino, beforeStat.ino);
    assert.equal(afterStat.mode & 0o777, 0o640);
    assert.equal(afterStat.uid, beforeStat.uid);
    assert.equal(afterStat.gid, beforeStat.gid);

    const backup = result.stdout.match(/^backup=(\S+)/)[1];
    assert.equal(statSync(backup).mode & 0o777, 0o600);
    assert.match(readFileSync(backup, "utf8"), /export RESEND_API_KEY='re_old_value'/);

    const log = readFileSync(docker.log, "utf8");
    assert.match(log, /exec -T mipo-api printenv MIPO_DEPLOY_SHA/);
    assert.match(log, /up -d --force-recreate --no-deps --wait --wait-timeout 60 mipo-api/);
    assert.match(log, /sha_passed=yes/);
    assert.equal(log.includes("resend_in_env=yes"), false);
    assert.equal(log.includes("--build"), false);
    assert.equal(log.includes(key), false);
    assert.equal(log.includes("abc1234dead"), false);

    const again = runPython(file, {
      input: key,
      env: { DRY_RUN: "true", MIPO_REMOTE_PATH: remote },
    });
    assert.equal(again.status, 0, again.stderr);
    assert.match(again.stdout, /PASSWORD_RESET_FROM_EMAIL present=true absent=false different=false/);
    assert.match(again.stdout, /RESEND_API_KEY present=true absent=false different=false/);
    assert.equal(again.stdout.includes(key), false);
    assert.equal(again.stdout.includes(FROM), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
    rmSync(remote, { recursive: true, force: true });
  }
});

test("a failed restart restores the backup and restarts again", () => {
  const { dir, file } = writeScript(remoteScript);
  const docker = installDocker(dir, { failFirst: true });
  const key = "re_restore_canary";
  const original = "KEEP_ME='postgres://secret-host/db'\nRESEND_API_KEY='re_old_value'\n";
  const remote = layout(original);
  const envPath = path.join(remote, ".env");
  const beforeStat = statSync(envPath);
  try {
    const result = runPython(file, {
      input: key,
      env: {
        ...docker.env,
        DRY_RUN: "false",
        MIPO_REMOTE_PATH: remote,
      },
    });
    assert.equal(result.status, 1);
    assert.match(result.stdout, /^backup=.*\.env\.backup-\d{8}-\d{6}\n$/);
    assert.equal(result.stdout.includes("restarted=true"), false);
    assert.match(result.stderr, /restored=true/);
    assert.match(result.stderr, /משחזרים את הגיבוי/);
    assert.equal(result.stdout.includes(key), false);
    assert.equal(result.stderr.includes(key), false);
    assert.equal(readFileSync(envPath, "utf8"), original);
    const afterStat = statSync(envPath);
    assert.equal(afterStat.ino, beforeStat.ino);
    assert.equal(afterStat.mode & 0o777, 0o640);
    const log = readFileSync(docker.log, "utf8");
    assert.equal(log.match(/ up -d --force-recreate /g).length, 2);
  } finally {
    rmSync(dir, { recursive: true, force: true });
    rmSync(remote, { recursive: true, force: true });
  }
});

test("restore mode puts the backup back and refuses a path outside the app directory", () => {
  const { dir, file } = writeScript(remoteScript);
  const docker = installDocker(dir);
  const remote = layout("KEEP_ME='current'\n");
  const envPath = path.join(remote, ".env");
  const backup = path.join(remote, ".env.backup-20260930-190201");
  writeFileSync(backup, "KEEP_ME='from-backup'\n");
  chmodSync(backup, 0o600);
  try {
    const result = runPython(file, {
      env: {
        ...docker.env,
        MODE: "restore",
        DRY_RUN: "false",
        MIPO_REMOTE_PATH: remote,
        BACKUP_PATH: backup,
      },
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, "restored=true\nrestarted=true\n");
    assert.equal(readFileSync(envPath, "utf8"), "KEEP_ME='from-backup'\n");
    assert.equal(result.stdout.includes("from-backup"), false);

    const outside = path.join(dir, ".env.backup-20260930-190201");
    writeFileSync(outside, "nope\n");
    const refused = runPython(file, {
      env: {
        ...docker.env,
        MODE: "restore",
        MIPO_REMOTE_PATH: remote,
        BACKUP_PATH: outside,
      },
    });
    assert.equal(refused.status, 1);
    assert.equal(readFileSync(envPath, "utf8"), "KEEP_ME='from-backup'\n");
    assert.equal(refused.stdout.includes("nope"), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
    rmSync(remote, { recursive: true, force: true });
  }
});
