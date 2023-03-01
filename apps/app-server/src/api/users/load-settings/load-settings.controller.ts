import { GroupMemberModel } from '@deeplib/db';
import { Controller, Post } from '@nestjs/common';
import { Locals } from 'src/utils';

@Controller()
export class LoadSettingsController {
  @Post()
  async handle(@Locals('userId') userId: string) {
    const groupMembers = await GroupMemberModel.query()
      .where('user_id', userId)
      .select('group_id')
      .orderBy('last_activity_date', 'DESC');

    return {
      groupIds: groupMembers.map((groupMember) => groupMember.group_id),
    };
  }
}
