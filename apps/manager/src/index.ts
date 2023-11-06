import './env';

import readline from 'readline';

import { dataAbstraction } from './data/data-abstraction';
import { initKnex } from './data/knex';

initKnex();

const readlineInterface = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function showHelp() {
  console.log('Commands:');
  console.log('- hget <prefix> <suffix> <field>');
  console.log('- hset <prefix> <suffix> <field> <value>');
}

async function handleCommand(command: string) {
  const [commandName, ...args] = command.split(' ');

  switch (commandName) {
    case 'help':
      showHelp();
      break;
    case 'hget':
      console.log(
        await dataAbstraction().hget(args[0] as any, args[1], args[2]),
      );
      break;
    case 'hset':
      await dataAbstraction().hmset(args[0] as any, args[1], {
        [args[2]]: args[3],
      });
      break;
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
