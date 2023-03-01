import { Module } from 'src/nest-plus';

import { MarkAsReadController } from './mark-as-read.controller';

@Module({
  controllers: [MarkAsReadController],
  providers: [],
})
export class MarkAsReadModule {}
