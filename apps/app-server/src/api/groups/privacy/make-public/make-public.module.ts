import { Module } from 'src/nest-plus';

import { MakePublicController } from './make-public.controller';
import { MakePublicService } from './make-public.service';

@Module({
  controllers: [MakePublicController],
  providers: [MakePublicService],
})
export class MakePublicModule {}
