import { getYjsValue, Y } from '@syncedstore/core';
import { ySyncPluginKey } from 'y-prosemirror';

import type { Page } from './page';

const _moduleLogger = mainLogger.sub('UndoRedo');

export class PageUndoRedo {
  readonly page: Page;

  undoManager!: Y.UndoManager;

  readonly react = reactive({
    key: 0,

    canUndo: computed(() => {
      this.react.key;
      return this.undoManager?.canUndo() ?? false;
    }),
    canRedo: computed(() => {
      this.react.key;
      return this.undoManager?.canRedo() ?? false;
    }),
  });

  constructor(input: { page: Page }) {
    this.page = input.page;
  }

  setup() {
    this.undoManager = new Y.UndoManager(
      [
        getYjsValue(this.page.collab.store.page) as any,
        getYjsValue(this.page.collab.store.notes) as any,
        getYjsValue(this.page.collab.store.arrows) as any,
      ],
      {
        trackedOrigins: new Set([null, ySyncPluginKey]),
      },
    );

    this.undoManager.on('stack-cleared', (event: any) => {
      _moduleLogger.debug('stack-cleared: %o', event);

      this.updateReactiveData();
    });
    this.undoManager.on('stack-item-added', (event: any) => {
      _moduleLogger.debug('stack-item-added: %o', event);

      this.updateReactiveData();

      event.stackItem.meta.set(
        'selectedNoteIds',
        this.page.selection.react.noteIds.slice(),
      );
      event.stackItem.meta.set(
        'selectedArrowIds',
        this.page.selection.react.arrowIds.slice(),
      );
    });
    this.undoManager.on('stack-item-updated', (event: any) => {
      // _moduleLogger.debug('stack-item-updated: %o', event);

      this.updateReactiveData();

      event.stackItem.meta.set(
        'selectedNoteIds',
        this.page.selection.react.noteIds.slice(),
      );
      event.stackItem.meta.set(
        'selectedArrowIds',
        this.page.selection.react.arrowIds.slice(),
      );
    });
    this.undoManager.on('stack-item-popped', (event: any) => {
      _moduleLogger.debug('stack-item-popped: %o', event);

      this.updateReactiveData();

      this.page.selection.set(
        ...this.page.notes.fromIds(event.stackItem.meta.get('selectedNoteIds')),
        ...this.page.arrows.fromIds(
          event.stackItem.meta.get('selectedArrowIds'),
        ),
      );
    });
  }

  resetCapturing() {
    this.undoManager.stopCapturing();
  }

  undo() {
    this.undoManager.undo();

    this.updateReactiveData();
  }
  redo() {
    this.undoManager.redo();

    this.updateReactiveData();
  }

  updateReactiveData = () => {
    this.react.key++;
  };

  skip(func: () => void) {
    const oldTrackedOrigins = this.undoManager.trackedOrigins;

    this.undoManager.trackedOrigins = new Set();

    func();

    this.undoManager.trackedOrigins = oldTrackedOrigins;
  }
}
