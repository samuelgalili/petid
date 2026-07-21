/**
 * The five stops of --gradient-primary (src/index.css).
 * Use for canvas/JS consumers (confetti etc.) that can't read CSS vars.
 * If the brand gradient changes, update BOTH places.
 */
export const MIPO_GRADIENT_STOPS = [
  "#FDBA74", // peach
  "#FB7185", // coral
  "#A78BFA", // violet
  "#60A5FA", // blue
  "#22D3EE", // cyan
] as const;
