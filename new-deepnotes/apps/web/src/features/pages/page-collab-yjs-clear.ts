import * as Y from "yjs";

/** Clears ProseMirror fragment and legacy plain Y.Text (migration path). */
export function clearYjsProseMirrorAndLegacyText(
  ydoc: Y.Doc,
  proseField: string,
  legacyTextName: string,
): void {
  const frag = ydoc.getXmlFragment(proseField);
  ydoc.transact(() => {
    while (frag.length > 0) {
      frag.delete(frag.length - 1, 1);
    }
  });
  const legacy = ydoc.getText(legacyTextName);
  if (legacy.length > 0) {
    legacy.delete(0, legacy.length);
  }
}
