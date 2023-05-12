import { listenPointerEvents } from '@stdlib/misc';
import { cloneDeep } from 'lodash';
import { nanoid } from 'nanoid';
import type { Factories } from 'src/code/factories';
import { isCtrlDown } from 'src/code/utils/misc';
import {
  prosemirrorJSONToYXmlFragment,
  yXmlFragmentToProsemirrorJSON,
} from 'y-prosemirror';

import { ISerialArrow } from '../../serialization';
import { makeSlim } from '../../slim';
import type { PageNote } from '../notes/note';
import type { Page } from '../page';
import type { IArrowCollabInput, PageArrow } from './arrow';
import { IArrowCollabDefault } from './arrow';
import { IArrowCollab } from './arrow';

export class PageArrowCreation {
  readonly page: Page;

  readonly react = reactive({
    active: false,
  });

  anchorNote!: PageNote;

  readonly fakeArrow: PageArrow;

  constructor(input: { factories: Factories; page: Page }) {
    this.page = input.page;

    this.fakeArrow = input.factories.PageArrow({
      page: input.page,
      id: '',
      index: -1,
      collab: reactive(IArrowCollab().parse({})),
    });
  }

  start(input: {
    anchorNote: PageNote;
    looseEndpoint: 'source' | 'target';
    event: PointerEvent;
    baseArrow?: PageArrow;
  }) {
    if (this.page.react.readOnly) {
      return;
    }

    this.react.active = true;

    this.anchorNote = input.anchorNote;

    const serialArrow =
      input.baseArrow?.react.collab != null
        ? ISerialArrow().parse({
            ...input.baseArrow.react.collab,

            source: undefined,
            target: undefined,

            label: yXmlFragmentToProsemirrorJSON(
              input.baseArrow.react.collab.label,
            ),
          })
        : ISerialArrow().parse(internals.pages.defaultArrow);

    const arrowCollab = IArrowCollab().parse({
      ...serialArrow,

      regionId: input.anchorNote.react.region.id,

      source: '',
      target: '',

      [input.looseEndpoint === 'source' ? 'target' : 'source']:
        input.anchorNote.id,
    } as IArrowCollabInput);

    Object.assign(this.fakeArrow.react.collab, arrowCollab);

    this.fakeArrow.react.looseEndpoint = input.looseEndpoint;
    this.fakeArrow.react.fakePos = this.page.pos.eventToWorld(input.event);

    listenPointerEvents(input.event, {
      move: this._update,
      up: async (event) => {
        if (!this.react.active) {
          return;
        }

        this.react.active = false;

        if (isCtrlDown(event) || internals.mobileAltKey) {
          const clientPos = this.page.pos.eventToClient(event);
          const worldPos = this.page.pos.clientToWorld(clientPos);

          const note = await this.page.notes.create(this.page, worldPos);

          if (note != null) {
            this.linkNote(note);
          }
        }
      },
    });

    this._update(input.event);
  }

  private _update = (event: PointerEvent) => {
    this.fakeArrow.react.fakePos = this.page.pos.eventToWorld(event);
  };

  linkNote(note: PageNote) {
    this.fakeArrow.react.collab[this.fakeArrow.react.looseEndpoint!] = note.id;

    return this.finishArrowCreation();
  }

  finishArrowCreation() {
    this.react.active = false;

    if (!this.fakeArrow.react.valid) {
      return;
    }

    // Create arrow collab

    const newCollab = makeSlim(
      cloneDeep(this.fakeArrow.react.collab),
      IArrowCollabDefault(),
    );

    newCollab.label = prosemirrorJSONToYXmlFragment(
      internals.tiptap().schema,
      this.fakeArrow.react.collab.label,
    );

    // Insert arrow into document

    const arrowId = nanoid();

    this.page.collab.doc.transact(() => {
      this.page.arrows.react.collab[arrowId] = newCollab;

      this.anchorNote.react.region.react.collab.arrowIds.push(arrowId);
    });

    // Select arrow

    const arrow = this.page.arrows.fromId(arrowId)!;

    return arrow;
  }
}
