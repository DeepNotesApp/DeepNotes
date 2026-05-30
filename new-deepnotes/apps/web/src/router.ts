import { createRouter, createWebHistory } from "vue-router";

import { accountRoutes } from "./features/account/account-routes";
import { authRoutes } from "./features/auth/auth-routes";
import { groupsRoutes } from "./features/groups/groups-routes";
import { homeRoutes } from "./features/home/home-routes";
import { notificationsRoutes } from "./features/notifications/notifications-routes";
import { pagesRoutes } from "./features/pages/pages-routes";

export function createAppRouter() {
  return createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
      ...homeRoutes,
      ...authRoutes,
      ...groupsRoutes,
      ...notificationsRoutes,
      ...accountRoutes,
      ...pagesRoutes,
    ],
  });
}
