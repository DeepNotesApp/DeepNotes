import type { RouteRecordRaw } from "vue-router";

export const pagesRoutes: RouteRecordRaw[] = [
  {
    path: "/pages",
    name: "pages-entry",
    component: () => import("./PagesEntryRedirectView.vue"),
  },
  {
    path: "/pages/:pageId",
    name: "page",
    component: () => import("./PageEditorView.vue"),
  },
  {
    path: "/page/:pageId",
    redirect: (to) => ({
      path: `/pages/${String(to.params.pageId ?? "")}`,
    }),
  },
];
