import { hasVertScrollbar } from '@stdlib/misc';
import { Rect } from '@stdlib/misc';
import { isNumeric } from '@stdlib/misc';
import { Vec2 } from '@stdlib/misc';
import type { Editor } from '@tiptap/vue-3';
import { sizeToCSS } from 'src/code/utils';
import type {
  ComputedRef,
  ShallowRef,
  UnwrapNestedRefs,
  WritableComputedRef,
} from 'vue';

import { colorNameToColorHex } from '../../colors';
import type { PageArrow } from '../arrows/arrow';
import type { IElemReact } from '../elems/elem';
import { PageElem } from '../elems/elem';
import type { Page } from '../page';
import type { PageRegion } from '../regions/region';
import type { IPageRegion, IRegionReact } from '../regions/region';
import { getIslandRegions, getIslandRoot } from '../regions/region';
import type { INoteCollabComplete } from './note-collab';

export type NoteSide = 'nw' | 'n' | 'ne' | 'w' | 'e' | 'sw' | 's' | 'se';

export type NoteSection = 'head' | 'body' | 'container';
export type NoteTextSection = 'head' | 'body';

export interface INoteSize {
  expanded: WritableComputedRef<string>;
  collapsed: WritableComputedRef<string>;
}
export type NoteSizeProp = keyof INoteSize;

export interface INoteVec2React {
  x: WritableComputedRef<number>;
  y: WritableComputedRef<number>;
}

export interface INoteSectionReact {
  visible: ComputedRef<boolean>;
  heightCSS: ComputedRef<string>;
}

export interface INoteTextSectionReact extends INoteSectionReact {
  editor: ShallowRef<Editor | null>;
}

export interface INoteReact extends IRegionReact, IElemReact {
  collab: ComputedRef<INoteCollabComplete>;

  rootNote: ComputedRef<PageNote>;

  dragging: boolean;
  resizing?: {
    active?: boolean;

    oldWorldRect: Rect;
    newWorldRect: Rect;

    section?: NoteSection;

    oldResizeRect: Rect;
    newResizeRect: Rect;
  };

  head: INoteTextSectionReact;
  body: INoteTextSectionReact;
  container: INoteSectionReact & {
    spatial: ComputedRef<boolean>;

    overflow: boolean;

    originOffset: Vec2;
  };

  collapsing: {
    collapsed: WritableComputedRef<boolean>;
    locallyCollapsed: boolean;
  };

  sizeProp: ComputedRef<NoteSizeProp>;

  floating: ComputedRef<boolean>;

  width: {
    stretched: ComputedRef<boolean>;
    parentPinned: ComputedRef<boolean>;
    selfPinned: ComputedRef<boolean>;
    pinned: ComputedRef<boolean>;

    self: ComputedRef<string>;
    minCSS: ComputedRef<string | undefined>;
    finalCSS: ComputedRef<string | undefined>;
    targetCSS: ComputedRef<string | undefined>;
  };

  topSection: ComputedRef<NoteSection>;
  bottomSection: ComputedRef<NoteSection>;
  numEnabledSections: ComputedRef<number>;

  size: Vec2;
  offsetInList: Vec2;
  relativeRect: ComputedRef<Rect>;
  islandRect: ComputedRef<Rect>;

  cursor: ComputedRef<string | undefined>;

  color: ComputedRef<string>;

  link: {
    external: ComputedRef<boolean>;
  };

  editors: ComputedRef<Editor[]>;

  loaded: boolean;
}

function makeSectionHeightCSS(note: PageNote, section: NoteSection) {
  return computed(() => {
    if (
      note.react.resizing?.active &&
      note.react.resizing.section === section
    ) {
      return `${note.react.resizing.newResizeRect.size.y}px`;
    }

    if (
      note.react.collapsing.collapsed &&
      !isNumeric(note.react.collab[section].height.collapsed)
    ) {
      if (note.react.numEnabledSections === 1) {
        return '0px';
      } else {
        return sizeToCSS(note.react.collab[section].height.expanded);
      }
    }

    return sizeToCSS(note.react.collab[section].height[note.react.sizeProp]);
  });
}

export class PageNote extends PageElem() implements IPageRegion {
  readonly type = 'note';

  declare readonly react: UnwrapNestedRefs<INoteReact>;

  readonly incomingArrowIds = new Set<string>();
  readonly outgoingArrowIds = new Set<string>();

  getContainerClientRect() {
    const frameElem = document.querySelector(
      `#note-${this.id} .note-container-frame`,
    );

    if (frameElem == null) {
      return;
    }

    return this.page.rects.fromDOM(frameElem.getBoundingClientRect());
  }
  getContainerWorldRect() {
    const containerClientRect = this.getContainerClientRect();

    if (containerClientRect == null) {
      return;
    }

    return this.page.rects.clientToWorld(containerClientRect);
  }

  getOriginClientPos() {
    return this.getContainerClientRect()?.topLeft;
  }
  getOriginWorldPos() {
    return this.getContainerWorldRect()?.topLeft;
  }

  constructor(args: {
    page: Page;
    id: string;
    index: number;
    collab?: INoteCollabComplete;
  }) {
    super(args);

    const react: Omit<INoteReact, keyof IElemReact> = {
      // Region

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

      notes: computed(() =>
        this.page.notes.fromIds(this.react.collab?.noteIds ?? [], this.id),
      ),
      arrows: computed(() =>
        this.page.arrows.fromIds(this.react.collab?.arrowIds ?? []),
      ),
      elems: computed(() =>
        (this.react.notes as (PageNote | PageArrow)[]).concat(
          this.react.arrows,
        ),
      ),

      islandRoot: computed(() => getIslandRoot(this)),
      islandRegions: computed(() => getIslandRegions(this)),

      // Note

      rootNote: computed(() => {
        if (this.react.region.type === 'note') {
          return this.react.region.react.rootNote;
        } else {
          return this;
        }
      }),

      dragging: false,

      head: {
        editor: shallowRef(null),
        visible: computed(() => this.react.collab.head.enabled),
        heightCSS: makeSectionHeightCSS(this, 'head'),
      },
      body: {
        editor: shallowRef(null),
        visible: computed(
          () =>
            this.react.collab.body.enabled &&
            (!this.react.collapsing.collapsed ||
              this.react.topSection === 'body'),
        ),
        heightCSS: makeSectionHeightCSS(this, 'body'),
      },
      container: {
        visible: computed(
          () =>
            this.react.collab.container.enabled &&
            (!this.react.collapsing.collapsed ||
              this.react.topSection === 'container'),
        ),
        heightCSS: makeSectionHeightCSS(this, 'container'),

        spatial: computed(
          () =>
            this.react.collab.container.enabled &&
            this.react.collab.container.spatial,
        ),

        overflow: false,

        originOffset: new Vec2(),
      },

      collapsing: {
        collapsed: computed({
          get: () => {
            if (!this.react.collab.collapsing.enabled) {
              return false;
            }

            if (
              this.page.react.readOnly ||
              this.react.collab.collapsing.localCollapsing
            ) {
              return this.react.collapsing.locallyCollapsed;
            }

            return this.react.collab.collapsing.collapsed;
          },
          set: (val) => {
            if (
              this.page.react.readOnly ||
              this.react.collab.collapsing.localCollapsing
            ) {
              this.react.collapsing.locallyCollapsed = val;
            } else {
              this.react.collab.collapsing.collapsed = val;
            }
          },
        }),
        locallyCollapsed: false,
      },

      sizeProp: computed(() =>
        this.react.collapsing.collapsed ? 'collapsed' : 'expanded',
      ),

      floating: computed(
        () =>
          this.react.region.type === 'page' ||
          this.react.region.react.collab.container.spatial,
      ),

      width: {
        stretched: computed(() => {
          return (
            this.react.region.type === 'note' &&
            !this.react.floating &&
            !this.react.region.react.collab.container.horizontal &&
            this.react.region.react.collab.container.stretchChildren
          );
        }),
        parentPinned: computed(() => {
          return (
            this.react.width.stretched &&
            this.react.region.type === 'note' &&
            this.react.region.react.width.pinned
          );
        }),
        selfPinned: computed(() => {
          return (
            (!this.react.width.stretched && isNumeric(this.react.width.self)) ||
            !!this.react.resizing?.active
          );
        }),
        pinned: computed(() => {
          return this.react.width.parentPinned || this.react.width.selfPinned;
        }),

        self: computed(() => {
          if (
            this.react.collapsing.collapsed &&
            !isNumeric(this.react.collab.width.collapsed)
          ) {
            return this.react.collab.width.expanded;
          }

          return this.react.collab.width[this.react.sizeProp];
        }),
        minCSS: computed(() => {
          if (
            // Is empty container with unpinned width:
            this.react.collab.container.enabled &&
            this.react.notes.length === 0
          ) {
            return '167px';
          } else if (this.react.floating) {
            return '20px';
          } else {
            return undefined;
          }
        }),
        finalCSS: computed(() => {
          if (this.react.resizing?.active) {
            return `${this.react.resizing.newResizeRect.size.x}px`;
          }

          if (this.react.width.stretched) {
            return undefined;
          }

          if (isNumeric(this.react.width.self)) {
            return `${this.react.width.self}px`;
          }

          return 'max-content';
        }),
        targetCSS: computed(() => {
          return this.react.width.pinned ? '0px' : undefined;
        }),
      },

      topSection: computed(() => {
        if (this.react.collab.head.enabled) {
          return 'head';
        } else if (this.react.collab.body.enabled) {
          return 'body';
        } else if (this.react.collab.container.enabled) {
          return 'container';
        } else {
          throw new Error('No sections enabled');
        }
      }),
      bottomSection: computed(() => {
        if (this.react.collapsing.collapsed) {
          return this.react.topSection;
        } else if (this.react.collab.container.enabled) {
          return 'container';
        } else if (this.react.collab.body.enabled) {
          return 'body';
        } else if (this.react.collab.head.enabled) {
          return 'head';
        } else {
          throw new Error('No sections enabled');
        }
      }),
      numEnabledSections: computed(() => {
        let numSections = 0;

        if (this.react.collab.head.enabled) {
          ++numSections;
        }
        if (this.react.collab.body.enabled) {
          ++numSections;
        }
        if (this.react.collab.container.enabled) {
          ++numSections;
        }

        return numSections;
      }),

      size: new Vec2(),
      offsetInList: new Vec2(),
      relativeRect: computed(() => {
        if (this.react.resizing?.active) {
          return new Rect(
            this.react.resizing.newWorldRect.topLeft,
            this.react.resizing.newWorldRect.topLeft.add(this.react.size),
          );
        }

        let topLeft: Vec2;

        if (
          this.react.region.type === 'note' &&
          !this.react.region.react.container.spatial
        ) {
          topLeft = this.react.offsetInList;
        } else {
          topLeft = new Vec2(this.react.collab.pos).sub(
            new Vec2(this.react.collab.anchor).mul(this.react.size),
          );
        }

        return new Rect(topLeft, topLeft.add(this.react.size));
      }),
      islandRect: computed(() => {
        let topLeft = this.react.relativeRect.topLeft;

        if (
          this.react.region.type === 'note' &&
          this.react.region !== this.react.islandRoot
        ) {
          topLeft = topLeft
            .add(this.react.region.react.islandRect.topLeft)
            .add(this.react.region.react.container.originOffset);
        }

        return new Rect(topLeft, topLeft.add(this.react.size));
      }),

      cursor: computed(() => {
        if (this.react.editing) {
          return 'auto';
        }

        if (this.react.selected) {
          return 'default';
        }

        if (this.react.collab.link) {
          return 'pointer';
        }

        return undefined;
      }),

      color: computed(() =>
        this.react.collab.color.inherit && this.react.region.type === 'note'
          ? this.react.region.react.color
          : colorNameToColorHex('notes', this.react.collab.color.value),
      ),

      link: {
        external: computed(() => {
          if (this.react.collab.link == null) {
            return false;
          }

          if (
            !this.react.collab.link.startsWith('http://') &&
            !this.react.collab.link.startsWith('https://')
          ) {
            return false;
          }

          if (
            this.react.collab.link.startsWith(
              `${window.location.origin}/pages/`,
            )
          ) {
            return false;
          }

          return true;
        }),
      },

      editors: computed(() => {
        const result = [];

        if (this.react.head.editor != null) {
          result.push(this.react.head.editor);
        }
        if (this.react.body.editor != null) {
          result.push(this.react.body.editor);
        }

        return result;
      }),

      loaded: false,
    };

    Object.assign(this.react, react);

    setTimeout(() => {
      setTimeout(() => {
        this.react.loaded = true;

        mainLogger().info(`Note loaded (${this.id})`);
      });
    });
  }

  bringToTop() {
    if (this.react.collab.zIndex !== this.react.region.react.nextZIndex - 1) {
      this.react.collab.zIndex = this.react.region.react.nextZIndex++;
    }
  }

  getElem(part: string | null): HTMLElement | null {
    if (part == null) {
      return document.getElementById(`note-${this.id}`);
    } else {
      return document.querySelector(`#note-${this.id} .${part}`);
    }
  }

  scrollIntoView() {
    if (this.react.region.type === 'page') {
      return;
    }

    const frameElem = this.getElem('note-frame');

    if (frameElem == null) {
      return;
    }

    let auxElem: HTMLElement | null = frameElem;

    while (auxElem != null) {
      if (hasVertScrollbar(auxElem)) {
        break;
      }

      auxElem = auxElem.parentElement;
    }

    if (auxElem == null) {
      return;
    }

    frameElem.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
    });
  }

  getClientRect(part: string) {
    const elem = this.getElem(part);

    if (elem == null) {
      return;
    }

    const domClientRect = elem.getBoundingClientRect();

    return this.page.rects.fromDOM(domClientRect);
  }
  getDisplayRect(part: string) {
    const clientRect = this.getClientRect(part);

    if (clientRect == null) {
      return;
    }

    return this.page.rects.clientToDisplay(clientRect);
  }
  getWorldRect(part: string) {
    const clientRect = this.getClientRect(part);

    if (clientRect == null) {
      return;
    }

    return this.page.rects.clientToWorld(clientRect);
  }

  removeFromRegion() {
    const items = this.react.region.react.collab.noteIds.slice();

    for (let i = items.length - 1; i >= 0; --i) {
      if (items[i] === this.id) {
        this.react.region.react.collab.noteIds.splice(i, 1);
      }
    }
  }
  moveToRegion(destRegion: PageRegion, afterId?: string) {
    this.page.collab.doc.transact(() => {
      this.removeFromRegion();

      this.react.collab.regionId = destRegion.id;

      this.react.collab.zIndex = destRegion.react.nextZIndex++;

      destRegion.react.collab.noteIds.splice(
        afterId != null
          ? destRegion.react.collab.noteIds.indexOf(afterId) + 1
          : 0,
        0,
        this.id,
      );
    });
  }

  reverseChildren() {
    this.page.collab.doc.transact(() => {
      const children = this.react.collab.noteIds.splice(
        0,
        this.react.collab.noteIds.length,
      );

      this.react.collab.noteIds.push(...children.reverse());
    });
  }
}
