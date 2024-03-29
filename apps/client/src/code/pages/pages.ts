import { isNanoID, Vec2 } from '@stdlib/misc';
import { unpack } from 'msgpackr';
import type { ComputedRef, ShallowRef, UnwrapNestedRefs } from 'vue';

import type { Factories } from '../factories';
import { authStore } from '../stores';
import { trpcClient } from '../trpc';
import { multiModePath } from '../utils/misc';
import { scrollIntoView } from '../utils/scroll-into-view';
import type { Page } from './page/page';
import type { PageCache } from './page-cache';
import type { ISerialArrowInput, ISerialObjectInput } from './serialization';
import type { Serialization } from './serialization';

export interface IAppReact {
  pathPageIds: string[];

  recentPageIdsOverride?: string[];
  recentPageIds: ComputedRef<string[]>;

  favoritePageIdsOverride?: string[];
  favoritePageIds: ComputedRef<string[]>;

  page: ShallowRef<Page>;
  pageId: ComputedRef<string | undefined>;
  pageIndex: ComputedRef<number>;

  tableContextMenu: boolean;
  tableContextMenuPos: Vec2;

  isNewUser: boolean;
  tutorialStep: number;

  loaded?: boolean;
}

export class Pages {
  readonly factories: Factories;

  readonly serialization: Serialization;
  readonly pageCache: PageCache;

  readonly react: UnwrapNestedRefs<IAppReact>;

  defaultNote!: ISerialObjectInput;
  defaultArrow!: ISerialArrowInput;

  parentPageId?: string;

  recentPageIdsKeepOverride?: boolean;
  favoritePageIdsKeepOverride?: boolean;

  constructor(input: { factories: Factories }) {
    this.factories = input.factories;

    this.serialization = input.factories.Serialization({ app: this });
    this.pageCache = input.factories.PageCache({ app: this });

    this.react = reactive({
      pathPageIds: [],

      recentPageIds: computed(() => {
        if (this.recentPageIdsKeepOverride) {
          this.recentPageIdsKeepOverride = undefined;
        } else {
          this.react.recentPageIdsOverride = undefined;
        }

        const recentPageIds = internals.realtime.globalCtx.hget(
          'user',
          authStore().userId,
          'recent-page-ids',
        );

        return this.react.recentPageIdsOverride ?? recentPageIds ?? [];
      }),

      favoritePageIds: computed(() => {
        if (this.favoritePageIdsKeepOverride) {
          this.favoritePageIdsKeepOverride = undefined;
        } else {
          this.react.favoritePageIdsOverride = undefined;
        }

        const favoritePageIds = internals.realtime.globalCtx.hget(
          'user',
          authStore().userId,
          'favorite-page-ids',
        );

        return this.react.favoritePageIdsOverride ?? favoritePageIds ?? [];
      }),

      page: shallowRef(null) as any,
      pageId: computed(() => this.react.page?.id),
      pageIndex: computed(() =>
        this.react.pathPageIds.indexOf(this.react.pageId ?? ''),
      ),

      tableContextMenu: false,
      tableContextMenuPos: new Vec2(),

      isNewUser: false,
      tutorialStep: 1,
    });
  }

  async loadUserData() {
    if (!authStore().loggedIn) {
      return;
    }

    const promises: PromiseLike<any>[] = [];

    promises.push(
      (async () => {
        pagesStore().notifications =
          await trpcClient.users.pages.notifications.load.query();
      })(),
    );

    promises.push(
      (async () => {
        const [encryptedDefaultNote, encryptedDefaultArrow, isNewUser] =
          await internals.realtime.hmget('user', authStore().userId, [
            'encrypted-default-note',
            'encrypted-default-arrow',
            'new',
          ]);

        this.defaultNote = unpack(
          internals.symmetricKeyring.decrypt(encryptedDefaultNote, {
            padding: true,
            associatedData: {
              context: 'UserDefaultNote',
              userId: authStore().userId,
            },
          }),
        );
        this.defaultArrow = unpack(
          internals.symmetricKeyring.decrypt(encryptedDefaultArrow, {
            padding: true,
            associatedData: {
              context: 'UserDefaultArrow',
              userId: authStore().userId,
            },
          }),
        );

        this.react.isNewUser = !!isNewUser;

        if (isNewUser) {
          internals.realtime.hset('user', authStore().userId, 'new', false);
        }
      })(),
    );

    await Promise.all(promises);
  }

  async setupPage(pageId: string) {
    this.react.page?.deactivate();

    let page;

    if (this.pageCache.has(pageId)) {
      page = this.pageCache.get(pageId)!;
    } else {
      page = this.factories.Page({ app: this, id: pageId });

      this.pageCache.add(page);
    }

    this.react.page = page;

    pagesStore().loading = false;

    const parentPageId = this.parentPageId;
    this.parentPageId = undefined;

    // Activate page

    page.activate(parentPageId);

    // Update current path

    await this.updateCurrentPath(pageId, parentPageId);

    await nextTick();

    document
      .querySelector(`.current-path[data-page-id="${pageId}"]`)
      ?.scrollIntoView();
  }

  async updateCurrentPath(pageId: string, parentPageId?: string) {
    if (this.react.pathPageIds.find((pathPageId) => pathPageId === pageId)) {
      // New page exists in path
      // Do nothing

      return;
    }

    const parentPageIndex = this.react.pathPageIds.findIndex(
      (pagePageId) => pagePageId === parentPageId,
    );

    if (parentPageIndex >= 0) {
      // Parent page exists in path
      // Insert new page in front of parent page

      this.react.pathPageIds.splice(parentPageIndex + 1);
      this.react.pathPageIds.push(pageId);

      return;
    }

    // Parent page does not exist in path
    // Try to load current path

    if (authStore().loggedIn) {
      try {
        this.react.pathPageIds =
          await trpcClient.users.pages.getCurrentPath.query({
            initialPageId: pageId,
          });

        return;
      } catch (error) {
        mainLogger.error(error);
      }
    }

    // Couldn't load current path
    // Set new page as root page

    if (authStore().loggedIn) {
      this.react.pathPageIds = [
        await internals.realtime.hget(
          'group',
          internals.personalGroupId,
          'main-page-id',
        ),
        pageId,
      ];
    } else {
      this.react.pathPageIds = [pageId];
    }
  }

  async goToPage(
    pageId: string,
    params?: { fromParent?: boolean; openInNewTab?: boolean; elemId?: string },
  ) {
    mainLogger.sub('Pages.goToPage').info('pageId: %s', pageId);

    // Open in a new tab

    if (params?.openInNewTab) {
      window.open(
        multiModePath(
          `/pages/${pageId}${params?.elemId ? `?elem=${params?.elemId}` : ''}`,
        ),
        '_blank',
      );
      return;
    }

    if (params?.fromParent && this.react.pageId !== pageId) {
      this.parentPageId = this.react.pageId;
    }

    this.react.page.editing.stop();

    await router().push({
      name: 'page',
      params: { pageId },
      query: { elem: params?.elemId },
    });

    const cachedPage = this.pageCache.get(pageId);

    if (
      cachedPage != null &&
      cachedPage.react.status === 'success' &&
      !cachedPage.react.loading &&
      isNanoID(params?.elemId ?? '')
    ) {
      const elem =
        cachedPage.notes.fromId(params?.elemId!) ??
        cachedPage.arrows.fromId(params?.elemId!);

      if (elem != null) {
        cachedPage.selection.set(elem);

        const elemElem =
          elem.type === 'note'
            ? elem.getElem('note-frame')
            : elem.getHitboxElem();

        if (elemElem != null) {
          scrollIntoView(elemElem, { centerCamera: true });
        }
      }
    }
  }
  async goToGroup(
    groupId: string,
    params?: { fromParent?: boolean; openInNewTab?: boolean },
  ) {
    mainLogger.sub('Pages.goToGroup').info('groupId: %s', groupId);

    if (params?.openInNewTab) {
      window.open(multiModePath(`/groups/${groupId}`), '_blank');
    } else {
      if (params?.fromParent) {
        this.parentPageId = this.react.pageId;
      }

      await router().push({ name: 'group', params: { groupId } });
    }
  }

  async goBackward() {
    const pageIndex = this.react.pathPageIds.indexOf(this.react.pageId!);

    if (pageIndex > 0) {
      await this.goToPage(
        this.react.pathPageIds[
          this.react.pathPageIds.indexOf(this.react.pageId!) - 1
        ],
      );
    }
  }

  async goForward() {
    const pageIndex = this.react.pathPageIds.indexOf(this.react.pageId!);

    if (pageIndex < this.react.pathPageIds.length - 1) {
      await this.goToPage(
        this.react.pathPageIds[
          this.react.pathPageIds.indexOf(this.react.pageId!) + 1
        ],
      );
    }
  }

  destroy() {
    for (const page of this.pageCache.react.cache) {
      page.destroy();
    }
  }
}
