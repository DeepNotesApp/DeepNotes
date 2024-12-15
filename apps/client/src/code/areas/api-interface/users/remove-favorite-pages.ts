import { pluralS } from '@stdlib/misc';
import { handleError } from 'src/code/utils/misc';

export async function removeFavoritePages(pageIds: string[]) {
  try {
    await trpcClient.users.pages.removeFavoritePages.mutate({
      pageIds: pageIds,
    });

    $quasar().notify({
      message: `Page${pluralS(pageIds.length)} removed from favorites.`,
      color: 'negative',
    });
  } catch (error) {
    handleError(error);
  }
}
