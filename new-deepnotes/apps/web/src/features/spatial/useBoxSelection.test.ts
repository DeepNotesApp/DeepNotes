import { beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import { useBoxSelection } from "./useBoxSelection";
import { useSpatialSelection } from "./selection";
import { useSpatialEditing } from "./useSpatialEditing";
import type { NoteModel } from "./note-model";
import { useNoteHeights } from "./useNoteHeights";

vi.mock("./useNoteHeights", () => ({
  useNoteHeights: vi.fn(),
}));

describe("useBoxSelection", () => {
  beforeEach(() => {
    (useNoteHeights as ReturnType<typeof vi.fn>).mockReturnValue({
      heights: ref(new Map<string, number>()),
    });
  });

  function setup() {
    const selection = useSpatialSelection();
    const editing = useSpatialEditing();
    const rootNoteList = ref([]) as unknown as import("vue").Ref<{ id: string; model: NoteModel }[]>;
    const noteList = ref([]) as unknown as import("vue").Ref<{ id: string; model: NoteModel }[]>;
    const parentOf = ref(new Map<string, string>());
    const canvasRef = ref({
      camX: 0,
      camY: 0,
      zoom: 1,
      rootEl: document.createElement("div"),
    });

    const { onCanvasPointerDown, onCanvasPointerMove, onCanvasPointerUp } = useBoxSelection({
      canvasRef,
      selection,
      editing,
      rootNoteList,
      noteList,
      parentOf,
    });

    return { onCanvasPointerDown, onCanvasPointerMove, onCanvasPointerUp, selection, editing };
  }

  it("starts box selection on pointer down", () => {
    const { onCanvasPointerDown } = setup();
    const e = new PointerEvent("pointerdown", { clientX: 100, clientY: 100 });
    onCanvasPointerDown(e);
    // Internal state is not exposed; box selection activates after threshold on move
  });

  it("activates box select after drag threshold", () => {
    const { onCanvasPointerDown, onCanvasPointerMove, selection } = setup();
    const down = new PointerEvent("pointerdown", { clientX: 100, clientY: 100 });
    onCanvasPointerDown(down);

    expect(selection.boxSelecting.value).toBe(false);

    const move = new PointerEvent("pointermove", { clientX: 110, clientY: 110 });
    onCanvasPointerMove(move);

    expect(selection.boxSelecting.value).toBe(true);
    expect(selection.boxRect.value).toEqual({ x: 100, y: 100, width: 10, height: 10 });
  });

  it("does not activate box select for small movements", () => {
    const { onCanvasPointerDown, onCanvasPointerMove, selection } = setup();
    const down = new PointerEvent("pointerdown", { clientX: 100, clientY: 100 });
    onCanvasPointerDown(down);

    const move = new PointerEvent("pointermove", { clientX: 102, clientY: 102 });
    onCanvasPointerMove(move);

    expect(selection.boxSelecting.value).toBe(false);
  });

  it("clears selection on pointer down without ctrl", () => {
    const { onCanvasPointerDown, selection } = setup();
    selection.select("a", "note");
    expect(selection.isSelected("a")).toBe(true);

    const down = new PointerEvent("pointerdown", { clientX: 100, clientY: 100 });
    onCanvasPointerDown(down);

    expect(selection.isSelected("a")).toBe(false);
  });

  it("does not clear selection when ctrl is held", () => {
    const { onCanvasPointerDown, selection } = setup();
    selection.select("a", "note");

    const down = new PointerEvent("pointerdown", { clientX: 100, clientY: 100, ctrlKey: true });
    onCanvasPointerDown(down);

    expect(selection.isSelected("a")).toBe(true);
  });

  it("stops editing on canvas pointer down", () => {
    const { onCanvasPointerDown, editing } = setup();
    editing.startEditing("note-1", "note");
    expect(editing.editingId.value).toBe("note-1");

    const down = new PointerEvent("pointerdown", { clientX: 100, clientY: 100 });
    onCanvasPointerDown(down);

    expect(editing.editingId.value).toBeNull();
  });
});
