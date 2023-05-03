import { pack } from 'msgpackr';

import { WrappedData } from './wrapped-data';

describe('WrappedData', () => {
  it('should work with new format', () => {
    const wrappedData = new WrappedData(
      new Uint8Array([
        3,
        ...pack({
          layers: [1, 2, 1, 0],
          metadata: {},
          content: new Uint8Array(32),
        }),
      ]),
    );

    expect(wrappedData.layers).toEqual([1, 2, 1, 0]);
    expect(wrappedData.content).toEqual(new Uint8Array(32));
  });

  it('should work with old format', () => {
    const wrappedData = new WrappedData(
      new Uint8Array([1, 2, 1, 0, ...new Uint8Array(32)]),
    );

    expect(wrappedData.layers).toEqual([1, 2, 1, 0]);
    expect(wrappedData.content).toEqual(new Uint8Array(32));
  });

  it('should clone correctly', () => {
    const wrappedData = new WrappedData(
      new Uint8Array([1, 2, 1, 0, ...new Uint8Array(32)]),
    );

    const cloned = wrappedData.clone();

    expect(cloned.layers).toEqual(wrappedData.layers);
    expect(cloned.content).toEqual(wrappedData.content);
  });
});
