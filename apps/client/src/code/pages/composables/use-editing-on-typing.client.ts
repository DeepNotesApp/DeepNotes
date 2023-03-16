import { isCtrlDown } from 'src/code/utils.client';

export function useEditingOnTyping() {
  const page = computed(() => internals.pages.react.page);

  onMounted(() => {
    document.addEventListener('keypress', onKeyPress);
  });

  async function onKeyPress(event: KeyboardEvent) {
    if (isCtrlDown(event)) {
      return;
    }

    if (page.value == null) {
      return;
    }

    const target = event.target as HTMLElement;

    if (
      target.nodeName === 'INPUT' ||
      target.nodeName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      return;
    }

    const activeElem = page.value.activeElem.react.value;

    if (activeElem == null) {
      return;
    }

    mainLogger().sub('useEditingOnTyping').info('Start');

    await page.value.editing.start(activeElem);

    if (page.value.editing.react.editor == null) {
      return;
    }

    let chain = page.value.editing.react.editor.chain().deleteSelection();

    if (event.key === 'Enter') {
      chain = chain.insertContent('<p></p><p></p>');
    } else {
      chain = chain.insertContent(event.key);
    }

    chain.run();
  }

  onBeforeUnmount(() => {
    document.removeEventListener('keypress', onKeyPress);
  });
}
