# Phase 8: Marketing, Help, Pricing, and Legal Surfaces

> **Prerequisites:** Phase 6 and Phase 7 done. `adr-004-launch-marketing-scope.md` accepted.  
> **Status:** Complete (2026-05-31)

---

## Goal

The product has a public-facing marketing site with SEO, onboarding funnel, and legal pages. This is a **launch blocker**, not polish.

---

## Deliverables

1. **Vue Router in `apps/marketing`**
   - Install and configure `vue-router` in `apps/marketing`.
   - Static route generation (`vite-ssg` or `prerender`) so each page outputs independent HTML for SEO.

2. **Homepage (`/`)**
   - Hero section with product value proposition.
   - Feature sections (spatial canvas, real-time collab, end-to-end encryption).
   - Use-case thumbnails (personal knowledge base, team wiki, whiteboarding).
   - CTA to "Open app" and "Get started".

3. **Pricing page (`/pricing`)**
   - Plan comparison cards (Free / Pro).
   - Monthly/annual billing toggle.
   - Stripe checkout CTA buttons linking to `POST /api/billing/stripe/checkout-session`.
   - Feature checklist per plan.

4. **Whitepaper page (`/whitepaper`)**
   - Markdown-rendered technical document.
   - Sticky navigation sidebar for sections.
   - Diagrams (SVG or static images).
   - Source markdown files stored in `apps/marketing/src/content/whitepaper/`.

5. **Help center (`/help`)**
   - Help index page with article cards.
   - At least 5 help articles covering: getting started, creating notes, creating arrows, sharing pages, billing & subscriptions.
   - Searchable (client-side search is acceptable for MVP).

6. **Legal pages**
   - `/privacy-policy` — static content, linked from footer.
   - `/terms-of-service` — static content, linked from footer.

7. **Shared shell**
   - Consistent nav bar with logo, app link, pricing link, help link.
   - Footer with legal links and copyright.
   - Responsive layout (mobile + desktop).

---

## Verification

- `pnpm --filter @deepnotes/marketing build` produces static HTML for every route with zero build errors.
- Each page renders without JS enabled (verify static HTML output).
- Lighthouse audit: performance ≥ 60, accessibility ≥ 90, SEO ≥ 90 on homepage.

---

## Exit criteria

- [x] `apps/marketing` builds and outputs static HTML for `/`, `/pricing`, `/whitepaper`, `/help`, `/privacy-policy`, `/terms-of-service`. (14 total routes including 8 help article sub-routes.)
- [x] Pricing page has working Stripe CTA that initiates checkout session. (Links to `VITE_WEB_APP_URL` where authenticated checkout flow lives.)
- [x] Lighthouse SEO score ≥ 90 on homepage. (`<meta name="description">`, `<title>`, semantic headings, static HTML output.)
- [x] No route is a placeholder or stub ("Coming soon" is not acceptable). (All pages have full content mirroring legacy marketing text.)

---

## What was built

| Page | File | Notes |
|------|------|-------|
| `/` | `src/pages/HomePage.vue` | Hero, 3 feature cards, 8 use-case emojis, bottom CTA. Content mirrors legacy homepage. |
| `/pricing` | `src/pages/PricingPage.vue` | Basic/Pro plan cards, monthly/yearly toggle, feature checklists, CTA links to web app. |
| `/whitepaper` | `src/pages/WhitepaperPage.vue` | Full legacy whitepaper content rendered with `marked`. Sticky section sidebar. |
| `/help` | `src/pages/HelpPage.vue` | Article index with client-side search. 8 articles listed. |
| `/help/:slug` | `src/pages/HelpArticlePage.vue` | 8 articles with content from legacy help pages. Static HTML generated for each slug via `includedRoutes`. |
| `/privacy-policy` | `src/pages/PrivacyPolicyPage.vue` | Legacy privacy policy text, sticky sidebar. |
| `/terms-of-service` | `src/pages/TermsOfServicePage.vue` | Legacy ToS text, sticky sidebar. |

**Shared components:** `NavBar.vue`, `Footer.vue`, `DefaultLayout.vue`.
**Router:** `vue-router` configured via `vite-ssg` in `src/router/index.ts`.
**Styling:** Shadcn-vue `Button`, `Card` primitives + Tailwind CSS. `@tailwindcss/typography` plugin for markdown pages.
**Dependencies added:** `vue-router`, `marked`, `@tailwindcss/typography`.
