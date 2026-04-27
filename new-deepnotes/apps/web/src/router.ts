import { createRouter, createWebHistory } from "vue-router";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "home",
      component: () => import("./features/home/HomeView.vue"),
    },
    {
      path: "/login",
      name: "login",
      component: () => import("./features/auth/LoginView.vue"),
      meta: { public: true },
    },
    {
      path: "/register",
      name: "register",
      component: () => import("./features/auth/RegisterView.vue"),
      meta: { public: true },
    },
    {
      path: "/page/:pageId",
      name: "page",
      component: () => import("./features/pages/PageEditorView.vue"),
    },
  ],
});

export default router;
