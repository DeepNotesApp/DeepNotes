import type { Vec2 } from './vec2';

export function getClosestPathPointLength(path: SVGPathElement, pos: Vec2) {
  let closestPointLength = 0;
  let minDistance = Infinity;

  for (let i = 0; i <= path.getTotalLength(); i++) {
    const point = path.getPointAtLength(i);
    const distance = (point.x - pos.x) ** 2 + (point.y - pos.y) ** 2;

    if (distance < minDistance) {
      minDistance = distance;
      closestPointLength = i;
    }
  }

  return closestPointLength;
}

export function getClosestPathPointPercent(path: SVGPathElement, pos: Vec2) {
  return getClosestPathPointLength(path, pos) / path.getTotalLength();
}
