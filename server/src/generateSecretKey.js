import { generateSecretKeyMaterial } from "./secretBox.js";

// Prints one 256-bit key for SECRET_ENCRYPTION_KEY. Store it in AWS SSM as a
// SecureString and nowhere else: losing it makes every sealed secret in the
// database unreadable, and leaking it makes them all readable.
const keyId = String(process.argv[2] || "").trim();
const material = generateSecretKeyMaterial();

process.stdout.write(`${keyId ? `${keyId}:${material}` : material}\n`);
