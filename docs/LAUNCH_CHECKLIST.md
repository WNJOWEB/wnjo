# Launch checklist

Working list for launching the AI-assisted website journey. Items marked **Decision** need the owner's answer before
they can be done. Nothing here is pushed or deployed until the owner says so.

## Done and tested
- [x] Package prices: Core £99, Plus £149, Pro £199 (setup fees match monthly prices). Pages are priced from each plan's own band.
- [x] Stripe payments are in GBP only (adaptive pricing off).
- [x] Deposits: 50% of a one-off website, taken from the quote, for every one-off package.
- [x] Revisions: two included rounds per website, enforced on the server and shown to the customer.
- [x] Customer accounts: websites, progress, proposals, payments, feedback, notifications, plan and billing.
- [x] Customers read their own websites through row-level security. Their plans are read through a function that returns only the fields the account shows (migration applied in production).
- [x] Billing button only opens the customer's own Stripe billing page. Email matching is exact (no wildcard matches).
- [x] Staff: builds, approvals (quality, pricing, contract, publication), subscriptions, orders and expected dates.
- [x] Admin screens on desktop and phone: enquiries, quotes, approvals, projects, orders and subscriptions.
- [x] 500 automated tests pass; type checks and lint pass.
- [x] Customer-facing AI wording removed: the build step reads "Building your website" (was "Planning your website").
- [x] Phone menu has a "Client sign-in" link.
- [x] Sign-in emails send as "WINJO DIGITAL <enquiries@winjodigital.co.uk>" through a Resend key for the verified domain, entered in the Supabase dashboard. Confirmed by the owner, 12 Nov.

## Done since the handover list (on main)
- [x] **Short checkout:** the name is required on the form and the server. The "New customer" stand-in is gone.
- [x] **Plans swipe on phones:** the pricing page plans swipe sideways, the same as the home page.
- [x] **Pricing hero:** "Choose a plan" is the only button; "Compare what each plan includes." is a plain underlined link.
- [x] **Managed websites hero:** the "On your own / With WINJO" switch drives the EV Exec walkthrough and its four jobs. Swipes on phones.
- [x] **Wording:** "Buy your website outright" is now "Own your website" in the menus, the project page and the App development link.
- [x] **Tagline kept:** "Your website. Our responsibility." stays as the brand tagline, in the footer, the metadata and the About page call to action. Decided by the owner.
- [x] **About page tidied:** the two long paragraphs are now short labelled tick lists, the statement is smaller, and the four engineering standards have three ticks each. Ticks now show on dark sections.
- [x] **Plan journey told truthfully:** "How it works" now reads Choose, Tell us, Build, Launch; the article describes the real plan checkout and the separate "Own your website" proposal route; the confirmation page says "Thank you, your payment is in" instead of "You're all set".
- [x] **Welcome email:** tells the customer to sign in and share their goals, pages and style, with the account link. No longer says the package "is set up".
- [x] **Numbered steps removed:** app development, contact "What happens next" and the confirmation page. Carousel position counters ("01 / 03") stay.
- [x] **"Own your website" used everywhere:** menu, project page title, home and pricing buttons and headings. "Every £99 plan" is now "every managed plan"; "£99/month" is "£99 a month".
- [x] **Remaining two-sentence headlines rewritten** on home, managed websites, pricing, booking systems and app development.
- [x] **Boonma on its own domain:** the case study, the work pages and the "Visit the live site" links now use `boonma.co.uk` (the owner confirmed it; `www.boonma.co.uk` redirects to it).
- [x] **Checkout details:** the pay screen asks for name, business name, email and an optional phone number. It also shows the 14-day delivery promise, the 30-day cancellation notice, and how to call or message us. The business name is required on the server too.
- [x] **Confirmation page no longer imports a server-only module** (it pulled Node's crypto into the browser bundle and broke the dev build).

## Done since 12 November (on main)
- [x] **Ten templates, to one standard (14 November, not yet on main):** Grooming, Beauty, Wellbeing, Fitness, Health, Hospitality, Tradesman, Plumbing, Building and Cleaning, plus Accommodation. The standard is that the form collects enough to write a good site. Every template asks "What makes your business different?" (required, in the customer's own words) and three or four questions of its own, each with a hint. The writer is given those answers and told to say nothing they don't. Each template has sector claim rules (no promised cures or results, registrations and accreditations only when ticked, no invented ratings, dietary claims only when ticked) and a tick the customer can use to lift each one. Every template has complete sample answers, and a test proves they become the facts its sample site was written from and that the site passes every check. The customer's own words, prices, emails and numbers are never flagged as invented, and their own service names are never judged. A customer with a draft started before this must now answer the new question before the site is built.
- [x] **Templates a small model can finish (14 November, not yet on main):** the template now writes the headings, button labels, request text and closing line itself, so the model writes only the headline and intro, plus optional descriptions and FAQ answers. If the model's reply can't be used, the build still produces a complete draft from our wording and the customer's own words, marked for a person to read. Tests prove every template passes every check with no model, and from a reply of only a headline and an intro. A real-model test exists but has not been run (it needs a key).
- [x] **Tier picker on Own your website (14 November):** the tiers on `/website-projects` now choose the same way as the pricing page: a card each, with a button that turns the card dark. Each tier keeps its example site. The bottom bar's "Choose a package" button and the "Change" link on the details form reach the section again (`#packages`, which was a broken link).
- [x] **Plan-aware template build (14 November):** a template site takes its section set from the customer's plan. Essential leaves out the facts strip and the FAQ; Professional and Premium keep every section. With no plan known, every section is kept. Tests cover each case. The Professional and Premium extras (timetable, local pages, blog) are not built yet.
- [x] **Plan for templates by website plan (14 November):** the agreed plan is in `docs/PLAN_TEMPLATES_BY_TIER.md`. The plan sets the structure and the sector sets the content. The EV Exec operator and driver apps are sold separately, never implied by Premium.
- [x] **Physio template:** a fourth sector, with treatments, hours, address and appointment requests. It can't promise results or cures, and only mentions a registration if the customer ticks it. Sample build passes every check.
- [x] **Own your website tiers:** Essential from £999, Professional from £1,999 and Premium from £2,999 (owner, 14 November). Each card lists what's included, and the page size carries into the proposal form.
- [x] **Services page flow:** choose a tier, then hosting (with the managed-plan upsell beside it), then continue to the proposal.
- [x] **Proposal form:** asks for an optional phone number, as the mobile form does.
- [x] **Menu on the proposal page:** highlights Services, not Managed websites, and the breadcrumb reads Home > Website projects > Own your website.
- [x] **Pricing on tablets:** the chosen plan reads "Core selected", and the bar says "Continue with Core".
- [x] **Managed websites examples:** a swipeable carousel of all five sites (FYStay included), headed "Five sites, five identities."
- [x] **Desktop and phone consistency audit (14 November):** every public page compared at desktop, iPad and phone size. Fixed the sideways scroll on pricing on phones, the missing Continue bar after choosing a plan on desktop, and the homepage section links hidden on phones. Signed-in account and admin screens were not covered.
- [x] **Hosting-only request flow (14 November):** new page `/build/hosting`, linked from the services and pricing pages. Choose Hosting, Care or Care Plus, say where the website is up to, give details. The price comes from the plan on the server. Tested.
- [x] **Hosting-only, online payment (14 November):** `/build/hosting` takes payment through Stripe. Database change applied (package codes `hosting`, `care`, `care_plus`). Tested on the live site in Stripe test mode: Care Plus hosting reached Stripe at £220 a month, the payment returned to the hosting confirmation page, the webhook activated the plan (one payment, no ownership milestone) and the owner got one alert after payment and none before. The customer welcome email's layout was checked in Gmail on a phone (owner, 14 November).
- [x] **Grok context audit (14 November):** the one-off website quote is priced from the tier that fits the pages (Essential £999 for up to 5, Professional £1,999 for up to 10, Premium £2,999 for up to 20), matching the website. Tier page limits are now 5, 10 and 20, the same as the managed plans. The template writer is told the sector rules (such as no promised cures) up front. The older instant-quote calculator keeps its original prices and is no longer used by any customer page.

## Before launch
- [ ] **AI quality checks (see `docs/AI_QUALITY_PLAN.md`):** criteria checks, copied-wording check, retry rule, and a £10 ceiling. Owner to confirm the ceiling and word limits.
- [ ] **Full Fable audit before launch.** Scope:
  - Signed-in account and admin screens: every page and action, including what a customer sees of someone else's data.
  - Database security advisor (Supabase): row-level security on every table, and the brief pass (write-only, one brief, 48 hours).
  - Live payments: the plan checkout, the deposit and balance, the billing portal, and the webhook's handling of each event, including retries.
  - Public site: visual polish on phone and desktop, the buying path (tiers, hosting, six questions), wording, SEO and AEO markup.
  - Email layout and copy as sent in a real inbox, plus the terms wording for the exit clause.
  - Grok: the live AI reply shape, once the settings are in.

## Not started

## Still to do before launch
- [x] **Cancellation request:** test cancellation on WS-1C9980 (12 Nov). The customer confirmation gives the end date, 12 December 2026, and the staff alert was delivered. Owner confirmed. Not yet checked: the Stripe cancel-at-period-end flag and the history entry.
- [x] **Hotmail delivery:** sign-in emails reached Hotmail once Microsoft's outage cleared. Owner confirmed, 12 Nov.
- [x] **DMARC:** a record is live on winjodigital.co.uk (`_dmarc` points to IONOS, `v=DMARC1; p=none;`), checked 12 Nov. No reporting address (`rua`) is set; adding one is optional.
- [x] **Plan & billing:** test as a signed-in customer with a test plan (the plan list and Manage billing button). Not yet checked against production data. Confirmed by the owner: works.
- [x] **Staff subscriptions:** the staff read rule is unchanged in the database. Confirm by signing in as staff.
- [x] **Sign-in link:** confirm the emailed link lands on the account page, not the home page. The code sends it to `/account` (checked in code). Not yet tested with a real email. Confirmed by the owner: works, tested several times.
- [x] **Live site:** Core shows £99 a month with no extra pages (checked on the live site).
- [x] **Preview check:** Plan & billing and the five-step bar checked on a phone-sized layout.
- [x] **Staff:** expected date set on WNJO-D95245 (20 November, owner confirmed). WNJO-D59321 has no date until its goals arrive, because the 14-day promise counts from then.
- [x] **Test-mode subscription:** no subscriptions left in the database for the test customer. Confirm in the Stripe test dashboard.

## Grok switch-on (last step before launch)
- [x] Apply migration `20261109190000_website_ai_plans_and_previews.sql` (applied; tables and rules checked).
- [x] Customer preview permissions locked down: the secret preview address isn't readable from the browser.
- [x] **Stripe test setup (13 Nov):** the WINJO Digital test account is set up, with the test key and webhook on production and preview. A test order on the site was paid and processed by the webhook. Test customers and subscriptions were removed, and the test product is switched off.
- [ ] Set `XAI_API_KEY`, `XAI_MODEL`, `XAI_INPUT_PENCE_PER_MILLION_TOKENS` and `XAI_OUTPUT_PENCE_PER_MILLION_TOKENS` in Vercel (optional: `AI_MAX_PENCE_PER_BRIEF`, default 300).
- [x] Run one test website end to end: pay in test mode, check the plan and preview appear in Admin, view the draft, release it, and open it from the customer account. Confirmed by the owner (already done).
- [ ] Check the model's reply shape against the live service. The code was only tested against a fake.
- [ ] **Try a small model on the templates:** run `src/lib/site-template/eval.test.ts` against Haiku (see `docs/AI_QUALITY_PLAN.md`). It reports the pass rate and the cost per site. Needs an Anthropic key.

## Decisions needed from the owner
- [x] ICO data protection fee: registered and Direct Debit set up (owner, 12 Nov). Application number C2085772. The ICO sends the registration confirmation within three working days, with the registration number.
- [x] ICO registration number on the privacy page: done for now. The owner will pass on the number from the ICO's confirmation email, and it goes on the privacy page then.
- [x] Privacy note: the 30-day retention of unsent briefs is on the privacy page.
- [x] Ownership line when due: "Ownership is available to you now. Message us whenever you'd like to talk it through."
- [x] Ending care: message only.

## Remaining list from the other Claude account (checked at 3b554bc)
Source: the handover list. Checked against `main` at `3b554bc`, which is the same commit as this branch.

### Needs the owner
- [x] **Trust facts:** done. Sole trader, so no company number. The registered address is in the terms. Not VAT registered. No reviews yet (new business). One-person business, so no team photos. The guarantees are as already agreed.
- [x] **Delivery timeline:** decided. A managed website is live within 14 days of us having the customer's goals, pages and style. Shown on the pay screen and in the welcome email (`DELIVERY` in `src/lib/pricing.ts`).
- [x] **Refresh slider:** decided. Keep the before-and-after with the Harbour Kitchen example, labelled as an example, using the owner's three photos (launch, first refresh, second refresh). The owner confirms the photos are licensed for use.
- [x] **Terms:** agreed. Published as drafted, without a solicitor review.
- [x] **Two tick boxes on the payment screen:** kept, under a "Before you pay" heading, with plainer wording. The owner is happy with them.

### Needs testing (cannot be done from the build environment)
- [x] **Test payment:** run a plan through Stripe test mode, including the confirmation page, the account and the owner email. Needs Stripe test keys. Confirmed by the owner several times: payments go through, and both the owner and the customer get an email.
- [x] **Owner email after payment:** pay a plan in Stripe test mode and confirm exactly one owner email arrives, after the payment ("New … subscription"), and none when the form is submitted. Confirmed by the owner: the owner gets an email after payment.
- [x] **Customer emails after payment:** pay a plan in Stripe test mode and confirm the customer gets only the welcome email, with no "Your website is waiting" email and no "Tell us about your website" reminder for a day or until the goals form is filled in. Confirmed by the owner: the customer gets an email after payment.
- [x] **Goals email right after payment:** test payment WS-1C9980 (12 Nov). The "Thank you. Now tell us about your website" email arrived at 19:01, the same minute as the payment. It links to the account page; it doesn't contain a one-time sign-in link. Owner confirmed.
- [x] **Buy-outright flow, rebuilt (12 Nov):** tested end to end. Run 1 (WNJO-240065): request, six steps, quote, deposit, preview approval, balance, handover and the handover email all passed. Run 2 (WNJO-8B11E9): proposal sent and accepted, deposit paid, preview approved by the customer, four approvals done. Handover was not repeated on run 2.

- [x] **Production builds:** checked on the live site for `4a82cb4`. The WINJO Refresh photos and "Own your website" wording are being served. WINJO Refresh and pricing look right on a phone (390px) and a desktop (1280px), with no sideways overflow and no page errors.

### Known issues, not fixed
- [x] **Project package sizes:** the cards now pass the form's own sizes (Essential up to 5, Professional 11 to 15, Premium more than 20 pages), read from the form's size list, with a test.
- [x] **Desktop header:** the full menu, with Services, now shows from 1024 px (was 1184 px). Checked on one row at 1024, 1100, 1183 and 1280 px.
- [x] **Cost of `/build`:** a plan-less `/build` now goes to the plans. Plan, project, care, draft and `?full=1` links still open the form. The site styler links to the plans directly.

### Suggested decisions
- [x] **Payment confirmation:** decided by the owner: customers can no longer pay with only an email address. The name and business name are required at checkout, and the server refuses a payment without them, so "Hi there" only appears in older records saved before this rule.
