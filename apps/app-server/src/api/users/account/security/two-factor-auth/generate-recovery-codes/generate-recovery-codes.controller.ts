import { Controller, Post } from '@nestjs/common';
import type { DataTransaction } from '@stdlib/data';
import sodium from 'libsodium-wrappers';
import { dataAbstraction } from 'src/data/data-abstraction';
import { encryptRecoveryCodes, hashRecoveryCode, Locals } from 'src/utils';

@Controller()
export class GenerateRecoveryCodesController {
  @Post()
  async handle(@Locals('userId') userId: string) {
    return {
      recoveryCodes: await generateRecoveryCodes(userId),
    };
  }
}

export async function generateRecoveryCodes(
  userId: string,
  params?: { dtrx?: DataTransaction },
) {
  const recoveryCodes = Array(6)
    .fill(null)
    .map(() => sodium.to_hex(sodium.randombytes_buf(16)));

  await dataAbstraction().patch(
    'user',
    userId,
    {
      encrypted_recovery_codes: encryptRecoveryCodes(
        recoveryCodes.map((recoveryCode) => hashRecoveryCode(recoveryCode)),
      ),
    },
    { dtrx: params?.dtrx },
  );

  return recoveryCodes;
}
