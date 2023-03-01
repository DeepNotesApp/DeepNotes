export function getFullKey(
  prefix: string,
  suffix: string,
  field: string,
): string {
  return `${prefix}:${suffix}>${field}`;
}
