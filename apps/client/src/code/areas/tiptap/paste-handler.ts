import type { Fragment, Slice } from 'prosemirror-model';
import { Plugin } from 'prosemirror-state';
import type { EditorView } from 'prosemirror-view';

export const ProsemirrorPasteHandlerPlugin = new Plugin({
  props: {
    handlePaste(view: EditorView, event: ClipboardEvent, slice: Slice) {
      async function embedImages(content: Fragment) {
        const promises: Promise<any>[] = [];

        content.forEach((node) => {
          promises.push(
            (async () => {
              try {
                if (node.type.name === 'image') {
                  if (node.attrs.src.startsWith('data:image')) {
                    return;
                  }

                  let imageBlob: Blob | undefined;

                  if (event.clipboardData!.files.length > 0) {
                    imageBlob = event.clipboardData!.files[0];
                  }

                  if (imageBlob == null) {
                    const response = await fetch(node.attrs.src);

                    imageBlob = await response.blob();
                  }

                  const reader = new FileReader();

                  await new Promise<void>((resolve) => {
                    reader.addEventListener('loadend', (event) => {
                      (node.attrs as any).src = event.target!.result;

                      resolve();
                    });

                    reader.readAsDataURL(imageBlob!);
                  });
                } else {
                  await embedImages(node.content);
                }
              } catch (error) {
                mainLogger.error(error);
              }
            })(),
          );
        });

        await Promise.all(promises);
      }

      void embedImages(slice.content).then(() => {
        const { state } = view;
        const { tr } = state;

        view.dispatch(tr.replaceSelection(slice).scrollIntoView());
      });

      return true;
    },
  },
});
