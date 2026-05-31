import type { NoteModel } from "./note-model";
import type { ArrowModel } from "./arrow-model";

export interface ClipboardNote {
  id: string;
  pos: { x: number; y: number };
  width: { expanded: string; collapsed: string };
  head: {
    enabled: boolean;
    wrap: boolean;
    height: { expanded: string; collapsed: string };
    content: string; // Serialized Y.XmlFragment
  };
  body: {
    enabled: boolean;
    wrap: boolean;
    height: { expanded: string; collapsed: string };
    content: string; // Serialized Y.XmlFragment
  };
  container: {
    enabled: boolean;
    spatial: boolean;
    horizontal: boolean;
    wrapChildren: boolean;
    stretchChildren: boolean;
    forceColorInheritance: boolean;
    children: string[];
  };
  collapsing: {
    enabled: boolean;
    collapsed: boolean;
    localCollapsing: boolean;
  };
  color: { inherit: boolean; value: string };
  zIndex: number;
  link: string;
  movable: boolean;
  resizable: boolean;
  readOnly: boolean;
  anchor?: { x: number; y: number };
  createdAt: number | null;
  editedAt: number | null;
  movedAt: number | null;
}

export interface ClipboardArrow {
  id: string;
  source: string;
  target: string;
  sourceAnchor: { x: number; y: number } | null;
  targetAnchor: { x: number; y: number } | null;
  sourceHead: string;
  targetHead: string;
  bodyType: string;
  bodyStyle: string;
  color: string;
  label: string; // Serialized Y.XmlFragment
  readOnly: boolean;
  interregional: boolean;
  fakePos: { x: number; y: number } | null;
  looseEndpoint: "source" | "target" | null;
  createdAt: number | null;
  editedAt: number | null;
}

export interface ClipboardPayload {
  notes: ClipboardNote[];
  arrows: ClipboardArrow[];
}

const CLIPBOARD_MIME_TYPE = 'application/vnd.deepnotes.clipboard';
const STORAGE_KEY = 'deepnotes-clipboard';

let internalBuffer: ClipboardPayload | null = null;

export function getClipboardBuffer(): ClipboardPayload | null {
  return internalBuffer;
}

export function setClipboardBuffer(payload: ClipboardPayload | null): void {
  internalBuffer = payload;
}

async function writeToClipboard(payload: ClipboardPayload): Promise<void> {
  try {
    const json = JSON.stringify(payload);
    const clipboardItem = new ClipboardItem({
      [CLIPBOARD_MIME_TYPE]: new Blob([json], { type: CLIPBOARD_MIME_TYPE }),
      'text/plain': new Blob([json], { type: 'text/plain' }),
    });
    await navigator.clipboard.write([clipboardItem]);
  } catch (e) {
    // Fallback to localStorage if clipboard API fails
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (storageError) {
      console.error('Failed to write to clipboard and localStorage:', storageError);
    }
  }
}

async function readFromClipboard(): Promise<ClipboardPayload | null> {
  try {
    const items = await navigator.clipboard.read();
    for (const item of items) {
      const type = item.types.find(t => t === CLIPBOARD_MIME_TYPE || t === 'text/plain');
      if (type) {
        const blob = await item.getType(type);
        const text = await blob.text();
        const parsed = JSON.parse(text);
        if (parsed.notes && parsed.arrows) {
          return parsed as ClipboardPayload;
        }
      }
    }
  } catch (e) {
    // Fallback to localStorage if clipboard API fails
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.notes && parsed.arrows) {
          return parsed as ClipboardPayload;
        }
      }
    } catch (storageError) {
      console.error('Failed to read from clipboard and localStorage:', storageError);
    }
  }
  return null;
}

function serializeNote(model: NoteModel, id: string): ClipboardNote {
  return {
    id,
    pos: model.pos.value,
    width: model.width.value,
    head: {
      enabled: model.head.enabled.value,
      wrap: model.head.wrap.value,
      height: model.head.height.value,
      content: model.head.value.value?.toString() ?? '',
    },
    body: {
      enabled: model.body.enabled.value,
      wrap: model.body.wrap.value,
      height: model.body.height.value,
      content: model.body.value.value?.toString() ?? '',
    },
    container: {
      enabled: model.container.enabled.value,
      spatial: model.container.spatial.value,
      horizontal: model.container.horizontal.value,
      wrapChildren: model.container.wrapChildren.value,
      stretchChildren: model.container.stretchChildren.value,
      forceColorInheritance: model.container.forceColorInheritance.value,
      children: [...model.container.children.value],
    },
    collapsing: {
      enabled: model.collapsing.enabled.value,
      collapsed: model.collapsing.collapsed.value,
      localCollapsing: model.collapsing.localCollapsing.value,
    },
    color: model.color.value,
    zIndex: model.zIndex.value,
    link: model.link.value,
    movable: model.movable.value,
    resizable: model.resizable.value,
    readOnly: model.readOnly.value,
    anchor: model.anchor.value,
    createdAt: model.createdAt.value ?? null,
    editedAt: model.editedAt.value ?? null,
    movedAt: model.movedAt.value ?? null,
  };
}

function serializeArrow(model: ArrowModel, id: string): ClipboardArrow {
  return {
    id,
    source: model.source.value,
    target: model.target.value,
    sourceAnchor: model.sourceAnchor.value ?? null,
    targetAnchor: model.targetAnchor.value ?? null,
    sourceHead: model.sourceHead.value,
    targetHead: model.targetHead.value,
    bodyType: model.bodyType.value,
    bodyStyle: model.bodyStyle.value,
    color: model.color.value,
    label: model.label.value?.toString() ?? '',
    readOnly: model.readOnly.value,
    interregional: model.interregional.value,
    fakePos: model.fakePos.value ?? null,
    looseEndpoint: model.looseEndpoint.value ?? null,
    createdAt: model.createdAt.value ?? null,
    editedAt: model.editedAt.value ?? null,
  };
}

export async function copySelection(
  noteEntries: { id: string; model: NoteModel }[],
  arrowEntries: { id: string; model: ArrowModel }[],
): Promise<ClipboardPayload> {
  const noteIds = new Set(noteEntries.map((n) => n.id));

  // Only include arrows whose both source and target are in the copied note set
  const arrows = arrowEntries
    .filter(
      (a) => noteIds.has(a.model.source.value) && noteIds.has(a.model.target.value),
    )
    .map((a) => serializeArrow(a.model, a.id));

  const notes = noteEntries.map((n) => serializeNote(n.model, n.id));

  const payload = { notes, arrows };
  internalBuffer = payload;
  
  // Write to system clipboard for cross-page paste
  await writeToClipboard(payload);
  
  return payload;
}

export async function readClipboardPayload(): Promise<ClipboardPayload | null> {
  // First try system clipboard for cross-page paste
  const systemPayload = await readFromClipboard();
  if (systemPayload) {
    internalBuffer = systemPayload;
    return systemPayload;
  }
  
  // Fall back to internal buffer
  return internalBuffer;
}

export function pastePayload(
  payload: ClipboardPayload,
  options: {
    createNote: (worldX: number, worldY: number, template?: Partial<ClipboardNote>) => string;
    createArrow: (sourceId: string, targetId: string, template?: Partial<ClipboardArrow>) => string;
    offsetX?: number;
    offsetY?: number;
  },
): { noteIds: string[]; arrowIds: string[] } {
  const { createNote, createArrow, offsetX = 32, offsetY = 32 } = options;

  if (payload.notes.length === 0) {
    return { noteIds: [], arrowIds: [] };
  }

  // Compute bounding box of original notes
  let minX = Infinity;
  let minY = Infinity;
  for (const note of payload.notes) {
    minX = Math.min(minX, note.pos.x);
    minY = Math.min(minY, note.pos.y);
  }

  const idMap = new Map<string, string>();
  const noteIds: string[] = [];

  // First pass: create notes (skip container children; they will be handled in second pass)
  const rootNotes = payload.notes.filter((n) => {
    // A note is a root in the payload if none of the copied notes list it as a child
    return !payload.notes.some((other) => other.container.children.includes(n.id));
  });

  function createNoteRecursive(note: ClipboardNote, parentOffsetX: number, parentOffsetY: number): string {
    const newId = createNote(note.pos.x - minX + parentOffsetX, note.pos.y - minY + parentOffsetY, note);
    idMap.set(note.id, newId);
    noteIds.push(newId);

    // Create child notes
    for (const childId of note.container.children) {
      const child = payload.notes.find((n) => n.id === childId);
      if (child) {
        // For spatial containers, children are positioned relative to parent
        // For simplicity, paste them at their relative positions plus parent position
        createNoteRecursive(child, parentOffsetX, parentOffsetY);
      }
    }

    return newId;
  }

  for (const note of rootNotes) {
    createNoteRecursive(note, offsetX, offsetY);
  }

  // Second pass: create arrows with remapped IDs
  const arrowIds: string[] = [];
  for (const arrow of payload.arrows) {
    const newSource = idMap.get(arrow.source);
    const newTarget = idMap.get(arrow.target);
    if (newSource && newTarget) {
      const newId = createArrow(newSource, newTarget, arrow);
      arrowIds.push(newId);
    }
  }

  return { noteIds, arrowIds };
}
