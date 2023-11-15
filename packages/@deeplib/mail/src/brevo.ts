import * as Brevo from '@getbrevo/brevo';
import { iif } from '@stdlib/misc';
import { once } from 'lodash';

import type { MailOptions } from '.';

const _getBrevo = once(() => {
  Brevo.ApiClient.instance.authentications['api-key'].apiKey =
    process.env.BREVO_API_KEY;

  return new Brevo.TransactionalEmailsApi();
});

export async function sendBrevoMail({ from, to, subject, html }: MailOptions) {
  await _getBrevo().sendTransacEmail({
    sender: {
      name: from.name,
      email: from.email,
    },

    to: to.map((email) => ({ email })),

    subject: iif(process.env.DEV, '[Brevo] ', '') + subject,

    htmlContent: html,
  });
}
