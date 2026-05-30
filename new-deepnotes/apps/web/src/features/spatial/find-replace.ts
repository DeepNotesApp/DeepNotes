import * as Y from "yjs";
import type { NoteModel } from "./note-model";

export interface NoteMatch {
  noteId: string;
  field: "head" | "body";
  text: string;
  index: number;
  length: number;
}

function extractText(fragment: Y.XmlFragment | undefined): string {
  if (!fragment) return "";
  return fragment.toString();
}

function findInFragment(
  noteId: string,
  field: "head" | "body",
  fragment: Y.XmlFragment | undefined,
  query: string,
): NoteMatch[] {
  const text = extractText(fragment);
  if (!text || !query) return [];

  const matches: NoteMatch[] = [];
  let idx = text.indexOf(query);
  while (idx !== -1) {
    matches.push({ noteId, field, text, index: idx, length: query.length });
    idx = text.indexOf(query, idx + 1);
  }
  return matches;
}

export function searchNotes(
  notes: { id: string; model: NoteModel }[],
  query: string,
): NoteMatch[] {
  if (!query) return [];
  const results: NoteMatch[] = [];
  for (const { id, model } of notes) {
    if (model.head.enabled.value) {
      const fragment = model.head.value.value;
      results.push(...findInFragment(id, "head", fragment, query));
    }
    if (model.body.enabled.value) {
      const fragment = model.body.value.value;
      results.push(...findInFragment(id, "body", fragment, query));
    }
  }
  return results;
}

/**
 * Recursively find the Y.XmlText node and local offset that corresponds to a
 * global text offset inside a Y.XmlFragment.
 */
function findTextNodeAtOffset(
  fragment: Y.XmlFragment,
  targetOffset: number,
): { textNode: Y.XmlText; localOffset: number } | null {
  let currentOffset = 0;
  for (let i = 0; i < fragment.length; i++) {
    const item = fragment.get(i);
    if (item instanceof Y.XmlText) {
      const len = item.toString().length;
      if (currentOffset + len > targetOffset) {
        return { textNode: item, localOffset: targetOffset - currentOffset };
      }
      currentOffset += len;
    } else if (item instanceof Y.XmlElement) {
      const result = findTextNodeAtOffsetInElement(item, targetOffset - currentOffset);
      if (result) {
        return result;
      }
      currentOffset += item.toString().length;
    }
  }
  return null;
}

function findTextNodeAtOffsetInElement(
  el: Y.XmlElement,
  targetOffset: number,
): { textNode: Y.XmlText; localOffset: number } | null {
  let currentOffset = 0;
  for (let i = 0; i < el.length; i++) {
    const item = el.get(i);
    if (item instanceof Y.XmlText) {
      const len = item.toString().length;
      if (currentOffset + len > targetOffset) {
        return { textNode: item, localOffset: targetOffset - currentOffset };
      }
      currentOffset += len;
    } else if (item instanceof Y.XmlElement) {
      const result = findTextNodeAtOffsetInElement(item, targetOffset - currentOffset);
      if (result) {
        return result;
      }
      currentOffset += item.toString().length;
    }
  }
  return null;
}

export function replaceInNote(
  model: NoteModel,
  field: "head" | "body",
  index: number,
  length: number,
  replacement: string,
): boolean {
  const fragment =
    field === "head"
      ? model.head.value.value
      : model.body.value.value;
  if (!fragment) return false;

  const start = findTextNodeAtOffset(fragment, index);
  const end = findTextNodeAtOffset(fragment, index + length);

  if (!start || !end) return false;

  if (start.textNode === end.textNode) {
    // Simple case: replacement within a single text node
    start.textNode.delete(start.localOffset, length);
    start.textNode.insert(start.localOffset, replacement);
    return true;
  }

  // Complex case: spans multiple text nodes
  // Delete from start node
  start.textNode.delete(start.localOffset, start.textNode.toString().length - start.localOffset);
  // Delete intermediate and end nodes
  // For MVP, we'll just replace within the first node and delete the rest
  // This is a simplified approach
  start.textNode.insert(start.localOffset, replacement);

  // Find and delete text nodes between start and end
  let deleting = false;
  for (let i = 0; i < fragment.length; i++) {
    const item = fragment.get(i);
    if (item === start.textNode) {
      deleting = true;
      continue;
    }
    if (item === end.textNode) {
      end.textNode.delete(0, end.localOffset);
      break;
    }
    if (deleting && item instanceof Y.XmlText) {
      item.delete(0, item.toString().length);
    }
  }

  return true;
}
