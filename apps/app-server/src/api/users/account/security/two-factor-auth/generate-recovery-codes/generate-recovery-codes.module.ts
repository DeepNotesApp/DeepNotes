import { Module } from 'src/nest-plus';

import { GenerateRecoveryCodesController } from './generate-recovery-codes.controller';

@Module({
  controllers: [GenerateRecoveryCodesController],
  providers: [],
})
export class GenerateRecoveryCodesModule {}
