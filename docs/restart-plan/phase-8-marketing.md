# Phase 8: Marketing, Help, Pricing, and Legal Surfaces

> **Prerequisites:** Phase 6 and Phase 7 done. `adr-004-launch-marketing-scope.md` accepted.  
> **Status:** Not started

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

- [ ] `apps/marketing` builds and outputs static HTML for `/`, `/pricing`, `/whitepaper`, `/help`, `/privacy-policy`, `/terms-of-service`.
- [ ] Pricing page has working Stripe CTA that initiates checkout session.
- [ ] Lighthouse SEO score ≥ 90 on homepage.
- [ ] No route is a placeholder or stub ("Coming soon" is not acceptable).
