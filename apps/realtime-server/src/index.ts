import './env';

import { mainLogger } from '@stdlib/misc';
import { httpServer } from 'src/http-server';

import { initKnex } from './data/knex';

const moduleLogger = mainLogger.sub('index.ts');

initKnex();

httpServer().listen(parseInt(process.env.REALTIME_SERVER_PORT), () => {
  moduleLogger.info(
    `realtime-server started on port ${process.env.REALTIME_SERVER_PORT}`,
  );
});
