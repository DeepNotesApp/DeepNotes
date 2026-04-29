/**
 * Pure camera math for a legacy-style infinite canvas: world coordinates under a
 * viewport center, uniform zoom. Matches legacy wheel pan exponent (zoom^0.8)
 * from apps/client zooming.ts where applicable.
 */

export type Vec2 = { x: number; y: number };

export function screenToWorld(
  screenX: number,
  screenY: number,
  centerX: number,
  centerY: number,
  camX: number,
  camY: number,
  zoom: number,
): Vec2 {
  return {
    x: camX + (screenX - centerX) / zoom,
    y: camY + (screenY - centerY) / zoom,
  };
}

export function worldToScreen(
  worldX: number,
  worldY: number,
  centerX: number,
  centerY: number,
  camX: number,
  camY: number,
  zoom: number,
): Vec2 {
  return {
    x: centerX + (worldX - camX) * zoom,
    y: centerY + (worldY - camY) * zoom,
  };
}

export function wheelZoomCameraTowardScreenPoint(input: {
  camX: number;
  camY: number;
  zoom: number;
  multiplier: number;
  screenX: number;
  screenY: number;
  centerX: number;
  centerY: number;
  minZoom: number;
  maxZoom: number;
}): { camX: number; camY: number; zoom: number } {
  const {
    camX,
    camY,
    zoom,
    multiplier,
    screenX,
    screenY,
    centerX,
    centerY,
    minZoom,
    maxZoom,
  } = input;
  const zNext = Math.min(maxZoom, Math.max(minZoom, zoom * multiplier));
  if (zNext === zoom) {
    return { camX, camY, zoom };
  }
  const camXNext = camX + (screenX - centerX) * (1 / zoom - 1 / zNext);
  const camYNext = camY + (screenY - centerY) * (1 / zoom - 1 / zNext);
  return { camX: camXNext, camY: camYNext, zoom: zNext };
}

/** Legacy-style scroll-wheel pan (non-Ctrl). */
export function wheelPanCamera(input: {
  camX: number;
  camY: number;
  zoom: number;
  deltaX: number;
  deltaY: number;
  shiftKey: boolean;
}): { camX: number; camY: number } {
  const { camX, camY, zoom, deltaX, deltaY, shiftKey } = input;
  const dx = shiftKey ? deltaY : deltaX;
  const dy = shiftKey ? deltaX : deltaY;
  const scale = Math.pow(zoom, 0.8) * 2;
  return {
    camX: camX + dx / scale,
    camY: camY + dy / scale,
  };
}

/** Pointer drag pan: screen delta moves camera in world space (inverse of zoom). */
export function panCameraByScreenDelta(input: {
  camX: number;
  camY: number;
  zoom: number;
  dx: number;
  dy: number;
}): { camX: number; camY: number } {
  return {
    camX: input.camX - input.dx / input.zoom,
    camY: input.camY - input.dy / input.zoom,
  };
}

export function clampZoom(zoom: number, minZoom: number, maxZoom: number): number {
  return Math.min(maxZoom, Math.max(minZoom, zoom));
}
