# Architecture

## Overview
- **Website:** Next.js 16 (App Router), React 19, TypeScript, deployed on Vercel. Styling is the site's own CSS (`src/app/globals.css`); Tailwind has not been adopted.
- **Database and auth:** Supabase (PostgreSQL, Auth, Storage). Every table is protected by row-level security. Browser code uses the publishable key; the server uses the secret key for writes.
- **Email:** Resend, sending from the verified `winjodigital.co.uk` domain.
- **Payments:** Stripe. Checkout routes for deposits (`src/app/api/deposits`), briefs (`src/app/api/briefs/pay`) and subscriptions (`src/app/api/subscriptions/checkout`), a billing portal (`src/app/api/subscriptions/portal`), and a webhook (`src/app/api/stripe/webhook`). The live webhook endpoint was pointed at `winjodigital.co.uk` on 8 November 2026 (see `docs/ENVIRONMENT_VARIABLES.md`).
- **AI:** provider-neutral engine (`src/lib/ai/`). The Claude adapter (`anthropic.ts`) is written but not connected (no key).
- **Source control:** GitHub, `WNJOWEB/wnjo`. Work happens on `claude/winjo-repositioning-exdr4m`; `main` is what production builds from.

## Layers
1. **Pages and components** (`src/app`, `src/components`): presentation only. Anything that matters for money or access is enforced in the database or on the server, never in the page.
2. **Pure business logic** (`src/lib`): pricing (`quote-engine.ts`), quote records, catalogue mapping, briefing, event routing, AI policy, budgets, runner. These take data as arguments and have no side effects, so they are unit-tested.
3. **Server boundary** (`src/lib/*-store.ts`, `src/app/api`): the only code that holds the secret key. Marked `server-only`.
4. **Database** (`supabase/migrations`): tables, row-level security, and the functions that perform sensitive actions (`accept_quote`, `decline_quote`, `store_quote`, `decide_approval`). These check permissions themselves.

## Multi-tenancy
Every business record carries `tenant_id`. The agency is tenant `wnjo`. Staff access is granted per tenant through `tenant_members`; client access is granted per organisation through `organization_members`. Isolation is tested in `supabase/tests`.

## Key decisions
- Money is stored as integer pence.
- Quotes are immutable snapshots. Versions, their line items and acceptances cannot be changed or deleted, even by the database owner.
- Customer-facing text never includes the owner's email address. Enquiries are delivered server-side.
- No feature assumes a credential exists. Missing credentials make the feature report that it is not connected.
- The site's CSS is kept rather than migrated to Tailwind, to keep the design intact.

## Known gaps
- The server-side paths (quote storage, enquiry saving, file transfer, agent records) run only once the Supabase secret key is set in Vercel. Production has the key; these paths have not been exercised end to end on the live database.
- The AI model (Claude, no key yet) and GitHub access for client repositories are not connected.
- The site does not keep separate backup copies of customer data. Deleted data is removed from live systems on the timings in the Terms.
