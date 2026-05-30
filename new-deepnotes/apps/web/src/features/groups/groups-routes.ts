import type { RouteRecordRaw } from "vue-router";

export const groupsRoutes: RouteRecordRaw[] = [
  {
    path: "/groups/:groupId/invite",
    name: "group-invite",
    component: () => import("./GroupInviteLandingView.vue"),
  },
  {
    path: "/groups/:groupId/join",
    name: "group-join-request",
    component: () => import("./GroupJoinRequestView.vue"),
  },
  {
    path: "/groups/:groupId",
    name: "group-detail",
    component: () => import("./GroupDetailView.vue"),
  },
  {
    path: "/groups",
    name: "groups",
    component: () => import("./GroupsView.vue"),
  },
];
