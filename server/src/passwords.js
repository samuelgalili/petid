import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const saltBytes = 16;
const hashBytes = 64;
const base64UrlPattern = /^[A-Za-z0-9_-]+$/;

const decodeBase64Url = (value, expectedBytes) => {
  const expectedLength = Math.ceil((expectedBytes * 4) / 3);
  if (typeof value !== "string" || value.length !== expectedLength || !base64UrlPattern.test(value)) return null;

  const decoded = Buffer.from(value, "base64url");
  if (decoded.length !== expectedBytes || decoded.toString("base64url") !== value) return null;
  return decoded;
};

export const hashPassword = (password) => {
  const salt = randomBytes(saltBytes).toString("base64url");
  const hash = scryptSync(String(password), salt, hashBytes).toString("base64url");
  return `scrypt$${salt}$${hash}`;
};

export const verifyPassword = (password, passwordHash) => {
  if (typeof passwordHash !== "string") return false;

  const parts = passwordHash.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;

  const [, encodedSalt, encodedHash] = parts;
  const salt = decodeBase64Url(encodedSalt, saltBytes);
  const actualHash = decodeBase64Url(encodedHash, hashBytes);
  if (!salt || !actualHash) return false;

  try {
    const expectedHash = scryptSync(String(password), encodedSalt, hashBytes);
    return timingSafeEqual(actualHash, expectedHash);
  } catch {
    return false;
  }
};
