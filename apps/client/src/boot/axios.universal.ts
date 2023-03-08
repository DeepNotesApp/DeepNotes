import 'pinia';

import axios from 'axios';
import { once } from 'lodash';

export const api = once(() =>
  axios.create({
    withCredentials: true,
    baseURL: process.env.APP_SERVER_URL,
  }),
);

// Be careful when using SSR for cross-request state pollution
// due to creating a Singleton instance here;
// If any client changes this (global) instance, it might be a
// good idea to move this instance creation inside of the
// "export default () => {}" function below (which runs individually
// for each client)
