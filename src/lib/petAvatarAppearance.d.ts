export type AvatarSpecies = "dog" | "cat";
export type AvatarEars = "pointed" | "floppy" | "folded";
export type Rgb = [number, number, number];

export type AvatarLook = {
  species: AvatarSpecies;
  coat: Rgb;
  markings: Rgb;
  ears: AvatarEars;
  bodyLength: number;
  headScale: number;
  legScale: number;
};

export type PetAppearanceInput = {
  type?: string | null;
  pet_type?: string | null;
  breed?: string | null;
  color?: string | null;
  colour?: string | null;
  name?: string | null;
} | null | undefined;

export function appearanceFromPet(pet: PetAppearanceInput): AvatarLook;

export function isWeakDevice(nav?: { deviceMemory?: number }): boolean;
