import { randomInt } from "node:crypto";
import { hashPassword, verifyPassword } from "./passwords.js";

// Crockford base32 without I, L, O and U: nothing in the set can be misread
// from a printed sheet, and nothing spells a word by accident.
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const GROUP_LENGTH = 5;
const GROUPS = 3;

export const RECOVERY_CODE_COUNT = 10;
export const RECOVERY_CODE_LENGTH = GROUP_LENGTH * GROUPS;

const randomGroup = () => {
  let group = "";
  for (let index = 0; index < GROUP_LENGTH; index += 1) {
    group += ALPHABET[randomInt(ALPHABET.length)];
  }
  return group;
};

export const generateRecoveryCode = () =>
  Array.from({ length: GROUPS }, randomGroup).join("-");

export const generateRecoveryCodes = (count = RECOVERY_CODE_COUNT) =>
  Array.from({ length: count }, generateRecoveryCode);

/**
 * Strips the formatting a person is likely to add or drop when typing a code
 * back in, so "abcde fghij-klmno" matches "ABCDE-FGHIJ-KLMNO".
 */
export const normalizeRecoveryCode = (value) =>
  String(value || "").toUpperCase().replace(/[^0-9A-Z]/g, "");

export const isWellFormedRecoveryCode = (value) => {
  const normalized = normalizeRecoveryCode(value);
  if (normalized.length !== RECOVERY_CODE_LENGTH) return false;
  return [...normalized].every((character) => ALPHABET.includes(character));
};

// Recovery codes are as powerful as a password, so they are stored with the
// same scrypt hashing and never in the clear.
export const hashRecoveryCode = (code) => hashPassword(normalizeRecoveryCode(code));

export const verifyRecoveryCode = (code, codeHash) =>
  verifyPassword(normalizeRecoveryCode(code), codeHash);
