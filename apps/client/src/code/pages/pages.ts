import type { DeepNotesNotification } from '@deeplib/misc';
import { Vec2 } from '@stdlib/misc';
import { unpack } from 'msgpackr';
import type { ComputedRef, ShallowRef, UnwrapNestedRefs } from 'vue';

import type { Factories } from '../factories';
import { authStore } from '../stores';
import { multiModePath } from '../utils';
import type { Page } from './page/page';
import type { PageCache } from './page-cache';
import type { ISerialArrowInput, ISerialObjectInput } from './serialization';
import type { Serialization } from './serialization';

export interface IAppReact {
  pathPageIds: string[];
  recentPageIds: string[];

  page: ShallowRef<Page>;
  pageId: ComputedRef<string | undefined>;

  tableContextMenu: boolean;
  tableContextMenuPos: Vec2;

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

  constructor({ factories }: { factories: Factories }) {
    this.factories = factories;

    this.serialization = factories.Serialization({ app: this });
    this.pageCache = factories.PageCache({ app: this });

    this.react = reactive({
      pathPageIds: [],
      recentPageIds: [],

      page: shallowRef(null) as any,
      pageId: computed(() => this.react.page?.id),

      tableContextMenu: false,
      tableContextMenuPos: new Vec2(),
    });
  }

  async loadUserData() {
    if (!authStore().loggedIn) {
      return;
    }

    const promises: PromiseLike<any>[] = [];

    promises.push(
      (async () => {
        const userData = (
          await api().post<{
            notifications: {
              items: DeepNotesNotification[];
              hasMore: boolean;
              lastNotificationRead: number | undefined;
            };
          }>('/api/users/data')
        ).data;

        pagesStore().notifications = userData.notifications;
      })(),
    );

    promises.push(
      (async () => {
        const [encryptedDefaultNote, encryptedDefaultArrow, recentPageIdsJSON] =
          await internals.realtime.hmget('user', authStore().userId, [
            'encrypted-default-note',
            'encrypted-default-arrow',
            'recent-page-ids',
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

        this.react.recentPageIds = recentPageIdsJSON ?? [];
      })(),
    );

    await Promise.all(promises);
  }

  async setupPage(pageId: string) {
    internals.pages.react.page?.deactivate();

    let page;

    if (this.pageCache.has(pageId)) {
      page = this.pageCache.get(pageId)!;
    } else {
      page = this.factories.Page({ app: this, id: pageId });

      this.pageCache.add(page);
    }

    internals.pages.react.page = page;

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
        this.react.pathPageIds = (
          await api().post<{
            pathPageIds: string[];
          }>('/api/users/current-path', {
            initialPageId: pageId,
          })
        ).data.pathPageIds;

        return;
      } catch (error) {
        mainLogger().error(error);
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
    params?: { fromParent?: boolean; openInNewTab?: boolean },
  ) {
    mainLogger().sub('Pages.goToPage').info('pageId: %s', pageId);

    if (params?.openInNewTab) {
      window.open(multiModePath(`/pages/${pageId}`), '_blank');
    } else {
      if (params?.fromParent) {
        this.parentPageId = this.react.pageId;
      }

      await router().push({ name: 'page', params: { pageId } });
    }
  }
  async goToGroup(
    groupId: string,
    params?: { fromParent?: boolean; openInNewTab?: boolean },
  ) {
    mainLogger().sub('Pages.goToGroup').info('groupId: %s', groupId);

    if (params?.openInNewTab) {
      window.open(multiModePath(`/groups/${groupId}`), '_blank');
    } else {
      if (params?.fromParent) {
        this.parentPageId = this.react.pageId;
      }

      await router().push({ name: 'group', params: { groupId } });
    }
  }

  destroy() {
    for (const page of this.pageCache.react.cache) {
      page.destroy();
    }
  }
}
