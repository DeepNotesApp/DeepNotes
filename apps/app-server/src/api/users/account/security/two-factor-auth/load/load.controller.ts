import { decryptUserEmail } from '@deeplib/data';
import { UserModel } from '@deeplib/db';
import { Controller, HttpException, HttpStatus, Post } from '@nestjs/common';
import { authenticator } from 'otplib';
import { decryptUserAuthenticatorSecret, Locals } from 'src/utils';

@Controller()
export class LoadController {
  @Post()
  async handle(@Locals('userId') userId: string) {
    const user = (await UserModel.query().findById(userId).select(
      'two_factor_auth_enabled',
      'encrypted_authenticator_secret',

      'encrypted_email',
    ))!;

    if (
      !user.two_factor_auth_enabled ||
      user.encrypted_authenticator_secret == null
    ) {
      throw new HttpException(
        'Two-factor authentication is not enabled.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const authenticatorSecret = decryptUserAuthenticatorSecret(
      user.encrypted_authenticator_secret,
    );

    return {
      secret: authenticatorSecret,
      keyUri: authenticator.keyuri(
        decryptUserEmail(user.encrypted_email),
        'DeepNotes',
        authenticatorSecret,
      ),
    };
  }
}
