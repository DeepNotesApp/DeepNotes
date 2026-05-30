import type { NoteModel } from "./note-model";

export interface AlignedNote {
  id: string;
  model: NoteModel;
}

export function alignLeft(notes: AlignedNote[]): void {
  if (notes.length < 2) return;
  const minX = Math.min(...notes.map((n) => n.model.pos.value.x));
  for (const note of notes) {
    const posMap = note.model.rawMap.get("pos") as import("yjs").Map<number>;
    posMap.set("x", minX);
  }
}

export function alignCenter(notes: AlignedNote[]): void {
  if (notes.length < 2) return;
  const xs = notes.map((n) => n.model.pos.value.x);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const center = minX + (maxX - minX) / 2;
  for (const note of notes) {
    const posMap = note.model.rawMap.get("pos") as import("yjs").Map<number>;
    posMap.set("x", center);
  }
}

export function alignRight(notes: AlignedNote[]): void {
  if (notes.length < 2) return;
  const maxX = Math.max(...notes.map((n) => n.model.pos.value.x));
  for (const note of notes) {
    const posMap = note.model.rawMap.get("pos") as import("yjs").Map<number>;
    posMap.set("x", maxX);
  }
}

export function alignTop(notes: AlignedNote[]): void {
  if (notes.length < 2) return;
  const minY = Math.min(...notes.map((n) => n.model.pos.value.y));
  for (const note of notes) {
    const posMap = note.model.rawMap.get("pos") as import("yjs").Map<number>;
    posMap.set("y", minY);
  }
}

export function alignMiddle(notes: AlignedNote[]): void {
  if (notes.length < 2) return;
  const ys = notes.map((n) => n.model.pos.value.y);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const middle = minY + (maxY - minY) / 2;
  for (const note of notes) {
    const posMap = note.model.rawMap.get("pos") as import("yjs").Map<number>;
    posMap.set("y", middle);
  }
}

export function alignBottom(notes: AlignedNote[]): void {
  if (notes.length < 2) return;
  const maxY = Math.max(...notes.map((n) => n.model.pos.value.y));
  for (const note of notes) {
    const posMap = note.model.rawMap.get("pos") as import("yjs").Map<number>;
    posMap.set("y", maxY);
  }
}
