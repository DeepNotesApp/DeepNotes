import { isIncluded } from '@stdlib/misc';
import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('src/layouts/HomeLayout/HomeLayout.vue'),
    meta: {
      requiresGuest: !isIncluded(process.env.MODE, ['ssr', 'spa']),
    },
    children: [
      {
        path: '',
        name: 'home',
        component: () =>
          isIncluded(process.env.MODE, ['ssr', 'spa'])
            ? import('src/pages/home/Index.vue')
            : import('src/pages/home/Login/Login.vue'),
      },
    ],
  },

  {
    path: '/login',
    component: () => import('src/layouts/HomeLayout/HomeLayout.vue'),
    meta: { requiresGuest: true },
    children: [
      {
        path: '',
        name: 'login',
        component: () => import('src/pages/home/Login/Login.vue'),
      },
    ],
  },

  {
    path: '/register',
    component: () => import('src/layouts/HomeLayout/HomeLayout.vue'),
    meta: { requiresGuest: true },
    children: [
      {
        path: '',
        name: 'register',
        component: () => import('src/pages/home/Register.vue'),
      },
    ],
  },

  {
    path: '/finish-registration',
    component: () => import('src/layouts/HomeLayout/HomeLayout.vue'),
    meta: { requiresGuest: true },
    children: [
      {
        path: '',
        name: 'finish-registration',
        component: () => import('src/pages/home/FinishRegistration.vue'),
      },
    ],
  },

  {
    path: '/verify-email/:code',
    component: () => import('src/layouts/HomeLayout/HomeLayout.vue'),
    children: [
      {
        path: '',
        name: 'verify-email',
        component: () => import('src/pages/home/VerifyEmail.vue'),
      },
    ],
  },

  {
    path: '/pricing',
    component: () => import('src/layouts/HomeLayout/HomeLayout.vue'),
    children: [
      {
        path: '',
        name: 'pricing',
        component: () => import('src/pages/home/Pricing/Pricing.vue'),
      },
    ],
  },

  // {
  //   path: '/download',
  //   component: () => import('src/layouts/HomeLayout/HomeLayout.vue'),
  //   children: [
  //     {
  //       path: '',
  //       name: 'download',
  //       component: () => import('src/pages/home/Download/Download.vue'),
  //     },
  //   ],
  // },

  {
    path: '/whitepaper',
    component: () => import('src/layouts/HomeLayout/HomeLayout.vue'),
    children: [
      {
        path: '',
        name: 'whitepaper',
        component: () => import('src/pages/home/Whitepaper.vue'),
      },
    ],
  },

  {
    path: '/privacy-policy',
    component: () => import('src/layouts/HomeLayout/HomeLayout.vue'),
    children: [
      {
        path: '',
        name: 'privacy-policy',
        component: () => import('src/pages/home/PrivacyPolicy.vue'),
      },
    ],
  },
  {
    path: '/terms-of-service',
    component: () => import('src/layouts/HomeLayout/HomeLayout.vue'),
    children: [
      {
        path: '',
        name: 'terms-of-service',
        component: () => import('src/pages/home/TermsOfService.vue'),
      },
    ],
  },

  {
    path: '/subscribed',
    component: () => import('src/layouts/HomeLayout/HomeLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'subscribed',
        component: () => import('src/pages/home/Subscribed.vue'),
      },
    ],
  },

  {
    path: '/account',
    component: () => import('src/layouts/HomeLayout/HomeLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        component: () => import('src/pages/home/Account/Account.vue'),
        children: [
          {
            path: 'general',
            name: 'account/general',
            component: () =>
              import('src/pages/home/Account/General/General.vue'),
          },
          {
            path: 'billing',
            name: 'account/billing',
            component: () =>
              import('src/pages/home/Account/Billing/Billing.vue'),
          },
          {
            path: 'security',
            name: 'account/security',
            component: () =>
              import('src/pages/home/Account/Security/Security.vue'),
          },
        ],
      },
    ],
  },

  {
    path: '/groups/:groupId',
    component: () => import('src/layouts/PagesLayout/PagesLayout.vue'),
    children: [
      {
        path: '',
        name: 'group',
        component: () => import('src/pages/pages/Group.vue'),
      },
    ],
  },

  {
    path: '/pages',
    name: 'pages',
    component: () => import('src/pages/pages/Pages.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/pages/:pageId',
    component: () => import('src/layouts/PagesLayout/PagesLayout.vue'),
    children: [
      {
        path: '',
        name: 'page',
        component: () => import('src/pages/pages/Page.vue'),
      },
    ],
  },

  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('src/pages/ErrorNotFound.vue'),
  },
];

export default routes;
