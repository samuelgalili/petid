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

/**
 * The logo's own gradients, sampled off the brand artwork rather than reused
 * from MIPO_GRADIENT_STOPS above — the mark needs the exact colours, the
 * confetti only needs the family.
 *
 * The M and the smile carry separate gradients: in the artwork the smile's left
 * tip is peach while the M at the same x is coral, which one shared gradient
 * cannot produce.
 *
 * The M's axis is not the obvious diagonal. Solving for the direction that
 * gives the left shoulder and the left peak the same colour lands on (34, 36),
 * about 47 degrees, along which every sampled colour falls in order. The
 * offsets are those measured colours at their measured positions on that axis.
 */
export const MIPO_MARK_GRADIENT = {
  x1: 93, y1: 26, x2: 292, y2: 236.7,
  stops: [
    [0, "#FEB779"], [0.135, "#FF9D82"], [0.235, "#FE8A8B"], [0.27, "#F68BA9"],
    [0.465, "#C387F5"], [0.635, "#8992F9"], [0.848, "#60B9FB"], [1, "#56D5F5"],
  ],
} as const;

export const MIPO_SMILE_GRADIENT = {
  x1: 12, y1: 0, x2: 369, y2: 0,
  stops: [
    [0, "#FFC17E"], [0.134, "#FEA680"], [0.246, "#FB9392"], [0.387, "#F188CD"],
    [0.515, "#B88EF2"], [0.639, "#73A3F7"], [0.778, "#54C3FB"], [0.891, "#57D8EE"],
    [1, "#5ADDF1"],
  ],
} as const;

export const MIPO_DOT_COLOR = "#5DE2F3";
