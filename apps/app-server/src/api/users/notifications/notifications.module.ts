import { Module } from '@stdlib/nestjs';

import { LoadModule } from './load/load.module';
import { MarkAsReadModule } from './mark-as-read/mark-as-read.module';

@Module({
  imports: [
    { prefix: 'load', module: LoadModule },
    { prefix: 'mark-as-read', module: MarkAsReadModule },
  ],
})
export class NotificationsModule {}
