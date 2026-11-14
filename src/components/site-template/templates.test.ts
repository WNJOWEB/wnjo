import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SAMPLES } from "@/lib/site-template/sample";
import { SiteRender } from "./SiteRender";

describe.each(Object.entries(SAMPLES))("the %s template", (_id, sample) => {
  it("renders its sample site in full: the name, the headline, every service and the request form", () => {
    const html = renderToStaticMarkup(createElement(SiteRender, { content: sample.content }));
    const esc = (s: string) => s.replace(/&/g, "&amp;");
    expect(html).toContain(esc(sample.content.business.name));
    const hero = sample.content.sections.find((s) => s.kind === "hero");
    if (hero?.kind === "hero") expect(html).toContain(esc(hero.headline));
    for (const svc of sample.facts.services) expect(html).toContain(esc(svc.name));
    const enquiry = sample.content.sections.find((s) => s.kind === "enquiry");
    if (enquiry?.kind === "enquiry") expect(html).toContain(esc(enquiry.heading));
  });
});
