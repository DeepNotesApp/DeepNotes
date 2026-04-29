import { describe, expect, it } from "vitest";

import {
  panCameraByScreenDelta,
  screenToWorld,
  wheelPanCamera,
  wheelZoomCameraTowardScreenPoint,
  worldToScreen,
} from "./spatial-viewport-math";

describe("spatial-viewport-math", () => {
  const centerX = 400;
  const centerY = 300;
  const camX = 10;
  const camY = -20;
  const zoom = 1.25;

  it("round-trips world ↔ screen for a sample point", () => {
    const w = { x: 42, y: 55 };
    const s = worldToScreen(w.x, w.y, centerX, centerY, camX, camY, zoom);
    const w2 = screenToWorld(s.x, s.y, centerX, centerY, camX, camY, zoom);
    expect(w2.x).toBeCloseTo(w.x, 10);
    expect(w2.y).toBeCloseTo(w.y, 10);
  });

  it("wheel zoom keeps world point under cursor stable", () => {
    const screenX = 220;
    const screenY = 180;
    const worldBefore = screenToWorld(
      screenX,
      screenY,
      centerX,
      centerY,
      camX,
      camY,
      zoom,
    );
    const mult = 1.2;
    const next = wheelZoomCameraTowardScreenPoint({
      camX,
      camY,
      zoom,
      multiplier: mult,
      screenX,
      screenY,
      centerX,
      centerY,
      minZoom: 0.1,
      maxZoom: 10,
    });
    const worldAfter = screenToWorld(
      screenX,
      screenY,
      centerX,
      centerY,
      next.camX,
      next.camY,
      next.zoom,
    );
    expect(worldAfter.x).toBeCloseTo(worldBefore.x, 10);
    expect(worldAfter.y).toBeCloseTo(worldBefore.y, 10);
    expect(next.zoom).toBeCloseTo(zoom * mult, 10);
  });

  it("wheel pan shifts camera like legacy delta scaling", () => {
    const next = wheelPanCamera({
      camX: 0,
      camY: 0,
      zoom: 1,
      deltaX: 10,
      deltaY: -4,
      shiftKey: false,
    });
    expect(next.camX).toBeCloseTo(10 / 2, 10);
    expect(next.camY).toBeCloseTo(-4 / 2, 10);
  });

  it("pointer pan moves camera opposite to drag / zoom", () => {
    const next = panCameraByScreenDelta({
      camX: 5,
      camY: 5,
      zoom: 2,
      dx: 20,
      dy: 10,
    });
    expect(next.camX).toBe(5 - 10);
    expect(next.camY).toBe(5 - 5);
  });
});
