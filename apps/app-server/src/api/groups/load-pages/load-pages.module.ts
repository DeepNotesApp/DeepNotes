import { Module } from '@stdlib/nestjs';

import { LoadPagesController } from './load-pages.controller';

@Module({
  controllers: [LoadPagesController],
  providers: [],
})
export class LoadPagesModule {}
