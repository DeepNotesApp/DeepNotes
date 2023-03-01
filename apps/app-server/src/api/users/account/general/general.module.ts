import { Module } from 'src/nest-plus';

import { ChangeEmailModule } from './change-email/change-email.module';

@Module({
  imports: [{ prefix: 'change-email', module: ChangeEmailModule }],
})
export class GeneralModule {}
