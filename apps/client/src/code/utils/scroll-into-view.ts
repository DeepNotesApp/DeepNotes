import type { IVec2 } from '@stdlib/misc';
import { hasScrollbar, Vec2 } from '@stdlib/misc';

function domRectScreenToWorld(domRect: DOMRect): DOMRect {
  return new DOMRect(
    domRect.x / internals.pages.react.page.camera.react.zoom,
    domRect.y / internals.pages.react.page.camera.react.zoom,
    domRect.width / internals.pages.react.page.camera.react.zoom,
    domRect.height / internals.pages.react.page.camera.react.zoom,
  );
}

function easeInOutQuint(x: number): number {
  return x < 0.5 ? 16 * x * x * x * x * x : 1 - Math.pow(-2 * x + 2, 5) / 2;
}

export function scrollIntoView(
  target: Element,
  params?: { animate?: boolean; centerCamera?: boolean },
) {
  let ancestor: Element | null = target.parentElement;

  const targetRect = domRectScreenToWorld(target.getBoundingClientRect());

  const scrollElems: { elem: Element; from: IVec2; to: IVec2 }[] = [];

  while (ancestor != null) {
    if (hasScrollbar(ancestor as HTMLElement)) {
      const ancestorRect = domRectScreenToWorld(
        ancestor.getBoundingClientRect(),
      );

      const ancestorClientRight = ancestorRect.x + ancestor.clientWidth;
      const ancestorClientBottom = ancestorRect.y + ancestor.clientHeight;

      let offsetX =
        targetRect.x < ancestorRect.x
          ? targetRect.x - ancestorRect.x
          : targetRect.right > ancestorClientRight
          ? targetRect.right - ancestorClientRight
          : 0;
      let offsetY =
        targetRect.y < ancestorRect.y
          ? targetRect.y - ancestorRect.y
          : targetRect.bottom > ancestorClientBottom
          ? targetRect.bottom - ancestorClientBottom
          : 0;

      // Clamp offset

      const maxScrollLeft = ancestor.scrollWidth - ancestor.clientWidth;
      const maxScrollTop = ancestor.scrollHeight - ancestor.clientHeight;

      offsetX = Math.min(offsetX, maxScrollLeft - ancestor.scrollLeft);
      offsetY = Math.min(offsetY, maxScrollTop - ancestor.scrollTop);

      offsetX = Math.max(offsetX, -ancestor.scrollLeft);
      offsetY = Math.max(offsetY, -ancestor.scrollTop);

      // Apply scroll offset

      scrollElems.push({
        elem: ancestor,
        from: { x: ancestor.scrollLeft, y: ancestor.scrollTop },
        to: {
          x: ancestor.scrollLeft + offsetX,
          y: ancestor.scrollTop + offsetY,
        },
      });

      targetRect.x -= offsetX;
      targetRect.y -= offsetY;
    }

    ancestor = ancestor.parentElement;
  }

  const pageElem = document.querySelector(
    `.display-screens[data-page-id="${internals.pages.react.pageId}"]`,
  ) as HTMLElement;
  const pageRect = pageElem.getBoundingClientRect();

  const targetCenter = new Vec2(
    targetRect.x + targetRect.width / 2,
    targetRect.y + targetRect.height / 2,
  );
  const pageCenter = new Vec2(
    pageRect.x + pageRect.width / 2,
    pageRect.y + pageRect.height / 2,
  ).divScalar(internals.pages.react.page.camera.react.zoom);

  const cameraStartPos = internals.pages.react.page.camera.react.pos;
  const cameraEndPos = cameraStartPos.add(targetCenter.sub(pageCenter));

  const duration = params?.animate !== false ? 400 : 0.0001;
  const startTime = Date.now();
  const endTime = startTime + duration;

  function animate() {
    requestAnimationFrame(() => {
      const currentTime = Date.now();
      const progress = easeInOutQuint(
        Math.min(1, (currentTime - startTime) / duration),
      );

      for (const scrollElem of scrollElems) {
        scrollElem.elem.scrollTo(
          scrollElem.from.x + (scrollElem.to.x - scrollElem.from.x) * progress,
          scrollElem.from.y + (scrollElem.to.y - scrollElem.from.y) * progress,
        );
      }

      if (params?.centerCamera) {
        internals.pages.react.page.camera.react.pos = cameraStartPos.add(
          cameraEndPos.sub(cameraStartPos).mulScalar(progress),
        );
      }

      if (currentTime < endTime) {
        animate();
      }
    });
  }

  animate();
}
