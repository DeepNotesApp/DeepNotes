import { rolesMap } from '@deeplib/misc';
import { sleep, Vec2 } from '@stdlib/misc';
import { watchUntilTrue } from '@stdlib/vue';
import { once, pull } from 'lodash';
import type { Factories } from 'src/code/factories.client';
import type { Pages } from 'src/code/pages/pages.client';
import { RealtimeContext } from 'src/code/realtime/context.universal';
import type { ComputedRef, UnwrapNestedRefs } from 'vue';
import type { z } from 'zod';

import { pageGroupIds } from '../computed/page-group-id.client';
import type { PageArrowCreation } from './arrows/arrow-creation.client';
import type { PageArrows } from './arrows/arrows.client';
import type { PageCamera } from './camera/camera.client';
import type { PagePanning } from './camera/panning.client';
import type { PagePinching } from './camera/pinching.client';
import type { PageZooming } from './camera/zooming.client';
import type { PageCollab } from './collab/collab.client';
import type { PageClipboard } from './elems/clipboard.client';
import type { PageDeleting } from './elems/deleting.client';
import type { PageEditing } from './elems/editing.client';
import type { PageElem } from './elems/elem.client';
import type { PageElems } from './elems/elems.client';
import type { NoteAligning } from './notes/aligning.client';
import type { NoteCloning } from './notes/cloning.client';
import type { NoteDragging } from './notes/dragging.client';
import type { NoteDropping } from './notes/dropping.client';
import type { PageNotes } from './notes/notes.client';
import type { NoteResizing } from './notes/resizing.client';
import type { IPageRegion, IRegionReact } from './regions/region.client';
import { getIslandRegions } from './regions/region.client';
import { getIslandRoot } from './regions/region.client';
import { IRegionCollab } from './regions/region.client';
import type { PageRegions } from './regions/regions.client';
import type { PageActiveElem } from './selection/active-elem.client';
import type { PageActiveRegion } from './selection/active-region.client';
import type { PageBoxSelection } from './selection/box-selection.client';
import type { PageClickSelection } from './selection/click-selection.client';
import type { PageSelection } from './selection/selection.client';
import type { PagePos } from './space/pos.client';
import type { PageRects } from './space/rects.client';
import type { PageSizes } from './space/sizes.client';
import type { PageUndoRedo } from './undo-redo.client';

export const IPageCollab = once(() => IRegionCollab());
export type IPageCollabInput = z.input<ReturnType<typeof IPageCollab>>;
export type IPageCollabOutput = z.output<ReturnType<typeof IPageCollab>>;

export type PageStatus =
  | undefined
  | 'error'
  | 'page-nonexistent'
  | 'pro-plan-required'
  | 'non-free-page'
  | 'page-deleted'
  | 'group-deleted'
  | 'invited'
  | 'rejected'
  | 'unauthorized'
  | 'password'
  | 'success';

export interface IAppPageReact extends IRegionReact {
  collab: ComputedRef<IPageCollabOutput>;

  active: ComputedRef<boolean>;

  status?: PageStatus;
  errorMessage?: string;

  groupId: ComputedRef<string>;
  readOnly: ComputedRef<boolean>;

  loading: boolean;
}

export class Page implements IPageRegion {
  readonly type = 'page';

  readonly app: Pages;
  readonly id: string;

  readonly realtimeCtx: RealtimeContext;

  readonly react: UnwrapNestedRefs<IAppPageReact>;

  readonly collab: PageCollab;
  readonly undoRedo: PageUndoRedo;

  readonly pos: PagePos;
  readonly rects: PageRects;
  readonly sizes: PageSizes;

  readonly camera: PageCamera;
  readonly panning: PagePanning;
  readonly zooming: PageZooming;
  readonly pinching: PagePinching;

  readonly selection: PageSelection;
  readonly activeElem: PageActiveElem;
  readonly activeRegion: PageActiveRegion;
  readonly clickSelection: PageClickSelection;
  readonly boxSelection: PageBoxSelection;

  readonly regions: PageRegions;

  readonly elems: PageElems;
  readonly deleting: PageDeleting;
  readonly clipboard: PageClipboard;
  readonly editing: PageEditing;

  readonly notes: PageNotes;
  readonly dragging: NoteDragging;
  readonly dropping: NoteDropping;
  readonly cloning: NoteCloning;
  readonly resizing: NoteResizing;
  readonly aligning: NoteAligning;

  readonly arrows: PageArrows;
  readonly arrowCreation: PageArrowCreation;

  getContainerClientRect() {
    const pageElem = document.querySelector(
      `.display-page[data-page-id="${this.id}"]`,
    );

    if (pageElem == null) {
      return;
    }

    return this.rects.fromDOM(pageElem.getBoundingClientRect());
  }
  getContainerWorldRect() {
    const containerClientRect = this.getContainerClientRect();

    if (containerClientRect == null) {
      return;
    }

    return this.rects.clientToWorld(containerClientRect);
  }

  getOriginClientPos() {
    const originElem = document.querySelector(
      `.display-page[data-page-id="${this.id}"] .dom-viewbox`,
    );

    if (originElem == null) {
      return;
    }

    return this.rects.fromDOM(originElem.getBoundingClientRect()).topLeft;
  }
  getOriginWorldPos() {
    return new Vec2();
  }

  constructor({
    factories,
    app,
    id,
  }: {
    factories: Factories;
    app: Pages;
    id: string;
  }) {
    this.app = app;
    this.id = id;

    this.realtimeCtx = new (RealtimeContext())();

    this.react = reactive({
      // Region

      collab: computed(() => this.collab.store.page),

      _nextZIndex: 0,
      nextZIndex: computed({
        get: () =>
          Math.max(this.react.collab.nextZIndex, this.react._nextZIndex),
        set: (value) => {
          value ||= 0;

          this.react.collab.nextZIndex = value;
          this.react._nextZIndex = value;
        },
      }),

      notes: computed(() => this.notes.fromIds(this.react.collab.noteIds)),
      arrows: computed(() => this.arrows.fromIds(this.react.collab.arrowIds)),

      elems: computed(() =>
        (this.react.notes as PageElem[]).concat(this.react.arrows),
      ),

      islandRoot: computed(() => getIslandRoot(this)),
      islandRegions: computed(() => getIslandRegions(this)),

      // Page

      active: computed(() => this.app.react.page === this),

      groupId: computed(() => pageGroupIds()(this.id).get()!),

      readOnly: computed(() => {
        if (
          !!this.realtimeCtx.hget('page', this.id, 'permanent-deletion-date') ||
          !!this.realtimeCtx.hget(
            'group',
            this.react.groupId,
            'permanent-deletion-date',
          )
        ) {
          return true;
        }

        if (authStore().userId == null) {
          return true;
        }

        const groupMemberRole = this.realtimeCtx.hget(
          'group-member',
          `${this.react.groupId}:${authStore().userId}`,
          'role',
        );

        return !(
          rolesMap()[groupMemberRole]?.permissions.editGroupPages ?? false
        );
      }),

      loading: true,
    });

    this.collab = factories.PageCollab({ page: this });
    this.undoRedo = factories.PageUndoRedo({ page: this });

    this.pos = factories.PagePos({ page: this });
    this.rects = factories.PageRects({ page: this });
    this.sizes = factories.PageSizes({ page: this });

    this.camera = factories.PageCamera({ page: this });
    this.panning = factories.PagePanning({ page: this });
    this.zooming = factories.PageZooming({ page: this });
    this.pinching = factories.PagePinching({ page: this });

    this.selection = factories.PageSelection({ page: this });
    this.activeElem = factories.PageActiveElem({ page: this });
    this.activeRegion = factories.PageActiveRegion({ page: this });
    this.clickSelection = factories.PageClickSelection({ page: this });
    this.boxSelection = factories.PageBoxSelection({ page: this });

    this.regions = factories.PageRegions({ page: this });

    this.elems = factories.PageElems({ page: this });
    this.deleting = factories.PageDeleting({ page: this });
    this.clipboard = factories.PageClipboard({ page: this });

    this.notes = factories.PageNotes({ page: this });
    this.editing = factories.PageEditing({ page: this });
    this.dragging = factories.PageNoteDragging({ page: this });
    this.dropping = factories.PageNoteDropping({ page: this });
    this.cloning = factories.PageNoteCloning({ page: this });
    this.resizing = factories.PageNoteResizing({ page: this });
    this.aligning = factories.PageNoteAligning({ page: this });

    this.arrows = factories.PageArrows({ page: this });
    this.arrowCreation = factories.PageArrowCreation({ page: this });
  }

  setStatus(status: PageStatus, loading = false) {
    this.react.status = status;
    this.react.loading = loading;
  }

  async finishSetup() {
    try {
      this.react.loading = true;

      // Setup collaboration

      await this.collab.setup();

      // Post-sync setup

      this.elems.setup();

      this.undoRedo.setup();

      this.react.status = 'success';

      await sleep();
      await watchUntilTrue(() => {
        for (const note of this.react.notes) {
          if (!note.react.loaded) {
            return false;
          }
        }

        return true;
      });

      mainLogger().sub('page.finishSetup').info('All notes loaded');

      this.camera.fitToScreen();

      await sleep();
    } catch (error) {
      mainLogger().error(error);
    }

    this.react.loading = false;
  }

  activate(parentPageId?: string) {
    void this.bump(parentPageId);

    this.collab.websocket.enableLocalAwareness();
  }
  deactivate() {
    this.collab.websocket.disableLocalAwareness();
  }

  async bump(parentPageId?: string) {
    // Bump on page cache

    this.app.pageCache.bump(this.id);

    // Bump on recent pages

    pull(this.app.react.recentPageIds, this.id);
    this.app.react.recentPageIds.unshift(this.id);

    // Bump on server

    if (authStore().loggedIn) {
      await api().post(`/api/pages/${this.id}/bump`, {
        parentPageId,
      });
    }
  }

  fixDisplay() {
    const pageElem = document.querySelector(
      `.display-screens[data-page-id="${this.id}"]`,
    ) as HTMLElement;
    const worldElem = document.querySelector(
      `.display-world[data-page-id="${this.id}"]`,
    ) as HTMLElement;

    if (worldElem == null) {
      return;
    }

    const pageRect = pageElem.getBoundingClientRect();
    const worldRect = worldElem.getBoundingClientRect();

    if (worldRect.x === pageRect.x && worldRect.y === pageRect.y) {
      return;
    }

    pageElem.style.position = 'static';

    setTimeout(() => {
      pageElem.style.position = 'absolute';
    });
  }

  destroy() {
    this.pinching.destroy();

    this.collab.destroy();

    this.realtimeCtx.destroy();
  }
}
