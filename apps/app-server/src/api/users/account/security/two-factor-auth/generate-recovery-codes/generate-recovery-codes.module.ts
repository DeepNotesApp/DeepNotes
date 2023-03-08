import { Module } from '@stdlib/nestjs';

import { GenerateRecoveryCodesController } from './generate-recovery-codes.controller';

@Module({
  controllers: [GenerateRecoveryCodesController],
  providers: [],
})
export class GenerateRecoveryCodesModule {}
