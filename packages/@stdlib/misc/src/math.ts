export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function minmax(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function posMod(n, m) {
  return ((n % m) + m) % m;
}
