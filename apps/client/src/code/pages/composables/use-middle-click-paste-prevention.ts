import { useEventListener } from '@vueuse/core';

export function useMiddleClickPastePrevention() {
  useEventListener('auxclick', (event) => {
    if (event.button === 1) {
      mainLogger
        .sub('useMiddleClickPastePrevention')
        .info('Prevent middle click paste');

      event.preventDefault();
    }
  });

  useEventListener('pointerup', (event) => {
    if (event.button === 1) {
      event.preventDefault();
    }
  });
}
