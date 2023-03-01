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

  if (hasVertScrollbar(elem) && event.offsetX > elem.clientWidth) {
    return true;
  }

  if (hasHorizScrollbar(elem) && event.offsetY > elem.clientHeight) {
    return true;
  }

  return false;
}

export function listenPointerEvents(
  downEvent: PointerEvent,
  options: {
    move?: (event: PointerEvent) => void;
    up?: (event: PointerEvent) => void;
  },
): () => void {
  document.addEventListener('pointermove', onPointerMove);

  document.addEventListener('pointerup', onPointerUp);
  document.addEventListener('pointercancel', onPointerUp);

  function cancel() {
    document.removeEventListener('pointermove', onPointerMove);

    document.removeEventListener('pointerup', onPointerUp);
    document.removeEventListener('pointercancel', onPointerUp);
  }

  function onPointerMove(moveEvent: PointerEvent) {
    if (moveEvent.pointerId !== downEvent.pointerId) {
      return;
    }

    options.move?.(moveEvent);
  }

  function onPointerUp(upEvent: PointerEvent) {
    if (upEvent.pointerId !== downEvent.pointerId) {
      return;
    }

    cancel();

    options.up?.(upEvent);
  }

  return cancel;
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
