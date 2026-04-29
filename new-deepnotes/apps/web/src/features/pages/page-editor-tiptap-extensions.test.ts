import * as Y from "yjs";
import { Awareness } from "y-protocols/awareness";
import { describe, expect, it } from "vitest";

import { createPageEditorTipTapExtensions } from "./page-editor-tiptap-extensions";

describe("createPageEditorTipTapExtensions", () => {
  it("includes starter kit, tables, images, tasks, and collab extensions", () => {
    const ydoc = new Y.Doc();
    const awareness = new Awareness(ydoc);
    const ext = createPageEditorTipTapExtensions({
      ydoc,
      collabCaretProvider: { awareness },
    });
    const names = ext.map((e) => e.name);
    expect(names.some((n) => /starter/i.test(String(n)))).toBe(true);
    expect(names).toContain("table");
    expect(names).toContain("image");
    expect(names).toContain("taskList");
    expect(names).toContain("collaboration");
    expect(names).toContain("collaborationCaret");
  });
});
