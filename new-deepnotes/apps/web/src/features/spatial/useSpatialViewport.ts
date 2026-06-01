import { onMounted, onUnmounted, ref, shallowRef, type Ref } from "vue";

import {
  clampZoom,
  fitCameraToBounds,
  panCameraByScreenDelta,
  wheelPanCamera,
  wheelZoomCameraTowardScreenPoint,
} from "./spatial-viewport-math";
import { shouldIgnoreSpaceForViewportPan } from "./spatial-keyboard";

export type UseSpatialViewportOptions = {
  minZoom?: number;
  maxZoom?: number;
};

/**
 * Legacy-aligned pan/zoom for an infinite canvas: Ctrl/Cmd+wheel zoom toward
 * cursor; plain wheel pans; middle mouse or Space+primary drag pans.
 */
export function useSpatialViewport(
  rootRef: Ref<HTMLElement | null>,
  options: UseSpatialViewportOptions = {},
) {
  const minZoom = options.minZoom ?? 0.12;
  const maxZoom = options.maxZoom ?? 4;

  const camX = ref(0);
  const camY = ref(0);
  const zoom = ref(1);

  const spaceDown = shallowRef(false);
  let panPointerId: number | null = null;
  let lastPanX = 0;
  let lastPanY = 0;

  // pinch state
  const activePointers = new Map<number, { x: number; y: number }>();
  let pinchStartDist = 0;
  let pinchStartZoom = 1;
  let pinchCenterX = 0;
  let pinchCenterY = 0;
  let pinchCamX = 0;
  let pinchCamY = 0;

  function getCenter(): { cx: number; cy: number; rect: DOMRect } | null {
    const el = rootRef.value;
    if (!el) {
      return null;
    }
    const rect = el.getBoundingClientRect();
    return {
      cx: rect.left + rect.width / 2,
      cy: rect.top + rect.height / 2,
      rect,
    };
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.code !== "Space" || e.repeat) {
      return;
    }
    if (shouldIgnoreSpaceForViewportPan(e.target)) {
      return;
    }
    e.preventDefault();
    spaceDown.value = true;
  }

  function onKeyUp(e: KeyboardEvent) {
    if (e.code === "Space") {
      spaceDown.value = false;
    }
  }

  function onWheel(e: WheelEvent) {
    const c = getCenter();
    if (!c) {
      return;
    }
    const ctrlOrMeta = e.ctrlKey || e.metaKey;
    if (ctrlOrMeta) {
      e.preventDefault();
      const mult = e.deltaY > 0 ? 1 / 1.2 : 1.2;
      const next = wheelZoomCameraTowardScreenPoint({
        camX: camX.value,
        camY: camY.value,
        zoom: zoom.value,
        multiplier: mult,
        screenX: e.clientX,
        screenY: e.clientY,
        centerX: c.cx,
        centerY: c.cy,
        minZoom,
        maxZoom,
      });
      camX.value = next.camX;
      camY.value = next.camY;
      zoom.value = next.zoom;
      return;
    }
    const pan = wheelPanCamera({
      camX: camX.value,
      camY: camY.value,
      zoom: zoom.value,
      deltaX: e.deltaX,
      deltaY: e.deltaY,
      shiftKey: e.shiftKey,
    });
    camX.value = pan.camX;
    camY.value = pan.camY;
  }

  function onPointerDown(e: PointerEvent) {
    const el = rootRef.value;
    if (!el) {
      return;
    }

    activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // pinch: two touch pointers
    if (activePointers.size === 2 && e.pointerType === "touch") {
      const pts = Array.from(activePointers.values());
      const dx = pts[1]!.x - pts[0]!.x;
      const dy = pts[1]!.y - pts[0]!.y;
      pinchStartDist = Math.hypot(dx, dy);
      pinchStartZoom = zoom.value;
      pinchCenterX = (pts[0]!.x + pts[1]!.x) / 2;
      pinchCenterY = (pts[0]!.y + pts[1]!.y) / 2;
      pinchCamX = camX.value;
      pinchCamY = camY.value;
      panPointerId = null;
      return;
    }

    const middle = e.button === 1;
    const spacePan = e.button === 0 && spaceDown.value;
    if (!middle && !spacePan) {
      return;
    }
    e.preventDefault();
    panPointerId = e.pointerId;
    lastPanX = e.clientX;
    lastPanY = e.clientY;
    el.setPointerCapture(e.pointerId);
    el.style.cursor = "grabbing";
  }

  function onPointerMove(e: PointerEvent) {
    if (!activePointers.has(e.pointerId)) {
      return;
    }
    activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // pinch zoom with two pointers
    if (activePointers.size === 2) {
      const pts = Array.from(activePointers.values());
      const dx = pts[1]!.x - pts[0]!.x;
      const dy = pts[1]!.y - pts[0]!.y;
      const dist = Math.hypot(dx, dy);
      if (pinchStartDist > 0) {
        const ratio = dist / pinchStartDist;
        const zNext = clampZoom(pinchStartZoom * ratio, minZoom, maxZoom);
        if (zNext !== zoom.value) {
          const c = getCenter();
          if (c) {
            const next = wheelZoomCameraTowardScreenPoint({
              camX: pinchCamX,
              camY: pinchCamY,
              zoom: pinchStartZoom,
              multiplier: zNext / pinchStartZoom,
              screenX: pinchCenterX,
              screenY: pinchCenterY,
              centerX: c.cx,
              centerY: c.cy,
              minZoom,
              maxZoom,
            });
            camX.value = next.camX;
            camY.value = next.camY;
            zoom.value = next.zoom;
          }
        }
      }
      return;
    }

    if (panPointerId !== e.pointerId) {
      return;
    }
    const dx = e.clientX - lastPanX;
    const dy = e.clientY - lastPanY;
    lastPanX = e.clientX;
    lastPanY = e.clientY;
    const next = panCameraByScreenDelta({
      camX: camX.value,
      camY: camY.value,
      zoom: zoom.value,
      dx,
      dy,
    });
    camX.value = next.camX;
    camY.value = next.camY;
  }

  function onPointerUp(e: PointerEvent) {
    const el = rootRef.value;
    activePointers.delete(e.pointerId);
    if (activePointers.size < 2) {
      pinchStartDist = 0;
    }
    if (panPointerId !== e.pointerId) {
      return;
    }
    panPointerId = null;
    if (el?.releasePointerCapture) {
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }
    if (el) {
      el.style.cursor = spaceDown.value ? "grab" : "";
    }
  }

  function resetView() {
    camX.value = 0;
    camY.value = 0;
    zoom.value = clampZoom(1, minZoom, maxZoom);
  }

  function zoomIn() {
    const c = getCenter();
    if (!c) return;
    const next = wheelZoomCameraTowardScreenPoint({
      camX: camX.value,
      camY: camY.value,
      zoom: zoom.value,
      multiplier: 1.2,
      screenX: c.cx,
      screenY: c.cy,
      centerX: c.cx,
      centerY: c.cy,
      minZoom,
      maxZoom,
    });
    camX.value = next.camX;
    camY.value = next.camY;
    zoom.value = next.zoom;
  }

  function zoomOut() {
    const c = getCenter();
    if (!c) return;
    const next = wheelZoomCameraTowardScreenPoint({
      camX: camX.value,
      camY: camY.value,
      zoom: zoom.value,
      multiplier: 1 / 1.2,
      screenX: c.cx,
      screenY: c.cy,
      centerX: c.cx,
      centerY: c.cy,
      minZoom,
      maxZoom,
    });
    camX.value = next.camX;
    camY.value = next.camY;
    zoom.value = next.zoom;
  }

  function fitToScreen(bounds: { minX: number; minY: number; maxX: number; maxY: number }, padding = 40) {
    const c = getCenter();
    if (!c) return;
    const next = fitCameraToBounds({
      bounds,
      viewportWidth: c.rect.width,
      viewportHeight: c.rect.height,
      centerScreenX: c.cx,
      centerScreenY: c.cy,
      screenLeft: c.rect.left,
      screenTop: c.rect.top,
      minZoom,
      maxZoom,
      padding,
    });
    camX.value = next.camX;
    camY.value = next.camY;
    zoom.value = next.zoom;
  }

  onMounted(() => {
    window.addEventListener("keydown", onKeyDown, { passive: false });
    window.addEventListener("keyup", onKeyUp);
  });

  onUnmounted(() => {
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
  });

  return {
    camX,
    camY,
    zoom,
    spaceDown,
    getCenter,
    onWheel,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    resetView,
    zoomIn,
    zoomOut,
    fitToScreen,
  };
}
