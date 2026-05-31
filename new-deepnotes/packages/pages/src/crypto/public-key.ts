export interface PublicKey {
  value: Uint8Array;
}

export function wrapPublicKey(value: Uint8Array): PublicKey {
  return { value };
}
