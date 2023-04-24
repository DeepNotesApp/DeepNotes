import { UserNotificationModel } from '@deeplib/db';
import { checkRedlockSignalAborted } from '@stdlib/redlock';
import { once } from 'lodash';
import type { InferProcedureOpts } from 'src/trpc/helpers';
import { authProcedure } from 'src/trpc/helpers';

const baseProcedure = authProcedure;

export const markAsReadProcedure = once(() =>
  baseProcedure.mutation(markAsRead),
);

export async function markAsRead({
  ctx,
}: InferProcedureOpts<typeof baseProcedure>) {
  return await ctx.usingLocks(
    [[`user-lock:${ctx.userId}`]],
    async (signals) => {
      // Get last notification ID

      const lastNotificationId = parseInt(
        (
          await UserNotificationModel.query()
            .where('user_id', ctx.userId)
            .select('notification_id')
            .orderBy('notification_id', 'DESC')
            .first()
        )?.notification_id as any,
      );

      checkRedlockSignalAborted(signals);

      // Update last notification read

      await ctx.dataAbstraction.patch('user', ctx.userId, {
        last_notification_read: lastNotificationId,
      });
    },
  );
}
