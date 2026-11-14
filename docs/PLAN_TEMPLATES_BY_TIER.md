# Plan: templates by website plan

Status: AGREED (14 November 2026), not built. The owner agreed the recommendation below. Commit stays local until the
owner says "push" or "merge to main".

## The decision

- **The plan sets the structure.** Essential, Professional and Premium each have a template level: how much the site
  has and what it can do.
- **The sector sets the content.** Barber, café, physio and so on keep supplying the wording rules, the voice and the
  restricted claims. A customer picks a plan and a sector; the two combine.
- **Custom software is not part of a plan.** EV Exec's operator app and driver app are bespoke software, not a
  website template. They are sold separately as a bespoke add-on, never implied by the Premium plan.

## The example sites

Each plan keeps the real site it already shows on its card. The template is built from that site's structure and
feel with fresh wording. No client wording, images or branding are copied. All six site repos were checked
(read-only) on 14 November 2026.

| Plan | Example | Template takes from it | Left out |
|---|---|---|---|
| Essential (£999, up to 5 pages) | Boonma | A simple, calm site: services, hours, gallery, enquiry | Nothing: it is already a small site |
| Professional (£1,999, up to 10 pages) | RAENG Fitness | A timetable, offer cards with prices, booking requests | The coach portal |
| Premium (£2,999, up to 20 pages) | EV Exec | Local landing pages, a booking enquiry, a blog | The operator app, the driver app, the 30-page count |

## Proposed section levels

The template today is one page of nine section kinds (hero, services, hours, gallery, facts, area, enquiry, faq, cta).
A plan decides which kinds are available.

| Section | Essential | Professional | Premium |
|---|---|---|---|
| Hero, services, hours, area, enquiry, closing line | yes | yes | yes |
| Gallery | yes | yes | yes, more photos |
| Facts strip | no | yes | yes |
| FAQ | no | yes | yes |
| Timetable (new) | no | yes | yes |
| Local pages (new): one per area served | no | no | yes |
| Blog posts (new) | no | no | yes |

The owner can move any row. This is a proposal.

## The gap to know about

Template sites are one page today, so the 5 / 10 / 20 page limits on the plans are not used by the template builder.
Professional and Premium only mean something once a template site can have more than one page. That is the largest
piece of work here, so it is its own step.

## Build order

1. **Plan-aware build.** Pass the plan into the build and filter the sector's sections by plan. With no plan given
   the build behaves exactly as it does now, so nothing changes for existing sites. Tests for each plan and sector.
2. **New sections.** Timetable first (Professional), then local pages and blog posts (Premium). Each needs a schema,
   writer guidance, checks and a layout, with tests.
3. **More than one page.** Pages per plan, with the page limits enforced.
4. **New sector presets.** Wellbeing and massage (from Boonma), fitness (from RAENG), holiday let (from LSL-Lodge).
   Duratek, EV Exec and FYStay stay as portfolio examples only.
5. **One list of categories** for the Work page and the template builder: Beauty and wellbeing, Fitness and leisure,
   Food and hospitality, Trades and building, Transport.
6. **Plan cards** show what each template level includes, as a swipe or a small preview, not as paragraphs.

## Open questions for the owner

- Should Essential include the gallery? The table says yes, because photos matter to small sites.
- Does Premium really need a blog, or are local pages enough?
- Where does the plan come from for a template site? It follows the quote the customer accepted, so the build reads it
  from there.

## What does not change

- Prices, the 14-day delivery promise and the fair terms.
- The checks, the retry rule and the person who releases every draft.
- The AI settings: provider, model and spending cap.
