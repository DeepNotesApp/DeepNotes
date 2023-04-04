import type { Editor } from '@tiptap/vue-3';

export function isTiptapEditorEmpty(editor: Editor) {
  const html = editor.getHTML();

  return (
    editor.isEmpty ||
    html === '<p style="text-align: left"></p>' ||
    html === '<p style="text-align: center"></p>' ||
    html === '<p style="text-align: right"></p>' ||
    html === '<p style="text-align: justify"></p>' ||
    html === '<h1></h1>' ||
    html === '<h2></h2>' ||
    html === '<h3></h3>'
  );
}
