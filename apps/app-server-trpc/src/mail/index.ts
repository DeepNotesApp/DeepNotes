import { mainLogger } from 'src/logger';

import { sendMailjetMail } from './mailjet';
import { sendSendGridMail } from './send-grid';
import { sendSendinblueMail } from './sendinblue';
import { sendZohoMail } from './zoho';

export interface MailOptions {
  from: { name: string; email: string };
  to: string[];
  subject: string;
  html: string;
}

export type MailSendFunc = (opts: MailOptions) => Promise<void>;

const _sendMailFuncs: [string, MailSendFunc][] = [
  ['SendGrid', sendSendGridMail],
  ['Sendinblue', sendSendinblueMail],
  ['Mailjet', sendMailjetMail],
  ['Zoho', sendZohoMail],
];

export async function sendMail(opts: MailOptions) {
  const funcLogger = mainLogger.sub('sendMail');

  for (const [serviceName, sendFunc] of _sendMailFuncs) {
    try {
      await sendFunc(opts);

      funcLogger.info(`Mail sent via ${serviceName}.`);

      break;
    } catch (error) {
      //
    }
  }

  throw new Error('Failed to send mail.');
}
