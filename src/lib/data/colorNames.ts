// Maps common apparel color names to a representative hex swatch, so the
// admin product form can preview a color as it's typed. Not exhaustive -
// anything unrecognized just leaves the current swatch untouched.

const COLOR_NAME_HEX: Record<string, string> = {
  black: "#000000",
  white: "#ffffff",
  ivory: "#fffff0",
  cream: "#fffdd0",
  beige: "#f5f5dc",
  nude: "#e3bc9a",
  tan: "#d2b48c",
  camel: "#c19a6b",
  khaki: "#c3b091",
  brown: "#78350f",
  rust: "#b7410e",
  maroon: "#800000",
  wine: "#722f37",
  red: "#dc2626",
  rose: "#e11d48",
  pink: "#ec4899",
  blush: "#f4c2c2",
  coral: "#ff7f50",
  peach: "#ffcba4",
  orange: "#f97316",
  mustard: "#d4a017",
  gold: "#d4af37",
  yellow: "#eab308",
  olive: "#65722f",
  green: "#16a34a",
  mint: "#86efac",
  teal: "#0d9488",
  turquoise: "#14b8a6",
  navy: "#1e3a8a",
  blue: "#2563eb",
  purple: "#7c3aed",
  lavender: "#c4b5fd",
  plum: "#8e4585",
  grey: "#6b7280",
  gray: "#6b7280",
  charcoal: "#36454f",
  silver: "#c0c0c0",
};

export function hexForColorName(name: string): string | undefined {
  return COLOR_NAME_HEX[name.trim().toLowerCase()];
}

function parseHex(hex: string): [number, number, number] | undefined {
  const match = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!match) {
    return undefined;
  }
  const value = match[1];
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
  ];
}

/** The reverse of `hexForColorName` - given a swatch hex (e.g. from the color
 *  picker), finds the closest named color by straight-line RGB distance, so
 *  picking a color can fill in a sensible name automatically instead of
 *  leaving the admin to type one from scratch. */
export function nameForHex(hex: string): string | undefined {
  const rgb = parseHex(hex);
  if (!rgb) {
    return undefined;
  }

  let closestName: string | undefined;
  let closestDistance = Infinity;

  for (const [name, candidateHex] of Object.entries(COLOR_NAME_HEX)) {
    const candidateRgb = parseHex(candidateHex);
    if (!candidateRgb) continue;
    const distance =
      (rgb[0] - candidateRgb[0]) ** 2 +
      (rgb[1] - candidateRgb[1]) ** 2 +
      (rgb[2] - candidateRgb[2]) ** 2;
    if (distance < closestDistance) {
      closestDistance = distance;
      closestName = name;
    }
  }

  return closestName ? closestName.charAt(0).toUpperCase() + closestName.slice(1) : undefined;
}
