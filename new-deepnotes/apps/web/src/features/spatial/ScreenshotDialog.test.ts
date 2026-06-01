import { afterEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";

import ScreenshotDialog from "./ScreenshotDialog.vue";

vi.mock("html2canvas", () => ({
  default: vi.fn(() =>
    Promise.resolve({
      toDataURL: () => "data:image/png;base64,test",
    }),
  ),
}));

function createMockNote(id: string, x: number, y: number) {
  return {
    id,
    model: {
      pos: { value: { x, y } },
      width: { value: { expanded: "200px", collapsed: "Auto" } },
      head: {
        enabled: { value: true },
        height: { value: { expanded: "Auto", collapsed: "Auto" } },
      },
      body: {
        enabled: { value: false },
        height: { value: { expanded: "Auto", collapsed: "Auto" } },
      },
    },
  };
}

describe("ScreenshotDialog", () => {
  afterEach(() => {
    document.querySelectorAll("[data-testid='screenshot-margin']").forEach((el) => el.remove());
    document.querySelectorAll("[data-testid='screenshot-scale']").forEach((el) => el.remove());
    document.querySelectorAll(".bg-black/50").forEach((el) => el.remove());
  });

  function mountComponent(props: Record<string, unknown> = {}) {
    return mount(ScreenshotDialog, {
      props: {
        open: true,
        canvasElement: null,
        selectedNoteIds: [],
        notes: [],
        zoom: 1,
        camX: 0,
        camY: 0,
        ...props,
      },
      attachTo: document.body,
    });
  }

  it("renders when open", () => {
    mountComponent();
    expect(document.body.textContent).toContain("Take Screenshot");
  });

  it("does not render when closed", () => {
    mountComponent({ open: false });
    expect(document.body.querySelector(".bg-black/50")).toBeNull();
  });

  it("renders cancel and download buttons", () => {
    mountComponent();
    const buttons = document.body.querySelectorAll("button");
    const texts = Array.from(buttons).map((b) => b.textContent);
    expect(texts.some((t) => t?.includes("Cancel"))).toBe(true);
    expect(texts.some((t) => t?.includes("Download"))).toBe(true);
  });

  it("renders margin and scale inputs with defaults", () => {
    mountComponent();
    const marginInput = document.body.querySelector('[data-testid="screenshot-margin"]') as HTMLInputElement;
    const scaleInput = document.body.querySelector('[data-testid="screenshot-scale"]') as HTMLInputElement;
    expect(marginInput).not.toBeNull();
    expect(scaleInput).not.toBeNull();
    expect(marginInput.value).toBe("100");
    expect(scaleInput.value).toBe("100");
  });
});
