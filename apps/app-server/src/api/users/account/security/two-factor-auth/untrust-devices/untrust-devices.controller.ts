import { DeviceModel } from '@deeplib/db';
import { Controller, Post } from '@nestjs/common';
import { Locals } from 'src/utils';

@Controller()
export class UntrustDevicesController {
  @Post()
  async handle(@Locals('userId') userId: string) {
    await DeviceModel.query().where('user_id', userId).patch({
      trusted: false,
    });
  }
}
