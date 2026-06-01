export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Vec2 {
  x: number;
  y: number;
}

/**
 * Find the intersection point of a line from (x1,y1) to (x2,y2) with a rectangle.
 * Returns the point on the rectangle edge closest to (x2,y2).
 */
export function lineRectIntersection(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  rect: Rect,
): Vec2 {
  const rx = rect.x;
  const ry = rect.y;
  const rw = rect.width;
  const rh = rect.height;
  const cx = rx + rw / 2;
  const cy = ry + rh / 2;

  // Direction from rect center to target point
  const dx = x2 - cx;
  const dy = y2 - cy;

  if (dx === 0 && dy === 0) {
    return { x: cx, y: cy };
  }

  // Scale factor to reach the rectangle edge
  // We want to find t such that (cx + t*dx, cy + t*dy) is on the rect boundary
  const scaleX = rw / 2 / Math.abs(dx || 1);
  const scaleY = rh / 2 / Math.abs(dy || 1);
  const t = Math.min(scaleX, scaleY);

  return {
    x: cx + t * dx,
    y: cy + t * dy,
  };
}

/**
 * Compute arrow start/end points with rectangle-edge intersection for line body.
 */
export function computeArrowEndpoints(
  sourcePos: Vec2,
  targetPos: Vec2,
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
  useEdgeIntersection: boolean,
): {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
} {
  if (!useEdgeIntersection) {
    return {
      x1: sourcePos.x + sourceWidth / 2,
      y1: sourcePos.y + sourceHeight / 2,
      x2: targetPos.x + targetWidth / 2,
      y2: targetPos.y + targetHeight / 2,
    };
  }

  // Center points
  const scx = sourcePos.x + sourceWidth / 2;
  const scy = sourcePos.y + sourceHeight / 2;
  const tcx = targetPos.x + targetWidth / 2;
  const tcy = targetPos.y + targetHeight / 2;

  // Find intersection on source rect from source center toward target center
  const sourceIntersect = lineRectIntersection(
    scx,
    scy,
    tcx,
    tcy,
    { x: sourcePos.x, y: sourcePos.y, width: sourceWidth, height: sourceHeight },
  );

  // Find intersection on target rect from target center toward source center
  const targetIntersect = lineRectIntersection(
    tcx,
    tcy,
    scx,
    scy,
    { x: targetPos.x, y: targetPos.y, width: targetWidth, height: targetHeight },
  );

  return {
    x1: sourceIntersect.x,
    y1: sourceIntersect.y,
    x2: targetIntersect.x,
    y2: targetIntersect.y,
  };
}
