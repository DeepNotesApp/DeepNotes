import { useEventListener } from '@vueuse/core';

export function useImagePasting() {
  useEventListener(
    'paste',
    async (event) => {
      const target = event.target as HTMLElement;

      if (
        target.closest('.ProseMirror') == null ||
        (event.clipboardData?.files?.length ?? 0) === 0
      ) {
        return;
      }

      mainLogger.sub('useImagePasting').info('Perform');

      for (const file of Array.from(event.clipboardData!.files)) {
        if (!file.type.startsWith('image/')) {
          continue;
        }

        const reader = new FileReader();

        reader.addEventListener('loadend', (event) => {
          internals.pages.react.page.selection.format((chain) =>
            chain.setImage({
              src: event.target!.result as string,
            }),
          );
        });

        reader.readAsDataURL(file);
      }

      event.preventDefault();
    },
    { capture: true },
  );
}
