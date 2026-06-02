import type { RouteRecordRaw } from "vue-router";

export const homeRoutes: RouteRecordRaw[] = [
  {
    path: "/",
    name: "home",
    redirect: "/pages",
  },
];
