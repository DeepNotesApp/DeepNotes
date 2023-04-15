import { Vec2 } from '@stdlib/misc';
import { isCtrlDown } from 'src/code/utils';

export function useKeyboardShortcuts() {
  const page = computed(() => internals.pages?.react?.page);

  onMounted(() => {
    document.addEventListener('keydown', async (event: KeyboardEvent) => {
      if (await onKeyDown(event)) {
        event.preventDefault();
      }
    });
  });

  async function onKeyDown(event: KeyboardEvent): Promise<any> {
    mainLogger.info(`Keydown: ${event.code}`);

    if (page.value == null) {
      return;
    }

    // If currently editing something

    const target = event.target as HTMLElement;

    if (
      target.nodeName === 'INPUT' ||
      target.nodeName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      if (event.code === 'Escape') {
        page.value.editing.stop();
        return true;
      }

      return;
    }

    const activeElem = page.value.activeElem.react.value;

    // Basic

    if (isCtrlDown(event) && event.code === 'KeyX') {
      page.value.clipboard.cut();
      return true;
    }
    if (isCtrlDown(event) && event.code === 'KeyC') {
      page.value.clipboard.copy();
      return true;
    }
    if (isCtrlDown(event) && event.code === 'KeyV' && window.clipboardData) {
      await page.value.clipboard.paste();
      return true;
    }
    if (isCtrlDown(event) && event.code === 'KeyD') {
      await page.value.cloning.perform();
      return true;
    }

    if (isCtrlDown(event) && event.code === 'KeyZ') {
      page.value.undoRedo.undo();
      return true;
    }
    if (isCtrlDown(event) && event.code === 'KeyY') {
      page.value.undoRedo.redo();
      return true;
    }

    if (isCtrlDown(event) && event.code === 'KeyA') {
      page.value.selection.selectAll();
      return true;
    }
    if (event.code === 'Delete') {
      page.value.deleting.perform();
      return true;
    }

    // Formatting

    if (isCtrlDown(event) && event.code === 'KeyB') {
      page.value.selection.toggleMark('bold');
      return true;
    }
    if (isCtrlDown(event) && event.code === 'KeyI') {
      page.value.selection.toggleMark('italic');
      return true;
    }
    if (isCtrlDown(event) && event.code === 'KeyU') {
      page.value.selection.toggleMark('underline');
      return true;
    }
    if (isCtrlDown(event) && event.code === 'KeyE') {
      page.value.selection.toggleMark('code');
      return true;
    }
    if (isCtrlDown(event) && event.shiftKey && event.code === 'KeyX') {
      page.value.selection.toggleMark('strike');
      return true;
    }

    if (isCtrlDown(event) && event.altKey && event.code === 'Digit1') {
      page.value.selection.toggleNode('heading', { level: 1 });
      return true;
    }
    if (isCtrlDown(event) && event.altKey && event.code === 'Digit2') {
      page.value.selection.toggleNode('heading', { level: 2 });
      return true;
    }
    if (isCtrlDown(event) && event.altKey && event.code === 'Digit3') {
      page.value.selection.toggleNode('heading', { level: 3 });
      return true;
    }

    // Others

    if (event.code === 'F2' && activeElem != null) {
      await page.value.editing.start(activeElem);
      return true;
    }

    if (event.code === 'Backspace' && activeElem != null) {
      await page.value.editing.start(activeElem);
      page.value.editing.react.editor?.commands.deleteSelection();
      return true;
    }

    if (event.code === 'ArrowLeft') {
      page.value.selection.shift(new Vec2(-1, 0));
      return true;
    }
    if (event.code === 'ArrowRight') {
      page.value.selection.shift(new Vec2(1, 0));
      return true;
    }
    if (event.code === 'ArrowUp') {
      page.value.selection.shift(new Vec2(0, -1));
      return true;
    }
    if (event.code === 'ArrowDown') {
      page.value.selection.shift(new Vec2(0, 1));
      return true;
    }
  }

  onBeforeUnmount(() => {
    document.removeEventListener('keydown', onKeyDown);
  });
}
