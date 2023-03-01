import { getYjsValue, Y } from '@syncedstore/core';
import { ySyncPluginKey } from 'y-prosemirror';

import type { Page } from './page.client';

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

  constructor({ page }: { page: Page }) {
    this.page = page;
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

    this.undoManager.on('stack-cleared', this.updateReactiveData);
    this.undoManager.on('stack-item-added', this.updateReactiveData);
    this.undoManager.on('stack-item-popped', this.updateReactiveData);
    this.undoManager.on('stack-item-updated', this.updateReactiveData);
  }

  resetCapturing() {
    this.undoManager.stopCapturing();
  }

  undo() {
    this.page.selection.clear();

    this.undoManager.undo();

    this.updateReactiveData();
  }
  redo() {
    this.page.selection.clear();

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
