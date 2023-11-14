import { boot } from 'quasar/wrappers';

export default boot(async ({ ssrContext }) => {
  ssrContext?.res.setHeader('X-Frame-Options', 'DENY');
});
