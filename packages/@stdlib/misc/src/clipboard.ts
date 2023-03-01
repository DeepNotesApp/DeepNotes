declare global {
  interface Window {
    clipboardData: any;
  }
}

export async function getClipboardText(): Promise<string> {
  if (navigator.clipboard?.readText != null) {
    return await navigator.clipboard.readText();
  }

  if (window.clipboardData != null) {
    return window.clipboardData.getData('Text');
  }

  if (document.queryCommandSupported?.('paste')) {
    const elem = document.createElement('textarea');

    document.body.appendChild(elem);

    elem.focus();

    document.execCommand('paste');

    const text = elem.value;

    document.body.removeChild(elem);

    return text;
  }

  return '';
}

export function setClipboardText(text: string): void {
  if (navigator.clipboard?.writeText != null) {
    void navigator.clipboard.writeText(text);
    return;
  }

  if (window.clipboardData != null) {
    window.clipboardData.setData('Text', text);
    return;
  }

  if (document.queryCommandSupported?.('copy')) {
    const elem = document.createElement('span');

    elem.textContent = text;

    elem.style.whiteSpace = 'pre';
    elem.style.webkitUserSelect = 'auto';
    elem.style.userSelect = 'all';

    document.body.appendChild(elem);

    const selection = window.getSelection();
    const range = document.createRange();
    selection?.removeAllRanges();
    range.selectNode(elem);
    selection?.addRange(range);

    document.execCommand('copy');

    selection?.removeAllRanges();
    document.body.removeChild(elem);

    return;
  }
}
