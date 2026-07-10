import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { Agent } from "undici";

const blockedHostSuffixes = [
  ".localhost",
  ".local",
  ".internal",
  ".lan",
  ".home",
  ".arpa",
  ".test",
  ".invalid",
  ".example",
];

const urlError = (message) => Object.assign(new Error(message), { statusCode: 400 });

const isBlockedIpv4 = (address) => {
  const octets = address.split(".").map(Number);
  if (octets.length !== 4 || octets.some((value) => !Number.isInteger(value) || value < 0 || value > 255)) return true;
  const [first, second, third] = octets;
  return first === 0
    || first === 10
    || first === 127
    || first >= 224
    || (first === 100 && second >= 64 && second <= 127)
    || (first === 169 && second === 254)
    || (first === 172 && second >= 16 && second <= 31)
    || (first === 192 && second === 168)
    || (first === 192 && second === 0 && third === 0)
    || (first === 192 && second === 0 && third === 2)
    || (first === 192 && second === 88 && third === 99)
    || (first === 198 && (second === 18 || second === 19))
    || (first === 198 && second === 51 && third === 100)
    || (first === 203 && second === 0 && third === 113);
};

const isBlockedIpv6 = (address) => {
  const normalized = address.toLowerCase().replace(/^\[|\]$/g, "").split("%")[0];
  if (normalized === "::" || normalized === "::1" || normalized.startsWith("::")) return true;
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
  if (/^fe[89ab]/.test(normalized) || normalized.startsWith("ff")) return true;
  if (normalized.startsWith("2001:db8:") || normalized === "2001:db8::") return true;
  if (normalized.startsWith("2001:0:") || normalized.startsWith("2002:")) return true;
  if (normalized.startsWith("64:ff9b:")) return true;

  const firstHextet = Number.parseInt(normalized.split(":")[0], 16);
  return !Number.isInteger(firstHextet) || firstHextet < 0x2000 || firstHextet > 0x3fff;
};

export const isPrivateOrReservedIp = (address) => {
  const normalized = String(address || "").replace(/^\[|\]$/g, "");
  const family = isIP(normalized);
  if (family === 4) return isBlockedIpv4(normalized);
  if (family === 6) return isBlockedIpv6(normalized);
  return true;
};

export const createConnectionSafeLookup = (lookupFn = lookup) => (hostname, options, callback) => {
  lookupFn(hostname, {
    all: true,
    verbatim: true,
    family: options?.family || 0,
  }).then((addresses) => {
    if (addresses.length === 0 || addresses.some(({ address }) => isPrivateOrReservedIp(address))) {
      callback(urlError("URL resolved to a non-public network address"));
      return;
    }
    if (options?.all) {
      callback(null, addresses);
      return;
    }
    callback(null, addresses[0].address, addresses[0].family);
  }).catch((error) => callback(error));
};

const safeRemoteDispatcher = new Agent({
  connect: { lookup: createConnectionSafeLookup() },
});

export const validateRemoteHttpUrl = async (input, { lookupFn = lookup } = {}) => {
  let url;
  try {
    url = new URL(String(input || ""));
  } catch {
    throw urlError("A valid URL is required");
  }

  if (!["http:", "https:"].includes(url.protocol)) throw urlError("Only HTTP and HTTPS URLs are supported");
  if (url.username || url.password) throw urlError("URLs containing credentials are not supported");
  if (url.href.length > 2048) throw urlError("URL is too long");

  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
  if (!hostname
    || hostname === "localhost"
    || (!hostname.includes(".") && isIP(hostname) === 0)
    || blockedHostSuffixes.some((suffix) => hostname.endsWith(suffix))) {
    throw urlError("URL hostname is not allowed");
  }

  if (isIP(hostname)) {
    if (isPrivateOrReservedIp(hostname)) throw urlError("URL must use a public network address");
    return url;
  }

  let addresses;
  try {
    addresses = await lookupFn(hostname, { all: true, verbatim: true });
  } catch {
    throw urlError("URL hostname could not be resolved");
  }
  if (!Array.isArray(addresses) || addresses.length === 0 || addresses.some(({ address }) => isPrivateOrReservedIp(address))) {
    throw urlError("URL must resolve only to public network addresses");
  }
  return url;
};

export const fetchValidatedRemoteUrl = async (input, {
  headers = {},
  timeoutMs = 35_000,
  maxRedirects = 5,
  fetchFn = fetch,
  lookupFn = lookup,
} = {}) => {
  let currentUrl = await validateRemoteHttpUrl(input, { lookupFn });

  for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    let response;
    try {
      response = await fetchFn(currentUrl, {
        method: "GET",
        headers,
        redirect: "manual",
        signal: controller.signal,
        dispatcher: safeRemoteDispatcher,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (response.status < 300 || response.status >= 400) {
      return { response, finalUrl: currentUrl.toString() };
    }

    if (redirectCount === maxRedirects) throw urlError("Too many URL redirects");
    const location = response.headers.get("location");
    if (!location) throw urlError("Remote server returned an invalid redirect");
    await response.body?.cancel().catch(() => {});
    currentUrl = await validateRemoteHttpUrl(new URL(location, currentUrl).toString(), { lookupFn });
  }

  throw urlError("Too many URL redirects");
};
