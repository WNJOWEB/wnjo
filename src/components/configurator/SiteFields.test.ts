import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ABOUT_QUESTION, SECTOR_PRESETS } from "@/lib/site-template/presets";
import { SAMPLE_ANSWERS } from "@/lib/site-template/sample";
import { EMPTY_BRIEF } from "@/lib/website-brief";
import { SiteFields } from "./SiteFields";

const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/'/g, "&#x27;").replace(/"/g, "&quot;");
const render = (sector: string, answers = SAMPLE_ANSWERS[sector], errors: Record<string, string> = {}) =>
  renderToStaticMarkup(createElement(SiteFields, { brief: { ...EMPTY_BRIEF, site: { sector, answers } }, onChange: () => {}, errors, businessName: answers.businessName ?? "" }));

describe.each(Object.values(SECTOR_PRESETS).map((p) => [p.label, p] as const))("the %s form", (_label, preset) => {
  it("asks for the services in the template's own words, and the question about what makes the business different", () => {
    const html = render(preset.id);
    expect(html).toContain(escape(preset.servicesPrompt));
    expect(html).toContain(escape(ABOUT_QUESTION.label));
    expect(html).toContain(escape(SAMPLE_ANSWERS[preset.id].about!));
  });

  it("asks each of the template's own questions, with its hint and the customer's answer", () => {
    const html = render(preset.id);
    for (const q of preset.questions) {
      expect(html, q.id).toContain(escape(q.label));
      expect(html, q.id).toContain(escape(q.hint));
      expect(html, q.id).toContain(escape(SAMPLE_ANSWERS[preset.id].details![q.id]));
    }
  });
});

describe("the form's messages", () => {
  it("shows what is missing from the customer's own words and from a required question", () => {
    const html = render("barber", { ...SAMPLE_ANSWERS.barber, about: "" }, { about: "Tell us in a sentence or two.", "detail-speciality": "Answer this question." });
    expect(html).toContain("Tell us in a sentence or two.");
    expect(html).toContain("Answer this question.");
  });

  it("starts with every box empty for a new customer, so nothing is guessed", () => {
    const html = render("plumbing", { businessName: "Pipe Dreams" });
    for (const q of SECTOR_PRESETS.plumbing.questions) expect(html).toContain(escape(q.label));
    expect(html).not.toContain("Homeowners and landlords");
  });
});
