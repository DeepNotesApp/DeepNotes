import type { NoteModel } from "./note-model";

export interface NoteRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function rectsIntersect(
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  bx: number,
  by: number,
  bw: number,
  bh: number,
) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

export function getNoteEffectiveWorldPos(
  noteId: string,
  noteList: { id: string; model: NoteModel }[],
  parentOf: Map<string, string>,
  originOffsets?: Map<string, number>,
): { x: number; y: number } | null {
  const entry = noteList.find((n) => n.id === noteId);
  if (!entry) return null;
  const parentId = parentOf.get(noteId);
  if (!parentId) {
    return { x: entry.model.pos.value.x, y: entry.model.pos.value.y };
  }
  const parent = noteList.find((n) => n.id === parentId);
  if (!parent) return { x: entry.model.pos.value.x, y: entry.model.pos.value.y };
  const offset = originOffsets?.get(parentId) ?? 48;
  return {
    x: parent.model.pos.value.x + entry.model.pos.value.x,
    y: parent.model.pos.value.y + entry.model.pos.value.y + offset,
  };
}

export function getNoteRect(
  noteId: string,
  noteList: { id: string; model: NoteModel }[],
  parentOf: Map<string, string>,
  heights?: Map<string, number>,
  originOffsets?: Map<string, number>,
): NoteRect | null {
  const entry = noteList.find((n) => n.id === noteId);
  if (!entry) return null;
  const pos = getNoteEffectiveWorldPos(noteId, noteList, parentOf, originOffsets);
  if (!pos) return null;
  const wStr = entry.model.width.value.expanded;
  const w = wStr === "Auto" ? 160 : parseFloat(wStr);
  const h = heights?.get(noteId) ?? 80;
  return { x: pos.x, y: pos.y, width: w, height: h };
}
