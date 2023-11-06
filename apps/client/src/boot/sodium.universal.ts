import sodium from 'libsodium-wrappers-sumo';
import { boot } from 'quasar/wrappers';

export default boot(async () => {
  await sodium.ready;
});
