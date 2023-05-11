import { useEventListener } from '@vueuse/core';
import { isCtrlDown } from 'src/code/utils/misc';

export function useEditingOnTyping() {
  useEventListener('keypress', async (event) => {
    if (isCtrlDown(event)) {
      return;
    }

    const page = internals.pages.react.page;

    if (page == null) {
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

    const activeElem = page.activeElem.react.value;

    if (activeElem == null) {
      return;
    }

    mainLogger.sub('useEditingOnTyping').info('Start');

    await page.editing.start(activeElem);

    if (page.editing.react.editor == null) {
      return;
    }

    let chain = page.editing.react.editor.chain().deleteSelection();

    if (event.key === 'Enter') {
      chain = chain.insertContent('<p></p><p></p>');
    } else {
      chain = chain.insertContent(event.key);
    }

    chain.run();
  });
}
