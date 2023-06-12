import { isDetachedDOM } from '@stdlib/misc';
import { useEventListener } from '@vueuse/core';

export function useElementPasting() {
  useEventListener(
    'paste' as any,
    async (event: ClipboardEvent) => {
      const target = event.target as HTMLElement;

      if (
        target.nodeName === 'INPUT' ||
        target.nodeName === 'TEXTAREA' ||
        target.isContentEditable ||
        target.closest('.ProseMirror') != null ||
        isDetachedDOM(target)
      ) {
        return;
      }

      mainLogger.sub('useElementPasting').info('Perform');

      const text = (event.clipboardData || window.clipboardData).getData(
        'text',
      );

      await internals.pages.react.page.clipboard.paste(text);
    },
    { capture: true },
  );
}
