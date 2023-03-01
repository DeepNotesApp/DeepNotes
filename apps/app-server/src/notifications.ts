import { NotificationModel, UserNotificationModel } from '@deeplib/db';
import type {
  DeepNotesNotification,
  DeepNotesNotificationType,
} from '@deeplib/misc';
import { bytesToBase64, isBase64 } from '@stdlib/base64';
import { objEntries } from '@stdlib/misc';
import { pack } from 'msgpackr';
import { z } from 'nestjs-zod/z';
import { getRedis } from 'src/data/redis';

import { dataAbstraction } from './data/data-abstraction';

export const notificationsResponseSchema = z.object({
  notificationRecipients: z.record(
    z.object({
      publicKeyring: z.string().refine(isBase64),
    }),
  ),
});
export type NotificationsResponse = z.infer<typeof notificationsResponseSchema>;

export const notificationRequestSchema = z.object({
  recipients: z.record(
    z.object({ encryptedSymmetricKey: z.string().refine(isBase64) }),
  ),

  encryptedContent: z.string().refine(isBase64),
});
export const notificationsRequestSchema = z.object({
  notifications: notificationRequestSchema.array(),
});
export type NotificationsRequest = z.infer<typeof notificationsRequestSchema>;

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

        const encryptedContentBase64 = bytesToBase64(encryptedContent);

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

                  encryptedSymmetricKey: bytesToBase64(encryptedSymmetricKey),
                  encryptedContent: encryptedContentBase64,

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

export async function loadNotifications(
  userId: string,
  lastNotificationId?: number,
) {
  let notificationsQuery = UserNotificationModel.query()
    .innerJoin(
      'notifications',
      'notifications.id',
      'users_notifications.notification_id',
    )
    .where('users_notifications.user_id', userId);

  if (lastNotificationId != null) {
    notificationsQuery = notificationsQuery.where(
      'users_notifications.notification_id',
      '<',
      lastNotificationId,
    );
  }

  notificationsQuery = notificationsQuery
    .select(
      'notifications.id',

      'notifications.type',

      'users_notifications.encrypted_symmetric_key',
      'notifications.encrypted_content',

      'notifications.datetime',
    )
    .orderBy('users_notifications.notification_id', 'DESC')
    .limit(11);

  const notifications = (await notificationsQuery) as (UserNotificationModel &
    NotificationModel)[];

  const hasMore = notifications.length > 10;

  if (hasMore) {
    notifications.pop();
  }

  return {
    items: notifications.map((notification) => ({
      id: parseInt(notification.id as any),

      type: notification.type,

      encryptedSymmetricKey: bytesToBase64(
        notification.encrypted_symmetric_key,
      ),
      encryptedContent: bytesToBase64(notification.encrypted_content),

      dateTime: notification.datetime,
    })),

    hasMore,
  };
}
