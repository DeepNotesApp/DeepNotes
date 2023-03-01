import type { PublicKey } from './public-key';
import { wrapPublicKey } from './public-key';
import { DataLayer, wrapData } from './wrapped-data';

export function createPublicKeyring(
  value: Uint8Array,
  params?: { maxKeys?: number; raw?: boolean },
) {
  const _wrappedData = wrapData(value, {
    raw: value.length <= 32,

    ...params,
  });

  const _keys: PublicKey[] = [];

  if (_wrappedData.topLayer === DataLayer.Raw) {
    for (
      let i = 0;
      i < Math.min(_wrappedData.content.length / 32, params?.maxKeys ?? 2);
      ++i
    ) {
      _keys.push(
        wrapPublicKey(_wrappedData.content.slice(i * 32, i * 32 + 32)),
      );
    }

    _wrappedData.content = _wrappedData.content.slice(0, _keys.length * 32);
  }

  return new (class PublicKeyring implements PublicKey {
    get keys() {
      return _keys;
    }
    get topKey() {
      return _keys[0];
    }
    addKey(key: Uint8Array) {
      if (_wrappedData.topLayer !== DataLayer.Raw) {
        throw new Error('Cannot add key to non-raw keyring.');
      }

      return createPublicKeyring(
        new Uint8Array([
          ..._wrappedData.layers,
          ...key,
          ..._wrappedData.content,
        ]),
        { ...params, raw: false },
      );
    }

    get fullValue() {
      return _wrappedData.value;
    }
    get value() {
      return this.topKey.value;
    }
  })();
}

export type PublicKeyring = ReturnType<typeof createPublicKeyring>;
