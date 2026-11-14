# Implementation status

Live tracker for the platform brief. Each step is only marked done once it has been built, tested and committed.

## Step 1: Multi-tenant foundation (database) — done, tested

- Tables: `tenants`, `tenant_settings`, `tenant_billing_settings`, `tenant_subscriptions` (inactive), `tenant_domains`, `profiles`, `tenant_members`, `user_roles`, `organizations`, `organization_members`, `addresses`, `audit_logs`.
- The agency is provisioned as tenant `wnjo`. `orders`, `order_updates` and `enquiries` are now tenant-scoped.
- Row Level Security is enabled on every table. Browser roles have read-only access, and only where a policy allows it. All writes go through the server.
- Migrations: `supabase/migrations/` (applied in filename order).
- Tests: `supabase/tests/isolation.sql`. 19 checks, all passing at the time of writing. The script rolls back its own rows.

**Known accepted item:** the Supabase security advisor reports that signed-in users can call the three access-check functions (`is_tenant_member`, `is_org_member`, `is_platform_admin`). Each one only answers about the caller's own memberships, and the policies need them. Moving them to a private schema is a later hardening task.

**Not yet built in Step 1:** the frontend for staff and the team-membership admin screens (Step 2), and the server helpers that read the signed-in person's role.

## Decisions taken in Step 1

- Keep the existing site CSS rather than moving to Tailwind, to keep the design intact.
- Platform-level roles (`user_roles`) are separate from agency roles (`tenant_members`), so an agency member can't alter platform permissions.
- No automatic profile creation on sign-up yet. The app will create profile rows when they're first needed.
- No staff-granting function yet. Staff will be added through a server action with an audit entry, in Step 2.

## Step 2: Agency business system — in progress

Built in sub-steps, each tested before the next.

### 2a. Pricing catalogue — done, tested
- Tables: `pricing_packages`, `pricing_features`, `pricing_rates`, `pricing_care_plans`, `pricing_settings`. All amounts are integer pence.
- Seeded with WNJO's current provisional prices. Owners and admins edit them through row-level-security policies; staff can read them.
- Migrations: `20261106220000` to `20261106220300`.

### 2b. Quotes and immutable snapshots — done, tested
- Tables: `quotes`, `quote_versions` (the frozen answers, catalogue and result), `quote_version_items`, `quote_acceptances`.
- Versions, items and acceptances can't be changed or deleted, even by the database owner (a trigger enforces this).
- A quote is visible to agency staff and to the client organisation it was issued to.
- Tests: `supabase/tests/quotes.sql`, 11 checks, all passing.

### 2c. Server quote engine — done, tested
- `src/lib/quote-engine.ts` prices an enquiry from a catalogue passed in as data. It doesn't read the database itself.
- Parity test (`src/lib/quote-engine.test.ts`): the engine matches the current calculator exactly on more than 10,000 combinations of answers, including package, total, range, care price, scope flags and line items.
- The browser configurator still uses the old `estimate()` in `src/lib/pricing.ts`. Switching it to the server engine is part of 2d, so the two can't disagree for long.

### 2d. Quote acceptance and staff view — built, partly verified
- Database: `accept_quote` and `decline_quote` (signed-in client, own organisation, latest open unexpired version only; the name is trimmed and checked; the signed-in email is recorded). `store_quote` writes a quote, its version and items atomically, and only the server's secret key can call it.
- Tests: `supabase/tests/acceptance.sql` (12 checks) and `supabase/tests/store_quote.sql` (4 checks). All passing.
- Customer: "Your quotes" panel on `/account` shows the latest version, the breakdown, scope notes, and accept and decline buttons. Built and type-checked. Not yet tested signed in, since that needs a sign-in link.
- Staff: `/admin` shows enquiries, quotes and orders, limited by row-level security, with a refusal for anyone without an agency role. Built. Not yet tested signed in.
- Server: `src/lib/quote-store.ts` loads prices from the database and creates quotes. **Blocked**: it needs `SUPABASE_SERVICE_ROLE_KEY`. Its pure parts (catalogue mapping, record building) are unit-tested, 44 tests across the suite.
- Not built yet: the quote-creation screen. The configurator still uses the browser estimate, and switching it is blocked on the same key.

### Still to build in Step 2
- Orders and project creation after payment (needs Stripe).
- Stripe deposits and payment schedules (blocked on Stripe test-mode keys).
- Staff screens for editing prices and team members.
- Switching the configurator to the server engine (needs the service key).

## Phase 3: Project and client portals — in progress

### 3a. Projects and messages — database built and tested; client screens built
- Applied: `projects`, `conversations`, `messages` (migration `20261106240000`). Messages are append-only for everyone. Internal notes (`is_internal`) are invisible to clients, enforced by row-level security. Clients can post only customer-visible messages, as themselves, into their own organisation's projects. System messages can only be written by the server.
- Tests: `supabase/tests/messages.sql`, 15 checks, all passing.
- Client screen: "Your projects" on `/account` shows each project's customer status, target date and message thread, with a form to send a message. Built, type-checked, built for production. Not yet tested signed in.

### 3b. Approvals and revision requests — database built and tested; client screens built
- Applied: `approval_requests`, `approval_responses`, `revision_requests`, and `decide_approval` (migrations `20261106250000` and `20261106250100`, the latter fixing a variable-name clash).
- Staff create approval requests. Clients approve, or request changes with a written reason, once per request. Each decision records the signed-in email and writes an audit entry. Clients can ask for revisions on their own project, but cannot change their status.
- Tests: `supabase/tests/approvals.sql`, 16 checks, all passing.
- Client screen: approvals appear under each project on `/account`, with approve and request-changes controls. Built and type-checked; not yet tested signed in.
- Not yet built: staff screens to create approvals and handle revision requests.

### 3c. Project files — built and tested (upload and download added)
- Uploads: the browser asks the server for a one-time link (`POST /api/files/upload-url`), uploads straight to the private `project-files` bucket, then confirms (`POST /api/files/confirm`). The server checks the object exists, is the declared size, and sits under the project's path, and only then records it.
- Downloads: `GET /api/files/[id]` returns a link valid for 5 minutes, forced to download as an attachment, only to someone allowed to read the file.
- Rules are pure and tested (`src/lib/files/rules.test.ts`, 11 checks): allowed types (no HTML, SVG, scripts), 50 MB limit, safe names, project-bound paths, and who may upload or read. Clients can never upload internal files; the server decides.
- Screens: customers see shared files on each project; staff upload (optionally internal) and download on the project screen.
- Not yet run against the live storage service: needs a deployment and a test upload.
- Earlier notes below still describe the database rules, which are unchanged.
- Applied: `project_files` metadata and a private `project-files` bucket (migration `20261106260000`).
- Tests: `supabase/tests/files.sql`, 9 checks, all passing.
- Not built: upload and download screens. Both need server-issued signed URLs, which need the server key.

### 3d. Notifications — database built and tested
- Applied: `notification_preferences`, `notifications` (one per recipient, unique dedupe key, so replays never duplicate), and triggers for staff messages, approval requests and new quotes (migration `20261106260100`).
- Clients see only their own notifications, can mark them read, and can't change their content.
- Tests: `supabase/tests/notifications.sql`, 11 checks, all passing.
- Not built: the in-app notification list and the email sending. Email uses the `email_wanted` flag and `sent_at` column; the server sender is still to be written.

### SECURITY FIX (applied): default privileges tightened
- Finding: Supabase grants new public tables to the browser roles by default, including TRUNCATE (which bypasses row-level security) and direct writes. This had been left open on the tables created since Step 1.
- Applied in migrations `20261106260200` and `20261106260300`: TRUNCATE, REFERENCES and TRIGGER removed from browser roles; anonymous visitors have no table access; quote status can only change through the tested functions; staff can change only an order's stage; projects can't be inserted from the browser.
- Verified by a privilege audit of every public table, and the approvals suite was rerun (16 checks passing).

### RESOLVED: internal project fields hidden from clients
- Applied `20261106260400`: the API can no longer read a project's internal `status` and `priority`. Clients read only the customer-safe columns. Tested in `supabase/tests/project_columns.sql` (3 checks, passing).
- Decision (owner): leave the unused `status` and `priority` columns on `projects` for now. They are hidden from clients. Revisit once the internal `project_internal` table is built; dropping the columns is destructive and needs explicit confirmation at that point.

### 3e. Staff project management — built; database rules tested
- `/admin` → Projects: list projects, set the client-visible status and target date, start conversations, reply (customer-visible or internal note), request approvals, update revision-request status, and see file records.
- Database rules: `supabase/tests/staff_projects.sql`, 4 checks passing. Staff can't move a project to another client, and can't create projects from the browser.
- Limitations: staff can't see or edit the internal project status or priority (not readable through the API yet); file upload and download wait for the server key; the screens haven't been exercised signed in, since that needs a staff sign-in link.

### Still to build in Phase 3
- Staff: project and message management screens, with internal notes.
- Upload and download screens (signed URLs, need the server key), the notification list and email sender, invoices and payments (Stripe), staff screens for approvals, revisions, files and notifications.

## Phase 4: AI orchestration — core built and tested; live provider blocked

### 4a. Core engine — built and tested (no credentials needed)
- Database (migration `20261106270000`): `ai_agents`, `ai_permissions`, `ai_tasks`, `ai_runs`, `ai_tool_calls`, `ai_budget_settings`. Staff can read them; nobody can write them from the browser, so agents can't grant themselves permissions or change their own task status. Clients see nothing. Tested in `supabase/tests/ai_access.sql` (6 checks).
- Code in `src/lib/ai/`:
  - `provider.ts`: the model-provider interface. Claude (Anthropic) is the one implementation of it. Grok was removed on 14 November 2026.
  - `tools.ts`: the tool registry. Tools are registered by name, and each one declares whether it is high-risk.
  - `policy.ts`: permission and budget decisions. Denies by default; high-risk tools need an owner approval; disabled or paused agents do nothing.
  - `runner.ts`: runs one task with bounded attempts, bounded model calls per attempt, a spend limit, and no retry for authentication or invalid-response errors. A runaway tool loop fails the task at once rather than retrying.
- Tests: `src/lib/ai/engine.test.ts`, 15 checks, all passing. They use a scripted provider and an in-memory store.

### 4b. Provider, budgets and storage — built, tested against fakes
- `src/lib/ai/anthropic.ts`: the Claude provider, through the official SDK. Only `ANTHROPIC_API_KEY` is required; the model (Haiku 5.5), thinking level (low) and prices have defaults that settings can override. Errors are classified as authentication, transient or invalid. **Not verified against the live Anthropic API**; it needs a live check once the key is set. (The earlier Grok provider was removed.)
- `src/lib/ai/budget.ts`: the budget gate. Checks task, agent, project and global limits together, stops at the first limit that would be exceeded, and warns at each warning threshold. 4 tests.
- `src/lib/ai/store.ts`: the database-backed run store, using the server's secret key. Tested against a fake client only; not yet run against the live database.
- The runner now waits between transient retries (exponential, up to 30 seconds). Tests use no delay.
- Tests: 34 AI tests in total, all passing.

### Not yet built in Phase 4
- Wiring the budget gate into the runner, and reading `ai_budget_settings` (currently read by nothing).
- Running the real store and the live provider end to end. This needs the server key and the Anthropic key.
- The approval queue screens.
- Event triggers (the event-driven queue), the five agents' instructions, and the morning briefing.
- Stuck tasks: a task left in `running` for 20 minutes is re-queued (or failed when out of attempts) by the daily sweep. Its old run record stays `running`; a later pass can close those. A long attempt is limited to 8 model calls, so 20 minutes leaves room.

### 4c. Agent set-up and staff AI view — built
- Migration `20261106270100`: the five agents for WNJO, all switched off, and a global AI budget of £0. Verified in the database: 5 agents, 0 enabled.
- `/admin` → AI: a read-only view of the agents and their switches, recent tasks, and the budget. No controls yet; switching agents on and changing budgets come with the approval screens.
- Not yet wired: the budget gate is not connected to the runner, and nothing reads the budget to block spending. This is safe while every agent is switched off and the budget is £0, but must be wired before anything is switched on.

### 4d. Morning briefing (deterministic part) — built, tested
- `src/lib/briefing.ts`: 07:30 Europe/London scheduling that handles the clock changes (6 tests), and a briefing builder that keeps facts and suggested priorities in separate lists, linked to projects (tested).
- Migration `20261106280000`: `ai_reports` table, staff read-only. The AI tab shows the latest briefing, or when the next one is due.
- Not yet built: the server job that gathers the facts from the database and writes the report each morning. It needs the server key, and the scheduling mechanism still needs choosing.
- Not AI-written yet: the wording is fixed and comes from the facts. The model adds prose once the AI is enabled.

### 4e. Event routing — built, tested
- `src/lib/ai/events.ts`: maps 11 business events (deposit paid, QA failed, client message, deadline approaching, and others) to the agent tasks they create. Each task has a stable key, so a repeated event never creates duplicate work. An agent's own events never re-trigger that agent, which prevents loops. 6 tests, all passing.
- Not yet built: the queue that delivers events and runs the tasks. It needs the server key, and the scheduling choice from the briefing job applies here too.

### 4g. Event queue and worker — built, tested (tier 2, part 1)
- Migration `20261107050000`: `ai_events` (one row per business event, unique on tenant and dedupe key, staff read only). Tests: `supabase/tests/ai_events.sql`, 7 checks, passing against the live database.
- `src/lib/ai/event-worker.ts` plans an event's tasks and queues each one under its dedupe key; only new tasks run. `src/lib/ai/event-processor.ts` marks each event processed, or failed with its error so the sweep retries it (up to 5 attempts).
- `src/lib/ai/task-queue.ts` and `src/lib/ai/event-store.ts`: the database adapters. The insert-if-new SQL they use was checked live (first insert creates, repeat is ignored, existing row found).
- `src/lib/ai/agent-runtime.ts` runs queued tasks through the runner with the database store, budget gate and read-only tools. With no AI key configured, queued tasks are suspended, not run.
- Triggers: a Stripe-confirmed deposit records `deposit_paid` and processes it straight away, after the webhook has answered Stripe (`after()` in `/api/stripe/webhook`). A daily sweep (`/api/cron/events`, 07:45 UTC) picks up anything left over. The webhook looks the deposit up on every delivery, so a Stripe retry still records the event.
- Tests: 11 new unit tests (worker and processor), 123 across the suite, all passing.
- Not yet done: an end-to-end run with a real event through the real store, which needs the service key in a test environment.

### 4h. Approval queue — built, tested (tier 2, part 2)
- Migration `20261107060000`: `ai_approvals` (one open request per task and tool, staff read only) and `ai_tasks.approved_tools`. Tests: `supabase/tests/ai_approvals.sql`, 7 checks, passing live. The decision SQL (claim once, then re-queue) was also checked live.
- The runner records a pending approval when a task asks for a high-risk tool, then pauses the task. `POST /api/admin/approvals/[id]` lets an owner or admin approve or reject; staff are refused. Approving re-queues the task with that tool allowed for that task only; rejecting fails it. A second decision is refused.
- The queue is shown in the AI tab of `/admin` ("Waiting for approval"). Staff see it, owners and admins can decide.
- The daily sweep also runs queued tasks, so an approved task runs again.
- Known limits: approval covers the tool for that task, not the exact arguments, so write tools must check their own arguments. If the task update fails after the decision is recorded, the approval stays decided and the task needs a manual look.
- Tests: `approvals.test.ts` (3), `engine.test.ts` gained 3 approval tests. Full suite passing.

### 3i. Progress and customer emails — built, tested
- Migration `20261107070000`: a claimed customer is notified when their order's stage changes and when a progress update is posted. Unclaimed orders queue nothing. Repeats are ignored. Tests: `supabase/tests/progress_notifications.sql`, 6 checks, passing live.
- Emails: `src/lib/notify/outbox.ts` sends queued notifications as plain text with a link to the account page. A row is marked sent only after Resend accepts it, so failures are retried. Tests: 6 in `outbox.test.ts`.
- Sending happens straight after a staff stage change, update, customer message or approval request (`POST /api/notifications/send`, staff only). The daily sweep sends anything missed.
- A notification whose email fails (or whose recipient has no address) is retried up to 5 times, then left for a person to look at. Migration `20261107090000` adds the attempt count; the due-query was checked live. One bad address can no longer block the queue.
- Known limits: progress emails are not switched off per customer yet (the preference screen only covers the older kinds); email needs the Resend key and sender address in Vercel. Nothing has been sent to a real inbox yet.

### 4i. Business events from the database — built, tested
- Migration `20261107080000`: a new project and a client's message each raise one AI event (dedupe-keyed). Staff messages and internal notes raise none. Tests: `supabase/tests/ai_event_triggers.sql`, 4 checks, passing live.
- Processing: the staff and client send route (`POST /api/notifications/send`) processes queued events and then sends customer emails, so a client's message reaches its agent straight away. Any signed-in person may trigger it, because it only works through rows already written. The daily sweep does the same for anything missed.
- Not yet raised as events: client file uploads, approvals decided, task failures and the deadline and website checks.

### 4j. AI controls for owners — built, tested
- `POST /api/admin/ai/settings` (owner or admin of the agency): sets the global monthly budget and warning level, and switches each agent off, on or paused. Only the server writes these; each change is written to the audit log with who made it and the values. Validation is pure and tested (8 checks): whole pence, no negatives, a warning level no higher than the budget, known agents only.
- The AI tab shows the controls to owners and admins. Staff see the same status and change nothing.
- Safety: the budget stays at £0 until an owner sets it, and a zero budget stops every agent before any model call. Agents are still off by default.

### 2e. Quotes from briefs — built, tested
- Fixed: website enquiries were never saved to the database. The enquiry insert didn't set the agency, which the table requires, so every save failed silently and only the email went out. The live table had 0 rows. Fixed in `src/lib/enquiry-store.ts` (`enquiryRow`, tested) and checked live.
- Brief enquiries now keep their validated answers (migration `20261107100000`).
- Staff can issue a quote from a brief in Sales → Enquiries: `POST /api/admin/quotes` prices it on the server from the agency's catalogue (the browser's figure is never used) and stores it through the existing `store_quote` function. An optional client organisation makes it visible to that client; without one it stays internal.
- New clients: staff add a client's business and email in the quote panel (`POST /api/admin/clients`). The email is invited to that organisation (migration `20261107180000`), and when they sign in with it they join and see their quotes. Checked live: the invite is claimed once, and another person cannot see it.
- The configurator still shows the browser estimate while the customer is choosing. The issued quote is the figure that counts; the two use the same rules, checked by the parity test.

### 4j. More AI event sources — built, tested
- A client's file upload raises `client_uploaded_files` (migration `20261107110000`, checked live: client upload raises one event, staff upload none).
- Deadlines: the daily sweep raises `deadline_approaching` for open projects due within 7 days, once per project and target date (`src/lib/ai/deadlines.ts`, 4 tests; the sweep runs it before processing events).
- Not added: approval decisions and failed tasks, because the event list has no types for them; and a website-down check, which needs an uptime monitor first.

### 3j. Customer notifications and preferences — built, tested
- Customers see their recent notices on `/account` (newest first, unread marked, mark one or all as read) and choose, for progress, messages, approvals and quotes, whether to get each one on the site and by email.
- Progress notices now follow those choices: a switched-off on-site notice is not queued at all, and a switched-off email leaves it on the site only. Migration `20261107120000`, checked live (default emails; email off stays on site; on-site off queues nothing).
- Quote notices follow the same switches (migration `20261107130000`, checked live: default emails, email off stays on the site, site off queues nothing).

### 4k. Long-running agent work — built, tested
- A task's conversation and model-call count are saved after each step (migration `20261107140000`). A run that reaches its time limit before the next model call saves the conversation, returns the task to the queue without counting the attempt, and resumes from that conversation on the next run.
- A total cap of 40 model calls per task, across every pause, stops a task that keeps pausing.
- The worker (`GET /api/cron/tasks`, bearer `CRON_SECRET`) runs queued tasks for up to 40 seconds per invocation. If work is left, it calls itself again, up to 20 times in a chain. Events, the Stripe webhook and the staff send route also start the worker when a task pauses; the daily cron picks up anything left over.
- An errored task stays queued for the daily cron and does not start a loop.
- Tests: 4 new runner tests (pause, resume, total cap, saved steps), 171 across the suite.
- Not yet run against live model calls. No agent is enabled and no AI key is set, so nothing has paused in production yet.

### Security advisor fixes — applied (Phase 7)
- Migration `20261107150000`: two notification trigger functions could be called directly through the API by anonymous visitors. They can no longer be; their triggers still fire (checked live). A helper's search path is now fixed.
- Still open, by choice or outside the code: signed-in users can call the access-check helpers (accepted in the database notes); leaked-password protection is off in Supabase Auth settings, which the owner needs to switch on in the dashboard.

### 3l. Balance payment — built, test mode only (terms to confirm)
- A quote's deposit and balance are now separate rows (migration `20261107160000`), checked live: both can exist on one quote, and a second balance is refused.
- Staff request the balance once the deposit is paid (`POST /api/admin/balance`). It records the balance as due (the total minus the 50% deposit, no VAT) and tells the client, following their quote notice choices.
- The client pays it from their quote (`POST /api/deposits/checkout` with `kind: "balance"`). Payment is refused until staff have requested it. Stripe return pages say so.
- The webhook marks the balance paid but does not raise a "deposit paid" event, so no work is started by it.
- The balance is requested automatically when the order moves to "Reviewing with you", the stage before launch, if the deposit is paid (migration `20261107170000`, checked live: created once, not again when the stage goes back and forth, not created before the deposit is paid). Staff keep the manual button as a fallback.
- Chosen by default: request at the pre-launch review stage (industry standard for web agencies, so the final payment is settled before handover). Wording of the client notice is a draft for the owner to approve.
- Not yet run through a real Stripe test payment end to end; the routes are type-checked and the database rules are checked live.

### 4f. Budget gate wired into the runner — built, tested
- The runner checks every model call against the task, agent, project and global limits. It adds the spend from the current run, because stored totals only change when a run finishes. A call that could exceed any limit is not started, and the task is suspended with the reason. 2 new runner tests, 42 AI tests in total, all passing.
- Still to do before any agent is switched on: the database-backed store must supply the budget limits (`loadBudgets`), reading `ai_budget_settings` and the agent, project and task spend. That needs the server key.

## Documentation (Phase 7 started)
- Written: `ARCHITECTURE.md`, `DATABASE_SCHEMA.md`, `AI_AGENTS.md`, `AI_PERMISSIONS.md`, `SECURITY.md`, `TESTING.md`, `DEPLOYMENT.md`, `ENVIRONMENT_VARIABLES.md`, and this file.
- Written since: `README.md` (rewritten for developers; the original brief is kept at `docs/PROJECT_BRIEF.md`), and `docs/API.md`.
- Still to do in Phase 7: security testing beyond the database suites, payment and webhook testing (needs Stripe), end-to-end testing on signed-in flows, performance and accessibility audits of new screens, backup and recovery validation.

## Production state
- `main` fast-forwarded to `845ac72` (the working branch merged, 22 commits) and pushed. Vercel production built from `main` and is READY.
- Checked live on `www.wnjoweb.co.uk`: `/account` and `/admin` serve (both `noindex`), and the homepage serves. `wnjoweb.co.uk` now returns a 308 redirect to `www`, so the earlier 404 on the bare domain is resolved.
- Still open: the database test suites in `supabase/tests/` have not been re-run since the latest migrations; the Resend and IONOS keys need rotating; Stripe, the AI key and the GitHub App are not connected.

### 3g. Staff-side client linking — built, tested
- Migration `20261107010000`: `client_invites` table (staff read and create for their own agency only, and only for that agency's orders and organisations; no browser edits). `orders.customer_id` may now be empty until a customer claims the order.
- `claim_client_invites()` (signed-in customers only): claims invites matching the verified sign-in email, attaches the order, and adds the customer to the organisations of that order's projects. An order that already belongs to someone else is never taken over.
- `/admin` → Orders: invite a customer by email to an order, and see whether it is waiting or linked. `/account` claims pending invites when a customer signs in.
- Tests: `supabase/tests/client_invites.sql`, 16 checks, all passing against the live database.

### 3h. Staff order tools — built, tested
- Migrations `20261107020000` and `20261107020100`: staff can change an order's stage only (the stage date updates itself), and post updates on their own agency's orders. Updates are append-only.
- `/admin` → Orders: open an order to set its stage and post updates the customer reads.
- Tests: `supabase/tests/order_tools.sql`, 15 checks, all passing against the live database.

### Verification after these changes
- Isolation suite re-run against the live database after the order and invite migrations: 19 of 19 PASS.
- `client_invites` (16) and `order_tools` (15) passing against the live database.
- Full database suite re-run against the live database: all 13 suites pass, 142 checks, 0 failures (isolation 19, quotes 11, acceptance 12, store_quote 4, messages 16, approvals 16, files 9, notifications 11, project_columns 3, staff_projects 4, ai_access 6, client_invites 16, order_tools 15).

## Repositioning and redesign — live (8 November 2026)
- Outcome-led site around Grow, Simplify and Build: new homepage, navigation labels, work page (problem and solution per project), pricing pathways with a payment timeline, goal-led contact step, About principles as plain statements, and updated metadata and structured data. See PROJECT_BRIEF §18.
- Visual changes: one hero accent only, Schibsted Grotesk body text, four-site fan, FYStay build stage, screenshot work strip, phone swiper for the three stages, reveal never hides content.
- Terms: monthly subscription section added and approved (version `2026-11-08`).
- Domains: `wnjoweb.co.uk` and `www` now 308-redirect to `winjodigital.co.uk`; they had been returning Vercel's 404.
- Checked on production: all main pages return 200, no sideways scroll at phone width, homepage links all resolve, phone swiper works. Type check, lint and 223 tests pass.
- Still open: subscription prices; plan names; legal review of the terms; prices are still provisional while Stripe is in live mode.


## Build journey: server-side draft saving (Phase 1) — built, tested; migration needs applying

- Migration `20261109120000_website_brief_drafts.sql`: table `website_brief_drafts` (draft id, payload, expires after 30 days). Row-level security on with no policies, so only the server (service role) can read or write it. **Not yet applied to the production database.** Until it is, saving online answers "not configured" and the form says "Saved on this device only", as before.
- `PUT/GET /api/brief/draft`: saves and reloads a draft. The draft id is a random UUID made in the customer's browser and acts like a magic link: anyone holding the link can read the draft. Answers are cleaned and size-capped (60 KB) on the way in and out; requests are limited to 120 per 10 minutes per connection; responses are never cached. Expired drafts read as "not found" and are cleared out now and then.
- Form: saves about 1.5 seconds after the customer stops typing, once they have moved on or typed something. Shows "Progress saved." with a "Copy a link to continue later" button. `/build?draft=<id>` restores the answers and resumes on the saved step on any device. A sent brief deletes its draft.
- Tests: `src/lib/brief-draft.test.ts` and `src/app/api/brief/draft/route.test.ts` (24 checks). Walked through in a browser on phone and desktop with a stubbed draft API: save, copy link, resume on another browser, unknown link, offline message, no sideways scroll.
- Not done: no database-level SQL test for the new table; the privacy page doesn't yet say in-progress answers are kept for up to 30 days.

## Build journey: customer feedback and revisions (Phase 6) — built, tested; migration needs applying

- Migration `20261109150000_build_revisions.sql`: table `build_revisions` (numbered per build, status waiting / in progress / done / not going ahead). A request's wording can never be edited or deleted; a finished revision can't be reopened; a decline needs a reason. Row-level security: staff read their agency's, customers read only their own build's; every write goes through the server. It also lets the build history record `revision` and `preview` events. **Not yet applied to the production database.** Until it is, customers see no feedback history and requests answer "didn't go through".
- Customer (`POST /api/briefs/feedback`, `FeedbackCard` on the build in `/account`): while the build is "Awaiting customer review" or "Changes requested", ask for changes (the build moves to "Changes requested") or approve the preview (the build moves to "Awaiting WINJO approval"). Approving the preview is not one of the four approvals; those stay with staff and nothing is made public. Limits: 5 unanswered requests at once, 2,000 characters each, 20 requests per 10 minutes.
- Staff (`revision` action on `/api/admin/briefs`, "Customer changes" in Admin, Website builds): start, mark done, or decline (reply required). When the last open change is finished the build returns to "Awaiting customer review" and the customer is emailed.
- Placeholder: how many rounds of changes each package includes isn't defined in the project, so `REVISION_ROUNDS_INCLUDED` is `null` and nothing is capped or charged. Set it once the inclusions are agreed.
- Tests: 30 new checks (`build-revisions.test.ts`, `briefs/feedback/route.test.ts`, `admin/briefs/route.revisions.test.ts`). Screens checked in a browser with sample data (phone and desktop). Not run against the live database, and the emails weren't sent for real.
- Not done: previews don't exist yet (Phase 5), so staff move a build to "Awaiting customer review" by hand; the AI can't yet apply or explain a change.

## Build journey: pay from the quote, and pay the deposit after a proposal — built, tested; not yet run against real Stripe

- **Standard packages end in payment.** On the last step of "Build my website", a monthly package (Core, Plus, Pro) shows its first payment (setup, any one-off extras and the first month), a terms tick that also names the 12-month minimum term, and "Pay £x securely". The server saves the brief, works the price out again from the answers (the page sends no price), creates the offer and the Stripe Checkout, and the customer lands on Stripe. They are emailed their private payment link in case they close the page. A callback is still offered underneath.
- **One-off websites at or under £1,000** also pay the 50% deposit at once (a single payment; no minimum term). **Decision to confirm:** the owner's rule was a 50% deposit for bespoke builds over £1,000. This case (the £999 one-off) wasn't covered, so it takes the deposit online like the rest. To keep it as a request instead, make `payNowFor` in `src/lib/pay-now.ts` return null for `oneOff`.
- **Bespoke builds over £1,000 (and anything needing a custom quote) never pay from the quote.** They go through the written proposal and your approval as before. Once the customer accepts the approved proposal, a "Your deposit" card appears on their build in `/account`: 50% of the agreed price for a one-off build, or the first payment for a monthly build. They tick the terms and go to Stripe (`POST /api/briefs/pay`). The amount comes only from the accepted proposal.
- **Paying moves the build on.** The payment handler now moves a build from "Payment" (or the start) to "AI processing" and records "Payment received." in its history. It didn't before. The build shows "Payment" while the customer is on the Stripe page.
- **One code path for offers:** `createOffer` (`src/lib/website-offers.ts`) is used by staff payment links, by pay-from-quote and by the proposal deposit. Staff can still create a link by hand in Admin.
- **Amounts are shown exactly.** `formatPence` shows pence when there are any, so a £499.50 deposit no longer reads as "£500" in emails or on the payment page.
- Consent: the server refuses a paying order without the terms agreed, and records when in the offer's snapshot.
- Tests: 39 new checks across the pay rule, the stage helpers, the enquiry route, the deposit route and the payment handler. Walked through in a browser (phone): standard package, callback and back, bespoke, £999 one-off, and the account deposit card, with the server reply stubbed. **Not yet run against real Stripe test mode.** Production is currently in Stripe test mode (`STRIPE_MODE=test`).
- Not done: abandoned-checkout reminders beyond the one email; a receipt page that names the build.

## AI website steps: plan and private preview (Phases 4 and 5 of the build journey) — built and tested; needs the AI key and one migration

A paid website gets a first AI draft, and a person decides what the customer sees. The model only writes text.

- **Plan** (`src/lib/ai/website-plan.ts`): the model reads the customer's brief and returns a JSON plan (pages, sections, tone, search text, assumptions, questions). The reply is checked strictly: wrong shape, too many pages for the package, repeated pages and HTML are rejected, never repaired. The prompt never mentions prices, contracts or publishing.
- **Page copy** (`website-content.ts`): for each page of the plan, the model writes headline, intro, sections and a button label. Text only; links and HTML are stripped. A customer's requested change can be passed in to write the pages again.
- **Pipeline** (`website-pipeline.ts`): up to three tries when a reply is the wrong shape; a spend cap per website (`AI_MAX_PENCE_PER_BRIEF`, default 100p, £1) checked before every model call; a preview is whole or not saved. Refused keys and busy services give plain messages.
- **Storage** (migration `20261109190000_website_ai_plans_and_previews.sql`): `website_plans` and `website_previews`. Staff can read them; every write goes through the server. The preview's secret address is not readable from the browser. The migration also adds the `ai` and `expected` history kinds. **Not yet applied to production.** Note: until it is, the "expected by" history line is not recorded (the date still saves).
- **Private preview page** (`/preview/<secret address>`): the customer's words in a fixed layout, themed from the look they chose. No scripts or links from the model run. Kept out of search, sends no referrer, and a withdrawn preview shows a 404. Staff open a draft through the admin; a customer gets the address only for a released preview, and only if they are the website's owner (`POST /api/briefs/preview`).
- **Staff panel** (Admin, Website builds, a website, "AI website"): make the plan, write the preview (optionally applying an open customer change), view it, release it to the customer, or withdraw it. Releasing moves the build to "Awaiting customer review" and emails the customer. Routes: `POST /api/admin/ai/website` (plan, preview, release, withdraw, link). Rate limited to 30 a hour per person.
- **Automatic first draft**: after a website payment is confirmed, and in the daily sweep, any paid website still at "AI processing" with no plan gets a plan and a draft preview (at most 2 per run). With no AI key it does nothing and staff start the steps by hand.
- **Human control:** nothing the AI writes reaches a customer, moves a build to customer review, changes a price or goes live without a person. The four approvals before going live are unchanged.
- **To switch on:** set `ANTHROPIC_API_KEY` (and optionally `AI_MAX_PENCE_PER_BRIEF`), and apply the migration. Then do one live run on a test website.
- Tests: 40 new checks (prompts and checks, pipeline, service rules, routes, automatic drafts, the provider request shape). All use a fake provider. **Never run against the real Anthropic service**: it needs one live check once the key is set. The empty tools list is now left out of a request.
- Not built: image generation, a visual design beyond the fixed text layout, and AI-applied edits beyond rewriting a page's copy. The older five-agent engine is separate and still switched off.
