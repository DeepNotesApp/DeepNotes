import { pull } from 'lodash';
import { handleError } from 'src/code/utils/misc';

export async function removeRecentPages(pageIds: string[]) {
  try {
    await trpcClient.users.pages.removeRecentPages.mutate({
      pageIds: pageIds,
    });

    internals.pages.recentPageIdsKeepOverride = true;
    internals.pages.react.recentPageIdsOverride =
      internals.pages.react.recentPageIds
        .filter((pageId) =>
          internals.realtime.globalCtx.hget('page', pageId, 'exists'),
        )
        .slice();
    pull(internals.pages.react.recentPageIdsOverride, ...pageIds);
  } catch (error) {
    handleError(error);
  }
}
