/**
 * DeepNotes legacy color palette.
 * Matches exactly the colors from apps/client/src/code/pages/colors.ts
 */

export type ColorName =
  | 'grey'
  | 'red'
  | 'brown'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'teal'
  | 'sky'
  | 'blue'
  | 'violet'
  | 'purple'
  | 'pink'

export const noteColorMap: Record<ColorName, string> = {
  grey: '#2F2F2F',
  red: '#6C1313',
  brown: '#542D11',
  orange: '#7B2F07',
  yellow: '#776109',
  green: '#0E5428',
  teal: '#08564E',
  sky: '#065072',
  blue: '#102C7A',
  violet: '#3E177A',
  purple: '#4B1972',
  pink: '#61116B',
}

export const arrowColorMap: Record<ColorName, string> = {
  grey: '#858585',
  red: '#B80909',
  brown: '#81370E',
  orange: '#CC6200',
  yellow: '#C19700',
  green: '#13A906',
  teal: '#14B8A6',
  sky: '#0EA5E9',
  blue: '#1D4ED8',
  violet: '#7F2DFF',
  purple: '#9C29FF',
  pink: '#C91CDA',
}

export interface ColorVariants {
  base: string;
  light: string;
  highlight: string;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.replace("#", "");
  if (clean.length !== 6 && clean.length !== 3) return null;
  const full = clean.length === 3
    ? clean.split("").map((c) => c + c).join("")
    : clean;
  const num = parseInt(full, 16);
  if (Number.isNaN(num)) return null;
  return {
    r: (num >> 16) & 0xff,
    g: (num >> 8) & 0xff,
    b: num & 0xff,
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => Math.round(n).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function lightenRgb(
  rgb: { r: number; g: number; b: number },
  ratio: number,
): { r: number; g: number; b: number } {
  return {
    r: rgb.r + (255 - rgb.r) * ratio,
    g: rgb.g + (255 - rgb.g) * ratio,
    b: rgb.b + (255 - rgb.b) * ratio,
  };
}

export function lightenColor(hex: string, ratio: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const lightened = lightenRgb(rgb, Math.max(0, Math.min(1, ratio)));
  return rgbToHex(lightened.r, lightened.g, lightened.b);
}

export function resolveNoteColor(colorValue: string | undefined): string {
  return noteColorMap[colorValue as ColorName] ?? colorValue ?? noteColorMap.grey
}

export function resolveArrowColor(colorValue: string | undefined): string {
  return arrowColorMap[colorValue as ColorName] ?? colorValue ?? arrowColorMap.grey
}

export function resolveNoteColorVariants(colorValue: string | undefined): ColorVariants {
  const base = resolveNoteColor(colorValue)
  return {
    base,
    light: lightenColor(base, 0.35),
    highlight: lightenColor(base, 0.65),
  };
}
