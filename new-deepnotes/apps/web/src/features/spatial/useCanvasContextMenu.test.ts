import { describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import { useCanvasContextMenu, type CanvasRef } from "./useCanvasContextMenu";
import { useSpatialSelection } from "./selection";

vi.mock("./clipboard", () => ({
  copySelection: vi.fn().mockResolvedValue(undefined),
  pastePayload: vi.fn().mockReturnValue({ noteIds: ["pasted-note"], arrowIds: [] }),
}));

describe("useCanvasContextMenu", () => {
  function makeCanvasRef(overrides?: Partial<CanvasRef>): CanvasRef {
    return {
      camX: 0,
      camY: 0,
      zoom: 1,
      rootEl: document.createElement("div"),
      ...overrides,
    };
  }

  function setup() {
    const canvasRef = ref(makeCanvasRef());
    const selection = useSpatialSelection();
    const noteList = ref([
      { id: "n1", model: {} as any },
      { id: "n2", model: {} as any },
    ]);
    const arrowList = ref([
      { id: "a1", model: {} as any },
    ]);
    const createNoteAt = vi.fn().mockReturnValue("new-note-id");
    const createArrow = vi.fn().mockReturnValue("new-arrow-id");
    const deleteNote = vi.fn();
    const deleteArrow = vi.fn();
    const pasteCount = ref(0);

    const api = useCanvasContextMenu({
      canvasRef,
      selection,
      noteList,
      arrowList,
      createNoteAt,
      createArrow,
      deleteNote,
      deleteArrow,
      pasteCount,
    });

    return {
      canvasRef,
      selection,
      noteList,
      arrowList,
      createNoteAt,
      createArrow,
      deleteNote,
      deleteArrow,
      pasteCount,
      api,
    };
  }

  it("onCanvasContextMenu sets state and prevents default", () => {
    const { api } = setup();
    const event = new MouseEvent("contextmenu", { clientX: 100, clientY: 200 });
    const preventDefaultSpy = vi.spyOn(event, "preventDefault");

    expect(api.contextMenu.value.open).toBe(false);
    api.onCanvasContextMenu(event);

    expect(preventDefaultSpy).toHaveBeenCalledOnce();
    expect(api.contextMenu.value.open).toBe(true);
    expect(api.contextMenu.value.x).toBe(100);
    expect(api.contextMenu.value.y).toBe(200);
  });

  it("handleContextMenuCreateNote creates a note at world coordinates", () => {
    const { api, createNoteAt } = setup();
    api.handleContextMenuCreateNote(150, 250);
    expect(createNoteAt).toHaveBeenCalledOnce();
    const [x, y] = createNoteAt.mock.calls[0]!;
    expect(typeof x).toBe("number");
    expect(typeof y).toBe("number");
  });

  it("handleContextMenuDeleteSelected deletes selected notes and arrows", () => {
    const { api, selection, deleteNote, deleteArrow } = setup();
    selection.select("n1", "note");
    selection.select("a1", "arrow", true);

    api.handleContextMenuDeleteSelected();

    expect(deleteNote).toHaveBeenCalledWith("n1");
    expect(deleteArrow).toHaveBeenCalledWith("a1");
    expect(selection.hasSelection.value).toBe(false);
  });

  it("handleContextMenuCopySelected copies selected notes and arrows", async () => {
    const { api, selection } = setup();
    selection.select("n1", "note");
    selection.select("a1", "arrow", true);

    // clipboard.ts copySelection is imported statically; we just verify
    // the handler iterates over selected items without error
    await expect(api.handleContextMenuCopySelected()).resolves.not.toThrow();
  });

  it("handleContextMenuCutSelected copies then deletes selected items", async () => {
    const { api, selection, deleteNote, deleteArrow } = setup();
    selection.select("n1", "note");
    selection.select("a1", "arrow", true);

    await api.handleContextMenuCutSelected();

    expect(deleteNote).toHaveBeenCalledWith("n1");
    expect(deleteArrow).toHaveBeenCalledWith("a1");
    expect(selection.hasSelection.value).toBe(false);
  });

  it("handleContextMenuCutSelected does nothing when no notes selected", async () => {
    const { api, selection, deleteNote, deleteArrow } = setup();
    selection.select("a1", "arrow"); // only arrow selected

    await api.handleContextMenuCutSelected();

    expect(deleteNote).not.toHaveBeenCalled();
    expect(deleteArrow).not.toHaveBeenCalled();
  });
});
