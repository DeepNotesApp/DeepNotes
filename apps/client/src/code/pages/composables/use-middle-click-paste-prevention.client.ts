export function useMiddleClickPastePrevention() {
  onMounted(() => {
    document.addEventListener('auxclick', onAuxClick);
  });

  function onAuxClick(event: MouseEvent) {
    if (event.button === 1) {
      mainLogger()
        .sub('useMiddleClickPastePrevention')
        .info('Prevent middle click paste');

      event.preventDefault();
    }
  }

  onBeforeUnmount(() => {
    document.removeEventListener('auxclick', onAuxClick);
  });

  onMounted(() => {
    document.addEventListener('pointerup', onPointerUp);
  });

  function onPointerUp(event: PointerEvent) {
    if (event.button === 1) {
      event.preventDefault();
    }
  }

  onBeforeUnmount(() => {
    document.removeEventListener('pointerup', onPointerUp);
  });
}
