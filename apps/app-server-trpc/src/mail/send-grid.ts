import SendGridMail from '@sendgrid/mail';
import { iif } from '@stdlib/misc';
import { once } from 'lodash';

import type { MailOptions } from '.';

const _getSendGridMail = once(() => {
  SendGridMail.setApiKey(process.env.SENDGRID_API_KEY);

  return SendGridMail;
});

export async function sendSendGridMail({
  from,
  to,
  subject,
  html,
}: MailOptions) {
  await _getSendGridMail().send({
    from,
    to,
    subject: iif(process.env.DEV, '[SendGrid] ', '') + subject,
    html,
  });
}
