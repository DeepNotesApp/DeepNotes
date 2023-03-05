import { Module } from 'src/nest-plus';

import { RequestModule } from './request/request.module';
import { VerifyModule } from './verify/verify.module';

@Module({
  imports: [
    { prefix: 'request', module: RequestModule },
    { prefix: 'verify', module: VerifyModule },
  ],
})
export class EnableModule {}
