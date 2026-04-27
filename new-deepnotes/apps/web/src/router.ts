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
      path: "/groups/:groupId/invite",
      name: "group-invite",
      component: () => import("./features/groups/GroupInviteLandingView.vue"),
    },
    {
      path: "/groups/:groupId/join",
      name: "group-join-request",
      component: () => import("./features/groups/GroupJoinRequestView.vue"),
    },
    {
      path: "/groups/:groupId",
      name: "group-detail",
      component: () => import("./features/groups/GroupDetailView.vue"),
    },
    {
      path: "/groups",
      name: "groups",
      component: () => import("./features/groups/GroupsView.vue"),
    },
    {
      path: "/notifications",
      name: "notifications",
      component: () => import("./features/notifications/NotificationsView.vue"),
    },
    {
      path: "/page/:pageId",
      name: "page",
      component: () => import("./features/pages/PageEditorView.vue"),
    },
  ],
});

export default router;
