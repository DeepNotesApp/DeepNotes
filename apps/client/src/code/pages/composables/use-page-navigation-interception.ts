import { useEventListener } from '@vueuse/core';
import { imageResizing } from 'src/code/tiptap/image-resize/NodeView.vue';
import { youtubeResizing } from 'src/code/tiptap/youtube-video/NodeView.vue';
import { handleError, isCtrlDown } from 'src/code/utils/misc';

export function usePageNavigationInterception() {
  useEventListener('click', async (event) => {
    try {
      const target = event.target as HTMLElement;

      // Ignore if it's not a link

      const closestAnchor = target.closest('a');

      const href = closestAnchor?.getAttribute('href') ?? '';

      if (!href) {
        event.preventDefault();
        return;
      }

      if (
        event.altKey ||
        internals.mobileAltKey ||
        target.isContentEditable ||
        imageResizing.active ||
        youtubeResizing.active
      ) {
        mainLogger
          .sub('usePageNavigationInterception')
          .info('Prevent default action');

        event.preventDefault(); // Prevent default action

        return;
      }

      // Allow default action if it's not a page link

      if (
        !(
          href.startsWith('/pages/') ||
          href.startsWith('/groups/') ||
          href.startsWith(`${window.location.origin}/pages/`) ||
          href.startsWith(`${window.location.origin}/groups/`)
        )
      ) {
        mainLogger
          .sub('usePageNavigationInterception')
          .info(
            "[usePageNavigationInterception] Link doesn't point to a DeepNotes page: allow default action.",
          );
        return;
      }

      mainLogger.info(
        'Link points to a DeepNotes page: prevent default action.',
      );

      event.preventDefault(); // Prevent default

      const matches =
        href.match(/\/(?:pages|groups)\/([\w-]{21})(?:\?note=([\w-]{21}))?/) ??
        [];

      const id = matches[1];
      const noteId = matches[2];

      if (href.includes('/groups/')) {
        await internals.pages.goToGroup(id, {
          fromParent: true,
          openInNewTab: isCtrlDown(event),
        });
      } else {
        await internals.pages.goToPage(id, {
          fromParent: true,
          openInNewTab: isCtrlDown(event),
          noteId,
        });
      }
    } catch (error) {
      handleError(error);
    }
  });
}
