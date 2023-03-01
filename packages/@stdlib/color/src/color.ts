import type Color from 'color';

export function lightenByRatio(color: Color, ratio: number) {
  const lightness = color.lightness();
  return color.lightness(lightness + (100 - lightness) * ratio);
}
export function darkenByRatio(color: Color, ratio: number) {
  const lightness = color.lightness();
  return color.lightness(lightness - lightness * ratio);
}

export function lightenByAmount(color: Color, amount: number) {
  const lightness = color.lightness();
  return color.lightness(lightness + amount);
}
export function darkenByAmount(color: Color, amount: number) {
  const lightness = color.lightness();
  return color.lightness(lightness - amount);
}
