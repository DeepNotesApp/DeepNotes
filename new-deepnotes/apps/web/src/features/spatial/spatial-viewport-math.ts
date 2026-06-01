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

/** Compute camera position and zoom to fit world bounds inside a viewport. */
export function fitCameraToBounds(input: {
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  viewportWidth: number;
  viewportHeight: number;
  centerScreenX: number;
  centerScreenY: number;
  screenLeft: number;
  screenTop: number;
  minZoom: number;
  maxZoom: number;
  padding?: number;
}): { camX: number; camY: number; zoom: number } {
  const {
    bounds,
    viewportWidth,
    viewportHeight,
    centerScreenX,
    centerScreenY,
    screenLeft,
    screenTop,
    minZoom,
    maxZoom,
    padding = 40,
  } = input;

  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;

  if (width === 0 && height === 0) {
    return { camX: 0, camY: 0, zoom: clampZoom(1, minZoom, maxZoom) };
  }

  const zoomX = (viewportWidth - padding * 2) / width;
  const zoomY = (viewportHeight - padding * 2) / height;
  const targetZoom = clampZoom(Math.min(zoomX, zoomY), minZoom, maxZoom);

  const boundsCenterX = bounds.minX + width / 2;
  const boundsCenterY = bounds.minY + height / 2;

  const camX = boundsCenterX - (centerScreenX - screenLeft) / targetZoom;
  const camY = boundsCenterY - (centerScreenY - screenTop) / targetZoom;

  return { camX, camY, zoom: targetZoom };
}
