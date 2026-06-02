import type { RouteRecordRaw } from "vue-router";

export const accountRoutes: RouteRecordRaw[] = [
  {
    path: "/account",
    component: () => import("./AccountLayout.vue"),
    children: [
      {
        path: "",
        redirect: "/account/general",
      },
      {
        path: "general",
        name: "account-general",
        component: () => import("./AccountGeneral.vue"),
      },
      {
        path: "security",
        name: "account-security",
        component: () => import("./AccountSecurity.vue"),
      },
      {
        path: "billing",
        name: "account-billing",
        component: () => import("./AccountBilling.vue"),
      },
    ],
  },
];
