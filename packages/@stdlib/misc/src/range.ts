export function rangeStop(start: number, stop: number, step = 1) {
  return Array.from(
    { length: (stop - start) / step + 1 },
    (_, i) => start + i * step,
  );
}

export function rangeCount(start: number, count: number, step = 1) {
  return Array.from({ length: count }, (_, i) => start + i * step);
}
