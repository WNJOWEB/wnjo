# AI-assisted website build: spec

Status: draft for the owner to review. Nothing here is live. The customer-facing site makes no AI claims until this is built and tested.

## Goal

A customer pays for a managed website, answers a short set of questions, and gets a bespoke-looking preview that the owner reviews before it goes to them. The owner can ask for revisions, and the customer can ask for changes after that. The whole thing should be cheap to run, quick, and good enough that customers don't complain.

## Principles

1. **Templates, not generated code.** The owner designs a small set of sector templates once. The AI fills them in. It never writes a site from scratch.
2. **Structure first.** The customer's answers are structured (tick boxes, short fixed options). Free text is only used where no tick box can capture the answer.
3. **Checks, not trust.** Automatic checks decide whether a build is usable. The AI is never asked whether it is "happy" with its own work.
4. **A person releases everything.** Nothing reaches a customer until the owner approves it. The existing approval step stays as it is.
5. **Hard spending limits.** Each website has a cap, already enforced, and the AI calls are kept small.

## The flow

1. **Customer pays.** The existing checkout takes the first payment. Nothing changes here.
2. **Customer picks a sector.** A set of tick-box cards (Barber, Café, Electrician, Physio, and so on). Picking one selects a template.
3. **Customer answers the questions.** Tick boxes wherever possible. See "The questions" below.
4. **Build job is queued.** The customer's answers are stored as a build job, with the template id.
5. **The AI fills the template.** For each section of the template, the model writes the wording and chooses options from the allowed list. Output must match the template's schema.
6. **Checks run.** See "Checks" below. A build that fails is retried once with the failure reason, then flagged for the owner.
7. **Preview is saved.** A private preview is rendered from the template plus the content. Only the owner can open it.
8. **Owner reviews in the admin.** The build appears under "Needs you now". The owner either approves it, or writes a revision note. A revision note re-runs step 5 with the note added.
9. **Customer sees the preview.** The customer can request changes in their account. Each request is a new revision, and the owner reviews it again.
10. **Owner approves, site goes live.** The existing release step is used.

## Templates

- A template is a fixed page layout for one sector: sections in order, each with a type (hero, services list, prices table, gallery, booking, opening hours, contact, testimonials, and so on).
- Each section has a schema: which fields it has, how long each field can be, and which options are allowed.
- Each template has a small set of visual variants (colour theme, type pairing, corner style), chosen from tick boxes.
- The owner builds the first three templates: **Barber, Café, Electrician**. These match the existing site styler designs, so the look already exists.
- A template is only added once it has a sample build that passes every check.

## The questions

The form stays short. Target: under five minutes.

- **Sector:** the template card (required).
- **Goals:** tick boxes, up to three (bookings, more enquiries, showing work, trust, recruiting, and so on).
- **Pages:** tick boxes from a fixed list the template supports, plus "add another" for uncommon ones.
- **Colour theme:** the existing colour tick boxes.
- **Look:** a few tick boxes (clean and minimal, warm and friendly, bold, classic).
- **Services and prices:** a short list, one per line, with an optional price. This is text only because there is no other way to capture it.
- **Opening hours:** a tick-box grid for days, with time fields.
- **Contact:** phone and address (both optional, but at least one contact method is required).
- **Photos and logo:** uploads, optional.
- **Anything else:** one optional text box.

Text fields are only used where a tick box can't do the job. Each field has a length limit.

## Checks

A build passes only if all of these hold:

- Every required section in the template is filled.
- No placeholder text is left (for example "Lorem", "Your headline here", "[business name]").
- Each field is within its length limit and uses only allowed options.
- The business name, and any services and prices the customer gave, appear in the output.
- No prices, contract terms, legal wording or contact details are invented. Anything not supplied by the customer is left out, not made up.
- The output parses against the template schema.

The owner can always override a failed check when reviewing.

## Models

- **Writing step (filling the template):** a small, low-cost model is enough, because the task is short and structured. Haiku-class models are the right choice to test first. Cost target: under 10p per build.
- **Planning and extraction (turning answers into a build job):** can use the same small model. No code is generated, so no larger model is needed.
- **The provider is Claude (Anthropic), Haiku 5.5 by default.** The owner dropped Grok on 14 November 2026. Only `ANTHROPIC_API_KEY` is required. The model, its thinking level and its prices are settings with defaults, so the model can change without rebuilding.
- **Claude Code is not used in the loop.** It isn't needed for template filling, and it would be far more expensive per site.

## Cost

- Hard cap per website, already enforced (default 100p, £1).
- A build should use one planning call and one writing call per section, with a total target of under 10p.
- Revisions re-run the writing step only, not planning.

## Build service

- Runs inside this repo's existing server code and database. No new hosting account.
- Reads only what the build needs: sector, answers, uploads' locations. It never sees payment details or contact details it doesn't need.
- Writes drafts to the database. It never moves a build's stage or publishes anything, the same rule as the current AI pipeline.

## What is built and what is missing

| Part | Status |
| --- | --- |
| Payment, account, goals form, uploads | Built |
| AI plan and page wording as drafts, spend cap | Built (uses Claude; untested against the live service) |
| Owner review and release, customer revisions | Built |
| Sector templates (Barber, Café, Electrician) | Missing |
| Template-driven rendering of a preview | Missing |
| Sector question and tick-box form for the template | Missing |
| Automatic checks listed above | Missing |
| Revision notes re-running the writing step | Partly built (the preview draft stores a change note) |
| Anthropic (Claude) provider | Missing |
| Hosting customer sites on their own domain | Not designed |

## Phases

1. **One template, end to end.** Barber only. Build the template, the form for it, the checks, and the preview. Test with three made-up barbers and one real customer's answers (with permission).
2. **Owner review and revisions.** Connect the admin review and revision loop to the new previews.
3. **Café and Electrician templates.** Add them, using the same process.
4. **Model check.** Run the template test (`src/lib/site-template/eval.test.ts`) against Haiku, and a larger Claude model if the pass rate is low. Compare quality, failures and cost.
5. **Customer-facing copy.** Only once the process has passed a real test, write the public description of how it works.

## Decisions for the owner

- Which sectors first, if not Barber, Café and Electrician.
- Whether the owner always reviews every build, or only the first build for each template.
- Whether a customer can see the template name, or only the finished preview.
- The model: Claude Haiku 5.5 (decided 14 November 2026). Grok was dropped.

## Open risks

- A template can look generic if the owner's design is generic. The owner should review the templates themselves before they're used.
- Customers who fill in very little will get thinner sites. The form should say so, and the checks should stop empty sections from reaching the preview.
- The customer-hosting question has no answer yet. It needs its own decision before the first customer goes live.
