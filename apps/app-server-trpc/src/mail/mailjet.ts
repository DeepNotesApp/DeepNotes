import { iif } from '@stdlib/misc';
import { once } from 'lodash';
import type { SendEmailV3_1 } from 'node-mailjet';
import Mailjet from 'node-mailjet';

import type { MailOptions } from '.';

const _getMailjet = once(
  () =>
    new Mailjet({
      apiKey: process.env.MAILJET_API_KEY,
      apiSecret: process.env.MAILJET_API_SECRET,
    }),
);

export async function sendMailjetMail({
  from,
  to,
  subject,
  html,
}: MailOptions) {
  const data: SendEmailV3_1.IBody = {
    Messages: [
      {
        From: {
          Name: from.name,
          Email: from.email,
        },

        To: to.map((email) => ({
          Email: email,
        })),

        Subject: iif(process.env.DEV, '[Mailjet] ', '') + subject,

        HTMLPart: html,
      },
    ],
  };

  await _getMailjet()
    .post('send', { version: 'v3.1' })
    .request(data as any);
}
