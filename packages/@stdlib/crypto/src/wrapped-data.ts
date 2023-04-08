import { pack, unpack } from 'msgpackr';

import type { KeyPair } from './keys/key-pair';
import type { PrivateKey } from './keys/private-key';
import type { PublicKey } from './keys/public-key';
import type { SymmetricKey } from './keys/symmetric-key';

export enum DataLayer {
  Raw,
  Symmetric,
  Asymmetric,
}

export interface Wrappable {
  get layers(): DataLayer[];
  get topLayer();
  hasLayer(layer: DataLayer);
  countLayerType(layer: DataLayer);

  wrapSymmetric(
    symmetricKey: SymmetricKey,
    params?: {
      nonce?: Uint8Array;
      includeNonce?: boolean;
      associatedData?: object;
      padding?: boolean;
    },
  );
  unwrapSymmetric(
    symmetricKey: SymmetricKey,
    params?: {
      nonce?: Uint8Array;
      associatedData?: object;
      padding?: boolean;
    },
  );

  wrapAsymmetric(
    keyPair: KeyPair,
    recipientsPublicKey: PublicKey,
    params?: { padding?: boolean },
  );
  unwrapAsymmetric(privateKey: PrivateKey, params?: { padding?: boolean });
}

export class WrappedData implements Wrappable {
  layers: DataLayer[] = [];
  metadata: any = {};
  content: Uint8Array = new Uint8Array();

  constructor(value: Uint8Array, params?: { raw?: boolean; metadata?: any }) {
    this.metadata = params?.metadata ?? {};

    if (params?.raw) {
      this.layers.push(DataLayer.Raw);

      this.content = value;
    } else {
      if (value[0] >= 3) {
        // New format

        const obj = unpack(value.slice(1)) as {
          layers: DataLayer[];
          metadata: any;
          content: Uint8Array;
        };

        this.layers = obj.layers;
        this.metadata = obj.metadata;
        this.content = obj.content;
      } else {
        // Old format

        let index = 0;

        while (value[index] !== DataLayer.Raw) {
          this.layers.push(value[index++]);
        }

        this.layers.push(value[index++]);

        this.content = value.slice(index);
      }
    }
  }

  get topLayer() {
    return this.layers[0];
  }
  hasLayer(layer: DataLayer) {
    return this.layers.includes(layer);
  }
  countLayerType(layer: DataLayer) {
    return this.layers.filter((l) => l === layer).length;
  }

  get value() {
    return new Uint8Array([
      3,
      ...pack({
        layers: this.layers,
        metadata: this.metadata,
        content: this.content,
      }),
    ]);
  }

  clone() {
    return new WrappedData(this.value);
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
    const result = this.clone();

    result.layers.unshift(DataLayer.Symmetric);
    result.content = symmetricKey.encrypt(result.content, params);

    return result;
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

    const result = this.clone();

    result.layers.shift();
    result.content = symmetricKey.decrypt(result.content, params);

    return result;
  }

  wrapAsymmetric(
    keyPair: KeyPair,
    recipientsPublicKey: PublicKey,
    params?: { padding?: boolean },
  ) {
    const result = this.clone();

    result.layers.unshift(DataLayer.Asymmetric);
    result.content = keyPair.encrypt(
      result.content,
      recipientsPublicKey,
      params,
    );

    return result;
  }
  unwrapAsymmetric(privateKey: PrivateKey, params?: { padding?: boolean }) {
    if (this.topLayer !== DataLayer.Asymmetric) {
      throw new Error('Cannot decrypt non-asymmetric keyring.');
    }

    const result = this.clone();

    result.layers.shift();
    result.content = privateKey.decrypt(result.content, params);

    return result;
  }
}
