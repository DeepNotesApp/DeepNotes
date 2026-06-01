/**
 * Simple global registry for note/arrow Tiptap editors so that
 * cross-selection formatting commands can target them.
 */
import type { Editor } from "@tiptap/vue-3";

export type EditorSection = "head" | "body" | "label";

interface EditorEntry {
  editor: Editor;
  section: EditorSection;
}

const registry = new Map<string, Map<EditorSection, EditorEntry>>();

export function registerNoteEditor(
  noteId: string,
  section: EditorSection,
  editor: Editor,
): () => void {
  let noteMap = registry.get(noteId);
  if (!noteMap) {
    noteMap = new Map();
    registry.set(noteId, noteMap);
  }
  noteMap.set(section, { editor, section });

  return () => {
    const map = registry.get(noteId);
    if (map) {
      map.delete(section);
      if (map.size === 0) {
        registry.delete(noteId);
      }
    }
  };
}

export function getNoteEditors(noteId: string): Editor[] {
  const map = registry.get(noteId);
  if (!map) return [];
  return Array.from(map.values()).map((e) => e.editor);
}

export function clearNoteEditors(noteId: string): void {
  registry.delete(noteId);
}
