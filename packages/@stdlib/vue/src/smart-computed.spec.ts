import { ref } from 'vue';

import { createSmartComputed } from './smart-computed';

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('SmartComputed', () => {
  it('should execute only when dependencies change', async () => {
    const dependency = ref('test1');

    const smartComputedGetter = vi.fn(async () => {
      const result = dependency.value;

      await sleep(100);

      return result;
    });

    const smartComputed = createSmartComputed({
      get: smartComputedGetter,
    });

    expect(smartComputedGetter).toHaveBeenCalledTimes(0);

    expect(smartComputed.get()).toBe(undefined);

    expect(smartComputedGetter).toHaveBeenCalledTimes(1);

    expect(smartComputed.get()).toBe(undefined);

    await sleep(101);

    expect(smartComputed.get()).toBe('test1');
    expect(smartComputed.get()).toBe('test1');

    dependency.value = 'test2';

    expect(smartComputedGetter).toHaveBeenCalledTimes(1);

    expect(smartComputed.get()).toBe('test1');

    expect(smartComputedGetter).toHaveBeenCalledTimes(2);

    expect(smartComputed.get()).toBe('test1');

    await sleep(101);

    expect(smartComputed.get()).toBe('test2');
    expect(smartComputed.get()).toBe('test2');

    expect(smartComputedGetter).toHaveBeenCalledTimes(2);
  });
});
