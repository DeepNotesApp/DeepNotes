import { isDetachedDOM } from '@stdlib/misc';

export function useElementPasting() {
  const page = computed(() => internals.pages.react.page);

  onMounted(() => {
    document.addEventListener('paste', onPaste, {
      capture: true,
    });
  });

  async function onPaste(event: ClipboardEvent) {
    const target = event.target as HTMLElement;

    if (
      target.nodeName === 'INPUT' ||
      target.nodeName === 'TEXTAREA' ||
      target.isContentEditable ||
      target.closest('.ProseMirror') != null ||
      isDetachedDOM(target)
    ) {
      return;
    }

    mainLogger().sub('useElementPasting').info('Perform');

    const text = (event.clipboardData || window.clipboardData).getData('text');

    await page.value.clipboard.paste(text);
  }

  onBeforeUnmount(() => {
    document.removeEventListener('paste', onPaste, {
      capture: true,
    });
  });
}
