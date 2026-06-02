/**
 * DeepNotes legacy color palette.
 * Matches exactly the colors from apps/client/src/code/pages/colors.ts
 *
 * Light-mode variants are generated so notes remain readable on light
 * canvas backgrounds while preserving the same design language.
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

/** Legacy dark-mode note background colors. */
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

/** Light-mode note background colors (pastel variants). */
export const lightNoteColorMap: Record<ColorName, string> = {
  grey: '#F0F0F0',
  red: '#FFE0E0',
  brown: '#F5E6D6',
  orange: '#FFE8D0',
  yellow: '#FFF8D0',
  green: '#D8F5DE',
  teal: '#D0F5F0',
  sky: '#D0F0FF',
  blue: '#D8E0FF',
  violet: '#E8D8FF',
  purple: '#EDD8FF',
  pink: '#FFD8FF',
}

/** Legacy arrow colors (work well on both light and dark canvas). */
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

export function resolveNoteColor(
  colorValue: string | undefined,
  isDark = true,
): string {
  const map = isDark ? noteColorMap : lightNoteColorMap
  return map[colorValue as ColorName] ?? colorValue ?? map.grey
}

export function resolveArrowColor(colorValue: string | undefined): string {
  return arrowColorMap[colorValue as ColorName] ?? colorValue ?? arrowColorMap.grey
}

/** Note text color: white in dark mode, near-black in light mode. */
export function noteTextColor(isDark = true): string {
  return isDark ? '#ffffff' : '#1a1a1a'
}

/** Note border color for the given theme. */
export function noteBorderColor(isDark = true, selected = false): string {
  if (selected) return '#2196f3'
  return isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.2)'
}

/** Divider color for the given theme. */
export function noteDividerColor(isDark = true): string {
  return isDark ? 'rgba(255, 255, 255, 0.35)' : 'rgba(0, 0, 0, 0.15)'
}

export function resolveNoteColorVariants(colorValue: string | undefined): ColorVariants {
  const base = resolveNoteColor(colorValue)
  return {
    base,
    light: lightenColor(base, 0.35),
    highlight: lightenColor(base, 0.65),
  };
}
