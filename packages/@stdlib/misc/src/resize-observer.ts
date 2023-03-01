import { once } from 'lodash';

export type ResizeListener = (entry: ResizeObserverEntry) => void;

const _getResizeListeners = once(() => new Map<Element, Set<ResizeListener>>());

const _getResizeObserver = once(() => {
  if (typeof ResizeObserver !== 'undefined') {
    return new ResizeObserver((entries) => {
      for (const entry of entries) {
        for (const listener of _getResizeListeners().get(entry.target)!) {
          listener(entry);
        }
      }
    });
  }
});

export function observeResize(target: Element, listener: ResizeListener) {
  let listeners = _getResizeListeners().get(target);

  if (listeners == null) {
    listeners = new Set();

    _getResizeListeners().set(target, listeners);

    _getResizeObserver()?.observe(target);
  }

  listeners.add(listener);
}

export function unobserveResize(target: Element, listener: ResizeListener) {
  const listeners = _getResizeListeners().get(target);

  if (listeners == null) {
    return;
  }

  listeners.delete(listener);

  if (listeners.size === 0) {
    _getResizeListeners().delete(target);

    _getResizeObserver()?.unobserve(target);
  }
}
