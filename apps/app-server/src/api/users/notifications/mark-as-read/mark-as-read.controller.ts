import { UserNotificationModel } from '@deeplib/db';
import { Controller, Post } from '@nestjs/common';
import { checkRedlockSignalAborted } from '@stdlib/redlock';
import { dataAbstraction } from 'src/data/data-abstraction';
import { usingLocks } from 'src/data/redlock';
import { Locals } from 'src/utils';

@Controller()
export class MarkAsReadController {
  @Post()
  async handle(@Locals('userId') agentId: string) {
    return await usingLocks([[`user-lock:${agentId}`]], async (signals) => {
      const lastNotificationId = parseInt(
        (
          await UserNotificationModel.query()
            .where('user_id', agentId)
            .select('notification_id')
            .orderBy('notification_id', 'DESC')
            .first()
        )?.notification_id as any,
      );

      checkRedlockSignalAborted(signals);

      await dataAbstraction().patch('user', agentId, {
        last_notification_read: lastNotificationId,
      });
    });
  }
}
