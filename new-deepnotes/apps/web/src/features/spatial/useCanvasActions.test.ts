import { describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import { useCanvasActions, type CanvasRef } from "./useCanvasActions";
import { useNoteHeights } from "./useNoteHeights";

vi.mock("./useNoteHeights", () => ({
  useNoteHeights: vi.fn(),
}));

describe("useCanvasActions", () => {
  function mockNoteHeights(heights: Map<string, number>, originOffsets?: Map<string, number>) {
    (useNoteHeights as ReturnType<typeof vi.fn>).mockReturnValue({
      heights: ref(heights),
      originOffsets: ref(originOffsets ?? new Map<string, number>()),
    });
  }

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
    mockNoteHeights(new Map());
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
    mockNoteHeights(new Map());
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
    mockNoteHeights(new Map());
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

  it("fitToScreen uses actual note heights when available", () => {
    const heights = new Map<string, number>([
      ["n1", 120],
      ["n2", 200],
    ]);
    mockNoteHeights(heights);

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
    const fitToScreenMock = canvasRef.value.fitToScreen as ReturnType<typeof vi.fn>;
    const [bounds] = fitToScreenMock.mock.calls[0]!;
    expect(bounds.maxY).toBe(60 + 200); // n2 height from map
  });

  it("fitToScreen uses selected notes bounds when selection exists", () => {
    mockNoteHeights(new Map());
    const canvasRef = ref(makeCanvasRef());
    const rootNoteList = ref([
      {
        id: "n1",
        model: {
          pos: { value: { x: 0, y: 0 } },
          width: { value: { expanded: "100px", collapsed: "80px" } },
        },
      },
      {
        id: "n2",
        model: {
          pos: { value: { x: 500, y: 500 } },
          width: { value: { expanded: "Auto", collapsed: "80px" } },
        },
      },
      {
        id: "n3",
        model: {
          pos: { value: { x: 1000, y: 1000 } },
          width: { value: { expanded: "Auto", collapsed: "80px" } },
        },
      },
    ] as any);

    const selectedNoteIds = ref(new Set(["n2"]));

    const { fitToScreen } = useCanvasActions({
      canvasRef,
      rootNoteList,
      selectedNoteIds,
      createNoteAt: vi.fn(),
    });

    fitToScreen();
    const fitToScreenMock = canvasRef.value.fitToScreen as ReturnType<typeof vi.fn>;
    const [bounds] = fitToScreenMock.mock.calls[0]!;
    // Should fit to n2 only, not the full spread of n1..n3
    expect(bounds.minX).toBe(500);
    expect(bounds.minY).toBe(500);
    expect(bounds.maxX).toBe(500 + 160); // Auto width
    expect(bounds.maxY).toBe(500 + 80);  // Default height
  });

  it("onCanvasDoubleClick at zoom=2 scales world coordinates correctly", () => {
    mockNoteHeights(new Map());
    const canvasRef = ref(
      makeCanvasRef({
        zoom: 2,
        camX: 10,
        camY: 20,
      }),
    );
    const createNoteAt = vi.fn();

    const { onCanvasDoubleClick } = useCanvasActions({
      canvasRef,
      rootNoteList: ref([]),
      createNoteAt,
    });

    const rect = canvasRef.value.rootEl!.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const event = new MouseEvent("dblclick", { clientX: cx + 100, clientY: cy + 200 });
    onCanvasDoubleClick(event);

    expect(createNoteAt).toHaveBeenCalledOnce();
    const [x, y] = createNoteAt.mock.calls[0]!;
    // At zoom=2, screen offset (100, 200) -> world offset (50, 100)
    // Plus camX=10, camY=20 -> world position (60, 120)
    expect(x).toBeCloseTo(10 + 100 / 2, 5);
    expect(y).toBeCloseTo(20 + 200 / 2, 5);
  });
});
