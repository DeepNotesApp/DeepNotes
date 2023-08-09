export function roundToMultiple(
  value: number,
  params: { base: number; roundFunc?: (value: number) => number },
) {
  return (params.roundFunc ?? Math.round)(value / params.base) * params.base;
}
