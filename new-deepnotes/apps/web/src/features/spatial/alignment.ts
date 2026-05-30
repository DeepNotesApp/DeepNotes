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

export function distributeHorizontally(notes: AlignedNote[]): void {
  if (notes.length < 3) return;
  const sorted = [...notes].sort(
    (a, b) => a.model.pos.value.x - b.model.pos.value.x,
  );
  const first = sorted[0]!;
  const last = sorted[sorted.length - 1]!;
  const minX = first.model.pos.value.x;
  const maxX = last.model.pos.value.x;
  const gap = (maxX - minX) / (sorted.length - 1);
  for (let i = 0; i < sorted.length; i++) {
    const posMap = sorted[i]!.model.rawMap.get("pos") as import("yjs").Map<number>;
    posMap.set("x", Math.round(minX + gap * i));
  }
}

export function distributeVertically(notes: AlignedNote[]): void {
  if (notes.length < 3) return;
  const sorted = [...notes].sort(
    (a, b) => a.model.pos.value.y - b.model.pos.value.y,
  );
  const first = sorted[0]!;
  const last = sorted[sorted.length - 1]!;
  const minY = first.model.pos.value.y;
  const maxY = last.model.pos.value.y;
  const gap = (maxY - minY) / (sorted.length - 1);
  for (let i = 0; i < sorted.length; i++) {
    const posMap = sorted[i]!.model.rawMap.get("pos") as import("yjs").Map<number>;
    posMap.set("y", Math.round(minY + gap * i));
  }
}
