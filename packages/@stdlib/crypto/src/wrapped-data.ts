import type { KeyPair } from './key-pair';
import type { PrivateKey } from './private-key';
import type { PublicKey } from './public-key';
import type { SymmetricKey } from './symmetric-key';

export enum DataLayer {
  Raw,
  Symmetric,
  Asymmetric,
}

export function wrapData(value: Uint8Array, params?: { raw?: boolean }) {
  const _params = params;

  const _layers: DataLayer[] = [];

  let _content: Uint8Array;

  if (params?.raw) {
    _layers.push(DataLayer.Raw);

    _content = value;
  } else {
    let index = 0;

    while (value[index] !== DataLayer.Raw) {
      _layers.push(value[index++]);
    }

    _layers.push(value[index++]);

    _content = value.slice(index);
  }

  return new (class WrappedData {
    get layers() {
      return _layers;
    }
    get topLayer() {
      return _layers[0];
    }
    hasLayer(layer: DataLayer) {
      return _layers.includes(layer);
    }
    countLayerType(layer: DataLayer) {
      return _layers.filter((l) => l === layer).length;
    }

    get value() {
      return new Uint8Array([..._layers, ..._content]);
    }

    get content() {
      return _content;
    }
    set content(value: Uint8Array) {
      if (this.topLayer !== DataLayer.Raw) {
        throw new Error('Cannot set data on non-raw wrapped data.');
      }

      _content = value;
    }

    wrapSymmetric(
      symmetricKey: SymmetricKey,
      params?: {
        nonce?: Uint8Array;
        includeNonce?: boolean;
        associatedData?: object;
        padding?: boolean;
      },
    ) {
      return wrapData(
        new Uint8Array([
          DataLayer.Symmetric,
          ..._layers,
          ...symmetricKey.encrypt(_content, params),
        ]),
        { ..._params, raw: false },
      );
    }
    unwrapSymmetric(
      symmetricKey: SymmetricKey,
      params?: {
        nonce?: Uint8Array;
        associatedData?: object;
        padding?: boolean;
      },
    ) {
      if (this.topLayer !== DataLayer.Symmetric) {
        throw new Error('Cannot decrypt non-symmetric keyring.');
      }

      return wrapData(
        new Uint8Array([
          ..._layers.slice(1),
          ...symmetricKey.decrypt(_content, params),
        ]),
        { ..._params, raw: false },
      );
    }

    wrapAsymmetric(
      keyPair: KeyPair,
      recipientsPublicKey: PublicKey,
      params?: { padding?: boolean },
    ) {
      return wrapData(
        new Uint8Array([
          DataLayer.Asymmetric,
          ..._layers,
          ...keyPair.encrypt(_content, recipientsPublicKey, params),
        ]),
        { ..._params, raw: false },
      );
    }
    unwrapAsymmetric(privateKey: PrivateKey, params?: { padding?: boolean }) {
      if (this.topLayer !== DataLayer.Asymmetric) {
        throw new Error('Cannot decrypt non-asymmetric keyring.');
      }

      return wrapData(
        new Uint8Array([
          ..._layers.slice(1),
          ...privateKey.decrypt(_content, params),
        ]),
        { ..._params, raw: false },
      );
    }
  })();
}

export type WrappedData = ReturnType<typeof wrapData>;
