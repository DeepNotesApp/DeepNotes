import { Vec2 } from '@stdlib/misc';

export function useKeyboardShortcuts() {
  const page = computed(() => internals.pages?.react?.page);

  onMounted(() => {
    document.addEventListener('keydown', onKeyDown);
  });

  async function onKeyDown(event: KeyboardEvent): Promise<void> {
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
        event.preventDefault();
        page.value.editing.stop();
        return;
      }

      return;
    }

    // If there is an element selected

    const activeElem = page.value.activeElem.react.value;

    if (activeElem != null) {
      if (event.code === 'F2') {
        event.preventDefault();
        await page.value.editing.start(activeElem);
        return;
      }

      if (event.code === 'Backspace') {
        event.preventDefault();
        await page.value.editing.start(activeElem);
        page.value.editing.react.editor?.commands.deleteSelection();
        return;
      }

      if (event.ctrlKey && event.code === 'KeyB') {
        event.preventDefault();
        page.value.selection.toggleMark('bold');
        return;
      }
      if (event.ctrlKey && event.code === 'KeyI') {
        event.preventDefault();
        page.value.selection.toggleMark('italic');
        return;
      }
      if (event.ctrlKey && event.code === 'KeyU') {
        event.preventDefault();
        page.value.selection.toggleMark('underline');
        return;
      }
      if (event.ctrlKey && event.code === 'KeyE') {
        event.preventDefault();
        page.value.selection.toggleMark('code');
        return;
      }
      if (event.ctrlKey && event.shiftKey && event.code === 'KeyX') {
        event.preventDefault();
        page.value.selection.toggleMark('strike');
        return;
      }
    }

    if (event.code === 'Delete') {
      event.preventDefault();
      page.value.deleting.perform();
      return;
    }

    if (event.ctrlKey && event.code === 'KeyA') {
      event.preventDefault();
      page.value.selection.selectAll();
      return;
    }

    if (event.ctrlKey && event.code === 'KeyD') {
      event.preventDefault();
      await page.value.cloning.perform();
      return;
    }

    if (event.ctrlKey && event.code === 'KeyC') {
      event.preventDefault();
      page.value.clipboard.copy();
      return;
    }
    if (event.ctrlKey && event.code === 'KeyV' && window.clipboardData) {
      event.preventDefault();
      await page.value.clipboard.paste();
      return;
    }
    if (event.ctrlKey && event.code === 'KeyX') {
      event.preventDefault();
      page.value.clipboard.cut();
      return;
    }

    if (event.ctrlKey && event.code === 'KeyZ') {
      event.preventDefault();
      page.value.undoRedo.undo();
      return;
    }
    if (event.ctrlKey && event.code === 'KeyY') {
      event.preventDefault();
      page.value.undoRedo.redo();
      return;
    }

    if (event.code === 'ArrowLeft') {
      event.preventDefault();
      page.value.selection.shift(new Vec2(-1, 0));
      return;
    }
    if (event.code === 'ArrowRight') {
      event.preventDefault();
      page.value.selection.shift(new Vec2(1, 0));
      return;
    }
    if (event.code === 'ArrowUp') {
      event.preventDefault();
      page.value.selection.shift(new Vec2(0, -1));
      return;
    }
    if (event.code === 'ArrowDown') {
      event.preventDefault();
      page.value.selection.shift(new Vec2(0, 1));
      return;
    }
  }

  onBeforeUnmount(() => {
    document.removeEventListener('keydown', onKeyDown);
  });
}
