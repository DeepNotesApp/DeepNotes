import type { Editor, Range } from '@tiptap/vue-3';
import { scrollIntoView } from 'src/code/utils/scroll-into-view';
import type { UnwrapNestedRefs } from 'vue';

import type { PageArrow } from '../arrows/arrow';
import type { PageNote } from '../notes/note';
import type { Page } from '../page';

interface IPageFindAndReplaceReact {
  active: boolean;

  replace: boolean;

  resultCount: number;
}

export class PageFindAndReplace {
  readonly page: Page;

  readonly react: UnwrapNestedRefs<IPageFindAndReplaceReact>;

  elems: (PageNote | PageArrow)[] = [];
  elemInfos: { elem: PageNote | PageArrow; editors: Editor[] }[] = [];

  findTerm = '';

  firstInteraction = true;

  elemIndex = 0;
  editorIndex = 0;
  resultIndex = 0;

  constructor(input: { page: Page }) {
    this.page = input.page;

    this.react = reactive({
      active: false,

      replace: false,

      resultCount: 0,
    });
  }

  collectElems() {
    this.elems = [];

    const _collectElems = (
      notes: PageNote[],
      arrows: PageArrow[],
      spatial: boolean,
    ) => {
      const elemsWithRects = [...notes, ...arrows]
        .map((elem) => ({
          elem,
          clientRect: elem.getClientRect()!,
        }))
        .filter((item) => item.clientRect != null);

      if (spatial) {
        elemsWithRects.sort((a, b) => {
          if (a.clientRect.center.y !== b.clientRect.center.y) {
            return a.clientRect.center.y - b.clientRect.center.y;
          } else {
            return a.clientRect.center.x - b.clientRect.center.x;
          }
        });
      }

      this.elems.push(...elemsWithRects.map((item) => item.elem));

      for (const note of notes) {
        _collectElems(
          note.react.notes,
          note.react.arrows,
          note.react.container.spatial,
        );
      }
    };

    _collectElems(this.page.react.notes, this.page.react.arrows, true);
  }

  async updateSearch(findTerm: string) {
    this.elemInfos = [];

    this.findTerm = findTerm;

    this.firstInteraction = true;

    if (this.react.active) {
      for (const elem of this.elems) {
        const editors: Editor[] = [];

        for (const editor of elem.react.editors) {
          editor.commands.setFindTerm(findTerm);

          if ((editor.state as any).findAndReplace$.results.length > 0) {
            editors.push(editor);
          }
        }

        if (editors.length > 0) {
          this.elemInfos.push({
            elem,
            editors,
          });
        }
      }

      this.updateResultCount();
    } else {
      for (const elem of this.elems) {
        for (const editor of elem.react.editors) {
          editor.commands.setFindTerm('');
        }
      }
    }
  }

  updateResultCount() {
    this.react.resultCount = 0;

    for (const elem of this.elems) {
      for (const editor of elem.react.editors) {
        this.react.resultCount += (
          editor.state as any
        ).findAndReplace$.results.length;
      }
    }
  }

  async focusCurrentResult() {
    const elemInfo = this.elemInfos[this.elemIndex];

    if (elemInfo == null) {
      return;
    }

    const editor = elemInfo.editors[this.editorIndex];

    if (editor == null) {
      return;
    }

    const result = (editor.state as any).findAndReplace$.results[
      this.resultIndex
    ];

    if (result == null) {
      return;
    }

    if (this.page.editing.react.editor !== editor) {
      await this.page.editing.start(
        elemInfo.elem,
        this.editorIndex === 0 ? 'head' : 'body',
      );
    }

    const resultElems = editor.options.element.querySelectorAll('.find-result');

    editor.commands.setTextSelection(result);
    editor.commands.focus(undefined, { scrollIntoView: false });

    scrollIntoView(resultElems[this.resultIndex], {
      centerCamera: true,
    });
  }

  async findNext() {
    if (this.firstInteraction) {
      this.firstInteraction = false;

      this.elemIndex = 0;
      this.editorIndex = 0;
      this.resultIndex = 0;
    } else {
      const elemInfo = this.elemInfos[this.elemIndex];
      const editor = elemInfo.editors[this.editorIndex];
      const results = (editor.state as any).findAndReplace$.results;

      if (this.resultIndex < results.length - 1) {
        this.resultIndex++;
      } else if (this.editorIndex < elemInfo.elem.react.editors.length - 1) {
        this.editorIndex++;
        this.resultIndex = 0;
      } else if (this.elemIndex < this.elemInfos.length - 1) {
        this.elemIndex++;
        this.editorIndex = 0;
        this.resultIndex = 0;
      } else {
        this.elemIndex = 0;
        this.editorIndex = 0;
        this.resultIndex = 0;
      }
    }

    await this.focusCurrentResult();
  }

  async findPrev() {
    const elemInfo = this.elemInfos[this.elemIndex];

    if (this.resultIndex > 0) {
      this.resultIndex--;
    } else if (this.editorIndex > 0) {
      this.editorIndex--;
      const newEditor = elemInfo.elem.react.editors[this.editorIndex];
      this.resultIndex =
        (newEditor.state as any).findAndReplace$.results.length - 1;
    } else if (this.elemIndex > 0) {
      this.elemIndex--;
      const newElemInfo = this.elemInfos[this.elemIndex];
      this.editorIndex = newElemInfo.elem.react.editors.length - 1;
      const newEditor = newElemInfo.elem.react.editors[this.editorIndex];
      this.resultIndex =
        (newEditor.state as any).findAndReplace$.results.length - 1;
    } else {
      this.elemIndex = this.elemInfos.length - 1;
      const newElemInfo = this.elemInfos[this.elemIndex];
      this.editorIndex = newElemInfo.elem.react.editors.length - 1;
      const newEditor = newElemInfo.elem.react.editors[this.editorIndex];
      this.resultIndex =
        (newEditor.state as any).findAndReplace$.results.length - 1;
    }

    await this.focusCurrentResult();
  }

  async replace(replacement: string) {
    this.firstInteraction = false;

    const elemInfo = this.elemInfos[this.elemIndex];

    if (elemInfo == null) {
      return;
    }

    const editor = elemInfo.editors[this.editorIndex];

    if (editor == null) {
      return;
    }

    const result = (editor.state as any).findAndReplace$.results[
      this.resultIndex
    ];

    if (result == null) {
      return;
    }

    replaceText(editor, result, replacement);

    if (!replacement.includes(this.findTerm)) {
      this.resultIndex--;
    }

    await this.findNext();

    this.updateResultCount();
  }

  replaceAll(replacement: string) {
    for (const elemInfo of this.elemInfos) {
      for (const editor of elemInfo.editors) {
        for (const result of (editor.state as any).findAndReplace$.results
          .slice()
          .reverse()) {
          replaceText(editor, result, replacement);
        }
      }
    }
  }
}

function replaceText(editor: Editor, range: Range, replacement: string) {
  if (replacement !== '') {
    editor.commands.insertContentAt(range, replacement);
  } else {
    editor.commands.deleteRange(range);
  }
}
