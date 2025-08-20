import { mainLogger } from '@stdlib/misc';

import { sendBrevoMail } from './brevo';
import { sendMailjetMail } from './mailjet';

export { sendBrevoMail } from './brevo';
export { sendMailjetMail } from './mailjet';
export { sendSendGridMail } from './send-grid';

export interface MailOptions {
  from: { name: string; email: string };
  to: string[];
  subject: string;
  html: string;
}

export type MailSendFunc = (opts: MailOptions) => Promise<void>;

const _sendMailFuncs: [string, MailSendFunc][] = [
  ['Brevo', sendBrevoMail],
  ['Mailjet', sendMailjetMail],
];

export async function sendMail(opts: MailOptions) {
  const funcLogger = mainLogger.sub('sendMail');

  const randomizedSendMailFuncs = _sendMailFuncs
    .slice()
    .sort(() => Math.random() - 0.5);

  for (const [serviceName, sendFunc] of randomizedSendMailFuncs) {
    try {
      await sendFunc(opts);

      funcLogger.info(`Mail sent via ${serviceName}.`);

      return;
    } catch (error) {
      //
    }
  }

  throw new Error('Failed to send mail.');
}
