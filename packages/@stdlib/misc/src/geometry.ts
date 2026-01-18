import type { Line } from './line';
import type { Rect } from './rect';
import { Vec2 } from './vec2';

export function getLineRectIntersection(line: Line, rect: Rect): Vec2 | null {
  const result = liangBarsky(
    line.start,
    line.end,
    rect.topLeft,
    rect.bottomRight,
  );

  if (result == null) {
    return null;
  }

  return result[0];
}

function liangBarsky(l0: Vec2, l1: Vec2, r0: Vec2, r1: Vec2): Vec2[] | null {
  const { x: x0, y: y0 } = l0;
  const { x: x1, y: y1 } = l1;

  const { x: xmin, y: ymin } = r0;
  const { x: xmax, y: ymax } = r1;

  let t0 = 0;
  let t1 = 1;

  const dx = x1 - x0;
  const dy = y1 - y0;

  let p = 0;
  let q = 0;
  let r: number;

  for (let edge = 0; edge < 4; edge++) {
    // Traverse through left, right, bottom, top edges.
    if (edge === 0) {
      p = -dx;
      q = -(xmin - x0);
    } else if (edge === 1) {
      p = dx;
      q = xmax - x0;
    } else if (edge === 2) {
      p = -dy;
      q = -(ymin - y0);
    } else if (edge === 3) {
      p = dy;
      q = ymax - y0;
    }

    r = q / p;

    if (p === 0 && q < 0) return null; // Don't draw line at all. (parallel line outside)

    if (p < 0) {
      if (r > t1)
        return null; // Don't draw line at all.
      else if (r > t0) t0 = r; // Line is clipped!
    } else if (p > 0) {
      if (r < t0)
        return null; // Don't draw line at all.
      else if (r < t1) t1 = r; // Line is clipped!
    }
  }

  return [
    new Vec2(x0 + t0 * dx, y0 + t0 * dy),
    new Vec2(x0 + t1 * dx, y0 + t1 * dy),
  ];
}
