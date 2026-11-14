/**
 * The website plan: what the model is asked to produce from a customer's brief, and how its answer is checked. Pure, so the
 * prompt and the checks are tested without a model. The model only writes text. It is never asked about prices,
 * contracts or publishing, and anything it returns outside the shape below is rejected, not repaired.
 */
import { extrasRows } from "@/lib/brief-extras";
import { GOALS, STYLES, profileLines, type WebsiteBrief } from "@/lib/website-brief";

export const PLAN_LIMITS = {
  pages: 25,
  sectionsPerPage: 8,
  pointsPerSection: 6,
  title: 80,
  text: 400,
  point: 200,
  list: 8,
} as const;

export const SECTION_KINDS = ["hero", "about", "services", "features", "gallery", "testimonials", "faq", "contact", "booking", "cta", "text"] as const;
export type SectionKind = (typeof SECTION_KINDS)[number];

export type PlanSection = { kind: SectionKind; heading: string; points: string[] };
export type PlanPage = { slug: string; title: string; purpose: string; sections: PlanSection[] };
export type WebsitePlan = {
  summary: string;
  tone: string;
  pages: PlanPage[];
  seo: { siteTitle: string; description: string };
  assumptions: string[];
  questions: string[];
};

export type PlanInput = {
  businessName: string;
  packageName: string;
  /** The most pages this website may have. The plan is rejected if it has more. */
  pagesAllowed: number;
  brief: WebsiteBrief;
};

export const PLAN_SYSTEM =
  "You are a senior web designer at WINJO DIGITAL, a UK web design agency. You turn a customer's brief into a clear " +
  "plan for their website. Write plain British English. Never mention prices, contracts, guarantees, awards, " +
  "statistics or client names you were not given. Never invent facts about the business: where something is " +
  "unknown, list it under assumptions or questions. Reply with one JSON object and nothing else.";

const SHAPE =
  '{"summary": string, "tone": string, "pages": [{"slug": string, "title": string, "purpose": string, "sections": ' +
  `[{"kind": ${SECTION_KINDS.map((k) => `"${k}"`).join("|")}, "heading": string, "points": [string]}]}], ` +
  '"seo": {"siteTitle": string, "description": string}, "assumptions": [string], "questions": [string]}';

/** The request sent to the model. Only the customer's own brief goes in, as plain labelled text. */
export function buildPlanPrompt(input: PlanInput): string {
  const b = input.brief;
  const goals = b.goals.map((g) => GOALS[g]?.label ?? g).join(", ") || "Not stated";
  const style = b.style ? (STYLES[b.style]?.label ?? b.style) : "No preference";
  return [
    `Business: ${input.businessName}`,
    `Package: ${input.packageName} (at most ${input.pagesAllowed} pages)`,
    `Goals: ${goals}`,
    b.goalNote ? `About the goal: ${b.goalNote}` : "",
    `Pages the customer asked for: ${b.pages.join(", ") || "None listed"}`,
    `Look and feel: ${style}`,
    b.colours ? `Colours: ${b.colours}` : "",
    b.references.length ? `Sites they like: ${b.references.join(", ")}` : "",
    b.avoid ? `To avoid: ${b.avoid}` : "",
    b.functionality ? `Features needed: ${b.functionality}` : "",
    ...(b.otherBusinessType ? [`Business type: ${b.otherBusinessType}`, ...profileLines(b.profile).map((l) => `Customer's answer. ${l}`)] : []),
    ...extrasRows(b.extras).map(([label, value]) => `Customer's answer. ${label} ${value}`),
    "",
    `Plan the website. Use at most ${input.pagesAllowed} pages, each with 2 to ${PLAN_LIMITS.sectionsPerPage} sections.`,
    `Reply with JSON in exactly this shape: ${SHAPE}`,
  ]
    .filter((line, i, all) => line !== "" || all[i - 1] !== "")
    .join("\n");
}

const clean = (value: unknown, max: number): string =>
  typeof value === "string"
    ? value
        .replace(/<[^>]*>/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, max)
    : "";

const cleanList = (value: unknown, max: number, count: number): string[] =>
  Array.isArray(value) ? value.map((v) => clean(v, max)).filter(Boolean).slice(0, count) : [];

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** The JSON object inside a model reply, which may be wrapped in a code fence or a sentence. */
export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = (fenced ? fenced[1] : text).trim();
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(body.slice(start, end + 1));
  } catch {
    return null;
  }
}

export type ParsedPlan = { ok: true; plan: WebsitePlan } | { ok: false; reason: string };

/** Checks a model reply against the plan shape. Strict: a wrong shape is rejected, never repaired. */
export function parsePlan(text: string, pagesAllowed: number): ParsedPlan {
  const raw = extractJson(text) as Record<string, unknown> | null;
  if (!raw || typeof raw !== "object") return { ok: false, reason: "The reply was not a JSON plan." };
  if (!Array.isArray(raw.pages) || raw.pages.length === 0) return { ok: false, reason: "The plan has no pages." };
  if (raw.pages.length > Math.min(pagesAllowed, PLAN_LIMITS.pages)) {
    return { ok: false, reason: `The plan has more than the ${pagesAllowed} pages the package allows.` };
  }
  const seen = new Set<string>();
  const pages: PlanPage[] = [];
  for (const p of raw.pages as Array<Record<string, unknown>>) {
    const slug = clean(p?.slug, 60).toLowerCase();
    const title = clean(p?.title, PLAN_LIMITS.title);
    if (!SLUG.test(slug) || !title || seen.has(slug)) return { ok: false, reason: "A page has a missing or repeated name." };
    seen.add(slug);
    const sectionsRaw = Array.isArray(p.sections) ? (p.sections as Array<Record<string, unknown>>) : [];
    const sections: PlanSection[] = [];
    for (const s of sectionsRaw.slice(0, PLAN_LIMITS.sectionsPerPage)) {
      const kind = (SECTION_KINDS as readonly string[]).includes(String(s?.kind)) ? (s.kind as SectionKind) : "text";
      const heading = clean(s?.heading, PLAN_LIMITS.title);
      if (!heading) continue;
      sections.push({ kind, heading, points: cleanList(s.points, PLAN_LIMITS.point, PLAN_LIMITS.pointsPerSection) });
    }
    if (sections.length === 0) return { ok: false, reason: `The page "${title}" has no sections.` };
    pages.push({ slug, title, purpose: clean(p.purpose, PLAN_LIMITS.text), sections });
  }
  const seo = (raw.seo ?? {}) as Record<string, unknown>;
  const summary = clean(raw.summary, PLAN_LIMITS.text);
  if (!summary) return { ok: false, reason: "The plan has no summary." };
  return {
    ok: true,
    plan: {
      summary,
      tone: clean(raw.tone, PLAN_LIMITS.text),
      pages,
      seo: { siteTitle: clean(seo.siteTitle, PLAN_LIMITS.title), description: clean(seo.description, 160) },
      assumptions: cleanList(raw.assumptions, PLAN_LIMITS.text, PLAN_LIMITS.list),
      questions: cleanList(raw.questions, PLAN_LIMITS.text, PLAN_LIMITS.list),
    },
  };
}
