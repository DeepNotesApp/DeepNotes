import { Clipboard } from '@capacitor/clipboard';
import {
  getClipboardText as _getClipboardText,
  setClipboardText as _setClipboardText,
} from '@stdlib/misc';

export async function getClipboardText(): Promise<string> {
  let text = await _getClipboardText();

  if (text === '') {
    const result = await Clipboard.read();

    mainLogger.info(`Capacitor clipboard result: ${JSON.stringify(result)}`);

    text = result.value;
  }

  return text;
}

export async function setClipboardText(text: string): Promise<void> {
  if (!(await _setClipboardText(text))) {
    await Clipboard.write({ string: text });
  }
}
