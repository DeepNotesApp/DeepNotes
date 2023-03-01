export function useTouchscreenPointerCaptureRelease() {
  onMounted(() => {
    document.addEventListener('pointerdown', onPointerDownCapture, {
      capture: true,
    });
  });

  function onPointerDownCapture(event: PointerEvent) {
    mainLogger()
      .sub('useTouchscreenPointerCaptureRelease')
      .info('Release pointer capture');

    (event.target as Element).releasePointerCapture(event.pointerId);
  }

  onBeforeUnmount(() => {
    document.removeEventListener('pointerdown', onPointerDownCapture, {
      capture: true,
    });
  });
}
