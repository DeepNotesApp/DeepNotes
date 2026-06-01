import { describe, expect, it } from "vitest";
import {
  registerNoteEditor,
  getNoteEditors,
  clearNoteEditors,
} from "./note-editor-registry";

describe("note-editor-registry", () => {
  it("registers and retrieves editors for a note", () => {
    const mockEditor = { id: "ed1" } as any;
    const unregister = registerNoteEditor("note-1", "body", mockEditor);

    const editors = getNoteEditors("note-1");
    expect(editors).toHaveLength(1);
    expect(editors[0]).toBe(mockEditor);

    unregister();
    expect(getNoteEditors("note-1")).toHaveLength(0);
  });

  it("registers multiple sections for the same note", () => {
    const headEd = { id: "head-ed" } as any;
    const bodyEd = { id: "body-ed" } as any;

    registerNoteEditor("note-1", "head", headEd);
    registerNoteEditor("note-1", "body", bodyEd);

    const editors = getNoteEditors("note-1");
    expect(editors).toHaveLength(2);
  });

  it("clears all editors for a note", () => {
    registerNoteEditor("note-1", "body", { id: "ed1" } as any);
    clearNoteEditors("note-1");
    expect(getNoteEditors("note-1")).toHaveLength(0);
  });
});
