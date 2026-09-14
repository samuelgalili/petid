// SSRF protection on the remote-image downloader.
//
// fetchImageBuffer takes a URL collected from a supplier's HTML by the scraper.
// The page that names it is not ours, the server it points at is not ours, and
// an admin pressing import does not change either fact. Before this suite the
// function checked the protocol and nothing else, and followed redirects
// blindly, so a supplier page could name http://169.254.169.254/… and the
// server would fetch it.
//
// Two layers are exercised here.
//
// validateRemoteHttpUrl and fetchValidatedRemoteUrl are tested directly with an
// injected DNS lookup, because the address a hostname resolves to is the whole
// question and a test that depended on real DNS would be testing the internet.
//
// fetchImageBuffer is tested against a real loopback HTTP server for the
// response-shaped rules — status, content type, size, timeout — with the URL
// guard injected, since the guard would (correctly) refuse 127.0.0.1.
//
// Nothing here touches a third-party host or a cloud metadata service.

import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "node:http";
import { once } from "node:events";

import { fetchImageBuffer, ImagePipelineError } from "../src/imagePipeline.js";
import {
  isPrivateOrReservedIp,
  validateRemoteHttpUrl,
  fetchValidatedRemoteUrl,
} from "../src/urlSafety.js";

// A stand-in resolver. Every hostname the tests use maps to an address they
// choose, so "does a public name that resolves inside get blocked" is testable
// without asking a real resolver anything.
const lookupReturning = (...addresses) => async () => addresses.map((address) => ({
  address,
  family: address.includes(":") ? 6 : 4,
}));

const rejects = async (fn, message) => {
  await assert.rejects(fn, (error) => {
    assert.ok(error, `${message}: expected an error`);
    return true;
  }, message);
};

// ─── the address rules ───────────────────────────────────────────────────────

test("loopback, unspecified, private, link-local and metadata addresses are all refused", () => {
  const blocked = [
    "127.0.0.1",        // loopback
    "127.1.2.3",        // the rest of 127/8
    "0.0.0.0",          // unspecified
    "10.0.0.5",         // RFC1918
    "172.16.4.9",       // RFC1918
    "172.31.255.254",   // RFC1918 upper edge
    "192.168.1.1",      // RFC1918
    "169.254.1.1",      // link-local
    "169.254.169.254",  // cloud metadata, which is link-local
    "100.64.0.1",       // carrier-grade NAT
    "224.0.0.1",        // multicast
    "::1",              // IPv6 loopback
    "::",               // IPv6 unspecified
    "::ffff:127.0.0.1", // IPv4-mapped loopback
    "fd00::1",          // IPv6 unique local
    "fe80::1",          // IPv6 link-local
    "ff02::1",          // IPv6 multicast
  ];
  for (const address of blocked) {
    assert.equal(isPrivateOrReservedIp(address), true, `${address} should be refused`);
  }
});

test("ordinary public addresses are allowed", () => {
  for (const address of ["8.8.8.8", "93.184.216.34", "2606:2800:220:1:248:1893:25c8:1946"]) {
    assert.equal(isPrivateOrReservedIp(address), false, `${address} should be allowed`);
  }
});

// ─── the initial URL ─────────────────────────────────────────────────────────

test("localhost is rejected by name", async () => {
  await rejects(() => validateRemoteHttpUrl("http://localhost/x.jpg"), "localhost");
});

test("an IP literal inside the private ranges is rejected without any lookup", async () => {
  for (const host of ["127.0.0.1", "0.0.0.0", "10.1.2.3", "169.254.169.254", "[::1]"]) {
    await rejects(
      () => validateRemoteHttpUrl(`http://${host}/x.jpg`, { lookupFn: lookupReturning("8.8.8.8") }),
      host,
    );
  }
});

test("a public hostname that resolves to a private address is rejected", async () => {
  await rejects(
    () => validateRemoteHttpUrl("https://cdn.example.com/x.jpg", {
      lookupFn: lookupReturning("10.0.0.7"),
    }),
    "hostname resolving inside",
  );
});

test("a hostname resolving to one public and one private address is rejected", async () => {
  // Any private answer is enough: the connection could pick it.
  await rejects(
    () => validateRemoteHttpUrl("https://cdn.example.com/x.jpg", {
      lookupFn: lookupReturning("93.184.216.34", "127.0.0.1"),
    }),
    "mixed resolution",
  );
});

test("a decimal IP that is not dotted-quad is rejected", async () => {
  // http://2130706433/ is 127.0.0.1 written as an integer.
  await rejects(
    () => validateRemoteHttpUrl("http://2130706433/x.jpg", { lookupFn: lookupReturning("8.8.8.8") }),
    "numeric host",
  );
});

test("a public hostname resolving publicly is accepted, over both http and https", async () => {
  const lookupFn = lookupReturning("93.184.216.34");
  for (const scheme of ["http", "https"]) {
    const url = await validateRemoteHttpUrl(`${scheme}://cdn.example.com/x.jpg`, { lookupFn });
    assert.equal(url.protocol, `${scheme}:`);
  }
});

test("credentials in the URL are refused", async () => {
  await rejects(
    () => validateRemoteHttpUrl("https://user:pass@cdn.example.com/x.jpg", {
      lookupFn: lookupReturning("93.184.216.34"),
    }),
    "credentials",
  );
});

// ─── redirects ───────────────────────────────────────────────────────────────

const redirectingFetch = (plan) => {
  const seen = [];
  const fetchFn = async (url) => {
    const href = url.toString();
    seen.push(href);
    const next = plan[href];
    if (next === undefined) {
      return {
        status: 200,
        ok: true,
        headers: new Map([["content-type", "image/jpeg"]]),
        body: null,
      };
    }
    return {
      status: 302,
      ok: false,
      headers: new Map([["location", next]]),
      body: { cancel: async () => {} },
    };
  };
  return { fetchFn, seen };
};

test("a public URL that redirects to a private address is rejected", async () => {
  const { fetchFn } = redirectingFetch({
    "https://cdn.example.com/x.jpg": "http://169.254.169.254/latest/meta-data/",
  });
  await rejects(
    () => fetchValidatedRemoteUrl("https://cdn.example.com/x.jpg", {
      fetchFn,
      lookupFn: lookupReturning("93.184.216.34"),
    }),
    "redirect to metadata",
  );
});

test("a relative redirect is resolved against the current URL and then validated", async () => {
  const { fetchFn, seen } = redirectingFetch({
    "https://cdn.example.com/a/x.jpg": "../b/y.jpg",
  });
  const { finalUrl } = await fetchValidatedRemoteUrl("https://cdn.example.com/a/x.jpg", {
    fetchFn,
    lookupFn: lookupReturning("93.184.216.34"),
  });
  assert.equal(finalUrl, "https://cdn.example.com/b/y.jpg");
  assert.equal(seen.length, 2);
});

test("a redirect chain longer than the limit is rejected", async () => {
  const plan = {};
  for (let i = 0; i < 10; i += 1) {
    plan[`https://cdn.example.com/${i}.jpg`] = `https://cdn.example.com/${i + 1}.jpg`;
  }
  await rejects(
    () => fetchValidatedRemoteUrl("https://cdn.example.com/0.jpg", {
      fetchFn: redirectingFetch(plan).fetchFn,
      lookupFn: lookupReturning("93.184.216.34"),
      maxRedirects: 3,
    }),
    "too many redirects",
  );
});

test("a redirect loop is rejected rather than followed forever", async () => {
  const { fetchFn } = redirectingFetch({
    "https://cdn.example.com/a.jpg": "https://cdn.example.com/b.jpg",
    "https://cdn.example.com/b.jpg": "https://cdn.example.com/a.jpg",
  });
  await rejects(
    () => fetchValidatedRemoteUrl("https://cdn.example.com/a.jpg", {
      fetchFn,
      lookupFn: lookupReturning("93.184.216.34"),
      maxRedirects: 3,
    }),
    "redirect loop",
  );
});

test("a redirect with no Location header is rejected", async () => {
  const fetchFn = async () => ({
    status: 302,
    ok: false,
    headers: new Map(),
    body: { cancel: async () => {} },
  });
  await rejects(
    () => fetchValidatedRemoteUrl("https://cdn.example.com/x.jpg", {
      fetchFn,
      lookupFn: lookupReturning("93.184.216.34"),
    }),
    "missing location",
  );
});

// ─── the response ────────────────────────────────────────────────────────────

const withServer = async (handler, run) => {
  const server = createServer(handler);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const { port } = server.address();
  try {
    return await run(`http://127.0.0.1:${port}`);
  } finally {
    // The stalled-body tests deliberately leave a request open. Without this,
    // close() would wait on that socket and the suite would hang.
    server.closeAllConnections?.();
    server.close();
    await once(server, "close");
  }
};

// The guard would refuse 127.0.0.1, correctly. These tests are about what the
// downloader does with a response it was allowed to make, so the guard is
// replaced with a pass-through that still uses redirect: manual.
//
// It forwards the caller's signal the same way fetchValidatedRemoteUrl does,
// because that forwarding is the thing under test in the stalled-body cases: a
// stand-in that swallowed the signal would make the downloader look safer here
// than it is in production.
const unguardedFetch = async (input, { timeoutMs = 5000, signal } = {}) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  // Left attached, as in urlSafety: the caller's signal has to stay wired to
  // the response body it is about to read.
  signal?.addEventListener("abort", () => controller.abort(), { once: true });
  try {
    const response = await fetch(String(input), {
      redirect: "manual",
      signal: controller.signal,
    });
    return { response, finalUrl: String(input) };
  } finally {
    clearTimeout(timer);
  }
};

test("a valid image response is downloaded", async () => {
  const payload = Buffer.from("not-really-a-jpeg-but-bytes-are-bytes");
  await withServer((_request, response) => {
    response.writeHead(200, { "content-type": "image/jpeg" });
    response.end(payload);
  }, async (base) => {
    const buffer = await fetchImageBuffer(`${base}/x.jpg`, { fetchRemote: unguardedFetch });
    assert.equal(buffer.length, payload.length);
  });
});

test("an HTML response is refused even when the URL ends in .jpg", async () => {
  await withServer((_request, response) => {
    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.end("<html>not an image</html>");
  }, async (base) => {
    await assert.rejects(
      () => fetchImageBuffer(`${base}/x.jpg`, { fetchRemote: unguardedFetch }),
      (error) => error instanceof ImagePipelineError && error.code === "unsupported_content_type",
    );
  });
});

test("octet-stream is accepted, because CDNs serve images with it", async () => {
  await withServer((_request, response) => {
    response.writeHead(200, { "content-type": "application/octet-stream" });
    response.end(Buffer.from("bytes"));
  }, async (base) => {
    const buffer = await fetchImageBuffer(`${base}/x.jpg`, { fetchRemote: unguardedFetch });
    assert.equal(buffer.toString(), "bytes");
  });
});

test("a non-2xx response is refused", async () => {
  await withServer((_request, response) => {
    response.writeHead(404, { "content-type": "image/jpeg" });
    response.end("missing");
  }, async (base) => {
    await assert.rejects(
      () => fetchImageBuffer(`${base}/x.jpg`, { fetchRemote: unguardedFetch }),
      (error) => error instanceof ImagePipelineError && error.code === "fetch_status",
    );
  });
});

test("a streamed body with no declared size is cut off at the ceiling", async () => {
  // The realistic hostile shape: chunked, no Content-Length, more bytes than
  // allowed. Node's own server truncates a body to a Content-Length it
  // declared, so a literally lying header cannot be produced here — but this
  // is the case the streaming counter exists for, and it is the worse one:
  // nothing announces the size in advance at all.
  await withServer((_request, response) => {
    response.writeHead(200, { "content-type": "image/jpeg" });
    for (let i = 0; i < 20; i += 1) response.write(Buffer.alloc(10_000, 1));
    response.end();
  }, async (base) => {
    await assert.rejects(
      () => fetchImageBuffer(`${base}/x.jpg`, { fetchRemote: unguardedFetch, maxBytes: 1000 }),
      (error) => error instanceof ImagePipelineError && error.code === "too_large",
    );
  });
});

test("an honest oversized Content-Length is refused before the body is read", async () => {
  await withServer((_request, response) => {
    response.writeHead(200, { "content-type": "image/jpeg", "content-length": "999999" });
    response.end(Buffer.alloc(999_999, 1));
  }, async (base) => {
    await assert.rejects(
      () => fetchImageBuffer(`${base}/x.jpg`, { fetchRemote: unguardedFetch, maxBytes: 1000 }),
      (error) => error instanceof ImagePipelineError && error.code === "too_large",
    );
  });
});

// A handler that delivers the headers for real and then never says another
// word. writeHead() alone is not enough: Node buffers those headers and sends
// nothing until the first write or end(), so a client aborting against it is
// still waiting for headers and never reaches the body at all. flushHeaders()
// is what puts the exchange into the state this suite needs to test.
const flushHeadersThenSilence = (_request, response) => {
  response.writeHead(200, {
    "content-type": "image/jpeg",
    "transfer-encoding": "chunked",
  });
  response.flushHeaders();
  // No write. No end(). The connection stays open.
};

// Bounded explicitly: against an implementation that does not cover the body
// these two hang rather than fail, and a test that can hang CI forever is not a
// regression test. The ceiling is far above the deadlines they exercise.
test("headers flushed, body remains silent - the download still times out", { timeout: 15_000 }, async () => {
  await withServer(flushHeadersThenSilence, async (base) => {
    const started = Date.now();
    await assert.rejects(
      () => fetchImageBuffer(`${base}/x.jpg`, {
        // The per-request ceiling is deliberately far higher than the total one.
        // If this test ever passed because the client gave up waiting for
        // headers, it would have to take at least 5s; the total deadline is what
        // has to fire, and it has to fire while the body is awaited.
        fetchRemote: (input, options) => unguardedFetch(input, { ...options, timeoutMs: 5000 }),
        timeoutMs: 5000,
        totalTimeoutMs: 400,
      }),
      (error) => {
        assert.ok(error instanceof ImagePipelineError, "must use the module's error type");
        assert.equal(error.code, "fetch_timeout", "must be classified as a timeout");
        assert.equal(error.statusCode, 400);
        assert.doesNotMatch(error.message, /\d+\.\d+\.\d+\.\d+/, "must not echo an address");
        return true;
      },
    );
    assert.ok(
      Date.now() - started < 3000,
      "must abort on the total deadline, not on the per-request header timeout",
    );
  });
});

test("the deadline fires after headers arrive, not while waiting for them", { timeout: 15_000 }, async () => {
  // The distinction the previous version of this suite could not make. Both
  // shapes must time out, but only the second proves the body is covered, so
  // the test records whether headers were in hand when the clock ran out.
  const attempt = async (handler) => {
    let headersReceived = false;
    return withServer(handler, async (base) => {
      const error = await fetchImageBuffer(`${base}/x.jpg`, {
        fetchRemote: async (input, options) => {
          const result = await unguardedFetch(input, { ...options, timeoutMs: 400 });
          headersReceived = true;
          return result;
        },
        timeoutMs: 400,
        totalTimeoutMs: 400,
      }).then(() => null, (caught) => caught);
      return { headersReceived, error };
    });
  };

  // Headers never leave the server: the timeout belongs to the header wait.
  const beforeHeaders = await attempt((_request, response) => {
    response.writeHead(200, { "content-type": "image/jpeg" });
  });
  assert.equal(beforeHeaders.headersReceived, false, "headers must not have arrived");
  assert.equal(beforeHeaders.error?.code, "fetch_timeout");

  // Headers arrive, body never does: the timeout belongs to the body wait.
  const afterHeaders = await attempt(flushHeadersThenSilence);
  assert.equal(afterHeaders.headersReceived, true, "headers must have arrived first");
  assert.equal(afterHeaders.error?.code, "fetch_timeout");
  assert.ok(afterHeaders.error instanceof ImagePipelineError);
});

// ─── the guard is actually wired in ──────────────────────────────────────────

test("fetchImageBuffer refuses a private destination through the real guard", async () => {
  // No fetchRemote override: this is the production path.
  await assert.rejects(
    () => fetchImageBuffer("http://169.254.169.254/latest/meta-data/"),
    (error) => error instanceof ImagePipelineError && error.code === "url_rejected",
  );
});

test("fetchImageBuffer refuses localhost through the real guard", async () => {
  await assert.rejects(
    () => fetchImageBuffer("http://localhost/x.jpg"),
    (error) => error instanceof ImagePipelineError && error.code === "url_rejected",
  );
});

test("fetchImageBuffer refuses a non-http protocol through the real guard", async () => {
  await assert.rejects(
    () => fetchImageBuffer("file:///etc/passwd"),
    (error) => error instanceof ImagePipelineError && error.code === "url_rejected",
  );
});

test("a rejection message names the rule, not the resolved address", async () => {
  await assert.rejects(
    () => fetchImageBuffer("http://127.0.0.1/x.jpg"),
    (error) => {
      assert.equal(error.code, "url_rejected");
      assert.doesNotMatch(error.message, /\d+\.\d+\.\d+\.\d+/, "must not echo an address");
      return true;
    },
  );
});
