import type { NotificationModel } from '@deeplib/db';
import { UserNotificationModel } from '@deeplib/db';
import type { DeepNotesNotificationType } from '@deeplib/misc';
import { once } from 'lodash';
import type { InferProcedureOpts } from 'src/trpc/helpers';
import { authProcedure } from 'src/trpc/helpers';
import { z } from 'zod';

const baseProcedure = authProcedure.input(
  z
    .object({
      lastNotificationId: z.number().optional(),
    })
    .optional(),
);

export const getNotificationsProcedure = once(() =>
  baseProcedure.query(getNotifications),
);

export async function getNotifications({
  ctx,
  input,
}: InferProcedureOpts<typeof baseProcedure>) {
  const [notifications, lastNotificationRead] = await Promise.all([
    _loadNotifications({
      userId: ctx.userId,
      lastNotificationId: input?.lastNotificationId,
    }),

    ...(input?.lastNotificationId == null
      ? [ctx.dataAbstraction.hget('user', ctx.userId, 'last-notification-read')]
      : []),
  ]);

  return {
    ...notifications,

    lastNotificationRead,
  };
}

async function _loadNotifications(input: {
  userId: string;
  lastNotificationId?: number;
}) {
  let notificationsQuery = UserNotificationModel.query()
    .innerJoin(
      'notifications',
      'notifications.id',
      'users_notifications.notification_id',
    )
    .where('users_notifications.user_id', input.userId);

  if (input.lastNotificationId != null) {
    notificationsQuery = notificationsQuery.where(
      'users_notifications.notification_id',
      '<',
      input.lastNotificationId,
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
    .limit(21);

  const notifications = (await notificationsQuery) as (UserNotificationModel &
    NotificationModel)[];

  const hasMore = notifications.length > 20;

  if (hasMore) {
    notifications.pop();
  }

  return {
    items: notifications.map((notification) => ({
      id: parseInt(notification.id as any),

      type: notification.type as DeepNotesNotificationType,

      encryptedSymmetricKey: notification.encrypted_symmetric_key,
      encryptedContent: notification.encrypted_content,

      dateTime: notification.datetime,
    })),

    hasMore,
  };
}
