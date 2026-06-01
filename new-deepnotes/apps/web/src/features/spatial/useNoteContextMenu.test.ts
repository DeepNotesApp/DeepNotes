import { describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import { useNoteContextMenu } from "./useNoteContextMenu";

describe("useNoteContextMenu", () => {
  function makeNote(id: string, zIndex: number) {
    const rawMap = new Map<string, any>();
    const zMap = new Map<string, number>();
    zMap.set("value", zIndex);
    rawMap.set("zIndex", zMap);

    return {
      id,
      model: {
        zIndex: { value: zIndex },
        rawMap,
      } as any,
    };
  }

  function setup() {
    const noteList = ref([makeNote("n1", 1), makeNote("n2", 3), makeNote("n3", 2)]);
    const deleteNote = vi.fn();

    const api = useNoteContextMenu({
      noteList,
      deleteNote,
    });

    return { noteList, deleteNote, api };
  }

  it("onNoteContextMenu sets state and prevents default", () => {
    const { api } = setup();
    const event = new MouseEvent("contextmenu", { clientX: 100, clientY: 200 });
    const preventDefaultSpy = vi.spyOn(event, "preventDefault");

    expect(api.contextMenu.value.open).toBe(false);
    api.onNoteContextMenu("n1", event);

    expect(preventDefaultSpy).toHaveBeenCalledOnce();
    expect(api.contextMenu.value.open).toBe(true);
    expect(api.contextMenu.value.x).toBe(100);
    expect(api.contextMenu.value.y).toBe(200);
    expect(api.contextMenu.value.noteId).toBe("n1");
  });

  it("handleNoteContextMenuDelete deletes the target note", () => {
    const { api, deleteNote } = setup();
    api.onNoteContextMenu("n2", new MouseEvent("contextmenu"));

    api.handleNoteContextMenuDelete();
    expect(deleteNote).toHaveBeenCalledWith("n2");
  });

  it("handleNoteContextMenuDelete does nothing when no note targeted", () => {
    const { api, deleteNote } = setup();
    api.handleNoteContextMenuDelete();
    expect(deleteNote).not.toHaveBeenCalled();
  });

  it("handleNoteContextMenuBringToFront bumps zIndex above all others", () => {
    const { api, noteList } = setup();
    api.onNoteContextMenu("n1", new MouseEvent("contextmenu"));

    api.handleNoteContextMenuBringToFront();
    const zMap = noteList.value[0]!.model.rawMap.get("zIndex") as Map<string, number>;
    expect(zMap.get("value")).toBe(4); // max was 3, so 3 + 1
  });

  it("handleNoteContextMenuSendToBack lowers zIndex below all others", () => {
    const { api, noteList } = setup();
    api.onNoteContextMenu("n2", new MouseEvent("contextmenu"));

    api.handleNoteContextMenuSendToBack();
    const zMap = noteList.value[1]!.model.rawMap.get("zIndex") as Map<string, number>;
    expect(zMap.get("value")).toBe(0); // min was 1, so 1 - 1
  });
});
