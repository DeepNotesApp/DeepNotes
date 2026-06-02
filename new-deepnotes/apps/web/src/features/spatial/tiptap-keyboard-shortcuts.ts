import { Extension } from "@tiptap/core";

/**
 * Custom Tiptap extension that adds DeepNotes-specific keyboard shortcuts
 * for formatting, objects, and structural commands inside note editors.
 */
export const DeepNotesKeyboardShortcuts = Extension.create({
  name: "deepnotesKeyboardShortcuts",

  addKeyboardShortcuts() {
    return {
      "Mod-Space": () =>
        this.editor.chain().focus().clearNodes().unsetAllMarks().run(),

      "Mod-Shift-x": () =>
        this.editor.chain().focus().toggleStrike().run(),

      "Mod-Shift-h": () =>
        this.editor.chain().focus().toggleHighlight().run(),

      "Mod-Shift-7": () =>
        this.editor.chain().focus().toggleOrderedList().run(),

      "Mod-Shift-8": () =>
        this.editor.chain().focus().toggleBulletList().run(),

      "Mod-Shift-9": () =>
        this.editor.chain().focus().toggleTaskList().run(),

      "Alt-1": () =>
        this.editor.chain().focus().toggleHeading({ level: 1 }).run(),

      "Alt-2": () =>
        this.editor.chain().focus().toggleHeading({ level: 2 }).run(),

      "Alt-3": () =>
        this.editor.chain().focus().toggleHeading({ level: 3 }).run(),

      "Alt-0": () => this.editor.chain().focus().setParagraph().run(),

      "Alt-Shift-q": () =>
        this.editor.chain().focus().toggleBlockquote().run(),

      "Alt-Shift-c": () =>
        this.editor.chain().focus().toggleCodeBlock().run(),

      "Alt-Shift-r": () =>
        this.editor.chain().focus().setHorizontalRule().run(),

      "Alt-Shift-t": () =>
        this.editor
          .chain()
          .focus()
          .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
          .run(),

      "Alt-Shift-i": () => {
        const url = window.prompt("Image URL:");
        if (url) {
          this.editor.chain().focus().setImage({ src: url }).run();
        }
        return true;
      },

      "Alt-Shift-y": () => {
        const url = window.prompt("YouTube video URL:");
        if (url) {
          this.editor
            .chain()
            .focus()
            .setYoutubeVideo({ src: url })
            .run();
        }
        return true;
      },

      "Mod-Comma": () =>
        this.editor.chain().focus().toggleSubscript().run(),

      "Mod-Period": () =>
        this.editor.chain().focus().toggleSuperscript().run(),

      "Mod-k": () => {
        const existing = this.editor.getAttributes("link").href as
          | string
          | undefined;
        const url = window.prompt(
          "Link URL:",
          existing ?? "",
        );
        if (url === null) return true;
        if (url === "") {
          this.editor.chain().focus().unsetLink().run();
        } else {
          this.editor.chain().focus().setLink({ href: url }).run();
        }
        return true;
      },

      "Mod-m": () =>
        (this.editor.commands as any).addInlineMath?.() ?? false,

      "Mod-Shift-m": () =>
        (this.editor.commands as any).addMathBlock?.() ?? false,
    };
  },
});
