import type { MarkName, NodeName } from '@stdlib/misc';
import { Vec2 } from '@stdlib/misc';
import type { ChainedCommands, Editor } from '@tiptap/vue-3';
import { every } from 'lodash';
import { unsetNode } from 'src/code/tiptap/utils';
import { getClipboardText, setClipboardText } from 'src/code/utils/clipboard';
import type { ComputedRef, UnwrapNestedRefs } from 'vue';

import type { PageArrow } from '../arrows/arrow';
import type { PageElem } from '../elems/elem';
import type { PageNote } from '../notes/note';
import type { Page } from '../page';
import type { PageRegion } from '../regions/region';

export interface ISelectionReact {
  noteSet: Record<string, boolean>;
  arrowSet: Record<string, boolean>;

  noteIds: ComputedRef<string[]>;
  arrowIds: ComputedRef<string[]>;

  notes: ComputedRef<PageNote[]>;
  arrows: ComputedRef<PageArrow[]>;

  elems: ComputedRef<(PageNote | PageArrow)[]>;
}

export class PageSelection {
  readonly page: Page;

  readonly react: UnwrapNestedRefs<ISelectionReact>;

  constructor(input: { page: Page }) {
    this.page = input.page;

    this.react = reactive({
      noteSet: {},
      arrowSet: {},

      noteIds: computed(() => Object.keys(this.react.noteSet)),
      arrowIds: computed(() => Object.keys(this.react.arrowSet)),

      notes: computed(() =>
        this.page.notes.fromIds(
          this.react.noteIds,
          this.page.activeRegion.react.id,
        ),
      ),
      arrows: computed(() => this.page.arrows.fromIds(this.react.arrowIds)),

      elems: computed(() =>
        (this.react.notes as (PageNote | PageArrow)[]).concat(
          this.react.arrows,
        ),
      ),
    });
  }

  has(elem: PageElem): boolean {
    if (elem.type == null) {
      return false;
    }

    return elem.id in this.react[`${elem.type}Set`];
  }

  clear(region?: PageRegion) {
    this.page.collab.doc.transact(() => {
      for (const elem of this.react.elems) {
        this.remove(elem);
      }

      this.react.noteSet = {};
      this.react.arrowSet = {};

      this.page.activeElem.clear();

      if (region !== undefined) {
        this.page.activeRegion.react.id = region.id;
      }
    });
  }

  add(...elems: PageElem[]) {
    this.page.collab.doc.transact(() => {
      for (const elem of elems) {
        if (elem.react.selected || elem.type == null) {
          continue;
        }

        if (
          elem.type === 'note' &&
          elem.react.region !== this.page.activeRegion.react.value
        ) {
          this.clear(elem.react.region);
        }

        elem.react.selected = true;
        this.react[`${elem.type}Set`][elem.id] = true;

        if (!this.page.activeElem.react.exists) {
          this.page.activeElem.set(elem);
        }

        if (elem.type === 'note') {
          (elem as PageNote).bringToTop();
        }
      }
    });
  }
  remove(...elems: PageElem[]) {
    this.page.collab.doc.transact(() => {
      for (const elem of elems) {
        if (!elem.react.selected || elem.type == null) {
          continue;
        }

        elem.react.selected = false;
        delete this.react[`${elem.type}Set`][elem.id];

        if (elem.react.active) {
          this.page.activeElem.set(this.react.elems.at(-1) ?? null);
        }
      }
    });
  }

  set(...elems: PageElem[]) {
    this.page.collab.doc.transact(() => {
      this.clear();

      this.add(...elems);
    });
  }

  selectAll() {
    const elemsToSelect: PageElem[] = [];

    const rootMap = new Map<PageNote, PageNote>();

    const descendantArrows: PageArrow[] = [];

    const processDescendants = (root: PageNote, note: PageNote) => {
      rootMap.set(note, root);

      descendantArrows.push(
        ...this.page.arrows.fromIds([
          ...note.incomingArrowIds,
          ...note.outgoingArrowIds,
        ]),
      );

      for (const child of note.react.notes) {
        processDescendants(root, child);
      }
    };

    // Add root notes and arrows and gather descendant arrows

    for (const note of this.page.activeRegion.react.value.react.notes) {
      elemsToSelect.push(note);

      elemsToSelect.push(
        ...this.page.arrows.fromIds([
          ...note.incomingArrowIds,
          ...note.outgoingArrowIds,
        ]),
      );

      processDescendants(note, note);
    }

    // Add interregional arrows

    for (const arrow of descendantArrows) {
      const sourceRootNote = rootMap.get(arrow.react.sourceNote);
      const targetRootNote = rootMap.get(arrow.react.targetNote);

      if (
        sourceRootNote != null &&
        targetRootNote != null &&
        sourceRootNote !== targetRootNote
      ) {
        elemsToSelect.push(arrow);
      }
    }

    this.add(...new Set(elemsToSelect));
  }

  shift(shift: Vec2) {
    this.page.collab.doc.transact(() => {
      for (const note of this.react.notes) {
        const newPos = new Vec2(note.react.collab.pos).add(shift);

        note.react.collab.pos.x = newPos.x;
        note.react.collab.pos.y = newPos.y;
      }
    });
  }

  format(
    chainFunc: (chain: ChainedCommands, editor: Editor) => ChainedCommands,
  ) {
    this.page.collab.doc.transact(() => {
      if (this.page.editing.react.editor != null) {
        chainFunc(
          this.page.editing.react.editor.chain().focus(),
          this.page.editing.react.editor,
        ).run();
      } else {
        for (const elem of this.react.elems) {
          for (const editor of elem.react.editors) {
            chainFunc(editor.chain().selectAll(), editor).run();
          }
        }
      }
    });
  }

  toggleMark(name: MarkName, attribs?: Record<string, any>) {
    if (
      every(this.react.elems, (elem) =>
        every(elem.react.editors, (editor) =>
          internals.tiptap().isMarkActive(editor.state, name),
        ),
      )
    ) {
      this.format((chain) => chain.unsetMark(name));
    } else {
      this.format((chain) => chain.setMark(name, attribs));
    }
  }
  toggleNode(name: NodeName, attribs?: Record<string, any>) {
    if (
      every(this.react.elems, (elem) =>
        every(elem.react.editors, (editor) =>
          internals.tiptap().isNodeActive(editor.state, name, attribs),
        ),
      )
    ) {
      this.format((chain, editor) => unsetNode(editor, chain, name, attribs));
    } else {
      this.format((chain) => chain.setNode(name, attribs));
    }
  }

  async copy() {
    if (this.page.editing.react.editor != null) {
      const state = this.page.editing.react.editor.view.state;

      await setClipboardText(
        state.doc.cut(state.selection.from, state.selection.to).textContent,
      );
    } else {
      await this.page.clipboard.copy();
    }
  }
  async cut() {
    if (this.page.editing.react.editor != null) {
      await this.copy();

      this.page.editing.react.editor.commands.deleteSelection();
    } else {
      await this.page.clipboard.cut();
    }
  }
  async paste() {
    if (this.page.editing.react.editor != null) {
      const text = await getClipboardText();

      if (text != null) {
        this.page.editing.react.editor
          .chain()
          .focus()
          .deleteSelection()
          .insertContent(text)
          .run();
      }
    } else {
      await this.page.clipboard.paste();
    }
  }

  moveToRegion(region: PageRegion, afterId?: string) {
    const oldActiveElem = this.page.activeElem.react.value;

    const notesSet = new Set(this.react.notes);
    const arrowsSet = new Set<PageArrow>();

    for (const note of this.react.notes) {
      for (const arrow of this.page.arrows.fromIds(
        Array.from(note.incomingArrowIds),
      )) {
        if (arrow.react.region !== region) {
          arrowsSet.add(arrow);
        }
      }

      for (const arrow of this.page.arrows.fromIds(
        Array.from(note.outgoingArrowIds),
      )) {
        if (arrow.react.region !== region) {
          arrowsSet.add(arrow);
        }
      }
    }

    const notesArray = Array.from(notesSet);
    const arrowsArray = Array.from(arrowsSet);

    notesArray.sort((a, b) => b.react.index - a.react.index);
    arrowsArray.sort((a, b) => b.react.index - a.react.index);

    this.page.collab.doc.transact(() => {
      for (const note of notesArray) {
        note.moveToRegion(region, afterId);
      }

      for (const arrow of arrowsArray) {
        arrow.moveToRegion(region);
      }
    });

    this.page.activeRegion.react.id = region.id;

    this.add(...notesArray, ...arrowsArray);

    this.page.activeElem.set(oldActiveElem);
  }
}
