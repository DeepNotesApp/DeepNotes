import { NotificationModel, UserNotificationModel } from '@deeplib/db';
import type {
  DeepNotesNotification,
  DeepNotesNotificationType,
} from '@deeplib/misc';
import { objEntries } from '@stdlib/misc';
import { pack } from 'msgpackr';
import { dataAbstraction } from 'src/data/data-abstraction';
import { getRedis } from 'src/data/redis';
import { z } from 'zod';

export const notificationRequestSchema = z.object({
  recipients: z.record(
    z.object({ encryptedSymmetricKey: z.instanceof(Uint8Array) }),
  ),

  encryptedContent: z.instanceof(Uint8Array),
});
export const notificationsRequestSchema = z.object({
  notifications: notificationRequestSchema.array(),
});

export const notificationsResponseSchema = z.object({
  notificationRecipients: z.record(
    z.object({
      publicKeyring: z.instanceof(Uint8Array),
    }),
  ),
});
export type NotificationsResponse = z.infer<typeof notificationsResponseSchema>;

export async function notifyUsers(
  notifications: {
    type: DeepNotesNotificationType;

    recipients: Record<string, { encryptedSymmetricKey: Uint8Array }>;

    encryptedContent: Uint8Array;
  }[],
) {
  await dataAbstraction().transaction(async ({ trx }) => {
    const dateTime = new Date();

    await Promise.all(
      notifications.map(async ({ recipients, type, encryptedContent }) => {
        const notificationId = parseInt(
          (
            await NotificationModel.query(trx)
              .insert({
                type,

                encrypted_content: encryptedContent,

                datetime: dateTime,
              })
              .returning('id')
          ).id as any,
        );

        await Promise.all(
          objEntries(recipients).map(
            async ([userId, { encryptedSymmetricKey }]) => {
              await UserNotificationModel.query(trx).insert({
                user_id: userId,
                notification_id: notificationId,

                encrypted_symmetric_key: encryptedSymmetricKey,
              });

              await getRedis().publish(
                `user-notification:${userId}`,
                pack({
                  id: notificationId,

                  type,

                  encryptedSymmetricKey: encryptedSymmetricKey,
                  encryptedContent: encryptedContent,

                  dateTime,
                } as DeepNotesNotification),
              );
            },
          ),
        );
      }),
    );
  });
}
