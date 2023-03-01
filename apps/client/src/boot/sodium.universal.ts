import sodium from 'libsodium-wrappers';
import { boot } from 'quasar/wrappers';

export default boot(async () => {
  await sodium.ready;
});
