import { Vec2 } from './vec2';

export function hasVertScrollbar(elem: HTMLElement) {
  const computedStyle = window.getComputedStyle(elem);

  return (
    computedStyle.overflowY === 'scroll' ||
    (computedStyle.overflowY === 'auto' &&
      elem.scrollHeight > (elem.clientHeight || elem.offsetHeight))
  );
}
export function hasHorizScrollbar(elem: HTMLElement) {
  const computedStyle = window.getComputedStyle(elem);

  return (
    computedStyle.overflowX === 'scroll' ||
    (computedStyle.overflowX === 'auto' &&
      elem.scrollWidth > (elem.clientWidth || elem.offsetWidth))
  );
}

export function hasScrollbar(elem: HTMLElement) {
  return hasHorizScrollbar(elem) || hasVertScrollbar(elem);
}

export function isTouchOverScrollbar(event: TouchEvent, zoom?: number) {
  const elem = event.target as HTMLElement;

  const clientRect = elem.getBoundingClientRect();

  zoom = zoom ?? 1;

  const offsetX = (event.targetTouches[0].clientX - clientRect.x) / zoom;
  const offsetY = (event.targetTouches[0].clientY - clientRect.y) / zoom;

  if (hasVertScrollbar(elem) && offsetX > elem.clientWidth) {
    return true;
  }

  if (hasHorizScrollbar(elem) && offsetY > elem.clientHeight) {
    return true;
  }

  return false;
}

export function isMouseOverScrollbar(event: PointerEvent) {
  const elem = event.target as HTMLElement;

  if (
    hasVertScrollbar(elem) &&
    (event.offsetX > elem.clientWidth || event.offsetX > elem.offsetWidth - 12)
  ) {
    return true;
  }

  if (
    hasHorizScrollbar(elem) &&
    (event.offsetY > elem.clientHeight ||
      event.offsetY > elem.offsetHeight - 12)
  ) {
    return true;
  }

  return false;
}

export function listenPointerEvents(
  downEvent: PointerEvent,
  options: {
    move?: (event: PointerEvent, downEvent: PointerEvent) => void;
    up?: (event: PointerEvent, downEvent: PointerEvent) => void;

    dragStartDistance?: number;
    dragStartDelay?: number;

    dragCancel?: (downEvent: PointerEvent, external: boolean) => void;
    dragStart?: (event: PointerEvent, downEvent: PointerEvent) => void;
    dragUpdate?: (event: PointerEvent, downEvent: PointerEvent) => void;
    dragEnd?: (event: PointerEvent, downEvent: PointerEvent) => void;
  },
): () => void {
  document.addEventListener('pointermove', onPointerMove);

  document.addEventListener('pointerup', onPointerUp);
  document.addEventListener('pointercancel', onPointerUp);

  let dragStartTimeout: ReturnType<typeof setTimeout> | undefined;

  let dragging = false;

  function destroy() {
    clearTimeout(dragStartTimeout);

    document.removeEventListener('pointermove', onPointerMove);

    document.removeEventListener('pointerup', onPointerUp);
    document.removeEventListener('pointercancel', onPointerUp);
  }

  function cancel(external: boolean) {
    options.dragCancel?.(downEvent, external);

    destroy();
  }

  const downClientPos = new Vec2(downEvent.clientX, downEvent.clientY);

  function onPointerMove(moveEvent: PointerEvent) {
    if (moveEvent.pointerId !== downEvent.pointerId) {
      return;
    }

    options.move?.(moveEvent, downEvent);

    if (options.dragStartDistance != null) {
      if (!dragging) {
        const moveClientPos = new Vec2(moveEvent.clientX, moveEvent.clientY);

        const distance = downClientPos.dist(moveClientPos);

        if (options.dragStartDelay != null) {
          if (dragStartTimeout == null) {
            dragStartTimeout = setTimeout(() => {
              dragging = true;

              options.dragStart?.(moveEvent, downEvent);
            }, options.dragStartDelay);
          }

          if (distance > options.dragStartDistance) {
            cancel(false);
          }
        } else {
          if (distance > options.dragStartDistance) {
            dragging = true;

            options.dragStart?.(moveEvent, downEvent);
          }
        }
      } else {
        options.dragUpdate?.(moveEvent, downEvent);
      }
    }
  }

  function onPointerUp(upEvent: PointerEvent) {
    if (upEvent.pointerId !== downEvent.pointerId) {
      return;
    }

    destroy();

    options.up?.(upEvent, downEvent);

    if (dragging) {
      options.dragEnd?.(upEvent, downEvent);
    }
  }

  return () => cancel(true);
}

export function isDetachedDOM(node: Node | null) {
  while (node != null) {
    if (node instanceof Document) {
      return false;
    }

    node = node.parentNode;
  }

  return node == null;
}
