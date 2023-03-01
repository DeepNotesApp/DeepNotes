import { Vec2 } from '@stdlib/misc';

export function useTableContextMenu() {
  onMounted(() => {
    document.addEventListener('contextmenu', onContextMenu);
  });

  function onContextMenu(event: MouseEvent) {
    let elem = event.target as HTMLElement | null;

    if (!elem?.isContentEditable) {
      return;
    }

    while (elem != null) {
      if (elem.nodeName === 'TD' || elem.nodeName === 'TH') {
        mainLogger().sub('useTableContextMenu').info('Show table context menu');

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
  }

  onBeforeUnmount(() => {
    document.removeEventListener('contextmenu', onContextMenu);
  });
}
