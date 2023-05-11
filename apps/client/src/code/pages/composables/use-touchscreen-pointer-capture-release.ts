import { useEventListener } from '@vueuse/core';

export function useTouchscreenPointerCaptureRelease() {
  useEventListener(
    'pointerdown',
    (event) => {
      mainLogger
        .sub('useTouchscreenPointerCaptureRelease')
        .info('Release pointer capture');

      (event.target as Element).releasePointerCapture(event.pointerId);
    },
    { capture: true },
  );
}
