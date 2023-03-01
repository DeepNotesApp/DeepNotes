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

export async function sendMail(opts: MailOptions) {
  const funcLogger = mainLogger().sub('sendMail');

  try {
    try {
      try {
        await sendSendGridMail(opts);

        funcLogger.info('Mail sent via SendGrid');
      } catch (error) {
        await sendSendinblueMail(opts);

        funcLogger.info('Mail sent via Sendinblue');
      }
    } catch (error) {
      await sendMailjetMail(opts);

      funcLogger.info('Mail sent via Mailjet');
    }
  } catch (error) {
    await sendZohoMail(opts);

    funcLogger.info('Mail sent via Zoho');
  }
}
