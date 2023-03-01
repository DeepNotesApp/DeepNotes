import { Module } from 'src/nest-plus';

import { MakePrivateController } from './make-private.controller';
import { MakePrivateService } from './make-private.service';

@Module({
  controllers: [MakePrivateController],
  providers: [MakePrivateService],
})
export class MakePrivateModule {}
