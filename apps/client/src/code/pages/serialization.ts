import { once } from 'lodash';
import { nanoid } from 'nanoid';
import {
  prosemirrorJSONToYXmlFragment,
  yXmlFragmentToProsemirrorJSON,
} from 'y-prosemirror';
import { z } from 'zod';

import type { IArrowCollabInput, PageArrow } from './page/arrows/arrow';
import { IArrowCollabDefault } from './page/arrows/arrow';
import { IArrowCollab } from './page/arrows/arrow';
import type { PageNote } from './page/notes/note';
import type { INoteCollabPartial } from './page/notes/note-collab';
import { INoteCollab, INoteCollabDefault } from './page/notes/note-collab';
import type {
  IRegionCollabOutput,
  IRegionElemsOutput,
  PageRegion,
} from './page/regions/region';
import { IRegionCollab } from './page/regions/region';
import type { Pages } from './pages';
import { makeSlim } from './slim';
import { IVec2 } from './utils';

// Region

export const ISerialRegion = once(() =>
  z.object({
    noteIdxs: z.number().array().default([]),
    arrowIdxs: z.number().array().default([]),
  }),
);

type ISerialRegionOutput = z.output<ReturnType<typeof ISerialRegion>>;

// Note

const ISerialTextSection = (enabled: boolean) =>
  z.object({
    enabled: z.boolean().default(enabled),
    value: z.any().default({
      type: 'doc',
      content: [{ type: 'paragraph', content: [] }],
    }),
    wrap: z.boolean().default(true),
    height: z
      .object({
        expanded: z.string().default('Auto'),
        collapsed: z.string().default('Auto'),
      })
      .default({}),
  });

const ISerialNote = once(() =>
  INoteCollab()
    .omit({
      regionId: true,

      zIndex: true,

      noteIds: true,
      arrowIds: true,

      nextZIndex: true,
    })
    .extend({
      head: ISerialTextSection(true).default({}),
      body: ISerialTextSection(false).default({}),
    })
    .merge(ISerialRegion()),
);
type ISerialNoteOutput = z.output<ReturnType<typeof ISerialNote>>;

const ISerialNoteDefault = once(() => ISerialNote().parse({}));

// Arrow

export const ISerialArrow = once(() =>
  IArrowCollab()
    .omit({
      regionId: true,
    })
    .extend({
      source: z.number().or(IVec2()).optional(),
      target: z.number().or(IVec2()).optional(),

      label: z.any().default({
        type: 'doc',
        content: [{ type: 'paragraph', content: [] }],
      }),
    }),
);
export type ISerialArrowInput = z.input<ReturnType<typeof ISerialArrow>>;
type ISerialArrowOutput = z.output<ReturnType<typeof ISerialArrow>>;

const ISerialArrowDefault = once(() => ISerialArrow().parse({}));

// Object

export const ISerialObject = once(() =>
  z.object({
    root: ISerialRegion().default({}),
    notes: ISerialNote().array().default([]),
    arrows: ISerialArrow().array().default([]),
  }),
);
export type ISerialObjectInput = z.input<ReturnType<typeof ISerialObject>>;
export type ISerialObjectOutput = z.output<ReturnType<typeof ISerialObject>>;

export interface SerializationAux {
  serialObj: ISerialObjectOutput;

  noteMap: Map<string, number>;
  arrowMap: Map<string, number>;
}

export interface DeserializationAux {
  serialObj: ISerialObjectOutput;

  noteMap: Map<number, PageNote>;
}

export class Serialization {
  readonly app: Pages;

  constructor({ app }: { app: Pages }) {
    this.app = app;
  }

  serialize(input: IRegionElemsOutput): ISerialObjectOutput {
    const aux: SerializationAux = {
      serialObj: ISerialObject().parse({}),

      noteMap: new Map(),
      arrowMap: new Map(),
    };

    for (const note of input.notes) {
      for (const arrow of internals.pages.react.page.arrows.fromIds(
        Array.from(note.incomingArrowIds),
      )) {
        input.arrows.push(arrow);
      }

      for (const arrow of internals.pages.react.page.arrows.fromIds(
        Array.from(note.outgoingArrowIds),
      )) {
        input.arrows.push(arrow);
      }
    }

    this._serializeRegion(input, aux.serialObj.root, aux);

    return aux.serialObj;
  }
  private _serializeRegion(
    region: IRegionElemsOutput,
    serialRegion: ISerialRegionOutput,
    aux: SerializationAux,
  ) {
    for (const note of region.notes) {
      this._serializeNote(note, serialRegion, aux);
    }

    for (const arrow of region.arrows) {
      this._serializeArrow(arrow, serialRegion, aux);
    }
  }
  private _serializeNote(
    note: PageNote,
    serialRegion: ISerialRegionOutput,
    aux: SerializationAux,
  ) {
    let noteIndex = aux.noteMap.get(note.id);

    if (noteIndex != null) {
      return noteIndex;
    }

    const serialNote = makeSlim(
      ISerialNote().parse({
        ...note.react.collab,

        head: {
          ...note.react.collab.head,

          value: yXmlFragmentToProsemirrorJSON(note.react.collab.head.value),
        },
        body: {
          ...note.react.collab.body,

          value: yXmlFragmentToProsemirrorJSON(note.react.collab.body.value),
        },

        regionIdxs: [],
      }),
      ISerialNoteDefault(),
    );

    noteIndex = aux.serialObj.notes.length;

    aux.serialObj.notes.push(serialNote);
    serialRegion.noteIdxs.push(noteIndex);
    aux.noteMap.set(note.id, noteIndex);

    this._serializeRegion(note.react, serialNote, aux);
  }
  private _serializeArrow(
    arrow: PageArrow,
    serialRegion: ISerialRegionOutput,
    aux: SerializationAux,
  ) {
    let arrowIndex = aux.arrowMap.get(arrow.id);

    if (arrowIndex != null) {
      return arrowIndex;
    }

    const sourceNoteIdx = aux.noteMap.get(arrow.react.collab.source);
    const targetNoteIdx = aux.noteMap.get(arrow.react.collab.target);

    if (sourceNoteIdx == null || targetNoteIdx == null) {
      return;
    }

    const serialArrow = makeSlim(
      ISerialArrow().parse({
        ...arrow.react.collab,

        source: sourceNoteIdx,
        target: targetNoteIdx,

        label: yXmlFragmentToProsemirrorJSON(arrow.react.collab.label),
      }),
      ISerialArrowDefault(),
    );

    arrowIndex = aux.serialObj.arrows.length;

    aux.serialObj.arrows.push(serialArrow);
    serialRegion.arrowIdxs.push(arrowIndex);
    aux.arrowMap.set(arrow.id, arrowIndex);
  }

  deserialize(
    serialObjInput: ISerialObjectInput,
    destRegion: PageRegion,
    destIndex?: number,
  ): IRegionElemsOutput {
    const serialObj = ISerialObject().parse(serialObjInput);

    const noteMap = new Map<number, string>();

    const fakeRegionCollab = IRegionCollab().parse({
      nextZIndex: destRegion.react.nextZIndex,
    });

    internals.pages.react.page.collab.doc.transact(() => {
      this._deserializeRegion(
        serialObj.root,
        serialObj,
        noteMap,
        destRegion.id,
        fakeRegionCollab,
      );

      destRegion.react.collab.noteIds.splice(
        destIndex ?? destRegion.react.collab.noteIds.length,
        0,
        ...fakeRegionCollab.noteIds,
      );

      destRegion.react.collab.arrowIds.push(...fakeRegionCollab.arrowIds);

      destRegion.react.nextZIndex = fakeRegionCollab.nextZIndex;
    });

    return {
      notes: internals.pages.react.page.notes.fromIds(
        fakeRegionCollab.noteIds,
        destRegion.id,
      ),
      arrows: internals.pages.react.page.arrows.fromIds(
        fakeRegionCollab.arrowIds,
      ),
    };
  }
  private _deserializeRegion(
    serialRegion: ISerialRegionOutput,
    serialObj: ISerialObjectOutput,
    noteMap: Map<number, string>,
    destRegionId: string,
    destRegionCollab: IRegionCollabOutput,
  ) {
    for (const noteIndex of serialRegion.noteIdxs) {
      this._deserializeNote(
        serialObj.notes[noteIndex],
        noteIndex,
        serialObj,
        noteMap,
        destRegionId,
        destRegionCollab,
      );
    }

    for (const arrowIndex of serialRegion.arrowIdxs) {
      this._deserializeArrow(
        serialObj.arrows[arrowIndex],
        noteMap,
        destRegionId,
        destRegionCollab,
      );
    }
  }
  private _deserializeNote(
    serialNote: ISerialNoteOutput,
    noteIndex: number,
    serialObj: ISerialObjectOutput,
    noteMap: Map<number, string>,
    destRegionId: string,
    destRegionCollab: IRegionCollabOutput,
  ) {
    destRegionCollab.nextZIndex ??= 0;

    const noteCollab = makeSlim(
      INoteCollab().parse({
        ...serialNote,

        regionId: destRegionId,

        head: {
          ...serialNote.head,

          value: prosemirrorJSONToYXmlFragment(
            internals.tiptap().schema,
            serialNote.head.value,
          ),
        },
        body: {
          ...serialNote.body,

          value: prosemirrorJSONToYXmlFragment(
            internals.tiptap().schema,
            serialNote.body.value,
          ),
        },

        zIndex: destRegionCollab.nextZIndex++,
      } as INoteCollabPartial),
      INoteCollabDefault(),
    );

    const noteId = nanoid();

    noteMap.set(noteIndex, noteId);

    destRegionCollab.noteIds.push(noteId);

    this._deserializeRegion(serialNote, serialObj, noteMap, noteId, noteCollab);

    internals.pages.react.page.notes.react.collab[noteId] = noteCollab;
  }
  private _deserializeArrow(
    serialArrow: ISerialArrowOutput,
    noteMap: Map<number, string>,
    destRegionId: string,
    destRegionCollab: IRegionCollabOutput,
  ) {
    const arrowCollab = this.parseArrowCollab(
      serialArrow,
      destRegionId,
      noteMap,
    );

    const arrowId = nanoid();

    destRegionCollab.arrowIds.push(arrowId);

    internals.pages.react.page.arrows.react.collab[arrowId] = arrowCollab;
  }
  parseArrowCollab(
    serialArrow: ISerialArrowOutput,
    destRegionId: string,
    noteMap = new Map<number, string>(),
  ) {
    return makeSlim(
      IArrowCollab().parse({
        ...serialArrow,

        regionId: destRegionId,

        source: noteMap.get(serialArrow.source as any),
        target: noteMap.get(serialArrow.target as any),

        label: prosemirrorJSONToYXmlFragment(
          internals.tiptap().schema,
          serialArrow.label,
        ),
      } as IArrowCollabInput),
      IArrowCollabDefault(),
    );
  }
}
