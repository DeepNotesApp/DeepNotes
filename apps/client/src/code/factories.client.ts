import type { ClassType } from '@stdlib/misc';
import { once } from 'lodash';

import { PageArrow } from './pages/page/arrows/arrow.client';
import { PageArrowCreation } from './pages/page/arrows/arrow-creation.client';
import { PageArrows } from './pages/page/arrows/arrows.client';
import { PageCamera } from './pages/page/camera/camera.client';
import { PagePanning } from './pages/page/camera/panning.client';
import { PagePinching } from './pages/page/camera/pinching.client';
import { PageZooming } from './pages/page/camera/zooming.client';
import { PageCollab } from './pages/page/collab/collab.client';
import { PagePresence } from './pages/page/collab/presence.client';
import { PageWebsocket } from './pages/page/collab/websocket.client';
import { PageClipboard } from './pages/page/elems/clipboard.client';
import { PageDeleting } from './pages/page/elems/deleting.client';
import { PageEditing } from './pages/page/elems/editing.client';
import { PageElems } from './pages/page/elems/elems.client';
import { NoteAligning } from './pages/page/notes/aligning.client';
import { NoteCloning } from './pages/page/notes/cloning.client';
import { NoteDragging } from './pages/page/notes/dragging.client';
import { NoteDropping } from './pages/page/notes/dropping.client';
import { PageNote } from './pages/page/notes/note.client';
import { PageNotes } from './pages/page/notes/notes.client';
import { NoteResizing } from './pages/page/notes/resizing.client';
import { Page } from './pages/page/page.client';
import { PageRegions } from './pages/page/regions/regions.client';
import { PageActiveElem } from './pages/page/selection/active-elem.client';
import { PageActiveRegion } from './pages/page/selection/active-region.client';
import { PageBoxSelection } from './pages/page/selection/box-selection.client';
import { PageClickSelection } from './pages/page/selection/click-selection.client';
import { PageSelection } from './pages/page/selection/selection.client';
import { PagePos } from './pages/page/space/pos.client';
import { PageRects } from './pages/page/space/rects.client';
import { PageSizes } from './pages/page/space/sizes.client';
import { PageUndoRedo } from './pages/page/undo-redo.client';
import { PageCache } from './pages/page-cache.client';
import { Pages } from './pages/pages.client';
import { Serialization } from './pages/serialization.client';

export type FactoryFunc<T extends abstract new (...args: any) => any> = (
  ...params: [Omit<ConstructorParameters<T>[0], 'factories'>]
) => InstanceType<T>;

const makeFactory = <T extends ClassType>(
  classType: T,
): FactoryFunc<typeof classType> =>
  ((args: any) => new classType({ factories: factories(), ...args })) as any;

export const factories = once(() => ({
  Pages: makeFactory(Pages),

  Serialization: makeFactory(Serialization),
  PageCache: makeFactory(PageCache),

  Page: makeFactory(Page),

  PageCollab: makeFactory(PageCollab),
  PagePresence: makeFactory(PagePresence),
  PageWebsocket: makeFactory(PageWebsocket()),

  PageUndoRedo: makeFactory(PageUndoRedo),

  PagePos: makeFactory(PagePos),
  PageRects: makeFactory(PageRects),
  PageSizes: makeFactory(PageSizes),

  PageCamera: makeFactory(PageCamera),
  PagePanning: makeFactory(PagePanning),
  PageZooming: makeFactory(PageZooming),
  PagePinching: makeFactory(PagePinching),

  PageSelection: makeFactory(PageSelection),
  PageActiveElem: makeFactory(PageActiveElem),
  PageActiveRegion: makeFactory(PageActiveRegion),
  PageClickSelection: makeFactory(PageClickSelection),
  PageBoxSelection: makeFactory(PageBoxSelection),

  PageRegions: makeFactory(PageRegions),

  PageElems: makeFactory(PageElems),
  PageDeleting: makeFactory(PageDeleting),
  PageClipboard: makeFactory(PageClipboard),
  PageEditing: makeFactory(PageEditing),

  PageNotes: makeFactory(PageNotes),
  PageNoteDragging: makeFactory(NoteDragging),
  PageNoteDropping: makeFactory(NoteDropping),
  PageNoteCloning: makeFactory(NoteCloning),
  PageNoteResizing: makeFactory(NoteResizing),
  PageNoteAligning: makeFactory(NoteAligning),
  PageNote: makeFactory(PageNote),

  PageArrows: makeFactory(PageArrows),
  PageArrowCreation: makeFactory(PageArrowCreation),
  PageArrow: makeFactory(PageArrow()),
}));

export type Factories = ReturnType<typeof factories>;
