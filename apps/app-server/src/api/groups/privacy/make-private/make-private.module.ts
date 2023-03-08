import { Module } from '@stdlib/nestjs';

import { MakePrivateController } from './make-private.controller';
import { MakePrivateService } from './make-private.service';

@Module({
  controllers: [MakePrivateController],
  providers: [MakePrivateService],
})
export class MakePrivateModule {}
