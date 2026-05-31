import { x25519 } from "@noble/curves/ed25519.js";

const KEY_SIZE = 32;

/**
 * Environment-agnostic cryptographically secure random byte generation.
 * Works in browser (crypto.getRandomValues) and Node.js (node:crypto.randomBytes).
 */
export function getRandomBytes(length: number): Uint8Array {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    return crypto.getRandomValues(new Uint8Array(length));
  }
  // Fallback for Node.js environments
  const { randomBytes } = require('node:crypto');
  return new Uint8Array(randomBytes(length));
}

/**
 * Generate an X25519 key pair for asymmetric encryption.
 */
export function generateKeyPair(): { publicKey: Uint8Array; privateKey: Uint8Array } {
  const privateKey = getRandomBytes(32);
  const publicKey = x25519.getPublicKey(privateKey);
  return { publicKey, privateKey };
}

/**
 * PKCS#7-like padding for block ciphers.
 */
export function pad(data: Uint8Array, blockSize: number): Uint8Array {
  const padding = blockSize - (data.length % blockSize);
  const padded = new Uint8Array(data.length + padding);
  padded.set(data);
  padded[padded.length - 1] = padding;
  return padded;
}

/**
 * Remove PKCS#7-like padding.
 */
export function unpad(data: Uint8Array, blockSize: number): Uint8Array {
  const padding = data[data.length - 1]!;
  if (padding < 1 || padding > blockSize) {
    throw new Error("Invalid padding");
  }
  return data.slice(0, data.length - padding);
}

export { KEY_SIZE };
