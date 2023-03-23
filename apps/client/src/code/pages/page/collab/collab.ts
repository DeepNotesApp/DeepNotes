import type { Y } from '@syncedstore/core';
import { getYjsDoc } from '@syncedstore/core';
import type { Factories } from 'src/code/factories';
import type { PageWebsocket } from 'src/code/pages/page/collab/websocket';

import type { Pages } from '../../pages';
import { createPageStore } from '../../utils';
import type { IArrowCollabOutput } from '../arrows/arrow';
import type { INoteCollabComplete } from '../notes/note-collab';
import type { IPageCollabOutput, Page } from '../page';
import { IPageCollab } from '../page';
import type { PagePresence } from './presence';

export interface IAppCollabStore {
  page: IPageCollabOutput;
  notes: Record<string, INoteCollabComplete>;
  arrows: Record<string, IArrowCollabOutput>;
}

export class PageCollab {
  readonly app: Pages;

  readonly page: Page;

  readonly store: IAppCollabStore;

  readonly doc: Y.Doc;

  readonly presence: PagePresence;
  readonly websocket: PageWebsocket;

  constructor({ factories, page }: { factories: Factories; page: Page }) {
    this.app = page.app;
    this.page = page;

    this.store = createPageStore();
    this.doc = getYjsDoc(this.store);

    this.presence = factories.PagePresence({ collab: this });
    this.websocket = factories.PageWebsocket({ collab: this });
  }

  async setup() {
    const logger = mainLogger().sub('page.collab.setup');

    this.presence.setup();

    logger.info('Presence setup finished');

    this.websocket.connect();

    await this.websocket.connectPromise;

    logger.info('connectPromise finished');

    this.websocket.enableLocalAwareness();

    logger.info('Local awareness enabled');

    await this.websocket.syncPromise;

    logger.info('syncPromise finished');

    if (this.store.page.noteIds == null) {
      this.reset();
    }
  }

  reset() {
    this.doc.transact(() => {
      // Object.assign because cannot directly assign root elements

      Object.assign(this.store.page, IPageCollab().parse({}));
    });
  }

  destroy() {
    this.websocket.destroy();

    this.presence.destroy();
  }
}
