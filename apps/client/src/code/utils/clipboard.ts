import {
  getClipboardText as _getClipboardText,
  setClipboardText as _setClipboardText,
} from '@stdlib/misc';

export async function getClipboardText(): Promise<string> {
  let text = await _getClipboardText();

  if (!text && $quasar().platform.is.capacitor) {
    const { Clipboard } = await import('@capacitor/clipboard');

    const result = await Clipboard.read();

    text = result.value;
  }

  return text;
}

export async function setClipboardText(text: string): Promise<void> {
  const result = await _setClipboardText(text);

  if (!result && $quasar().platform.is.capacitor) {
    const { Clipboard } = await import('@capacitor/clipboard');

    await Clipboard.write({ string: text });
  }
}
