import { once } from 'lodash';

import { Resolvable } from './resolvable';

const _getIntersectionResolvables = once(
  () => new Map<Element, Resolvable<DOMRectReadOnly>>(),
);

const _getIntersectionObserver = once(
  () =>
    new IntersectionObserver((entries) => {
      for (const entry of entries) {
        _getIntersectionResolvables()
          .get(entry.target)
          ?.resolve(entry.boundingClientRect);

        _getIntersectionResolvables().delete(entry.target);

        _getIntersectionObserver().unobserve(entry.target);
      }
    }),
);

export function getClientRectAsync(target: Element) {
  let resolvable = _getIntersectionResolvables().get(target);

  if (resolvable == null) {
    resolvable = new Resolvable<DOMRectReadOnly>();

    _getIntersectionResolvables().set(target, resolvable);

    _getIntersectionObserver().observe(target);
  }

  return resolvable;
}

export function getClientRectsAsync(targets: Element[]) {
  return Promise.all(targets.map(getClientRectAsync));
}
