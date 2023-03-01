import { Module } from 'src/nest-plus';

import { AccountModule } from './account/account.module';
import { CurrentPathModule } from './current-path/current-path.module';
import { DataModule } from './data/data.module';
import { LoadSettingsModule } from './load-settings/load-settings.module';
import { NotificationsModule } from './notifications/notifications.module';
import { RemoveRecentPageModule } from './remove-recent-page/remove-recent-page.module';
import { SetEncryptedDefaultArrowModule } from './set-encrypted-default-arrow/set-encrypted-default-arrow.module';
import { SetEncryptedDefaultNoteModule } from './set-encrypted-default-note/set-encrypted-default-note.module';
import { StartingPageIdModule } from './starting-page-id/starting-page-id.module';

@Module({
  imports: [
    { prefix: 'account', module: AccountModule },
    { prefix: 'current-path', module: CurrentPathModule },
    { prefix: 'data', module: DataModule },
    { prefix: 'load-settings', module: LoadSettingsModule },
    { prefix: 'notifications', module: NotificationsModule },
    { prefix: 'remove-recent-page', module: RemoveRecentPageModule },
    {
      prefix: 'set-encrypted-default-arrow',
      module: SetEncryptedDefaultArrowModule,
    },
    {
      prefix: 'set-encrypted-default-note',
      module: SetEncryptedDefaultNoteModule,
    },
    { prefix: 'starting-page-id', module: StartingPageIdModule },
  ],
})
export class UsersModule {}
