const alphabet =
  'useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict';

const charMap = new Map<string, number>();

for (let i = 0; i < alphabet.length; i++) {
  charMap.set(alphabet[i], i);
}

export const nanoidLength = 21;

export function nanoidToBytes(input: string): Uint8Array {
  const bytes = new Uint8Array(16);

  let bitPos = 0;
  let bytePos = 0;

  let oldBitOffset = 0;

  for (let i = 0; i < nanoidLength; i++) {
    bytes[bytePos] |= charMap.get(input[i])! << oldBitOffset;

    bitPos += 6;
    bytePos = bitPos >>> 3;
    const newBitOffset = bitPos % 8;

    if (oldBitOffset > newBitOffset) {
      bytes[bytePos] |= charMap.get(input[i])! >>> (8 - oldBitOffset);
    }

    oldBitOffset = newBitOffset;
  }

  return bytes;
}

const nanoidRegExp = /^[\w-]{21}$/;

export function isNanoID(input: string): boolean {
  return nanoidRegExp.test(input);
}
