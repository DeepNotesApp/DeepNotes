import type { RouteRecordRaw } from "vue-router";

export const routes: RouteRecordRaw[] = [
  {
    path: "/",
    name: "home",
    component: () => import("@/pages/HomePage.vue"),
  },
  {
    path: "/pricing",
    name: "pricing",
    component: () => import("@/pages/PricingPage.vue"),
  },
  {
    path: "/whitepaper",
    name: "whitepaper",
    component: () => import("@/pages/WhitepaperPage.vue"),
  },
  {
    path: "/help",
    name: "help",
    component: () => import("@/pages/HelpPage.vue"),
  },
  {
    path: "/help/:slug",
    name: "help-article",
    component: () => import("@/pages/HelpArticlePage.vue"),
  },
  {
    path: "/privacy-policy",
    name: "privacy-policy",
    component: () => import("@/pages/PrivacyPolicyPage.vue"),
  },
  {
    path: "/terms-of-service",
    name: "terms-of-service",
    component: () => import("@/pages/TermsOfServicePage.vue"),
  },
];
