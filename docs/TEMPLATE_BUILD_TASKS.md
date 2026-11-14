# Template build: progress tracker

Objective: a customer pays, ticks and types their answers, an AI fills a sector template, the owner reviews the preview, revisions follow, then it goes to the customer. Spec: `AI_BUILD_SPEC.md`. Inventory: `TEMPLATE_INVENTORY.md`.

Working rules: commit locally; push or merge only when the owner says "push" or "merge to main" (each push builds on Vercel). Nothing sends real emails or spends real money without the owner.

## Done (local commits; nothing pushed yet)

- Content schema, Barber preset, automatic checks (`src/lib/site-template/schema.ts`, `presets.ts`, `checks.ts`).
- Renderer for the Barber template, four looks, safe by construction (`src/components/site-template/SiteRender.tsx`), and a sample build that passes every check (`sample.ts`).
- Writing step: facts are assembled from the customer's answers, the model writes wording only, one retry with the check reasons, spend cap respected (`write.ts`).
- Customer answers: parse and validate (`answers.ts`), stored on the versioned brief as `brief.site`, shown in the brief text and email.
- Build step and store (`build.ts`, `build-store.ts`); staff service with release (override needed for failed checks) and withdraw (`build-service.ts`); route actions `site`, `site-release`, `site-withdraw`, `site-link` on `/api/admin/ai/website`.
- Private preview page `/site-preview/[token]`; the customer's "View your preview" link picks the newest released build or preview.
- Staff panel: template builds listed with view, release, withdraw and "write it again" with a change note.
- Automatic first draft: a paid brief with complete sector answers gets a template build (once), instead of a plan and copy preview.
- Customer form: sector choice, services and prices, opening hours grid (no pre-filled times), contact, tick-box facts, look and colour, in the post-payment details form (`SiteFields.tsx`).
- Photos: uploaded images become the hero and gallery, shown through short-lived signed links (`photos.ts`).
- Claude provider through the official SDK (`src/lib/ai/anthropic.ts`), the only provider (Grok was removed on 14 November 2026). Only `ANTHROPIC_API_KEY` is required. Optional settings, with defaults: `ANTHROPIC_MODEL` (claude-haiku-5-5), `ANTHROPIC_EFFORT` (low), `ANTHROPIC_INPUT_PENCE_PER_MILLION_TOKENS` (8), `ANTHROPIC_OUTPUT_PENCE_PER_MILLION_TOKENS` (40) and `ANTHROPIC_MAX_TOKENS`. Prices are pence per million tokens (convert from dollars). Not yet run against the live service.
- The customer's sector questions are hidden until `NEXT_PUBLIC_TEMPLATE_SITES=on` is set in Vercel, so a push cannot expose them.
- Migration `supabase/migrations/20261112090000_website_site_builds.sql`: applied and checked in the live database (12 Nov).
- Merged to main (12 Nov, `5fa1f64`). `NEXT_PUBLIC_TEMPLATE_SITES=on` is set in Vercel and redeployed, so customers can see the sector questions.
- Booking-request endpoint `/api/site-enquiry` (12 Nov): the form posts natively, works without JavaScript, only a released build takes requests, the email goes to the website owner's verified account address (never one from the request), rate limited, with a hidden bot trap and a confirmation or error shown on the page. Draft previews stay inactive.
- Café and Electrician presets (12 Nov): each with a sample build that passes every check. Café: menu and table requests. Electrician: areas covered (each must appear), optional hours, quote requests, a Call button. Preset-specific labels for the request box.
- Page limit on the details form (12 Nov bug fix): Core 5, Plus 10, Pro 20 pages (or what a one-off buyer paid for). The server gives the allowance (`/api/briefs/allowance`) and refuses more pages when the details are saved; the form disables extra pages at the limit.
- Business types (12 Nov): three groups (Booking services, Hospitality, Trades), shown as one grid with the group name on each tile. "Another type of business" has a typed box, stored on the brief as `otherBusinessType` for planning by hand. Only Barber, Café, Electrician and Physio build automatically.
- Business profile for "Another type of business" (12 Nov): what they offer (with optional prices), phone or email, and what makes them different are required. Optional: customers, first action, areas, hours, about (a few sentences in their words), proof, tone. Stored as `brief.profile`, shown to staff, and given to the planning step as the customer's own answers.
- Stepped details form (12 Nov): six short steps (About you, What you offer, Goals and pages, Look, Files and extras, Check and send), each checked before moving on, with swipe between steps. Progress is saved to the server at every step (`website_brief_progress`, `/api/briefs/progress`), so an accidental close loses only the last few seconds and resumes on the same step. Saving progress never starts the AI build; only "Send to the team" does. **Migration `20261112140000_website_brief_progress.sql` is written but not applied**; until it is, progress saves show "Couldn't save just now" and the form still works.
- Details form reuses sign-up details (12 Nov): the account email and the sign-up phone number (`/api/briefs/known`, owner-only) fill empty contact fields on step 2, with a note; anything typed is never overwritten. Email is required and phone optional.
- Extra questions (12 Nov): 15 optional questions across the steps (role; lead service; pricing style; first contact; what they don't offer; how success is measured; existing pages; what must be found; photo style; words to use and avoid; accessibility; social links; reviews; legal pages). Stored as `brief.extras`, shown to staff under their full question, and given to the writer as the customer's own answers.
- Cancellation tracking (12 Nov): Stripe is the source of truth. The webhook writes a permanent log (`website_subscription_events`: cancel requested, cancel withdrawn, ended, payment failed) with Stripe's reason, once per Stripe event. Staff are alerted the day a cancel is asked for, and when a subscription ends or a payment fails. The subscriptions admin page lists the history. **Migration `20261112160000_website_subscription_events.sql` is written but not applied**; until it is, the history stays empty and the webhook carries on without recording.
- Cancellation requests and renewal reminders (12 Nov): customers can ask to cancel from Plan & billing (optional reason, confirmation email, staff alert); staff see open requests on the subscriptions page and processing a cancel closes the request. A daily reminder goes out 14 days before the minimum term ends and every six months after, saying what they pay and how to cancel. **Migration `20261112170000_website_cancellation_requests.sql` must be applied before this is merged.** Timings (`REMINDER_DAYS_BEFORE`, `REMINDER_EVERY_MONTHS` in `renewal-reminders.ts`) and the email wording need a solicitor's check. Terms decided (12 Nov): new plans are rolling monthly with no minimum term, and customers can cancel any time, with no notice. The terms (section 8.1), FAQ and site copy were changed from 30 days' notice to match (terms version 2026-11-12.1). A rolling plan's cancel request is set in Stripe to end at the period end straight away, and the customer is emailed the date. Plans with a minimum term still go to staff. Stripe's own customer-portal cancel stays off, so all cancels go through the request button.
- Upload list on the details form: thumbnails for files picked this session, a View link (owner-only, 60-second signed link via `/api/briefs/file`), one row per file with wrapping names.

## Blocked on the owner

- An AI key in Vercel for any live build: `ANTHROPIC_API_KEY`.

## Next

1. Run the template test against Haiku (`src/lib/site-template/eval.test.ts`). Needs the AI key.
2. Customer-facing wording about the process, only after a real end-to-end test with a live model.
3. More sectors, each with a sample build that passes every check. Physio is built (13 Nov): treatments, hours, address, appointment requests, no promises of results or cures, and a registration is only mentioned if the customer ticks it. Not yet: a field for a registration number.

## Known gaps and risks

- Never run against a live model: reply shape unverified (also true of the existing plan and page steps).
- The sector questions are only in the post-payment form, not the checkout steps.
- The new tables and policies have no database-level tests (the migration is unapplied).
- Hours-in-prose are not checked (the prompt tells the model not to quote times).
- Boonma repo not yet inventoried (needs its name).
- Customer hosting on their own domain is not designed.

## Tests

`npx vitest run` passes (see the latest run in the commit log). Typecheck and lint clean.
