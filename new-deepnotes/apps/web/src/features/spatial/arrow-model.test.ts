import { describe, expect, it } from "vitest";
import * as Y from "yjs";
import { createPageYDoc, addArrowToPage, YPAGE_ARROW_KEY } from "@deepnotes/collab-wire";

import { useArrowModel } from "./arrow-model";

describe("arrow-model reactivity", () => {
  it("reads default arrow properties", () => {
    const ydoc = createPageYDoc();
    const arrow = addArrowToPage(ydoc, "a1");
    const model = useArrowModel(arrow);

    expect(model.source.value).toBe("");
    expect(model.target.value).toBe("");
    expect(model.sourceHead.value).toBe("none");
    expect(model.targetHead.value).toBe("open");
    expect(model.bodyType.value).toBe("curve");
    expect(model.bodyStyle.value).toBe("solid");
    expect(model.color.value).toBe("grey");
    expect(model.readOnly.value).toBe(false);
    expect(model.interregional.value).toBe(false);
  });

  it("reacts to source/target mutation", () => {
    const ydoc = createPageYDoc();
    const arrow = addArrowToPage(ydoc, "a1");
    const model = useArrowModel(arrow);

    arrow.set(YPAGE_ARROW_KEY.source, "n1");
    arrow.set(YPAGE_ARROW_KEY.target, "n2");

    expect(model.source.value).toBe("n1");
    expect(model.target.value).toBe("n2");
  });

  it("reacts to color mutation", () => {
    const ydoc = createPageYDoc();
    const arrow = addArrowToPage(ydoc, "a1");
    const model = useArrowModel(arrow);

    arrow.set(YPAGE_ARROW_KEY.color, "red");
    expect(model.color.value).toBe("red");
  });

  it("reads label as Y.XmlFragment", () => {
    const ydoc = createPageYDoc();
    const arrow = addArrowToPage(ydoc, "a1");
    const model = useArrowModel(arrow);

    expect(model.label.value).toBeInstanceOf(Y.XmlFragment);
  });
});
