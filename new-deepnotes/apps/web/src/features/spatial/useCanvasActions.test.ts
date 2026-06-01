import { describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import { useCanvasActions, type CanvasRef } from "./useCanvasActions";

describe("useCanvasActions", () => {
  function makeCanvasRef(overrides?: Partial<CanvasRef>): CanvasRef {
    return {
      camX: 0,
      camY: 0,
      zoom: 1,
      rootEl: document.createElement("div"),
      resetView: vi.fn(),
      fitToScreen: vi.fn(),
      ...overrides,
    };
  }

  it("onCanvasDoubleClick creates a note at world coordinates", () => {
    const canvasRef = ref(makeCanvasRef());
    const createNoteAt = vi.fn();
    const defaultNoteTemplate = { color: { value: "red", inherit: false } };

    const { onCanvasDoubleClick } = useCanvasActions({
      canvasRef,
      rootNoteList: ref([]),
      createNoteAt,
      defaultNoteTemplate,
    });

    const event = new MouseEvent("dblclick", { clientX: 100, clientY: 200 });
    onCanvasDoubleClick(event);

    expect(createNoteAt).toHaveBeenCalledOnce();
    const [x, y, template] = createNoteAt.mock.calls[0]!;
    expect(typeof x).toBe("number");
    expect(typeof y).toBe("number");
    expect(template).toBe(defaultNoteTemplate);
  });

  it("fitToScreen calls resetView when no root notes", () => {
    const canvasRef = ref(makeCanvasRef());
    const { fitToScreen } = useCanvasActions({
      canvasRef,
      rootNoteList: ref([]),
      createNoteAt: vi.fn(),
    });

    fitToScreen();
    expect(canvasRef.value.resetView).toHaveBeenCalledOnce();
    expect(canvasRef.value.fitToScreen).not.toHaveBeenCalled();
  });

  it("fitToScreen calculates bounds and calls canvas.fitToScreen", () => {
    const canvasRef = ref(makeCanvasRef());
    const rootNoteList = ref([
      {
        id: "n1",
        model: {
          pos: { value: { x: 10, y: 20 } },
          width: { value: { expanded: "100px", collapsed: "80px" } },
        },
      },
      {
        id: "n2",
        model: {
          pos: { value: { x: 50, y: 60 } },
          width: { value: { expanded: "Auto", collapsed: "80px" } },
        },
      },
    ] as any);

    const { fitToScreen } = useCanvasActions({
      canvasRef,
      rootNoteList,
      createNoteAt: vi.fn(),
    });

    fitToScreen();
    expect(canvasRef.value.resetView).not.toHaveBeenCalled();
    expect(canvasRef.value.fitToScreen).toHaveBeenCalledOnce();
    const fitToScreenMock = canvasRef.value.fitToScreen as ReturnType<typeof vi.fn>;
    const [bounds, padding] = fitToScreenMock.mock.calls[0]!;
    expect(bounds.minX).toBe(10);
    expect(bounds.minY).toBe(20);
    expect(bounds.maxX).toBe(50 + 160); // Auto width defaults to 160
    expect(bounds.maxY).toBe(60 + 80);  // Default height estimate is 80
    expect(padding).toBe(40);
  });
});
