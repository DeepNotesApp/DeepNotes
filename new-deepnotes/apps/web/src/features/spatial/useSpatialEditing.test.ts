import { describe, expect, it } from "vitest";
import { useSpatialEditing } from "./useSpatialEditing";

describe("useSpatialEditing", () => {
  it("starts with no active editing", () => {
    const editing = useSpatialEditing();
    expect(editing.editingId.value).toBeNull();
    expect(editing.editingKind.value).toBeNull();
  });

  it("tracks editing note", () => {
    const editing = useSpatialEditing();
    editing.startEditing("note-1", "note");
    expect(editing.editingId.value).toBe("note-1");
    expect(editing.editingKind.value).toBe("note");
    expect(editing.isEditing.value("note-1")).toBe(true);
    expect(editing.isEditing.value("note-2")).toBe(false);
  });

  it("tracks editing arrow", () => {
    const editing = useSpatialEditing();
    editing.startEditing("arrow-1", "arrow");
    expect(editing.editingId.value).toBe("arrow-1");
    expect(editing.editingKind.value).toBe("arrow");
  });

  it("clears editing on stop", () => {
    const editing = useSpatialEditing();
    editing.startEditing("note-1", "note");
    editing.stopEditing();
    expect(editing.editingId.value).toBeNull();
    expect(editing.editingKind.value).toBeNull();
  });
});
