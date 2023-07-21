import { Vec2 } from '@stdlib/misc';
import { useEventListener } from '@vueuse/core';
import { isCtrlDown } from 'src/code/utils/misc';

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

    if (isEditingElem && event.code === 'Escape') {
      page.editing.stop();
      return true;
    }

    if (event.code === 'Escape' && page.findAndReplace.react.active) {
      page.findAndReplace.react.active = false;
      return true;
    }

    if (event.code === 'F3' && page.findAndReplace.react.active) {
      await page.findAndReplace.findNext();
      return true;
    }

    if (
      event.code === 'F3' &&
      event.shiftKey &&
      page.findAndReplace.react.active
    ) {
      await page.findAndReplace.findPrev();
      return true;
    }

    if (isCtrlDown(event) && event.code === 'KeyF') {
      page.findAndReplace.react.active =
        !page.findAndReplace.react.active || page.findAndReplace.react.replace;
      page.findAndReplace.react.replace = false;
      return true;
    }

    if (!isEditingElem && isCtrlDown(event) && event.code === 'KeyH') {
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

      if (isCtrlDown(event) && event.code === 'KeyX') {
        await page.clipboard.cut();
        return true;
      }
      if (isCtrlDown(event) && event.code === 'KeyC') {
        await page.clipboard.copy();
        return true;
      }
      if (isCtrlDown(event) && event.code === 'KeyV' && window.clipboardData) {
        await page.clipboard.paste();
        return true;
      }
      if (isCtrlDown(event) && event.code === 'KeyD') {
        await page.cloning.perform();
        return true;
      }

      if (isCtrlDown(event) && event.code === 'KeyZ') {
        page.undoRedo.undo();
        return true;
      }
      if (isCtrlDown(event) && event.code === 'KeyY') {
        page.undoRedo.redo();
        return true;
      }

      if (isCtrlDown(event) && event.code === 'KeyA') {
        page.selection.selectAll();
        return true;
      }
      if (event.code === 'Delete') {
        page.deleting.perform();
        return true;
      }

      // Formatting

      if (isCtrlDown(event) && event.code === 'KeyB') {
        page.selection.toggleMark('bold');
        return true;
      }
      if (isCtrlDown(event) && event.code === 'KeyI') {
        page.selection.toggleMark('italic');
        return true;
      }
      if (isCtrlDown(event) && event.code === 'KeyU') {
        page.selection.toggleMark('underline');
        return true;
      }
      if (isCtrlDown(event) && event.code === 'KeyE') {
        page.selection.toggleMark('code');
        return true;
      }
      if (isCtrlDown(event) && event.shiftKey && event.code === 'KeyX') {
        page.selection.toggleMark('strike');
        return true;
      }

      if (event.altKey && event.code === 'Digit1') {
        page.selection.toggleNode('heading', { level: 1 });
        return true;
      }
      if (event.altKey && event.code === 'Digit2') {
        page.selection.toggleNode('heading', { level: 2 });
        return true;
      }
      if (event.altKey && event.code === 'Digit3') {
        page.selection.toggleNode('heading', { level: 3 });
        return true;
      }

      // Others

      if (event.code === 'F2' && activeElem != null) {
        await page.editing.start(activeElem);
        return true;
      }

      if (event.code === 'Backspace' && activeElem == null) {
        await internals.pages.goBackward();
        return true;
      }
      if (event.code === 'Backspace' && activeElem != null) {
        await page.editing.start(activeElem);
        page.editing.react.editor?.commands.deleteSelection();
        return true;
      }

      if (event.code === 'ArrowLeft') {
        page.selection.shift(new Vec2(-1, 0));
        return true;
      }
      if (event.code === 'ArrowRight') {
        page.selection.shift(new Vec2(1, 0));
        return true;
      }
      if (event.code === 'ArrowUp') {
        page.selection.shift(new Vec2(0, -1));
        return true;
      }
      if (event.code === 'ArrowDown') {
        page.selection.shift(new Vec2(0, 1));
        return true;
      }
    }
  }
}
