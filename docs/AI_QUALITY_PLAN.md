# AI quality plan (Claude drafts)

Status: BUILT for template sites (14 November 2026). Quality is judged by checks, not by money. The checks below run on every template build. The free-form plan and page steps for a bespoke website get the three-round retry and the £10 ceiling, but not these content checks.

## The rule
Claude (Haiku 5.5) drafts the plan and each page. Each page is checked. A page that fails gets another round with the reasons
attached, up to 3 rounds. If it still fails, a person sees the page and the reasons (`MAX_ROUNDS` in `src/lib/ai/limits.ts`). Nothing reaches a customer
until a person releases the preview.

## The money ceiling
- £1 per website (owner, 14 November 2026), as a safety net against a runaway loop. It is not a quality target. `DEFAULT_MAX_PENCE_PER_BRIEF` in `src/lib/ai/limits.ts`; `AI_MAX_PENCE_PER_BRIEF` overrides it.
- Each draft's real cost is logged, so the ceiling can be set from measured spend once the AI is live.

## Criteria
Already in place:
- Every fact is from the customer's answers (no invented prices, numbers, addresses, reviews or claims).
- Sector rules (for example, no promised cures on physio sites).

To build:
1. **Coverage:** every section in the plan is present and filled in.
2. **One clear next step:** each page has one clear call to action that matches the sector (for example, "Request an appointment").
3. **Plain English:** short sentences; no filler phrases such as "passionate team", "cutting-edge" or "one-stop shop".
4. **Length:** headlines and intros stay within set word counts.
5. **SEO basics:** one H1 per page; a title and a description; alt text on every image.
6. **Consistency:** the same service names, prices and hours on every page.

## Originality
- The writing prompt says: write only from the customer's facts, and never copy phrasing from any site.
- A copied-wording check compares each draft with a store of phrases from sites we have been asked to avoid, and
  flags any long exact match for a person to review.
- Sector templates are our own fixed layouts, so the model fills in the words only.
- The free-form plan step (more freedom, more risk) is left for later, after the checks are built.

## Order of work
1. Add the criteria checks (coverage, call to action, plain English, length, SEO basics, consistency), with tests.
2. Add the copied-wording check, with tests.
3. Add the retry rule (3 rounds, then a person), and the ceiling.
4. Test against Claude Haiku 5.5 once the key is set, and set the ceiling from the measured cost.

## Owner decisions
- Decided: the ceiling is £1 a website, and there are no word limits.

## Making a small model enough (14 November 2026, built)
The aim is a template good enough that a small, cheap model (Haiku) can finish the website.
- **The template writes almost everything.** Headings, button labels, the request text, the closing line and the area
  text are fixed wording in each template (`copy` in `presets.ts`), written once by us. None of it makes a claim about
  the business.
- **The model writes only what needs a voice:** the hero headline and intro, plus an optional tagline, short service
  descriptions and up to four FAQ answers. It is shown a style example for its own sector, with [brackets] where the
  customer's facts go, and a bracket left in is caught by the placeholder check.
- **It works from the customer's own words.** Every template asks "What makes your business different?" and three or
  four questions of its own. The model may rephrase the answers and never add to them.
- **There is always a draft.** If the model's reply can't be used, the build uses our fixed wording, a headline from
  the trade and the place, and the customer's own words as the intro. It passes every check, is marked failed so a
  person must read it before it is released, and says so.
- **Every template is tested without a model:** a site built from our wording alone passes every check, and so does a
  site finished from a reply of only a headline and an intro.

Measuring a real model: `src/lib/site-template/eval.test.ts` writes every template several times with the configured
model and reports the pass rate and the cost per site. It does nothing in the normal run. To try Haiku:

    AI_EVAL=1 ANTHROPIC_API_KEY=... npx vitest run src/lib/site-template/eval.test.ts

That uses Claude Haiku 5.5 with low thinking, the defaults.

It fails if fewer than 90% of sites pass on the model's own wording (`AI_EVAL_MIN_PASS` changes that). Not run yet: it
needs an Anthropic key.

## What the checks do (built 14 November 2026)
All in `src/lib/site-template/checks.ts`, with tests in `quality.test.ts`. A site that fails any of them is tried again
with the reasons, up to three times, and then goes to a person marked failed.
- **Coverage:** every required section is present and filled in (already in place).
- **One clear next step:** the top of the page has a next step, and the end of the page says the same thing
  (`cta-missing`, `cta-mismatch`).
- **Plain English:** no filler phrases (`FILLER_PHRASES`, for example "passionate team", "cutting-edge", "one-stop
  shop"). The customer's own words are never judged.
- **Length:** no word limits (owner, 14 November 2026). Only the character limits the page layout needs apply
  (`FIELD_LIMITS` in `schema.ts`), so text can't break the design.
- **Search basics:** the page has an intro, which is its description, and every image has alt text (`no-description`,
  `missing-alt`). There is one headline per page, because a template has one top section. The page title is not
  checked, because a template does not set one yet.
- **Consistency:** the same service names, prices, hours and places as the customer gave (already in place).
- **Copied wording:** any run of 7 words in a row that exactly matches wording listed in `avoid-wording.ts` is
  flagged (`copied-wording`). The list starts empty: paste in a competitor's paragraphs when a customer points at one.
  A run the customer wrote themselves is not counted.
- **Asked up front:** the prompt states the filler to avoid and the no-copying rule, so fewer drafts need another
  round.
