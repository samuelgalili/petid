/**
 * Code 128 subset B, enough to print an order number the warehouse can scan.
 *
 * Written out rather than pulled from a package: it is a lookup table and a
 * checksum, the output has to be inlined into a print window that loads no
 * scripts, and a barcode that silently encodes the wrong thing is worse than
 * no barcode at all — so it is small enough to verify directly.
 */

// One entry per symbol value 0..106. Each digit is the width, in modules, of
// alternating bars and spaces starting with a bar. Every pattern is 11 modules
// wide; the stop pattern at 106 is 13.
const PATTERNS = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312",
  "132212", "221213", "221312", "231212", "112232", "122132", "122231", "113222",
  "123122", "123221", "223211", "221132", "221231", "213212", "223112", "312131",
  "311222", "321122", "321221", "312212", "322112", "322211", "212123", "212321",
  "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313",
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121",
  "313121", "211331", "231131", "213113", "213311", "213131", "311123", "311321",
  "331121", "312113", "312311", "332111", "314111", "221411", "431111", "111224",
  "111422", "121124", "121421", "141122", "141221", "112214", "112412", "122114",
  "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111",
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112",
  "421211", "212141", "214121", "412121", "111143", "111341", "131141", "114113",
  "114311", "411113", "411311", "113141", "114131", "311141", "411131", "211412",
  "211214", "211232", "2331112",
];

const START_B = 104;
const STOP = 106;
const QUIET_ZONE_MODULES = 10;

/** Code 128 B covers printable ASCII, space through tilde. */
export const isEncodableInCode128B = (value: string): boolean =>
  value.length > 0 && [...value].every((character) => {
    const code = character.charCodeAt(0);
    return code >= 32 && code <= 126;
  });

export const code128BSymbolValues = (value: string): number[] => {
  const data = [...value].map((character) => character.charCodeAt(0) - 32);
  // The checksum weights the start value by 1 and each data value by its
  // one-based position.
  const weighted = data.reduce((sum, symbol, index) => sum + symbol * (index + 1), START_B);
  return [START_B, ...data, weighted % 103, STOP];
};

/**
 * Bar and space widths, in modules, starting with a bar. Quiet zones are the
 * caller's business; `renderCode128Svg` adds them.
 */
export const code128BWidths = (value: string): number[] =>
  code128BSymbolValues(value).flatMap((symbol) => [...PATTERNS[symbol]].map(Number));

export interface Code128SvgOptions {
  /** Width of one module. Whole numbers keep the bars crisp in print. */
  moduleWidth?: number;
  height?: number;
  quietZone?: boolean;
}

/**
 * A self-contained SVG. Returns null when the text cannot be encoded, so a
 * caller can leave the barcode off rather than print a misleading one.
 */
export const renderCode128Svg = (
  value: string,
  { moduleWidth = 2, height = 60, quietZone = true }: Code128SvgOptions = {},
): string | null => {
  if (!isEncodableInCode128B(value)) return null;

  const widths = code128BWidths(value);
  const quiet = quietZone ? QUIET_ZONE_MODULES : 0;
  const totalModules = widths.reduce((sum, width) => sum + width, 0) + quiet * 2;

  const bars: string[] = [];
  let position = quiet;
  widths.forEach((width, index) => {
    // Even indices are bars, odd are spaces.
    if (index % 2 === 0) {
      bars.push(`<rect x="${position * moduleWidth}" y="0" width="${width * moduleWidth}" height="${height}" />`);
    }
    position += width;
  });

  const svgWidth = totalModules * moduleWidth;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${height}"`,
    ` viewBox="0 0 ${svgWidth} ${height}" shape-rendering="crispEdges" fill="#000"`,
    // A long order number would otherwise run past the edge of a 10cm label.
    // The intrinsic size stays, so a barcode that fits prints at full size and
    // a longer one scales down proportionally rather than being cut off.
    ` style="max-width:100%;height:auto;display:block;margin:0 auto">`,
    `<rect x="0" y="0" width="${svgWidth}" height="${height}" fill="#fff" />`,
    bars.join(""),
    "</svg>",
  ].join("");
};

/** A `data:` URI, for use as an `<img src>` inside a print window. */
export const code128DataUri = (value: string, options?: Code128SvgOptions): string | null => {
  const svg = renderCode128Svg(value, options);
  return svg ? `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}` : null;
};
