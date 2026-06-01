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

/**
 * Find the island root for a note.
 * An island is a tree of spatial containers.
 * A non-spatial container with overflow=true acts as an island boundary.
 */
export function getIslandRoot(
  noteId: string,
  noteList: { id: string; model: NoteModel }[],
  parentOf: Map<string, string>,
): string | null {
  // Walk up parent chain
  let current = noteId;
  while (true) {
    const parentId = parentOf.get(current);
    if (!parentId) return current; // root note is its own island root
    const parent = noteList.find((n) => n.id === parentId);
    if (!parent) return current;
    // If parent is non-spatial and overflow, it's the island boundary
    if (
      !parent.model.container.spatial.value &&
      parent.model.container.overflow.value
    ) {
      return parentId;
    }
    current = parentId;
  }
}

/**
 * Get all note IDs in the same island as the given note.
 */
export function getIslandNoteIds(
  rootNoteId: string,
  noteList: { id: string; model: NoteModel }[],
  parentOf: Map<string, string>,
): Set<string> {
  const island = new Set<string>();
  const stack = [rootNoteId];

  while (stack.length > 0) {
    const id = stack.pop()!;
    if (island.has(id)) continue;
    island.add(id);

    const note = noteList.find((n) => n.id === id);
    if (!note || !note.model.container.enabled.value) continue;
    // Skip non-spatial overflow containers (they're island boundaries)
    if (
      !note.model.container.spatial.value &&
      note.model.container.overflow.value
    ) {
      continue;
    }

    // Add children
    for (const child of noteList) {
      if (parentOf.get(child.id) === id) {
        stack.push(child.id);
      }
    }
  }

  return island;
}

/**
 * Compute the bounding rect of an island (all notes within it).
 */
export function getIslandRect(
  rootNoteId: string,
  noteList: { id: string; model: NoteModel }[],
  parentOf: Map<string, string>,
  heights?: Map<string, number>,
  originOffsets?: Map<string, number>,
): NoteRect | null {
  const ids = getIslandNoteIds(rootNoteId, noteList, parentOf);
  if (ids.size === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const id of ids) {
    const rect = getNoteRect(id, noteList, parentOf, heights, originOffsets);
    if (!rect) continue;
    minX = Math.min(minX, rect.x);
    minY = Math.min(minY, rect.y);
    maxX = Math.max(maxX, rect.x + rect.width);
    maxY = Math.max(maxY, rect.y + rect.height);
  }

  if (minX === Infinity) return null;
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/**
 * Compute a note's rect relative to its island root.
 */
export function getRelativeRect(
  noteId: string,
  noteList: { id: string; model: NoteModel }[],
  parentOf: Map<string, string>,
  heights?: Map<string, number>,
  originOffsets?: Map<string, number>,
): NoteRect | null {
  const noteRect = getNoteRect(noteId, noteList, parentOf, heights, originOffsets);
  const rootId = getIslandRoot(noteId, noteList, parentOf);
  if (!noteRect || !rootId) return noteRect;
  const rootRect = getNoteRect(rootId, noteList, parentOf, heights, originOffsets);
  if (!rootRect) return noteRect;
  return {
    x: noteRect.x - rootRect.x,
    y: noteRect.y - rootRect.y,
    width: noteRect.width,
    height: noteRect.height,
  };
}
