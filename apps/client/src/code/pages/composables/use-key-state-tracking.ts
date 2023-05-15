import { useEventListener } from '@vueuse/core';

export const keyDown: Record<string, boolean> = reactive({});

export function useKeyStateTracking() {
  useEventListener('keydown', (event) => (keyDown[event.key] = true), {
    capture: true,
  });

  useEventListener('keyup', (event) => delete keyDown[event.key], {
    capture: true,
  });
}
