import { UserModel } from '@deeplib/db';
import { Injectable } from '@nestjs/common';
import { ref } from 'objection';

@Injectable()
export class VerifyEmailService {
  async tryVerifyEmail(emailVerificationCode: string) {
    return (
      (await UserModel.query()
        .whereNot('email_verified', true)
        .where('email_verification_code', emailVerificationCode)
        .where('email_verification_expiration_date', '>', new Date())
        .patch({
          encrypted_email: ref('encrypted_new_email'),
          encrypted_new_email: null,
          email_verified: true,
          email_verification_code: null,
          email_verification_expiration_date: null,
        })) === 1
    );
  }
}
