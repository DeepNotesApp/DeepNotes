import { Vec2 } from '@stdlib/misc';
import { useEventListener } from '@vueuse/core';
import { unsetNode } from 'src/code/areas/tiptap/utils';
import { modsMatch } from 'src/code/utils/misc';
import InsertImageDialog from 'src/layouts/PagesLayout/MainToolbar/InsertImageDialog.vue';
import InsertLinkDialog from 'src/layouts/PagesLayout/MainToolbar/InsertLinkDialog.vue';
import TakeScreenshotDialog from 'src/layouts/PagesLayout/MainToolbar/TakeScreenshotDialog.vue';

export function useKeyboardShortcuts() {
  useEventListener('keydown', async (event) => {
    if (await onKeyDown(event)) {
      event.preventDefault();
      event.stopPropagation();
    }
  });

  async function onKeyDown(event: KeyboardEvent): Promise<any> {
    mainLogger.info(`Keydown: ${event.code}`);

    const page = internals.pages?.react?.page;

    if (page == null) {
      return;
    }

    const target = event.target as HTMLElement;

    const isEditingElem = page.editing.react.active && target.isContentEditable;

    if (isEditingElem) {
      if (modsMatch(event, []) && event.code === 'Escape') {
        page.editing.stop();
        return true;
      }

      if (modsMatch(event, ['Control']) && event.code === 'Space') {
        page.selection.format((chain) => chain.clearNodes().unsetAllMarks());
        return true;
      }

      if (modsMatch(event, ['Alt']) && event.code === 'Digit1') {
        page.selection.format((chain) => chain.toggleHeading({ level: 1 }));
        return true;
      }
      if (modsMatch(event, ['Alt']) && event.code === 'Digit2') {
        page.selection.format((chain) => chain.toggleHeading({ level: 2 }));
        return true;
      }
      if (modsMatch(event, ['Alt']) && event.code === 'Digit3') {
        page.selection.format((chain) => chain.toggleHeading({ level: 3 }));
        return true;
      }
      if (modsMatch(event, ['Alt']) && event.code === 'Digit3') {
        page.selection.format((chain, editor) =>
          unsetNode(editor, chain, 'heading'),
        );
        return true;
      }

      if (modsMatch(event, ['Control']) && event.code === 'KeyK') {
        $quasar().dialog({ component: InsertLinkDialog });
        return true;
      }
      if (modsMatch(event, ['Control', 'Shift']) && event.code === 'KeyK') {
        page.selection.format((chain) => chain.unsetMark('link'));
        return true;
      }

      if (modsMatch(event, ['Control']) && event.code === 'KeyM') {
        page.selection.format((chain) => chain.addInlineMath());
        return true;
      }
      if (modsMatch(event, ['Control', 'Shift']) && event.code === 'KeyM') {
        page.selection.format((chain) => chain.addMathBlock());
        return true;
      }

      if (modsMatch(event, ['Alt', 'Shift']) && event.code === 'KeyQ') {
        page.selection.format((chain) => chain.toggleBlockquote());
        return true;
      }
      if (modsMatch(event, ['Alt', 'Shift']) && event.code === 'KeyC') {
        page.selection.format((chain) => chain.toggleCodeBlock());
        return true;
      }
      if (modsMatch(event, ['Alt', 'Shift']) && event.code === 'KeyR') {
        page.selection.format((chain) => chain.setHorizontalRule());
        return true;
      }
      if (modsMatch(event, ['Alt', 'Shift']) && event.code === 'KeyI') {
        $quasar().dialog({ component: InsertImageDialog });
        return true;
      }
      if (modsMatch(event, ['Alt', 'Shift']) && event.code === 'KeyY') {
        $quasar()
          .dialog({
            title: 'Insert YouTube video',
            message: 'Enter the video URL:',

            prompt: {
              type: 'url',
              model: '',
              filled: true,
            },
            color: 'primary',

            cancel: { flat: true, color: 'negative' },

            focus: 'cancel',
          })
          .onOk((url: string) =>
            page.selection.format((chain) =>
              chain.setYoutubeVideo({
                src: url,
              }),
            ),
          );
        return true;
      }

      if (modsMatch(event, ['Alt', 'Shift']) && event.code === 'KeyT') {
        page.selection.format((chain) =>
          chain.insertTable({
            rows: 3,
            cols: 3,
            withHeaderRow: false,
          }),
        );
        return true;
      }
    }

    if (
      modsMatch(event, []) &&
      event.code === 'Escape' &&
      page.findAndReplace.react.active
    ) {
      page.findAndReplace.react.active = false;
      return true;
    }

    if (
      modsMatch(event, []) &&
      event.code === 'F3' &&
      page.findAndReplace.react.active
    ) {
      await page.findAndReplace.findNext();
      return true;
    }

    if (
      modsMatch(event, ['Shift']) &&
      event.code === 'F3' &&
      page.findAndReplace.react.active
    ) {
      await page.findAndReplace.findPrev();
      return true;
    }

    if (modsMatch(event, ['Control']) && event.code === 'KeyF') {
      page.findAndReplace.react.active =
        !page.findAndReplace.react.active || page.findAndReplace.react.replace;
      page.findAndReplace.react.replace = false;
      return true;
    }

    if (
      !isEditingElem &&
      modsMatch(event, ['Control']) &&
      event.code === 'KeyH'
    ) {
      page.findAndReplace.react.active =
        !page.findAndReplace.react.active || !page.findAndReplace.react.replace;
      page.findAndReplace.react.replace = true;
      return true;
    }

    const isEditingInput =
      target.nodeName === 'INPUT' ||
      target.nodeName === 'TEXTAREA' ||
      target.isContentEditable;

    if (!isEditingInput) {
      const activeElem = page.activeElem.react.value;

      // Basic

      if (modsMatch(event, ['Control']) && event.code === 'KeyX') {
        await page.clipboard.cut();
        return true;
      }
      if (modsMatch(event, ['Control']) && event.code === 'KeyC') {
        await page.clipboard.copy();
        return true;
      }
      if (
        modsMatch(event, ['Control']) &&
        event.code === 'KeyV' &&
        window.clipboardData
      ) {
        await page.clipboard.paste();
        return true;
      }
      if (modsMatch(event, ['Control']) && event.code === 'KeyD') {
        await page.cloning.perform();
        return true;
      }

      if (modsMatch(event, ['Control']) && event.code === 'KeyZ') {
        page.undoRedo.undo();
        return true;
      }
      if (modsMatch(event, ['Control']) && event.code === 'KeyY') {
        page.undoRedo.redo();
        return true;
      }

      if (modsMatch(event, ['Control']) && event.code === 'KeyA') {
        page.selection.selectAll();
        return true;
      }
      if (modsMatch(event, []) && event.code === 'Delete') {
        page.deleting.perform();
        return true;
      }

      if (modsMatch(event, ['Alt', 'Shift']) && event.code === 'KeyS') {
        $quasar().dialog({ component: TakeScreenshotDialog });
        return true;
      }

      // Formatting

      if (modsMatch(event, ['Control']) && event.code === 'KeyB') {
        page.selection.toggleMark('bold');
        return true;
      }
      if (modsMatch(event, ['Control']) && event.code === 'KeyI') {
        page.selection.toggleMark('italic');
        return true;
      }
      if (modsMatch(event, ['Control', 'Shift']) && event.code === 'KeyX') {
        page.selection.toggleMark('strike');
        return true;
      }
      if (modsMatch(event, ['Control']) && event.code === 'KeyU') {
        page.selection.toggleMark('underline');
        return true;
      }
      if (modsMatch(event, ['Control']) && event.code === 'Space') {
        page.selection.format((chain) => chain.clearNodes().unsetAllMarks());
        return true;
      }

      if (modsMatch(event, ['Control', 'Shift']) && event.code === 'KeyL') {
        page.selection.format((chain) => chain.setTextAlign('left'));
        return true;
      }
      if (modsMatch(event, ['Control', 'Shift']) && event.code === 'KeyE') {
        page.selection.format((chain) => chain.setTextAlign('center'));
        return true;
      }
      if (modsMatch(event, ['Control', 'Shift']) && event.code === 'KeyR') {
        page.selection.format((chain) => chain.setTextAlign('right'));
        return true;
      }
      if (modsMatch(event, ['Control', 'Shift']) && event.code === 'KeyJ') {
        page.selection.format((chain) => chain.setTextAlign('justify'));
        return true;
      }
      if (modsMatch(event, ['Control', 'Shift']) && event.code === 'KeyH') {
        page.selection.format((chain) => chain.toggleHighlight());
        return true;
      }

      if (modsMatch(event, ['Control']) && event.code === 'Comma') {
        page.selection.toggleMark('subscript');
        return true;
      }
      if (modsMatch(event, ['Control']) && event.code === 'Period') {
        page.selection.toggleMark('superscript');
        return true;
      }
      if (modsMatch(event, ['Control']) && event.code === 'KeyK') {
        $quasar().dialog({ component: InsertLinkDialog });
        return true;
      }
      if (modsMatch(event, ['Control', 'Shift']) && event.code === 'KeyK') {
        page.selection.format((chain) => chain.unsetMark('link'));
        return true;
      }
      if (modsMatch(event, ['Control']) && event.code === 'KeyE') {
        page.selection.toggleMark('code');
        return true;
      }

      if (modsMatch(event, ['Alt']) && event.code === 'Digit1') {
        page.selection.toggleNode('heading', { level: 1 });
        return true;
      }
      if (modsMatch(event, ['Alt']) && event.code === 'Digit2') {
        page.selection.toggleNode('heading', { level: 2 });
        return true;
      }
      if (modsMatch(event, ['Alt']) && event.code === 'Digit3') {
        page.selection.toggleNode('heading', { level: 3 });
        return true;
      }
      if (modsMatch(event, ['Alt']) && event.code === 'Digit0') {
        page.selection.format((chain, editor) =>
          unsetNode(editor, chain, 'heading'),
        );
        return true;
      }

      if (modsMatch(event, ['Control', 'Shift']) && event.code === 'Digit7') {
        page.selection.format((chain) => chain.toggleOrderedList());
        return true;
      }
      if (modsMatch(event, ['Control', 'Shift']) && event.code === 'Digit8') {
        page.selection.format((chain) => chain.toggleBulletList());
        return true;
      }
      if (modsMatch(event, ['Control', 'Shift']) && event.code === 'Digit9') {
        page.selection.format((chain) => chain.toggleTaskList());
        return true;
      }

      if (modsMatch(event, ['Alt', 'Shift']) && event.code === 'KeyQ') {
        page.selection.format((chain) => chain.toggleBlockquote());
        return true;
      }
      if (modsMatch(event, ['Alt', 'Shift']) && event.code === 'KeyC') {
        page.selection.format((chain) => chain.toggleCodeBlock());
        return true;
      }

      // Others

      if (modsMatch(event, []) && event.code === 'F2' && activeElem != null) {
        await page.editing.start(activeElem);
        return true;
      }

      if (
        modsMatch(event, []) &&
        event.code === 'Backspace' &&
        activeElem == null
      ) {
        await internals.pages.goBackward();
        return true;
      }
      if (
        modsMatch(event, []) &&
        event.code === 'Backspace' &&
        activeElem != null
      ) {
        await page.editing.start(activeElem);
        page.editing.react.editor?.commands.deleteSelection();
        return true;
      }

      if (modsMatch(event, []) && event.code === 'ArrowLeft') {
        page.selection.shift(new Vec2(-(1 / page.camera.react.zoom), 0));
        return true;
      }
      if (modsMatch(event, []) && event.code === 'ArrowRight') {
        page.selection.shift(new Vec2(1 / page.camera.react.zoom, 0));
        return true;
      }
      if (modsMatch(event, []) && event.code === 'ArrowUp') {
        page.selection.shift(new Vec2(0, -(1 / page.camera.react.zoom)));
        return true;
      }
      if (modsMatch(event, []) && event.code === 'ArrowDown') {
        page.selection.shift(new Vec2(0, 1 / page.camera.react.zoom));
        return true;
      }
    }
  }
}
