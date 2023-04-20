import { hashUserEmail } from '@deeplib/data';
import { UserModel } from '@deeplib/db';
import { Injectable } from '@nestjs/common';
import { mainLogger } from '@stdlib/misc';
import { createUser } from 'src/deep-utils';
import { sendMail } from 'src/mail';

import type { EndpointValues } from './register.controller';

@Injectable()
export class RegisterService {
  async getUser({ email }: EndpointValues) {
    return await UserModel.query()
      .where('email_hash', Buffer.from(hashUserEmail(email)))
      .where((builder) =>
        builder
          .where('email_verified', true)
          .orWhere('email_verification_expiration_date', '>', new Date()),
      )
      .select('email_verified')
      .first();
  }

  async registerUser(values: EndpointValues) {
    return await createUser(values);
  }

  async sendEmail({ email, user }: EndpointValues) {
    try {
      await sendMail({
        from: {
          name: 'DeepNotes',
          email: 'account@deepnotes.app',
        },
        to: [email],
        subject: 'Complete your registration',
        html: `
          Visit the following link to verify your email address:<br/>
          <a href="https://deepnotes.app/verify-email/${
            user!.email_verification_code
          }">https://deepnotes.app/verify-email/${
          user!.email_verification_code
        }</a><br/>
          The link above will expire in 1 hour.
        `,
      });
    } catch (error) {
      mainLogger.error('Email sending error: %o', error);
    }
  }
}
