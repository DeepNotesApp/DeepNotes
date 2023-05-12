import type { Vec2 } from '@stdlib/misc';
import { listenPointerEvents } from '@stdlib/misc';
import { cloneDeep } from 'lodash';
import { nanoid } from 'nanoid';
import type { Factories } from 'src/code/factories';
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
    anchor?: Vec2 | null;
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

    const fixedEndpoint =
      input.looseEndpoint === 'source' ? 'target' : 'source';

    const arrowCollab = IArrowCollab().parse({
      ...serialArrow,

      regionId: input.anchorNote.react.region.id,

      source: '',
      target: '',

      [fixedEndpoint]: input.anchorNote.id,

      [`${input.looseEndpoint}Anchor`]: null,
    } as IArrowCollabInput);

    if (input.anchor != null) {
      arrowCollab[`${fixedEndpoint}Anchor`] = input.anchor;
    }

    Object.assign(this.fakeArrow.react.collab, arrowCollab);

    this.fakeArrow.react.looseEndpoint = input.looseEndpoint;
    this.fakeArrow.react.fakePos = this.page.pos.eventToWorld(input.event);

    listenPointerEvents(input.event, {
      move: this._update,
      up: () => (this.react.active = false),
    });

    this._update(input.event);
  }

  private _update = (event: PointerEvent) => {
    this.fakeArrow.react.fakePos = this.page.pos.eventToWorld(event);
  };

  finish(input: { note: PageNote; anchor: Vec2 | null }) {
    this.fakeArrow.react.collab[this.fakeArrow.react.looseEndpoint!] =
      input.note.id;

    if (!this.fakeArrow.react.valid) {
      return;
    }

    // Create arrow collab

    const newCollab = makeSlim(
      cloneDeep(this.fakeArrow.react.collab),
      IArrowCollabDefault(),
    );

    newCollab[`${this.fakeArrow.react.looseEndpoint!}Anchor`] = input.anchor;

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

    this.page.selection.set(arrow);

    return arrow;
  }
}
