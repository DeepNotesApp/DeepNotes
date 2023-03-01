import { Body, Controller, Post } from '@nestjs/common';
import { createZodDto } from 'nestjs-zod';
import { z } from 'nestjs-zod/z';
import { loadNotifications } from 'src/notifications';
import { Locals } from 'src/utils';

class BodyDto extends createZodDto(
  z.object({
    lastNotificationId: z.number().optional(),
  }),
) {}

@Controller()
export class LoadController {
  @Post()
  async handle(
    @Locals('userId') userId: string,
    @Body() { lastNotificationId }: BodyDto,
  ) {
    return {
      notifications: await loadNotifications(userId, lastNotificationId),
    };
  }
}
