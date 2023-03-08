import { Module } from '@stdlib/nestjs';

import { MarkAsReadController } from './mark-as-read.controller';

@Module({
  controllers: [MarkAsReadController],
  providers: [],
})
export class MarkAsReadModule {}
