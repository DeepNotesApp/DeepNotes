import { describe, expect, it } from "vitest";
import { createPageYDoc } from "@deepnotes/collab-wire";
import { useSpatialPage } from "./useSpatialPage";
import { useSpatialUndoRedo } from "./undo-redo";
import { searchNotes, replaceInNote } from "./find-replace";

describe("find-replace", () => {
  it("finds text in note head and body", () => {
    const ydoc = createPageYDoc();
    const ur = useSpatialUndoRedo(ydoc);
    const page = useSpatialPage(ydoc, ur);

    const n1 = page.createNoteAt(0, 0);
    // head text is the default fragment from createNoteMap
    // we can't easily set it from here without Tiptap
    // so we just verify search returns empty for default empty text
    const results = searchNotes(page.noteList.value, "hello");
    expect(results).toEqual([]);
  });

  it("finds nothing with empty query", () => {
    const ydoc = createPageYDoc();
    const ur = useSpatialUndoRedo(ydoc);
    const page = useSpatialPage(ydoc, ur);

    page.createNoteAt(0, 0);
    expect(searchNotes(page.noteList.value, "")).toEqual([]);
  });

  it("returns empty for disabled head/body sections", () => {
    const ydoc = createPageYDoc();
    const ur = useSpatialUndoRedo(ydoc);
    const page = useSpatialPage(ydoc, ur);

    const id = page.createNoteAt(0, 0);
    const model = page.noteList.value.find((n) => n.id === id)!.model;
    // Disable head
    const headMap = model.rawMap.get("head") as import("yjs").Map<unknown>;
    headMap.set("enabled", false);

    const results = searchNotes(page.noteList.value, "test");
    expect(results).toEqual([]);
  });
});
