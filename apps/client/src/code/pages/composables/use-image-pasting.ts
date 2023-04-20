export function useImagePasting() {
  const page = computed(() => internals.pages.react.page);

  onMounted(() => {
    document.addEventListener('paste', onPaste, {
      capture: true,
    });
  });

  async function onPaste(event: ClipboardEvent) {
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
        page.value.selection.format((chain) =>
          chain.setImage({
            src: event.target!.result as string,
          }),
        );
      });

      reader.readAsDataURL(file);
    }

    event.preventDefault();
  }

  onBeforeUnmount(() => {
    document.removeEventListener('paste', onPaste, {
      capture: true,
    });
  });
}
