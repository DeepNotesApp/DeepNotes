import './env';

import {
  sendBrevoMail,
  sendMailjetMail,
  sendSendGridMail,
} from '@deeplib/mail';
import { mainLogger } from '@stdlib/misc';
import readline from 'readline';

import { dataAbstraction } from './data/data-abstraction';
import { initKnex } from './data/knex';

initKnex();

const readlineInterface = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function showHelp() {
  console.log('Available commands:');
  console.log('- hget <prefix> <suffix> <field>');
  console.log('- hset <prefix> <suffix> <field> <value>');
  console.log('- send-sendgrid-test-mail <from> <to>');
  console.log('- send-brevo-test-mail <from> <to>');
  console.log('- send-mailjet-test-mail <from> <to>');
  console.log('Enter your commands:');
}

async function handleCommand(command: string) {
  const [commandName, ...args] = command.split(' ');

  try {
    switch (commandName) {
      case 'help':
        showHelp();
        break;
      case 'hget':
        mainLogger.info(
          `Result: ${await dataAbstraction().hget(
            args[0] as any,
            args[1],
            args[2],
          )}`,
        );
        break;
      case 'hset':
        await dataAbstraction().hmset(args[0] as any, args[1], {
          [args[2]]: args[3],
        });
        break;

      case 'send-sendgrid-test-mail':
        await sendSendGridMail({
          from: { name: 'DeepNotes', email: args[0] },
          to: [args[1]],

          subject: 'SendGrid test mail',
          html: 'SendGrid test mail',
        });
        break;
      case 'send-brevo-test-mail':
        await sendBrevoMail({
          from: { name: 'DeepNotes', email: args[0] },
          to: [args[1]],

          subject: 'Brevo test mail',
          html: 'Brevo test mail',
        });
        break;
      case 'send-mailjet-test-mail':
        await sendMailjetMail({
          from: { name: 'DeepNotes', email: args[0] },
          to: [args[1]],

          subject: 'Mailjet test mail',
          html: 'Mailjet test mail',
        });
        break;
      default:
        mainLogger.error('Command unknown.');
        return;
    }

    mainLogger.info('Command executed successfully.');
  } catch (error) {
    mainLogger.error('Command failed with error: %o', error);
  }
}

function requestCommand() {
  readlineInterface.question('', async (command) => {
    if (command === 'exit') {
      readlineInterface.close();
      return;
    }

    await handleCommand(command);

    requestCommand();
  });
}

showHelp();

requestCommand();
