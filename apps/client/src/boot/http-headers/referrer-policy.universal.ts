import { boot } from 'quasar/wrappers';

export default boot(async ({ ssrContext }) => {
  ssrContext?.res.setHeader('Referrer-Policy', 'no-referrer');
});
