import { Controller, Post } from '@nestjs/common';
import { dataAbstraction } from 'src/data/data-abstraction';
import { loadNotifications } from 'src/notifications';
import { Locals } from 'src/utils';

@Controller()
export class DataController {
  @Post()
  async handle(@Locals('userId') userId: string) {
    const [lastNotificationRead, notifications] = await Promise.all([
      dataAbstraction().hget('user', userId, 'last-notification-read'),

      loadNotifications(userId),
    ]);

    return {
      notifications: {
        ...notifications,

        lastNotificationRead,
      },
    };
  }
}
