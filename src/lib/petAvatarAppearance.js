/**
 * Turns the pet record the app already has into a coat, ears and proportions
 * for the volume stand-in. No network, no model file.
 *
 * An explicit colour wins over the breed. The name only shifts the hue a
 * little, so two pets of the same breed are not copies of each other.
 */

const CAT_COAT = [0.62, 0.5, 0.42];
const DOG_COAT = [0.8, 0.58, 0.36];

const COLOURS = [
  { keys: ["שחור", "black"], rgb: [0.14, 0.12, 0.11] },
  { keys: ["לבן", "white"], rgb: [0.93, 0.91, 0.87] },
  { keys: ["אפור", "אפורה", "gray", "grey", "כסף", "silver"], rgb: [0.58, 0.59, 0.62] },
  { keys: ["זהוב", "זהובה", "זהב", "golden", "gold"], rgb: [0.86, 0.62, 0.26] },
  { keys: ["שוקולד", "chocolate", "חום", "חומה", "brown"], rgb: [0.42, 0.26, 0.14] },
  { keys: ["ג'ינג", "גינג", "ginger", "כתום", "orange"], rgb: [0.86, 0.42, 0.16] },
  { keys: ["קרם", "cream", "בז", "beige", "fawn"], rgb: [0.9, 0.8, 0.64] },
  { keys: ["אדום", "אדומה", "red"], rgb: [0.62, 0.2, 0.14] },
];

const BREEDS = [
  {
    keys: ["סיאמ", "siamese"],
    species: "cat",
    coat: [0.9, 0.82, 0.7],
    markings: [0.22, 0.16, 0.14],
    ears: "pointed",
    bodyLength: 1.08,
    headScale: 0.94,
  },
  {
    keys: ["פרסי", "persian"],
    species: "cat",
    coat: [0.9, 0.88, 0.84],
    ears: "folded",
    headScale: 1.18,
    bodyLength: 0.9,
  },
  {
    keys: ["בנגל", "bengal"],
    species: "cat",
    coat: [0.78, 0.55, 0.28],
    markings: [0.28, 0.18, 0.1],
    ears: "pointed",
    bodyLength: 1.06,
  },
  {
    keys: ["מיין", "maine"],
    species: "cat",
    coat: [0.55, 0.38, 0.24],
    ears: "pointed",
    bodyLength: 1.2,
    headScale: 1.05,
  },
  {
    keys: ["ספינקס", "sphynx"],
    species: "cat",
    coat: [0.86, 0.66, 0.58],
    ears: "pointed",
    headScale: 1.08,
  },
  {
    keys: ["גולדן", "golden retriever"],
    species: "dog",
    coat: [0.86, 0.62, 0.26],
    ears: "floppy",
    bodyLength: 1.16,
  },
  {
    keys: ["לברדור", "labrador"],
    species: "dog",
    coat: [0.72, 0.52, 0.26],
    ears: "floppy",
    bodyLength: 1.12,
  },
  {
    keys: ["האסקי", "husky"],
    species: "dog",
    coat: [0.82, 0.83, 0.84],
    markings: [0.22, 0.24, 0.3],
    ears: "pointed",
    bodyLength: 1.1,
  },
  {
    keys: ["רועה גרמני", "german shepherd", "ג'רמן"],
    species: "dog",
    coat: [0.72, 0.48, 0.24],
    markings: [0.16, 0.12, 0.1],
    ears: "pointed",
    bodyLength: 1.14,
  },
  {
    keys: ["פודל", "poodle"],
    species: "dog",
    coat: [0.9, 0.88, 0.86],
    ears: "floppy",
    headScale: 1.08,
  },
  {
    keys: ["בולדוג", "bulldog"],
    species: "dog",
    coat: [0.82, 0.68, 0.56],
    ears: "folded",
    bodyLength: 0.82,
    headScale: 1.16,
    legScale: 0.72,
  },
  {
    keys: ["צ'יוואווה", "ציוואווה", "chihuahua"],
    species: "dog",
    ears: "pointed",
    headScale: 1.28,
    bodyLength: 0.74,
    legScale: 0.78,
  },
  {
    keys: ["קורגי", "corgi"],
    species: "dog",
    coat: [0.84, 0.54, 0.22],
    ears: "pointed",
    bodyLength: 1.28,
    legScale: 0.62,
  },
  {
    keys: ["תחש", "dachshund"],
    species: "dog",
    ears: "floppy",
    bodyLength: 1.36,
    legScale: 0.58,
  },
  {
    keys: ["שפיץ", "פומר", "pomeranian"],
    species: "dog",
    coat: [0.9, 0.78, 0.5],
    ears: "pointed",
    headScale: 1.16,
    bodyLength: 0.8,
  },
];

const CAT_HINTS = ["חתול", "cat", "סיאמ", "siamese", "פרסי", "persian", "בנגל", "bengal", "מיין", "maine"];

const clamp01 = (value) => Math.min(1, Math.max(0, value));

const normalize = (value) => String(value || "").trim().toLowerCase().replace(/['’]/g, "");

const hashName = (name) => {
  const text = String(name || "");
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  return hash;
};

const rgbToHsl = (r, g, b) => {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h / 6, s, l];
};

const hueChannel = (p, q, t) => {
  let x = t;
  if (x < 0) x += 1;
  if (x > 1) x -= 1;
  if (x < 1 / 6) return p + (q - p) * 6 * x;
  if (x < 1 / 2) return q;
  if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
  return p;
};

const hslToRgb = (h, s, l) => {
  if (s === 0) return [l, l, l];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [hueChannel(p, q, h + 1 / 3), hueChannel(p, q, h), hueChannel(p, q, h - 1 / 3)];
};

const shiftRgb = (rgb, name, amount) => {
  if (!name || amount <= 0) return rgb;
  const [h, s, l] = rgbToHsl(rgb[0], rgb[1], rgb[2]);
  const hash = hashName(name);
  const hueShift = ((hash % 1000) / 1000 - 0.5) * 2 * amount;
  const lightShift = ((((hash >>> 3) % 1000) / 1000) - 0.5) * amount;
  const next = hslToRgb((h + hueShift + 1) % 1, s, clamp01(l + lightShift));
  return [clamp01(next[0]), clamp01(next[1]), clamp01(next[2])];
};

const colourFromText = (text) => {
  const normalized = normalize(text);
  if (!normalized) return null;
  const hex = normalized.match(/^#([0-9a-f]{6})$/);
  if (hex) {
    const value = Number.parseInt(hex[1], 16);
    return [(value >> 16) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];
  }
  for (const entry of COLOURS) {
    if (entry.keys.some((key) => normalized.includes(key))) return entry.rgb;
  }
  return null;
};

const matchBreed = (breed) => {
  const normalized = normalize(breed);
  if (!normalized) return null;
  return BREEDS.find((entry) => entry.keys.some((key) => normalized.includes(key))) || null;
};

const speciesOf = (pet, breed) => {
  const raw = normalize(pet?.type || pet?.pet_type);
  if (raw === "cat" || raw === "חתול" || raw === "feline") return "cat";
  if (raw === "dog" || raw === "כלב" || raw === "canine") return "dog";
  const breedText = normalize(breed);
  if (CAT_HINTS.some((hint) => breedText.includes(hint))) return "cat";
  return "dog";
};

const baseFor = (species) => (
  species === "cat"
    ? { ears: "pointed", bodyLength: 1, headScale: 1, legScale: 1, coat: CAT_COAT, markings: CAT_COAT }
    : { ears: "floppy", bodyLength: 1, headScale: 1, legScale: 1, coat: DOG_COAT, markings: DOG_COAT }
);

/**
 * @param {object | null | undefined} pet
 * @returns {{
 *   species: "dog" | "cat",
 *   coat: [number, number, number],
 *   markings: [number, number, number],
 *   ears: "pointed" | "floppy" | "folded",
 *   bodyLength: number,
 *   headScale: number,
 *   legScale: number,
 * }}
 */
export const appearanceFromPet = (pet) => {
  const breed = matchBreed(pet?.breed);
  const species = breed?.species && !normalize(pet?.type || pet?.pet_type)
    ? breed.species
    : speciesOf(pet, pet?.breed);
  const base = baseFor(species);
  const explicit = colourFromText(pet?.color || pet?.colour);
  const coat = explicit || breed?.coat || base.coat;
  const markings = breed?.markings || coat;
  const amount = explicit ? 0.025 : 0.06;
  const name = pet?.name;
  return {
    species,
    coat: shiftRgb(coat, name, amount),
    markings: shiftRgb(markings, name, amount),
    ears: breed?.ears || base.ears,
    bodyLength: breed?.bodyLength || base.bodyLength,
    headScale: breed?.headScale || base.headScale,
    legScale: breed?.legScale || base.legScale,
  };
};

/**
 * Low-memory devices skip the canvas and keep the photo.
 * Core count alone is not a signal: a test browser often reports two cores.
 *
 * @param {Navigator | { deviceMemory?: number } | undefined} [nav]
 */
export const isWeakDevice = (nav) => {
  const source = nav || (typeof navigator === "undefined" ? undefined : navigator);
  const memory = source && source.deviceMemory;
  return typeof memory === "number" && memory > 0 && memory <= 2;
};
