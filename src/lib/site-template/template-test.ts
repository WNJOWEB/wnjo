import type { AiProvider } from "@/lib/ai/provider";
import { parseAnswers } from "./answers";
import { SECTOR_PRESETS } from "./presets";
import { SAMPLE_ANSWERS } from "./sample";
import { SAMPLE_VARIANTS } from "./variants";
import type { CustomerFacts, SiteContent } from "./schema";
import { firstPages, MAX_TEMPLATE_PAGES } from "./pages";
import { assembleSite, defaultCopy, writeSite, type WriteInput } from "./write";

/**
 * Writes every template a few times with a model and reports how many sites pass every check on the model's own
 * wording, and what they cost. Used by the staff test page and by the test that runs on request. A site that needed
 * our fallback wording counts as not passed, because the point is what the model can do unaided.
 */
/** A line the model wrote, with what it was (headline, intro, a service description, an FAQ answer...). */
export type ModelLine = { label: string; text: string };

/**
 * One generated site from the test: whose business it is, whether it passed, the site itself, what the customer gave
 * (so a made-up fact can be spotted), the lines the model wrote, and the reason for each failed check.
 */
export type TemplateTestSite = {
  business: string;
  passed: boolean;
  content: SiteContent | null;
  facts: CustomerFacts;
  modelLines: ModelLine[];
  issues: string[];
};
export type TemplateTestRow = { template: string; passed: number; runs: number; pencePerSite: number; problems: string[]; sites: TemplateTestSite[] };
export type TemplateTestResult = { model: string; rows: TemplateTestRow[]; passed: number; total: number; pencePerSite: number };

/**
 * Stand-in photos for the test, so a site shows its pictures. These are our own example photos, closest to each
 * template; a real customer's photos replace them. They only show the layout.
 */
const STANDIN_PHOTOS: Record<string, { hero: string; gallery: string[] }> = {
  barber: { hero: "/styler/barber-hero.webp", gallery: ["/styler/barber-cut.webp", "/styler/barber-fade.webp", "/styler/barber-shave.webp"] },
  beauty: { hero: "/styler/barber-hero.webp", gallery: ["/styler/barber-cut.webp", "/styler/barber-fade.webp", "/styler/barber-shave.webp"] },
  massage: { hero: "/styler/clinic-hero.webp", gallery: ["/styler/clinic-knee.webp", "/styler/clinic-rehab.webp", "/styler/clinic-sports.webp"] },
  physio: { hero: "/styler/clinic-hero.webp", gallery: ["/styler/clinic-knee.webp", "/styler/clinic-rehab.webp", "/styler/clinic-sports.webp"] },
  fitness: { hero: "/styler/trades-hero.webp", gallery: ["/styler/trades-fuse.webp", "/styler/trades-rewires.webp", "/styler/trades-testing.webp"] },
  cafe: { hero: "/styler/cafe-hero.webp", gallery: ["/styler/cafe-plates.webp", "/styler/cafe-sourdough.webp", "/styler/cafe-wine.webp"] },
  "holiday-let": { hero: "/styler/cafe-hero.webp", gallery: ["/styler/cafe-plates.webp", "/styler/cafe-sourdough.webp", "/styler/cafe-wine.webp"] },
  electrician: { hero: "/styler/trades-hero.webp", gallery: ["/styler/trades-fuse.webp", "/styler/trades-rewires.webp", "/styler/trades-testing.webp"] },
  plumbing: { hero: "/styler/trades-hero.webp", gallery: ["/styler/trades-fuse.webp", "/styler/trades-rewires.webp", "/styler/trades-testing.webp"] },
  building: { hero: "/styler/trades-hero.webp", gallery: ["/styler/trades-fuse.webp", "/styler/trades-rewires.webp", "/styler/trades-testing.webp"] },
  cleaning: { hero: "/styler/trades-hero.webp", gallery: ["/styler/trades-fuse.webp", "/styler/trades-rewires.webp", "/styler/trades-testing.webp"] },
};

/** The ids of every template, in the order they are tested. */
export const TEMPLATE_IDS = Object.keys(SECTOR_PRESETS);

/**
 * The lines the model wrote, found by comparing the site with the same site built from our own fixed wording. Anything
 * that differs is the model's, so you can judge its work separately from the template's.
 */
export function modelLinesOf(content: SiteContent, input: WriteInput): ModelLine[] {
  const ours = assembleSite(input, defaultCopy(input));
  const lines: ModelLine[] = [];
  const add = (label: string, text: string | undefined, theirs: string | undefined) => {
    if (text && text !== theirs) lines.push({ label, text });
  };
  add("Tagline", content.business.tagline, ours.business.tagline);
  const hero = content.sections.find((s) => s.kind === "hero");
  const ourHero = ours.sections.find((s) => s.kind === "hero");
  if (hero?.kind === "hero" && ourHero?.kind === "hero") {
    add("Headline", hero.headline, ourHero.headline);
    add("Intro", hero.intro, ourHero.intro);
  }
  for (const s of content.sections) {
    if (s.kind === "services") for (const item of s.items) add(`Description of ${item.name}`, item.description, undefined);
    if (s.kind === "faq") for (const q of s.items) lines.push({ label: "FAQ", text: `${q.question} ${q.answer}` });
    if (s.kind === "area") {
      const ourArea = ours.sections.find((o) => o.kind === "area");
      add("Area text", s.text, ourArea?.kind === "area" ? ourArea.text : undefined);
    }
  }
  return lines;
}

/** Tests every template, or only the ones named, so a slow run can be split across several requests. */
export async function runTemplateTest(provider: AiProvider, runs: number, only?: string[], pageCount = 1): Promise<TemplateTestResult> {
  // The customer chose this many pages; their plan is taken to allow at least that many.
  const chosen = Math.min(MAX_TEMPLATE_PAGES, Math.max(1, Math.floor(pageCount)));
  const pages = firstPages(chosen);
  const count = Math.min(3, Math.max(1, Math.floor(runs)));
  const rows: TemplateTestRow[] = [];
  const presets = Object.values(SECTOR_PRESETS).filter((p) => !only || only.includes(p.id));
  for (const preset of presets) {
    // The main sample plus the extra made-up businesses for this template, each written `count` times.
    const sets = [SAMPLE_ANSWERS[preset.id], ...(SAMPLE_VARIANTS[preset.id] ?? [])];
    const row: TemplateTestRow = { template: preset.label, passed: 0, runs: count * sets.length, pencePerSite: 0, problems: [], sites: [] };
    let pence = 0;
    for (const answers of sets) {
      const parsed = parseAnswers(answers, preset, { colour: "#1f3a34" });
      if (!parsed.ok) throw new Error(`${preset.label} (${answers.businessName}): answers not accepted`);
      for (let i = 0; i < count; i++) {
        const photos = STANDIN_PHOTOS[preset.id];
        const writeInput: WriteInput = {
          preset,
          facts: parsed.facts,
          look: parsed.look,
          colour: parsed.colour,
          heroPhoto: photos?.hero,
          images: photos?.gallery.map((src, n) => ({ src, alt: `${answers.businessName ?? "Our"} photo ${n + 1}` })),
          pages,
          pageLimit: chosen,
        };
        const r = await writeSite({ provider, spentPence: 0, maxPence: 300 }, writeInput);
        pence += r.costPence;
        // Each reason is the check's own message, so it can be read on the page, not just its code.
        const issues = r.ok ? [] : [r.reason, ...(r.issues ?? []).map((x) => x.message)];
        if (r.ok) row.passed += 1;
        else row.problems.push(...issues.map((x) => `${answers.businessName}: ${x}`));
        row.sites.push({
          business: answers.businessName ?? "",
          passed: r.ok,
          content: r.content ?? null,
          facts: parsed.facts,
          modelLines: r.content ? modelLinesOf(r.content, writeInput) : [],
          issues,
        });
      }
    }
    row.pencePerSite = Math.round((pence / row.runs) * 100) / 100;
    row.problems = [...new Set(row.problems)];
    rows.push(row);
  }
  const passed = rows.reduce((n, r) => n + r.passed, 0);
  const total = rows.reduce((n, r) => n + r.runs, 0);
  const pence = rows.reduce((n, r) => n + r.pencePerSite * r.runs, 0);
  return { model: `${provider.name} ${provider.model}`, rows, passed, total, pencePerSite: Math.round((pence / total) * 100) / 100 };
}
