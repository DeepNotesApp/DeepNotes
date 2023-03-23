import { listenPointerEvents } from '@stdlib/misc';
import { cloneDeep, merge } from 'lodash';
import { nanoid } from 'nanoid';
import type { Factories } from 'src/code/factories';
import { isCtrlDown } from 'src/code/utils';
import { prosemirrorJSONToYXmlFragment } from 'y-prosemirror';

import { ISerialArrow } from '../../serialization';
import { makeSlim } from '../../slim';
import type { PageNote } from '../notes/note';
import type { Page } from '../page';
import type { PageArrow } from './arrow';
import { IArrowCollabDefault } from './arrow';
import { IArrowCollab } from './arrow';

export class PageArrowCreation {
  readonly page: Page;

  readonly react = reactive({
    active: false,
  });

  sourceNote!: PageNote;

  readonly fakeArrow: PageArrow;

  constructor({ factories, page }: { factories: Factories; page: Page }) {
    this.page = page;

    this.fakeArrow = factories.PageArrow({
      page,
      id: '',
      index: -1,
      collab: reactive(IArrowCollab().parse({})),
    });
  }

  start(sourceNote: PageNote, event: PointerEvent) {
    if (this.page.react.readOnly) {
      return;
    }

    this.react.active = true;

    this.sourceNote = sourceNote;

    const serialArrow = ISerialArrow().parse(internals.pages.defaultArrow);

    const arrowCollab = internals.pages.serialization.parseArrowCollab(
      serialArrow,
      sourceNote.react.region.id,
    );

    merge(this.fakeArrow.react.collab, arrowCollab);

    this.fakeArrow.react.modifying = 'target';

    this.fakeArrow.react.collab.label = serialArrow.label;

    this.fakeArrow.react.collab.source = sourceNote.id;
    this.fakeArrow.react.collab.target = '';

    this.fakeArrow.react.fakeTargetPos = this.page.pos.eventToWorld(event);

    listenPointerEvents(event, {
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

    this._update(event);
  }

  private _update = (event: PointerEvent) => {
    this.fakeArrow.react.fakeTargetPos = this.page.pos.eventToWorld(event);
  };

  linkNote(targetNote: PageNote) {
    this.fakeArrow.react.collab.target = targetNote.id;

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

      this.sourceNote.react.region.react.collab.arrowIds.push(arrowId);
    });

    // Select arrow

    const arrow = this.page.arrows.fromId(arrowId)!;

    return arrow;
  }
}
