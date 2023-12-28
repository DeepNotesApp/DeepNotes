import { pluralS } from '@stdlib/misc';
import { handleError } from 'src/code/utils/misc';

export async function addFavoritePages(pageIds: string[]) {
  try {
    await trpcClient.users.pages.addFavoritePages.mutate({
      pageIds: pageIds,
    });

    $quasar().notify({
      message: `Page${pluralS(pageIds.length)} added to favorites.`,
      color: 'positive',
    });
  } catch (error) {
    handleError(error);
  }
}
