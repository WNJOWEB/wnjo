/**
 * The pages a template site can have, and how its sections are laid out across them. The customer picks how many
 * pages they want, up to what their plan allows (Core 5, Plus 10, Pro 20), and we build exactly those: pick 2 and
 * we make 2. Home is always the first page and counts as one. A page the customer didn't pick doesn't exist, and its
 * content stays on the home page, so nothing they gave us is lost. Pure, so it is tested without a model.
 */
import type { SectorPreset } from "./presets";
import type { CustomerFacts, Section, SitePage } from "./schema";

export const PAGE_KINDS = ["home", "services", "about", "gallery", "faq", "contact"] as const;
export type PageKind = (typeof PAGE_KINDS)[number];

/** The most pages a template site can have today: one of each kind. Plus and Pro can ask for more than this. */
export const MAX_TEMPLATE_PAGES = PAGE_KINDS.length;

/** The names a customer picks from, in menu order. */
export const PAGE_CHOICES: Record<PageKind, string> = { home: "Home", services: "Services", about: "About", gallery: "Gallery", faq: "FAQs", contact: "Contact" };

const ALIASES: Record<string, PageKind> = {
  home: "home",
  services: "services",
  menu: "services",
  treatments: "services",
  about: "about",
  "about us": "about",
  gallery: "gallery",
  faq: "faq",
  faqs: "faq",
  contact: "contact",
  "contact us": "contact",
  "book online": "contact",
};

/** The kind of page a name stands for, or null when a template can't build it (a blog, a careers page...). */
export const pageKindFor = (name: string): PageKind | null => ALIASES[name.trim().toLowerCase()] ?? null;

/**
 * The pages to build. Home comes first and always counts. The rest are the ones the customer picked, in menu order,
 * and only as many as the plan allows. A name a template can't build is ignored.
 */
export function choosePages(names: readonly string[], limit: number | null): PageKind[] {
  const wanted = new Set<PageKind>();
  for (const name of names) {
    const kind = pageKindFor(name);
    if (kind) wanted.add(kind);
  }
  const max = Math.max(1, Math.min(limit ?? MAX_TEMPLATE_PAGES, MAX_TEMPLATE_PAGES));
  return (["home", ...PAGE_KINDS.filter((k) => k !== "home" && wanted.has(k))] as PageKind[]).slice(0, max);
}

/** The first `count` pages in menu order, for a test that asks for a number of pages rather than names. */
export const firstPages = (count: number): PageKind[] => PAGE_KINDS.slice(0, Math.max(1, Math.min(count, MAX_TEMPLATE_PAGES))) as PageKind[];

/** A page's address on the site: home is the root. */
export const slugFor = (kind: PageKind): string => (kind === "home" ? "" : kind);

/** The name in the menu. The services page takes the sector's own word for what it sells. */
export function pageTitle(preset: SectorPreset, kind: PageKind): string {
  if (kind === "services") return preset.itemsLabel === "Menu items" ? "Menu" : preset.itemsLabel === "Classes and sessions" ? "Classes" : preset.itemsLabel;
  return PAGE_CHOICES[kind];
}

/** The headline and the line under it that every page after the first starts with, written without a model. */
export function defaultPageHead(preset: SectorPreset, kind: PageKind): { headline: string; intro: string } {
  const h = preset.copy.headings;
  switch (kind) {
    case "services":
      return { headline: h.services, intro: "Everything we offer." };
    case "about":
      return { headline: "About us", intro: "Who we are and what we do." };
    case "gallery":
      return { headline: h.gallery, intro: "A look at our work." };
    case "faq":
      return { headline: h.faq, intro: "Answers to what people ask us most." };
    case "contact":
      return { headline: "Get in touch", intro: "Tell us what you need and we will reply." };
    default:
      return { headline: "", intro: "" };
  }
}

/** The About page's content: the customer's own words, and their answers to the sector's questions as points. */
export function aboutSection(facts: CustomerFacts, heading = "About us"): Section | null {
  if (!facts.about?.trim()) return null;
  return { kind: "about", heading, text: facts.about.trim(), points: (facts.details ?? []).map((d) => ({ label: d.label, text: d.value })) };
}

export type PageHeads = Partial<Record<PageKind, { headline: string; intro: string }>>;
export type Layout = { sections: Section[]; pages: SitePage[]; missing: PageKind[] };

/**
 * Lays a site's sections out across the chosen pages. `flat` is every section in the sector's order, as built for a
 * one-page site. With one page chosen the site is that page, unchanged. With more, each page takes its own sections:
 * Services the full list (Home keeps a short teaser), Contact the hours, the place and the request form, and so on.
 * A page whose content is missing (a Gallery with no photos, an FAQ with no questions) is left out and named in
 * `missing`, so the check can say so. The closing next step goes on every page.
 */
export function layoutPages(preset: SectorPreset, chosen: readonly PageKind[], flat: Section[], heads: PageHeads, about: Section | null): Layout {
  if (chosen.length <= 1) return { sections: flat, pages: [], missing: [] };
  const has = (k: PageKind) => chosen.includes(k);
  const bucket: Record<PageKind, Section[]> = { home: [], services: [], about: [], gallery: [], faq: [], contact: [] };
  let cta: Section | null = null;

  for (const s of flat) {
    switch (s.kind) {
      case "hero":
      case "facts":
        bucket.home.push(s);
        break;
      case "services":
        if (has("services")) {
          bucket.services.push(s);
          bucket.home.push({ ...s, teaser: 3 });
        } else bucket.home.push(s);
        break;
      case "hours":
      case "area":
      case "enquiry":
        (has("contact") ? bucket.contact : bucket.home).push(s);
        break;
      case "gallery":
        (has("gallery") ? bucket.gallery : bucket.home).push(s);
        break;
      case "faq":
        (has("faq") ? bucket.faq : bucket.home).push(s);
        break;
      case "cta":
        cta = s;
        break;
    }
  }
  if (about && has("about")) bucket.about.push(about);

  const pages: SitePage[] = [];
  const missing: PageKind[] = [];
  for (const kind of chosen) {
    if (kind === "home") continue;
    if (bucket[kind].length === 0) {
      missing.push(kind);
      continue;
    }
    const head = heads[kind] ?? defaultPageHead(preset, kind);
    pages.push({ slug: slugFor(kind), title: pageTitle(preset, kind), sections: [{ kind: "pagehead", headline: head.headline, intro: head.intro }, ...bucket[kind], ...(cta ? [cta] : [])] });
  }
  return { sections: [...bucket.home, ...(cta ? [cta] : [])], pages, missing };
}
