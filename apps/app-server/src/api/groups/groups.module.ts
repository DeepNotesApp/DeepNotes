import { Module } from 'src/nest-plus';

import { ChangeUserRoleModule } from './change-user-role/change-user-role.module';
import { DeletionModule } from './deletion/deletion.module';
import { JoinInvitationsModule } from './join-invitations/join-invitations.module';
import { JoinRequestsModule } from './join-requests/join-requests.module';
import { LoadSettingsModule } from './load-settings/load-settings.module';
import { MainPageIdModule } from './main-page-id/main-page-id.module';
import { PasswordModule } from './password/password.module';
import { PrivacyModule } from './privacy/privacy.module';
import { RemoveUserModule } from './remove-user/remove-user.module';
import { RotateKeysModule } from './rotate-keys/rotate-keys.module';

@Module({
  imports: [
    { prefix: ':groupId/load-settings', module: LoadSettingsModule },
    { prefix: ':groupId/change-user-role', module: ChangeUserRoleModule },
    { prefix: ':groupId/remove-user', module: RemoveUserModule },
    { prefix: ':groupId/join-invitations', module: JoinInvitationsModule },
    { prefix: ':groupId/join-requests', module: JoinRequestsModule },
    { prefix: ':groupId/password', module: PasswordModule },
    { prefix: ':groupId/deletion', module: DeletionModule },
    { prefix: ':groupId/privacy', module: PrivacyModule },
    { prefix: ':groupId/main-page-id', module: MainPageIdModule },
    { prefix: ':groupId/rotate-keys', module: RotateKeysModule },
  ],
})
export class GroupsModule {}
