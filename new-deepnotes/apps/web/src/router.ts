import { createRouter, createWebHistory } from "vue-router";

export function createAppRouter() {
  return createRouter({
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
        path: "/account",
        name: "account",
        component: () => import("./features/account/AccountView.vue"),
      },
      {
        path: "/spatial",
        name: "spatial-world-stub",
        component: () =>
          import("./features/spatial/SpatialWorldStubView.vue"),
      },
      {
        path: "/pages",
        name: "pages-entry",
        component: () => import("./features/pages/PagesEntryRedirectView.vue"),
      },
      {
        path: "/pages/:pageId",
        name: "page",
        component: () => import("./features/pages/PageEditorView.vue"),
      },
      {
        path: "/page/:pageId",
        redirect: (to) => ({
          path: `/pages/${String(to.params.pageId ?? "")}`,
        }),
      },
    ],
  });
}
