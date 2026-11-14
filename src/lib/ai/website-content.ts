/**
 * The words for one page of the website. The model writes text only: no HTML, no scripts, no links. Our own code lays the
 * text out in a fixed design when the preview is shown, so nothing the model writes can run in a visitor's browser.
 */
import { extrasRows } from "@/lib/brief-extras";
import { profileLines, type WebsiteBrief } from "@/lib/website-brief";
import { extractJson, PLAN_LIMITS, type PlanPage, type WebsitePlan } from "./website-plan";

export const CONTENT_LIMITS = { headline: 120, intro: 500, heading: 80, body: 900, bullet: 160, bullets: 8, cta: 40 } as const;

export type ContentSection = { heading: string; body: string; bullets: string[] };
export type PageContent = { slug: string; headline: string; intro: string; sections: ContentSection[]; cta: string };

export const CONTENT_SYSTEM =
  "You are a copywriter at WINJO DIGITAL, a UK web design agency. Write website copy in plain British English for the " +
  "page you are given. Use only facts from the brief. Where a fact is missing, write general copy that does not " +
  "claim anything specific: never invent names, numbers, reviews, awards or prices. No HTML. Reply with one JSON object " +
  "and nothing else.";

const SHAPE = '{"headline": string, "intro": string, "sections": [{"heading": string, "body": string, "bullets": [string]}], "cta": string}';

/** A change the customer asked for, applied when a page is written again. Plain text, trimmed. */
export function buildContentPrompt(input: { businessName: string; brief: WebsiteBrief; plan: WebsitePlan; page: PlanPage; change?: string }): string {
  const { plan, page, brief } = input;
  return [
    `Business: ${input.businessName}`,
    `Tone: ${plan.tone || "Friendly and professional"}`,
    brief.goalNote ? `About the goal: ${brief.goalNote}` : "",
    brief.avoid ? `To avoid: ${brief.avoid}` : "",
    brief.functionality ? `Features needed: ${brief.functionality}` : "",
    ...(brief.otherBusinessType ? profileLines(brief.profile).map((l) => `Customer's answer. ${l}`) : []),
    ...extrasRows(brief.extras).map(([label, value]) => `Customer's answer. ${label} ${value}`),
    `Page: ${page.title} (${page.purpose || "no purpose given"})`,
    "Sections, in order:",
    ...page.sections.map((s) => `- ${s.kind}: ${s.heading}${s.points.length ? ` (${s.points.join("; ")})` : ""}`),
    input.change ? `The customer asked for this change: ${input.change.slice(0, 1000)}` : "",
    "",
    `Write the page copy as JSON in exactly this shape: ${SHAPE}`,
    "Use one entry in sections for each section listed above, in the same order.",
  ]
    .filter((line, i, all) => line !== "" || all[i - 1] !== "")
    .join("\n");
}

const clean = (value: unknown, max: number): string =>
  typeof value === "string"
    ? value
        .replace(/<[^>]*>/g, "")
        .replace(/https?:\/\/\S+/gi, "")
        .replace(/[ \t]+/g, " ")
        .trim()
        .slice(0, max)
    : "";

export type ParsedContent = { ok: true; content: PageContent } | { ok: false; reason: string };

export function parseContent(text: string, page: PlanPage): ParsedContent {
  const raw = extractJson(text) as Record<string, unknown> | null;
  if (!raw || typeof raw !== "object") return { ok: false, reason: "The reply was not JSON." };
  const headline = clean(raw.headline, CONTENT_LIMITS.headline);
  if (!headline) return { ok: false, reason: "The page has no headline." };
  const sectionsRaw = Array.isArray(raw.sections) ? (raw.sections as Array<Record<string, unknown>>) : [];
  const sections: ContentSection[] = [];
  for (const s of sectionsRaw.slice(0, PLAN_LIMITS.sectionsPerPage)) {
    const heading = clean(s?.heading, CONTENT_LIMITS.heading);
    const body = clean(s?.body, CONTENT_LIMITS.body);
    if (!heading && !body) continue;
    const bullets = Array.isArray(s.bullets) ? s.bullets.map((b) => clean(b, CONTENT_LIMITS.bullet)).filter(Boolean).slice(0, CONTENT_LIMITS.bullets) : [];
    sections.push({ heading, body, bullets });
  }
  if (sections.length === 0) return { ok: false, reason: "The page has no sections." };
  return { ok: true, content: { slug: page.slug, headline, intro: clean(raw.intro, CONTENT_LIMITS.intro), sections, cta: clean(raw.cta, CONTENT_LIMITS.cta) } };
}
