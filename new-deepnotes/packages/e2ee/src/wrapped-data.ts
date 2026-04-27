import { pack, unpack } from "msgpackr";

import type { KeyPair } from "./key-pair.js";
import type { PrivateKey } from "./private-key.js";
import type { PublicKey } from "./public-key.js";
import type { SymmetricKey } from "./symmetric-key.js";

export enum DataLayer {
  Raw,
  Symmetric,
  Asymmetric,
}

export interface Wrappable {
  get layers(): DataLayer[];
  get topLayer(): unknown;
  hasLayer(layer: DataLayer): boolean;
  countLayerType(layer: DataLayer): number;

  wrapSymmetric(
    symmetricKey: SymmetricKey,
    params?: {
      nonce?: Uint8Array;
      includeNonce?: boolean;
      associatedData?: object;
      padding?: boolean;
    },
  ): Wrappable;
  unwrapSymmetric(
    symmetricKey: SymmetricKey,
    params?: {
      nonce?: Uint8Array;
      associatedData?: object;
      padding?: boolean;
    },
  ): Wrappable;

  wrapAsymmetric(
    keyPair: KeyPair,
    recipientsPublicKey: PublicKey,
    params?: { padding?: boolean },
  ): Wrappable;
  unwrapAsymmetric(
    privateKey: PrivateKey,
    params?: { padding?: boolean },
  ): Wrappable;
}

export class WrappedData implements Wrappable {
  layers: DataLayer[] = [];
  metadata: Record<string, unknown> = {};
  content: Uint8Array = new Uint8Array();

  constructor(value: Uint8Array, params?: { raw?: boolean; metadata?: unknown }) {
    this.metadata = (params?.metadata as Record<string, unknown>) ?? {};

    if (params?.raw) {
      this.layers.push(DataLayer.Raw);
      this.content = value;
    } else if (value[0]! >= 3) {
      const obj = unpack(value.slice(1)) as {
        layers: DataLayer[];
        metadata: Record<string, unknown>;
        content: Uint8Array;
      };
      this.layers = obj.layers;
      this.metadata = obj.metadata;
      this.content = obj.content;
    } else {
      let index = 0;
      while (value[index] !== DataLayer.Raw) {
        this.layers.push(value[index++]!);
      }
      this.layers.push(value[index++]!);
      this.content = value.slice(index);
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
      throw new Error("Cannot decrypt non-symmetric keyring.");
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
    result.content = keyPair.encrypt(result.content, recipientsPublicKey, params);
    return result;
  }

  unwrapAsymmetric(privateKey: PrivateKey, params?: { padding?: boolean }) {
    if (this.topLayer !== DataLayer.Asymmetric) {
      throw new Error("Cannot decrypt non-asymmetric keyring.");
    }
    const result = this.clone();
    result.layers.shift();
    result.content = privateKey.decrypt(result.content, params);
    return result;
  }
}
