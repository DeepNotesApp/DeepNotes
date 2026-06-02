import { getNoteEditors } from "./note-editor-registry";

export type EditorCommand = (editor: any) => void;

export interface CommandDispatcher {
  run: (command: EditorCommand) => void;
  getEditors: () => any[];
}

export function useEditorCommandDispatcher(
  selectedNoteIds: () => string[],
): CommandDispatcher {
  function getEditors() {
    const editors: any[] = [];
    for (const noteId of selectedNoteIds()) {
      const noteEditors = getNoteEditors(noteId);
      editors.push(...noteEditors);
    }
    return editors;
  }

  function run(command: EditorCommand): void {
    for (const ed of getEditors()) {
      try {
        command(ed);
      } catch {
        // Ignore command failures on individual editors
      }
    }
  }

  return { run, getEditors };
}
