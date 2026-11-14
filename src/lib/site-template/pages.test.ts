import { describe, expect, it } from "vitest";
import { parseAnswers } from "./answers";
import { aboutSection, choosePages, firstPages, layoutPages, MAX_TEMPLATE_PAGES, pageKindFor, pageTitle, PAGE_KINDS, type PageKind } from "./pages";
import { BARBER_PRESET, SECTOR_PRESETS } from "./presets";
import { SAMPLE_ANSWERS, SAMPLES } from "./sample";
import type { Section } from "./schema";
import { assembleSite, buildCopyPrompt, defaultCopy, type WriteInput } from "./write";

describe("choosing the pages", () => {
  it("builds exactly the pages the customer picked, with Home first and counted", () => {
    expect(choosePages(["Home", "Services", "About", "Contact"], 5)).toEqual(["home", "services", "about", "contact"]);
    expect(choosePages(["About"], 5)).toEqual(["home", "about"]);
    expect(choosePages([], 5)).toEqual(["home"]);
  });

  it("makes 2 pages when 2 are picked, 4 when 4 are, and 5 when 5 are", () => {
    const six = ["Home", "Services", "About", "Gallery", "FAQs", "Contact"];
    expect(choosePages(six.slice(0, 2), 5)).toHaveLength(2);
    expect(choosePages(["Home", "Services", "About", "Gallery"], 5)).toHaveLength(4);
    expect(choosePages(["Home", "Services", "About", "Gallery", "FAQs"], 5)).toHaveLength(5);
  });

  it("never builds more than the plan allows, even if more are asked for", () => {
    const all = ["Home", "Services", "About", "Gallery", "FAQs", "Contact"];
    expect(choosePages(all, 5)).toHaveLength(5);
    expect(choosePages(all, 2)).toHaveLength(2);
    expect(choosePages(all, 1)).toEqual(["home"]);
  });

  it("never builds more than a template can hold, however large the plan", () => {
    const all = ["Home", "Services", "About", "Gallery", "FAQs", "Contact"];
    expect(choosePages(all, 20)).toHaveLength(MAX_TEMPLATE_PAGES);
    expect(choosePages(all, null)).toHaveLength(MAX_TEMPLATE_PAGES);
  });

  it("ignores pages a template can't build, in any case, and counts each page once", () => {
    expect(choosePages(["Blog", "Team", "Careers"], 5)).toEqual(["home"]);
    expect(choosePages(["services", "SERVICES", "Menu", "Treatments"], 5)).toEqual(["home", "services"]);
    expect(choosePages(["Contact us", "Book online"], 5)).toEqual(["home", "contact"]);
    expect(pageKindFor("Blog")).toBeNull();
  });

  it("takes the first few pages in menu order when a test asks for a number", () => {
    expect(firstPages(1)).toEqual(["home"]);
    expect(firstPages(3)).toEqual(["home", "services", "about"]);
    expect(firstPages(99)).toHaveLength(MAX_TEMPLATE_PAGES);
  });

  it("names the Services page for what the sector sells", () => {
    expect(pageTitle(SECTOR_PRESETS.cafe, "services")).toBe("Menu");
    expect(pageTitle(SECTOR_PRESETS.fitness, "services")).toBe("Classes");
    expect(pageTitle(SECTOR_PRESETS.massage, "services")).toBe("Treatments");
    expect(pageTitle(SECTOR_PRESETS.barber, "contact")).toBe("Contact");
  });
});

describe("laying the sections out across pages", () => {
  const preset = SECTOR_PRESETS.barber;
  const parsed = parseAnswers(SAMPLE_ANSWERS.barber, preset, { colour: "#1f3a34" });
  if (!parsed.ok) throw new Error("answers not accepted");
  const input: WriteInput = {
    preset,
    facts: parsed.facts,
    look: parsed.look,
    colour: parsed.colour,
    heroPhoto: "/styler/barber-hero.webp",
    images: [{ src: "/styler/barber-cut.webp", alt: "A cut" }],
  };
  const copy = { ...defaultCopy(input), faq: [{ question: "Do you take walk-ins?", answer: "Yes." }] };
  const flat = assembleSite(input, copy).sections;
  const about = aboutSection(parsed.facts);
  const kinds = (sections: Section[]) => sections.map((s) => s.kind);
  const lay = (chosen: PageKind[]) => layoutPages(preset, chosen, flat, {}, about);

  it("leaves a one-page site exactly as it is", () => {
    const l = lay(["home"]);
    expect(l.sections).toBe(flat);
    expect(l.pages).toEqual([]);
  });

  it("keeps everything on the home page when no other page is picked", () => {
    expect(kinds(lay(["home"]).sections)).toEqual(kinds(flat));
  });

  it("moves the contact sections to the Contact page, and keeps nothing of them on Home", () => {
    const l = lay(["home", "contact"]);
    expect(l.pages).toHaveLength(1);
    expect(l.pages[0].slug).toBe("contact");
    expect(kinds(l.pages[0].sections)).toEqual(["pagehead", "hours", "area", "enquiry", "cta"]);
    expect(kinds(l.sections)).not.toContain("enquiry");
    expect(kinds(l.sections)).toContain("hero");
    expect(kinds(l.sections)).toContain("services");
  });

  it("gives Home a short teaser of the services when they have their own page", () => {
    const l = lay(["home", "services"]);
    const home = l.sections.find((s) => s.kind === "services");
    const page = l.pages[0].sections.find((s) => s.kind === "services");
    expect(home?.kind === "services" && home.teaser).toBe(3);
    expect(page?.kind === "services" && page.teaser).toBeUndefined();
    expect(kinds(l.sections)).toContain("enquiry");
  });

  it("builds an About page from the customer's own words and their answers", () => {
    const l = lay(["home", "about"]);
    const section = l.pages[0].sections.find((s) => s.kind === "about");
    expect(section?.kind === "about" && section.text).toBe(parsed.facts.about);
    expect(section?.kind === "about" && section.points).toHaveLength(parsed.facts.details?.length ?? 0);
  });

  it("builds every page when all six are picked, each starting with its own heading", () => {
    const l = lay([...PAGE_KINDS]);
    expect(l.pages.map((p) => p.slug)).toEqual(["services", "about", "gallery", "faq", "contact"]);
    expect(l.missing).toEqual([]);
    for (const page of l.pages) expect(page.sections[0].kind).toBe("pagehead");
  });

  it("puts the same next step on every page, as its last section", () => {
    const l = lay([...PAGE_KINDS]);
    const cta = l.sections.find((s) => s.kind === "cta");
    for (const page of l.pages) expect(page.sections[page.sections.length - 1]).toEqual(cta);
  });

  it("names a page that has nothing to show, instead of building an empty one", () => {
    const noPhotos = layoutPages(preset, ["home", "gallery"], flat.filter((s) => s.kind !== "gallery"), {}, about);
    expect(noPhotos.missing).toEqual(["gallery"]);
    expect(noPhotos.pages).toEqual([]);
    const noFaq = layoutPages(preset, ["home", "faq"], flat.filter((s) => s.kind !== "faq"), {}, about);
    expect(noFaq.missing).toEqual(["faq"]);
  });

  it("keeps a page's content on Home when that page isn't picked", () => {
    const l = lay(["home", "contact"]);
    expect(kinds(l.sections)).toContain("faq");
    expect(kinds(l.sections)).toContain("gallery");
  });
});

describe("the writer builds the pages the customer chose", () => {
  const facts = SAMPLES.barber.facts;
  const images = [1, 2, 3].map((n) => ({ src: `/styler/${n}.webp`, alt: `Photo ${n}` }));
  const input = (pages: PageKind[], pageLimit: number | null = 5) => ({ preset: BARBER_PRESET, facts, look: "classic" as const, colour: "#1f3a34", pages, pageLimit, images });

  it.each([2, 3, 4, 5])("%d pages chosen gives %d pages", (n) => {
    const copy = { ...defaultCopy(input(firstPages(n))), faq: [{ question: "Do you take walk-ins?", answer: "Yes, any time we are open." }] };
    const content = assembleSite(input(firstPages(n)), copy);
    expect(1 + (content.pages?.length ?? 0)).toBe(n);
  });

  it("tells the model how many pages were chosen and what the plan allows", () => {
    const prompt = buildCopyPrompt(input(firstPages(4), 5));
    expect(prompt).toContain("chose 4 pages");
    expect(prompt).toContain("allows up to 5");
  });
});
