import {
  GroupJoinInvitationModel,
  GroupJoinRequestModel,
  GroupMemberModel,
} from '@deeplib/db';
import { Controller, Param, Post } from '@nestjs/common';

@Controller()
export class LoadSettingsController {
  @Post()
  async handle(@Param('groupId') groupId: string) {
    const groupMembers = await GroupMemberModel.query()
      .where('group_id', groupId)
      .select('user_id')
      .union(
        GroupJoinRequestModel.query()
          .where('group_id', groupId)
          .select('user_id'),
      )
      .union(
        GroupJoinInvitationModel.query()
          .where('group_id', groupId)
          .select('user_id'),
      );

    return {
      groupMemberIds: groupMembers.map((groupMember) => groupMember.user_id),
    };
  }
}
