import { Vec2 } from '@stdlib/misc';
import { useEventListener } from '@vueuse/core';

export function useTableContextMenu() {
  useEventListener('contextmenu', (event) => {
    let elem = event.target as HTMLElement | null;

    if (!elem?.isContentEditable) {
      return;
    }

    while (elem != null) {
      if (elem.nodeName === 'TD' || elem.nodeName === 'TH') {
        mainLogger.sub('useTableContextMenu').info('Show table context menu');

        event.preventDefault();

        internals.pages.react.tableContextMenu = true;
        internals.pages.react.tableContextMenuPos = new Vec2(
          Math.min(event.clientX, document.body.clientWidth - 400),
          Math.min(event.clientY, document.body.clientHeight - 192),
        );

        return;
      }

      elem = elem.parentElement;
    }

    internals.pages.react.tableContextMenu = false;
  });
}
