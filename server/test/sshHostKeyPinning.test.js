// Every workflow that reaches the production host over SSH must pin the host
// key from MIPO_AWS_KNOWN_HOSTS. ssh-keyscan on a fresh runner, or
// StrictHostKeyChecking=accept-new, trusts whatever answers at the address.

import assert from "node:assert/strict";
import test from "node:test";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const workflowsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../.github/workflows");
const sshWorkflows = readdirSync(workflowsDir)
  .filter((file) => file.endsWith(".yml"))
  .map((file) => ({ file, text: readFileSync(path.join(workflowsDir, file), "utf8") }))
  .filter(({ text }) => text.includes("MIPO_AWS_SSH_PRIVATE_KEY"));

test("the SSH workflows are found", () => {
  assert.ok(sshWorkflows.some(({ file }) => file === "deploy-aws.yml"));
  assert.ok(sshWorkflows.length >= 9);
});

for (const { file, text } of sshWorkflows) {
  test(`${file} pins the production host key`, () => {
    const code = text.split("\n").filter((line) => !line.trim().startsWith("#")).join("\n");
    assert.doesNotMatch(code, /ssh-keyscan/);
    assert.doesNotMatch(code, /StrictHostKeyChecking=(accept-new|no)/);
    assert.match(code, /SSH_KNOWN_HOSTS: \$\{\{ secrets\.MIPO_AWS_KNOWN_HOSTS \}\}/);
    assert.match(code, /if \[ -z "\$\{SSH_KNOWN_HOSTS:-\}" \]; then\n\s+echo "BLOCKED:[^\n]*\n[^\n]*\n\s+exit 1/);
    assert.match(code, /ssh-keygen -F "\$MIPO_AWS_HOST" -f ~\/\.ssh\/known_hosts/);
    for (const match of code.matchAll(/StrictHostKeyChecking=(\w[\w-]*)/g)) {
      assert.equal(match[1], "yes");
    }
    assert.ok(code.includes("StrictHostKeyChecking=yes"));
  });
}
