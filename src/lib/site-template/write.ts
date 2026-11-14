/**
 * The writing step for a template build. Our code assembles every fact (services, prices, hours, contact details,
 * photos) straight from what the customer gave. The model writes only the wording around them, in a small JSON
 * reply, so a price or an opening time can't be invented: there is nowhere in the reply to put one. The checks still
 * run on the finished site, and a build that fails them is tried again with the reasons, up to three times, then flagged for review.
 */
import { MAX_ROUNDS } from "@/lib/ai/limits";
import { ProviderError, type AiProvider } from "@/lib/ai/provider";
import { extractJson } from "@/lib/ai/website-plan";
import { checkSite, describeIssues, FILLER_PHRASES, type CheckIssue } from "./checks";
import type { SectorPreset } from "./presets";
import type { CustomerFacts, GalleryImage, Look, Section, SiteContent } from "./schema";
import { FIELD_LIMITS, WORD_LIMITS } from "./schema";
import { cutWords, wordCount } from "./text";

export type SiteCopy = {
  tagline: string;
  hero: { headline: string; intro: string; cta: string };
  headings: { services: string; hours: string; gallery: string; area: string; enquiry: string; faq: string };
  descriptions: Record<string, string>;
  area: string;
  enquiry: { intro: string; cta: string };
  faq: { question: string; answer: string }[];
  closing: { headline: string; cta: string };
};

export type WriteInput = {
  preset: SectorPreset;
  facts: CustomerFacts;
  look: Look;
  /** Theme colour as #rrggbb. */
  colour: string;
  /** A reference to the customer's hero photo, if they uploaded one. Decides a photo or a plain hero. */
  heroPhoto?: string;
  images?: GalleryImage[];
  /** A change the owner or customer asked for, applied when the site is written again. */
  change?: string;
};

export const COPY_SYSTEM =
  "You are a copywriter at WINJO DIGITAL, a UK web design agency. Write short wording for a small business website in " +
  "plain British English, from the facts you are given. Never invent anything: no prices, times, phone numbers, " +
  "addresses, names, reviews, awards or years in business. Use a number or a year only if the customer's own words " +
  "give it. No HTML and no links. Reply with one JSON object and nothing else.";

/** The only fields the model writes. Everything else on the site is ours: the facts, and the fixed wording of the template. */
const SHAPE =
  '{"tagline": string, "hero": {"headline": string, "intro": string}, ' +
  '"descriptions": {"<service name exactly as given>": string}, "faq": [{"question": string, "answer": string}]}';

const LOOK_TONE: Record<Look, string> = {
  minimal: "calm and understated",
  warm: "warm and friendly",
  bold: "direct and confident",
  classic: "traditional and assured",
};

/** The sector's own rules (for example, no promised cures), stated up front so a draft doesn't break them. A claim the customer ticked is theirs to make, so its rule is left out. */
function sectorRules(input: WriteInput): string[] {
  const rules = (input.preset.restrictedClaims ?? []).filter((c) => !c.unless?.(input.facts)).map((c) => `- ${c.reason}`);
  return rules.length ? ["Rules for this sector (a draft that breaks one is rejected):", ...rules] : [];
}

export function buildCopyPrompt(input: WriteInput, retryIssues?: string): string {
  const { facts, preset } = input;
  // Only the sections the model writes wording for. The rest are fixed wording and facts, put in by our own code.
  const wanted = preset.sections.filter((s) => s.kind === "hero" || s.kind === "faq").map((s) => `- ${s.kind}${s.required ? "" : " (only if the facts support it)"}: ${s.guidance}`);
  return [
    `Business: ${facts.businessName}`,
    `Sector: ${preset.label}. Voice: ${preset.voice} Tone: ${LOOK_TONE[input.look]}.`,
    `${preset.itemsLabel}: ${facts.services.map((s) => s.name).join("; ")}`,
    facts.areas?.length ? `Areas covered: ${facts.areas.join("; ")}. Name each one exactly as given in the area text, and no others.` : "",
    facts.address ? `Address given: yes (${facts.address})` : preset.areaSource === "address" ? "Address given: no. Leave the area text empty." : "",
    facts.hours?.length
      ? `Opening hours: ${facts.hours.map((h) => (h.closed ? `${h.day} closed` : `${h.day} ${h.open} to ${h.close}`)).join("; ")}`
      : "Opening hours given: no",

    facts.highlights?.length ? `Facts the customer gave: ${facts.highlights.map((h) => `${h.value} ${h.label}`).join("; ")}` : "",
    facts.about ? `In the customer's own words, what makes the business different: "${facts.about}"` : "",
    ...(facts.details ?? []).map((d) => `Customer's answer to "${d.label}": ${d.value}`),
    facts.about || facts.details?.length ? "Draw on the customer's own words and answers for the hero intro, the tagline and the FAQ. Rephrase them if you like, but never state anything they don't say." : "",
    ...sectorRules(input),
    "Write only these. Everything else on the site is written for you:",
    "- tagline: optional, a short line under the business name. Leave it empty if nothing true and short fits.",
    ...wanted,
    `Style example (the [brackets] stand for the customer's own facts: never copy the example and never leave a bracket in): headline "${preset.copy.example.headline}"; intro "${preset.copy.example.intro}"`,
    `Headline: at most ${WORD_LIMITS.headline} words. Intro: at most ${WORD_LIMITS.intro} words. Keep every sentence under ${WORD_LIMITS.sentence + 1} words.`,
    `Plain English, specific to this business. No filler such as: ${FILLER_PHRASES.map((p) => `"${p}"`).join(", ")}. Never copy wording from another website.`,
    "FAQ: at most four questions a new customer would ask, answered only from the facts above. Leave the list empty if the facts don't support any.",
    `Descriptions: one short line per ${preset.itemsLabel === "Menu items" ? "menu item" : "service"}, using only its name. Skip any you can't describe without guessing.`,
    input.change ? `Apply this change: ${input.change.slice(0, 1000)}` : "",
    retryIssues ? `\nYour last attempt failed these checks:\n${retryIssues}\nFix them.` : "",
    "",
    `Reply as JSON in exactly this shape: ${SHAPE}`,
  ]
    .filter((line, i, all) => line !== "" || all[i - 1] !== "")
    .join("\n");
}

const clean = (value: unknown, max: number): string =>
  typeof value === "string"
    ? value
        .replace(/<[^>]*>/g, "")
        .replace(/https?:\/\/\S+/gi, "")
        .replace(/[ \t\r\n]+/g, " ")
        .trim()
        .slice(0, max)
    : "";

const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});

export type ParsedCopy = { ok: true; copy: SiteCopy } | { ok: false; reason: string };

export function parseCopy(text: string): ParsedCopy {
  const raw = extractJson(text);
  if (!raw || typeof raw !== "object") return { ok: false, reason: "The reply was not JSON." };
  const r = obj(raw);
  const hero = obj(r.hero);
  const h = obj(r.headings);
  const enquiry = obj(r.enquiry);
  const closing = obj(r.closing);
  if (!clean(hero.headline, FIELD_LIMITS.headline)) return { ok: false, reason: "The hero has no headline." };

  const descriptions: Record<string, string> = {};
  for (const [name, text] of Object.entries(obj(r.descriptions))) {
    const d = clean(text, FIELD_LIMITS.itemText);
    if (d) descriptions[name] = d;
  }
  const faq = (Array.isArray(r.faq) ? r.faq : [])
    .map((q) => ({ question: clean(obj(q).question, FIELD_LIMITS.question), answer: clean(obj(q).answer, FIELD_LIMITS.answer) }))
    .filter((q) => q.question && q.answer)
    .slice(0, 4);

  return {
    ok: true,
    copy: {
      tagline: clean(r.tagline, FIELD_LIMITS.tagline),
      hero: { headline: clean(hero.headline, FIELD_LIMITS.headline), intro: clean(hero.intro, FIELD_LIMITS.intro), cta: clean(hero.cta, FIELD_LIMITS.cta) },
      headings: {
        services: clean(h.services, FIELD_LIMITS.heading),
        hours: clean(h.hours, FIELD_LIMITS.heading),
        gallery: clean(h.gallery, FIELD_LIMITS.heading),
        area: clean(h.area, FIELD_LIMITS.heading),
        enquiry: clean(h.enquiry, FIELD_LIMITS.heading),
        faq: clean(h.faq, FIELD_LIMITS.heading),
      },
      descriptions,
      area: clean(r.area, FIELD_LIMITS.body),
      enquiry: { intro: clean(enquiry.intro, FIELD_LIMITS.intro), cta: clean(enquiry.cta, FIELD_LIMITS.cta) },
      faq,
      closing: { headline: clean(closing.headline, FIELD_LIMITS.headline), cta: clean(closing.cta, FIELD_LIMITS.cta) },
    },
  };
}

const joinList = (items: string[]) => (items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`);

/** The last part of an address, which is the town in the way people write them: "12 High Street, Leeds". */
const townOf = (address?: string) => address?.split(",").map((part) => part.trim()).filter(Boolean).pop();

/** Cuts text to a limit at the end of a sentence if there is one, otherwise at a space. */
function cut(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  const head = t.slice(0, max);
  const stop = Math.max(head.lastIndexOf(". "), head.lastIndexOf("! "), head.lastIndexOf("? "));
  if (stop > max / 3) return head.slice(0, stop + 1);
  return head.slice(0, head.lastIndexOf(" ") > 0 ? head.lastIndexOf(" ") : max).trim();
}

/**
 * The whole site's wording with no model at all: the template's fixed wording, a headline from the trade and the
 * place, and the intro in the customer's own words. It makes no claim the customer didn't, so it passes the checks,
 * and it is what a build falls back to if the model's reply can't be used.
 */
export function defaultCopy(input: WriteInput): SiteCopy {
  const { facts, preset } = input;
  const c = preset.copy;
  const places = facts.areas?.length ? facts.areas : [];
  const place = places.length ? joinList(places) : townOf(facts.address);
  const headline = place ? `${c.trade} ${places.length ? (c.areasPreposition ?? "for") : "in"} ${place}` : facts.businessName;
  const fits = headline.length <= FIELD_LIMITS.headline && wordCount(headline) <= WORD_LIMITS.headline;
  return {
    tagline: "",
    hero: { headline: fits ? headline : facts.businessName, intro: cutWords(cut(facts.about ?? "", FIELD_LIMITS.intro), WORD_LIMITS.intro), cta: c.heroCta },
    headings: c.headings,
    descriptions: {},
    area: places.length ? `${c.areaLead} ${joinList(places)}.` : facts.address ? `We are at ${facts.address}.` : "",
    enquiry: { intro: c.enquiryIntro, cta: c.enquiryCta },
    faq: [],
    closing: { headline: c.closingHeadline, cta: c.closingCta },
  };
}

/** The model's wording where it gave some, our fixed wording everywhere else. */
export function withDefaults(input: WriteInput, copy: SiteCopy): SiteCopy {
  const d = defaultCopy(input);
  const pick = (value: string, fallback: string) => value.trim() || fallback;
  return {
    tagline: copy.tagline,
    hero: { headline: pick(copy.hero.headline, d.hero.headline), intro: pick(copy.hero.intro, d.hero.intro), cta: pick(copy.hero.cta, d.hero.cta) },
    headings: {
      services: pick(copy.headings.services, d.headings.services),
      hours: pick(copy.headings.hours, d.headings.hours),
      gallery: pick(copy.headings.gallery, d.headings.gallery),
      area: pick(copy.headings.area, d.headings.area),
      enquiry: pick(copy.headings.enquiry, d.headings.enquiry),
      faq: pick(copy.headings.faq, d.headings.faq),
    },
    descriptions: copy.descriptions,
    area: pick(copy.area, d.area),
    enquiry: { intro: pick(copy.enquiry.intro, d.enquiry.intro), cta: pick(copy.enquiry.cta, d.enquiry.cta) },
    faq: copy.faq,
    closing: { headline: pick(copy.closing.headline, d.closing.headline), cta: pick(copy.closing.cta, d.closing.cta) },
  };
}

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

/** Builds the site: the customer's facts as given, the model's wording in the gaps. Sections without data are left out. */
export function assembleSite(input: WriteInput, copy: SiteCopy): SiteContent {
  const { facts, preset } = input;
  const descriptions = new Map(Object.entries(copy.descriptions).map(([k, v]) => [norm(k), v]));
  const sections: Section[] = [];

  for (const p of preset.sections) {
    switch (p.kind) {
      case "hero":
        sections.push({ kind: "hero", variant: input.heroPhoto ? "photo" : "plain", ...copy.hero, ...(input.heroPhoto ? { image: input.heroPhoto } : {}) });
        break;
      case "services":
        sections.push({
          kind: "services",
          heading: copy.headings.services,
          items: facts.services.map((s) => ({ name: s.name, ...(descriptions.get(norm(s.name)) ? { description: descriptions.get(norm(s.name)) } : {}), ...(s.price ? { price: s.price } : {}) })),
        });
        break;
      case "hours":
        if (facts.hours?.length) sections.push({ kind: "hours", heading: copy.headings.hours, items: facts.hours });
        break;
      case "gallery":
        if (input.images?.length) sections.push({ kind: "gallery", heading: copy.headings.gallery, images: input.images.map((im) => ({ src: im.src, alt: im.alt.trim() || `${facts.businessName} photo` })) });
        break;
      case "facts":
        if (facts.highlights?.length) sections.push({ kind: "facts", items: facts.highlights.slice(0, 4) });
        break;
      case "area":
        if ((preset.areaSource === "areas" ? facts.areas?.length : facts.address) && copy.area) sections.push({ kind: "area", heading: copy.headings.area, text: copy.area });
        break;
      case "enquiry":
        sections.push({ kind: "enquiry", heading: copy.headings.enquiry, ...copy.enquiry, prompt: preset.enquiryPrompt });
        break;
      case "faq":
        if (copy.faq.length) sections.push({ kind: "faq", heading: copy.headings.faq, items: copy.faq });
        break;
      case "cta":
        sections.push({ kind: "cta", ...copy.closing });
        break;
    }
  }

  return {
    business: {
      name: facts.businessName,
      ...(copy.tagline ? { tagline: copy.tagline } : {}),
      ...(facts.phone ? { phone: facts.phone } : {}),
      ...(facts.email ? { email: facts.email } : {}),
      ...(facts.address ? { address: facts.address } : {}),
    },
    theme: { colour: input.colour, look: input.look },
    sections,
  };
}

export type WriteContext = { provider: AiProvider; spentPence: number; maxPence: number };
/**
 * `content` is present whenever the model's reply could be assembled, even if it failed the checks, so the owner can
 * look at it and override. `issues` lists what failed.
 */
export type WriteResult =
  | { ok: true; content: SiteContent; costPence: number }
  | { ok: false; reason: string; content?: SiteContent; issues?: CheckIssue[]; costPence: number };

export async function writeSite(ctx: WriteContext, input: WriteInput): Promise<WriteResult> {
  let spent = ctx.spentPence;
  const start = spent;
  let retryIssues: string | undefined;
  let last: { content: SiteContent; issues: CheckIssue[] } | undefined;

  for (let attempt = 0; attempt < MAX_ROUNDS; attempt++) {
    if (spent >= ctx.maxPence) return { ok: false, reason: "The spending limit for this website has been reached.", ...last, costPence: spent - start };
    let reply;
    try {
      reply = await ctx.provider.complete({ system: COPY_SYSTEM, messages: [{ role: "user", content: buildCopyPrompt(input, retryIssues) }], tools: [] });
    } catch (error) {
      if (error instanceof ProviderError) {
        const reason = error.kind === "authentication" ? "The AI service refused our key." : error.kind === "transient" ? "The AI service is busy. Please try again shortly." : "The AI service sent a reply we could not use.";
        return { ok: false, reason, ...last, costPence: spent - start };
      }
      throw error;
    }
    spent += reply.usage.costPence;
    if (reply.kind !== "final") return { ok: false, reason: "The AI service asked for a tool, which this step does not use.", ...last, costPence: spent - start };

    const parsed = parseCopy(reply.text);
    if (!parsed.ok) {
      retryIssues = `- ${parsed.reason} Reply with only the JSON.`;
      continue;
    }
    const content = assembleSite(input, withDefaults(input, parsed.copy));
    const result = checkSite(content, input.facts, input.preset);
    if (result.ok) return { ok: true, content, costPence: spent - start };
    last = { content, issues: result.issues };
    retryIssues = describeIssues(result);
  }
  if (last) return { ok: false, reason: "The site did not pass the checks after three tries.", ...last, costPence: spent - start };
  // No usable reply at all: build the site from our own wording and the customer's words, so there is always a draft.
  const fallback = assembleSite(input, defaultCopy(input));
  return {
    ok: false,
    reason: "The AI wording could not be used, so this draft uses our standard wording. Read it before releasing it.",
    content: fallback,
    issues: checkSite(fallback, input.facts, input.preset).issues,
    costPence: spent - start,
  };
}
