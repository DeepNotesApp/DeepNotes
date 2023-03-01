import { iif } from '@stdlib/misc';
import { once } from 'lodash';
import { createTransport } from 'nodemailer';
import { htmlToText } from 'nodemailer-html-to-text';

import type { MailOptions } from '.';

const _getZohoMailTransporter = once(() => {
  const mailTransporter = createTransport({
    host: process.env.MAIL_HOST,
    secure: true,
    port: parseInt(process.env.ZOHO_PORT),
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASSWORD,
    },
  });

  mailTransporter.use('compile', htmlToText());

  return mailTransporter;
});

export async function sendZohoMail({ from, to, subject, html }: MailOptions) {
  await _getZohoMailTransporter().sendMail({
    from: {
      name: from.name,
      address: from.email,
    },
    to,
    subject: iif(process.env.DEV, '[Zoho] ', '') + subject,
    html,
  });
}
