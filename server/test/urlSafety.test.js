import assert from "node:assert/strict";
import test from "node:test";
import {
  createConnectionSafeLookup,
  fetchValidatedRemoteUrl,
  isPrivateOrReservedIp,
  validateRemoteHttpUrl,
} from "../src/urlSafety.js";

const publicLookup = async () => [{ address: "93.184.216.34", family: 4 }];

test("URL validation rejects local and private network targets", async () => {
  await assert.rejects(() => validateRemoteHttpUrl("http://localhost/admin"), /not allowed/);
  await assert.rejects(() => validateRemoteHttpUrl("http://127.0.0.1/"), /public network/);
  await assert.rejects(() => validateRemoteHttpUrl("http://169.254.169.254/latest/meta-data"), /public network/);
  await assert.rejects(() => validateRemoteHttpUrl("file:///etc/passwd"), /Only HTTP/);
  await assert.rejects(() => validateRemoteHttpUrl("https://user:secret@example.com"), /credentials/);
});

test("URL validation rejects hostnames resolving to any private address", async () => {
  const mixedLookup = async () => [
    { address: "93.184.216.34", family: 4 },
    { address: "10.0.0.8", family: 4 },
  ];
  await assert.rejects(
    () => validateRemoteHttpUrl("https://shop.example.org/product", { lookupFn: mixedLookup }),
    /public network/,
  );
});

test("URL validation accepts a hostname resolving only to public addresses", async () => {
  const url = await validateRemoteHttpUrl("https://shop.example.org/product", { lookupFn: publicLookup });
  assert.equal(url.hostname, "shop.example.org");
});

test("redirect targets are validated before a second request", async () => {
  let calls = 0;
  const fetchFn = async () => {
    calls += 1;
    return new Response(null, {
      status: 302,
      headers: { location: "http://127.0.0.1/private" },
    });
  };
  await assert.rejects(
    () => fetchValidatedRemoteUrl("https://shop.example.org", { fetchFn, lookupFn: publicLookup }),
    /public network/,
  );
  assert.equal(calls, 1);
});

test("IP classification blocks private ranges and permits public addresses", () => {
  assert.equal(isPrivateOrReservedIp("10.0.0.1"), true);
  assert.equal(isPrivateOrReservedIp("::1"), true);
  assert.equal(isPrivateOrReservedIp("8.8.8.8"), false);
  assert.equal(isPrivateOrReservedIp("2606:4700:4700::1111"), false);
});

test("connection-time DNS lookup rejects rebinding to a private address", async () => {
  const lookupFn = createConnectionSafeLookup(async () => [{ address: "127.0.0.1", family: 4 }]);
  await assert.rejects(
    () => new Promise((resolve, reject) => {
      lookupFn("shop.example.org", {}, (error, address) => error ? reject(error) : resolve(address));
    }),
    /non-public/,
  );
});
