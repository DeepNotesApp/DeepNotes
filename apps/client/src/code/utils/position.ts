import { posMod } from '@stdlib/misc';

export type CSSPosition = 'left' | 'top' | 'right' | 'bottom';

export function posToIndex(pos: CSSPosition) {
  switch (pos) {
    case 'left':
      return 0;
    case 'top':
      return 1;
    case 'right':
      return 2;
    case 'bottom':
      return 3;
  }
}

export function indexToPos(index: number): CSSPosition {
  switch (posMod(index, 4)) {
    case 0:
      return 'left';
    case 1:
      return 'top';
    case 2:
      return 'right';
    case 3:
      return 'bottom';
    default:
      return 'top';
  }
}

export function indexToPosBasis(index: number): CSSPosition {
  if (posMod(index, 2) === 0) {
    return 'left';
  } else {
    return 'top';
  }
}
export function posToBasis(pos: CSSPosition): CSSPosition {
  return indexToPosBasis(posToIndex(pos));
}

export function flipPos(pos: CSSPosition): CSSPosition {
  return indexToPos(posToIndex(pos) + 2);
}
export function flipPosBasis(basis: CSSPosition): CSSPosition {
  if (basis === 'left') {
    return 'top';
  } else {
    return 'left';
  }
}
