import { iif } from '@stdlib/misc';
import { once } from 'lodash';
import * as SibApiV3Sdk from 'sib-api-v3-typescript';

import type { MailOptions } from '.';

const _apiInstance = once(() => {
  const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

  apiInstance.setApiKey(
    SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey,
    process.env.SENDINBLUE_API_KEY,
  );

  return apiInstance;
});

export async function sendSendinblueMail({
  from,
  to,
  subject,
  html,
}: MailOptions) {
  const mail = new SibApiV3Sdk.SendSmtpEmail();

  mail.sender = from;
  mail.to = to.map((email) => ({ email }));
  mail.subject = iif(process.env.DEV, '[Sendinblue] ', '') + subject;
  mail.htmlContent = html;

  await _apiInstance().sendTransacEmail(mail);
}
