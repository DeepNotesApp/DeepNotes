import type { RouteRecordRaw } from "vue-router";

export const accountRoutes: RouteRecordRaw[] = [
  {
    path: "/account",
    name: "account",
    component: () => import("./AccountView.vue"),
  },
];
