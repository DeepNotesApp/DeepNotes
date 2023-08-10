import { roundToMultiple } from 'src/code/utils/math';

export function roundTimeToMinutes(value: number): number {
  return roundToMultiple(value, {
    base: 60 * 1000,
    roundFunc: Math.floor,
  });
}
