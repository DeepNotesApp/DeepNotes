import './env';

import { initKnex } from './data/knex';
import { httpServer } from './http-server';
import { mainLogger } from './logger';

initKnex();

httpServer().listen(parseInt(process.env.COLLAB_SERVER_PORT), () => {
  mainLogger()
    .sub('index.ts')
    .info(`Server started on port ${process.env.COLLAB_SERVER_PORT}`);
});
