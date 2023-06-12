import type { ClassType } from '@stdlib/misc';
import { once } from 'lodash';

import { PageArrow } from './pages/page/arrows/arrow';
import { PageArrowCreation } from './pages/page/arrows/arrow-creation';
import { PageArrows } from './pages/page/arrows/arrows';
import { PageCamera } from './pages/page/camera/camera';
import { PagePanning } from './pages/page/camera/panning';
import { PagePinching } from './pages/page/camera/pinching';
import { PageZooming } from './pages/page/camera/zooming';
import { PageCollab } from './pages/page/collab/collab';
import { PagePresence } from './pages/page/collab/presence';
import { PageWebsocket } from './pages/page/collab/websocket';
import { PageClipboard } from './pages/page/elems/clipboard';
import { PageDeleting } from './pages/page/elems/deleting';
import { PageEditing } from './pages/page/elems/editing';
import { PageElems } from './pages/page/elems/elems';
import { PageFindAndReplace } from './pages/page/elems/find-and-replace';
import { NoteAligning } from './pages/page/notes/aligning';
import { NoteCloning } from './pages/page/notes/cloning';
import { NoteDragging } from './pages/page/notes/dragging';
import { NoteDropping } from './pages/page/notes/dropping';
import { PageNote } from './pages/page/notes/note';
import { PageNotes } from './pages/page/notes/notes';
import { NoteResizing } from './pages/page/notes/resizing';
import { Page } from './pages/page/page';
import { PageRegions } from './pages/page/regions/regions';
import { PageActiveElem } from './pages/page/selection/active-elem';
import { PageActiveRegion } from './pages/page/selection/active-region';
import { PageBoxSelection } from './pages/page/selection/box-selection';
import { PageClickSelection } from './pages/page/selection/click-selection';
import { PageSelection } from './pages/page/selection/selection';
import { PagePos } from './pages/page/space/pos';
import { PageRects } from './pages/page/space/rects';
import { PageSizes } from './pages/page/space/sizes';
import { PageUndoRedo } from './pages/page/undo-redo';
import { PageCache } from './pages/page-cache';
import { Pages } from './pages/pages';
import { Serialization } from './pages/serialization';

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
  PageFindAndReplace: makeFactory(PageFindAndReplace),

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
