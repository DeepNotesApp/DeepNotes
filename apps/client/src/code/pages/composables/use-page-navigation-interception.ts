import { isNanoID, splitStr } from '@stdlib/misc';
import { handleError, isCtrlDown } from 'src/code/utils';

export function usePageNavigationInterception() {
  onMounted(() => {
    document.addEventListener('click', onClick);
  });

  async function onClick(event: MouseEvent) {
    try {
      const target = event.target as HTMLElement;

      // Ignore if it's not a link

      const anchor = target.closest('a[href]');

      if (anchor == null) {
        return;
      }

      if (event.altKey || internals.mobileAltKey || target.isContentEditable) {
        mainLogger()
          .sub('usePageNavigationInterception')
          .info('Prevent default action');

        event.preventDefault(); // Prevent default action

        return;
      }

      // Allow default action if it's not a page link

      const href = anchor.getAttribute('href') ?? '';

      if (
        !(
          isNanoID(href) ||
          href.startsWith('/pages/') ||
          href.startsWith('/groups/') ||
          href.startsWith(`${window.location.origin}/pages/`) ||
          href.startsWith(`${window.location.origin}/groups/`)
        )
      ) {
        mainLogger()
          .sub('usePageNavigationInterception')
          .info(
            "[usePageNavigationInterception] Link doesn' point to a DeepNotes page: allow default action.",
          );
        return;
      }

      mainLogger().info(
        'Link points to a DeepNotes page: prevent default action.',
      );

      event.preventDefault(); // Prevent default action

      const id = splitStr(href, '/').at(-1) ?? '';

      if (href.includes('/groups/')) {
        await internals.pages.goToGroup(id, {
          fromParent: true,
          openInNewTab: isCtrlDown(event),
        });
      } else {
        await internals.pages.goToPage(id, {
          fromParent: true,
          openInNewTab: isCtrlDown(event),
        });
      }
    } catch (error) {
      handleError(error);
    }
  }

  onBeforeUnmount(() => {
    document.removeEventListener('click', onClick);
  });
}
