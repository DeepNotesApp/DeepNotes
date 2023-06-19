import { rolesMap } from '@deeplib/misc';
import { sleep, Vec2 } from '@stdlib/misc';
import { watchUntilTrue } from '@stdlib/vue';
import { once, pull } from 'lodash';
import { bumpPage } from 'src/code/api-interface/pages/bump';
import type { Factories } from 'src/code/factories';
import type { Pages } from 'src/code/pages/pages';
import { RealtimeContext } from 'src/code/realtime/context';
import type { ComputedRef, UnwrapNestedRefs } from 'vue';
import type { z } from 'zod';

import { pageGroupIds } from '../computed/page-group-id';
import type { PageArrowCreation } from './arrows/arrow-creation';
import type { PageArrows } from './arrows/arrows';
import type { PageCamera } from './camera/camera';
import type { PagePanning } from './camera/panning';
import type { PagePinching } from './camera/pinching';
import type { PageZooming } from './camera/zooming';
import type { PageCollab } from './collab/collab';
import type { PageClipboard } from './elems/clipboard';
import type { PageDeleting } from './elems/deleting';
import type { PageEditing } from './elems/editing';
import type { PageElem } from './elems/elem';
import type { PageElems } from './elems/elems';
import type { PageFindAndReplace } from './elems/find-and-replace';
import type { NoteAligning } from './notes/aligning';
import type { NoteCloning } from './notes/cloning';
import type { NoteDragging } from './notes/dragging';
import type { NoteDropping } from './notes/dropping';
import type { PageNotes } from './notes/notes';
import type { NoteResizing } from './notes/resizing';
import type { IPageRegion, IRegionReact } from './regions/region';
import { getIslandRegions } from './regions/region';
import { getIslandRoot } from './regions/region';
import { IRegionCollab } from './regions/region';
import type { PageRegions } from './regions/regions';
import type { PageActiveElem } from './selection/active-elem';
import type { PageActiveRegion } from './selection/active-region';
import type { PageBoxSelection } from './selection/box-selection';
import type { PageClickSelection } from './selection/click-selection';
import type { PageSelection } from './selection/selection';
import type { PagePos } from './space/pos';
import type { PageRects } from './space/rects';
import type { PageSizes } from './space/sizes';
import type { PageUndoRedo } from './undo-redo';

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
  readonly findAndReplace: PageFindAndReplace;

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

  constructor(input: { factories: Factories; app: Pages; id: string }) {
    this.app = input.app;
    this.id = input.id;

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

    this.collab = input.factories.PageCollab({ page: this });
    this.undoRedo = input.factories.PageUndoRedo({ page: this });

    this.pos = input.factories.PagePos({ page: this });
    this.rects = input.factories.PageRects({ page: this });
    this.sizes = input.factories.PageSizes({ page: this });

    this.camera = input.factories.PageCamera({ page: this });
    this.panning = input.factories.PagePanning({ page: this });
    this.zooming = input.factories.PageZooming({ page: this });
    this.pinching = input.factories.PagePinching({ page: this });

    this.selection = input.factories.PageSelection({ page: this });
    this.activeElem = input.factories.PageActiveElem({ page: this });
    this.activeRegion = input.factories.PageActiveRegion({ page: this });
    this.clickSelection = input.factories.PageClickSelection({ page: this });
    this.boxSelection = input.factories.PageBoxSelection({ page: this });

    this.regions = input.factories.PageRegions({ page: this });

    this.elems = input.factories.PageElems({ page: this });
    this.deleting = input.factories.PageDeleting({ page: this });
    this.clipboard = input.factories.PageClipboard({ page: this });
    this.editing = input.factories.PageEditing({ page: this });
    this.findAndReplace = input.factories.PageFindAndReplace({ page: this });

    this.notes = input.factories.PageNotes({ page: this });
    this.dragging = input.factories.PageNoteDragging({ page: this });
    this.dropping = input.factories.PageNoteDropping({ page: this });
    this.cloning = input.factories.PageNoteCloning({ page: this });
    this.resizing = input.factories.PageNoteResizing({ page: this });
    this.aligning = input.factories.PageNoteAligning({ page: this });

    this.arrows = input.factories.PageArrows({ page: this });
    this.arrowCreation = input.factories.PageArrowCreation({ page: this });
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
      await nextTick();

      mainLogger.sub('page.finishSetup').info('All notes loaded');

      this.camera.fitToScreen();

      await sleep();
    } catch (error) {
      mainLogger.error(error);
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
      await bumpPage({
        pageId: this.id,
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

    if (worldRect.x !== pageRect.x || worldRect.y !== pageRect.y) {
      this.camera.react.pos = this.camera.react.pos.add(
        this.sizes.screenToWorld2D(
          new Vec2(pageRect.x, pageRect.y).sub(
            new Vec2(worldRect.x, worldRect.y),
          ),
        ),
      );

      pageElem.style.position = 'static';

      setTimeout(() => {
        pageElem.style.position = 'absolute';
      });
    }
  }

  destroy() {
    this.pinching.destroy();

    this.collab.destroy();

    this.realtimeCtx.destroy();
  }
}
