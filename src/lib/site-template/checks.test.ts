import { describe, expect, it } from "vitest";
import { checkSite, describeIssues } from "./checks";
import { BARBER_PRESET, presetFor } from "./presets";
import type { CustomerFacts, SiteContent } from "./schema";

const hours = [
  { day: "Mon", open: "09:00", close: "18:00" },
  { day: "Sun", closed: true },
];

const facts: CustomerFacts = {
  businessName: "Hartley & Sons",
  services: [
    { name: "Cut & style", price: "£22" },
    { name: "Skin fade", price: "£20" },
    { name: "Beard trim" },
  ],
  hours,
  phone: "01632 960123",
  email: "book@hartley.example",
  address: "12 High Street, Leeds",
};

function good(): SiteContent {
  return {
    business: { name: "Hartley & Sons", tagline: "Barbers in Leeds", phone: "01632 960123", address: "12 High Street, Leeds" },
    theme: { colour: "#1a2b3c", look: "classic" },
    sections: [
      { kind: "hero", variant: "photo", headline: "Hartley & Sons, barbers on High Street", intro: "Cuts, fades and beard trims in Leeds.", cta: "Request a booking" },
      {
        kind: "services",
        heading: "Cuts and prices",
        items: [
          { name: "Cut & style", price: "£22" },
          { name: "Skin fade", price: "£20" },
          { name: "Beard trim" },
        ],
      },
      { kind: "hours", heading: "Opening hours", items: hours },
      { kind: "area", heading: "Find us", text: "We are at 12 High Street, Leeds." },
      { kind: "enquiry", heading: "Request a booking", intro: "Tell us when suits and we will reply.", cta: "Send request" },
      { kind: "cta", headline: "Ready for a fresh cut?", cta: "Request a booking" },
    ],
  };
}

const codes = (c: SiteContent, f: CustomerFacts = facts) => checkSite(c, f, BARBER_PRESET).issues.map((i) => i.code);

describe("checkSite", () => {
  it("passes a good build", () => {
    const result = checkSite(good(), facts, BARBER_PRESET);
    expect(result.issues).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it("flags a missing required section", () => {
    const c = good();
    c.sections = c.sections.filter((s) => s.kind !== "hours");
    expect(codes(c)).toContain("missing-section");
  });

  it("flags an empty section", () => {
    const c = good();
    c.sections = c.sections.map((s) => (s.kind === "services" ? { ...s, items: [] } : s));
    expect(codes(c)).toContain("empty-section");
  });

  it("flags placeholder text", () => {
    const c = good();
    c.sections[0] = { kind: "hero", variant: "photo", headline: "Your headline here", intro: "Lorem ipsum", cta: "Book" };
    expect(codes(c)).toContain("placeholder");
    const d = good();
    d.sections[0] = { kind: "hero", variant: "photo", headline: "Welcome to [business name]", intro: "Hello", cta: "Book" };
    expect(codes(d)).toContain("placeholder");
  });

  it("flags text over its limit", () => {
    const c = good();
    c.sections[0] = { kind: "hero", variant: "photo", headline: "Hartley & Sons " + "x".repeat(130), intro: "ok", cta: "Book" };
    expect(codes(c)).toContain("too-long");
  });

  it("flags HTML and links in text", () => {
    const c = good();
    c.sections[4] = { kind: "enquiry", heading: "Request a booking", intro: "Visit https://evil.example now", cta: "Send" };
    expect(codes(c)).toContain("markup");
    const d = good();
    d.sections[0] = { kind: "hero", variant: "plain", headline: "<script>alert(1)</script>", intro: "x", cta: "Book" };
    expect(codes(d)).toContain("markup");
  });

  it("flags a wrong business name", () => {
    const c = good();
    c.business.name = "Hartley Barbers";
    expect(codes(c)).toContain("business-name");
  });

  it("flags a missing service, a changed price and an invented service", () => {
    const missing = good();
    missing.sections = missing.sections.map((s) => (s.kind === "services" ? { ...s, items: s.items.slice(0, 2) } : s));
    expect(codes(missing)).toContain("service-missing");

    const changed = good();
    changed.sections = changed.sections.map((s) => (s.kind === "services" ? { ...s, items: s.items.map((i) => (i.name === "Skin fade" ? { ...i, price: "£25" } : i)) } : s));
    expect(codes(changed)).toContain("price-changed");

    const invented = good();
    invented.sections = invented.sections.map((s) => (s.kind === "services" ? { ...s, items: [...s.items, { name: "Hot towel shave", price: "£18" }] } : s));
    const got = codes(invented);
    expect(got).toContain("service-invented");
    expect(got).toContain("price-invented");
  });

  it("flags a price given to a service that had none", () => {
    const c = good();
    c.sections = c.sections.map((s) => (s.kind === "services" ? { ...s, items: s.items.map((i) => (i.name === "Beard trim" ? { ...i, price: "£10" } : i)) } : s));
    expect(codes(c)).toContain("price-invented");
  });

  it("flags a price quoted in prose that the customer never gave", () => {
    const c = good();
    c.sections[0] = { kind: "hero", variant: "photo", headline: "Hartley & Sons", intro: "Cuts from £15.", cta: "Book" };
    expect(codes(c)).toContain("price-invented");
  });

  it("allows a prose price the customer did give", () => {
    const c = good();
    c.sections[0] = { kind: "hero", variant: "photo", headline: "Hartley & Sons", intro: "Skin fades are £20.", cta: "Book" };
    expect(codes(c)).not.toContain("price-invented");
  });

  it("flags invented contact details", () => {
    const c = good();
    c.business.phone = "01632 999999";
    c.business.email = "hello@other.example";
    c.business.address = "99 Elsewhere Road";
    const got = codes(c);
    expect(got).toContain("phone-invented");
    expect(got).toContain("email-invented");
    expect(got).toContain("address-invented");
  });

  it("flags a phone number or email in prose that is not the customer's", () => {
    const c = good();
    c.sections[4] = { kind: "enquiry", heading: "Request a booking", intro: "Ring 07700 900123 or write to a@b.example", cta: "Send" };
    const got = codes(c);
    expect(got).toContain("phone-invented");
    expect(got).toContain("email-invented");
  });

  it("accepts the customer's own phone number in prose, however it is spaced", () => {
    const c = good();
    c.sections[4] = { kind: "enquiry", heading: "Request a booking", intro: "Ring 01632960123 to book.", cta: "Send" };
    expect(codes(c)).not.toContain("phone-invented");
  });

  it("flags opening hours that were changed or made up", () => {
    const changed = good();
    changed.sections = changed.sections.map((s) => (s.kind === "hours" ? { ...s, items: [{ day: "Mon", open: "08:00", close: "20:00" }] } : s));
    expect(codes(changed)).toContain("hours-changed");

    const none = { ...facts, hours: undefined };
    expect(codes(good(), none)).toContain("hours-invented");
  });

  it("flags an area section when there is no address", () => {
    const noAddress = { ...facts, address: undefined };
    const c = good();
    c.business.address = undefined;
    expect(codes(c, noAddress)).toContain("area-without-address");
  });

  it("flags sections out of order, repeated or not in the preset", () => {
    const order = good();
    [order.sections[1], order.sections[2]] = [order.sections[2], order.sections[1]];
    expect(codes(order)).toContain("section-order");

    const dup = good();
    dup.sections.push(dup.sections[dup.sections.length - 1]);
    expect(codes(dup)).toContain("duplicate-section");

    const odd = good() as unknown as { sections: { kind: string }[] };
    odd.sections.push({ kind: "menu" });
    expect(codes(odd as unknown as SiteContent)).toContain("unknown-section");
  });

  it("flags too many FAQ items and images without a description", () => {
    const c = good();
    c.sections.splice(5, 0, {
      kind: "faq",
      heading: "Questions",
      items: Array.from({ length: 7 }, (_, i) => ({ question: `Question ${i}?`, answer: "Answer." })),
    });
    c.sections.splice(3, 0, { kind: "gallery", heading: "The shop", images: [{ src: "a.jpg", alt: "" }] });
    const got = codes(c);
    expect(got).toContain("too-many-items");
    expect(got).toContain("missing-alt");
  });

  it("flags a bad colour and an unknown look", () => {
    const c = good();
    c.theme = { colour: "blue", look: "neon" as never };
    const got = codes(c);
    expect(got).toContain("bad-colour");
    expect(got).toContain("bad-look");
  });
});

describe("describeIssues", () => {
  it("lists each reason on its own line", () => {
    const c = good();
    c.business.name = "Wrong";
    const text = describeIssues(checkSite(c, facts, BARBER_PRESET));
    expect(text).toMatch(/^- business\.name: /);
  });
});

describe("presets", () => {
  it("looks up the barber preset, and nothing for an unknown sector", () => {
    expect(presetFor("barber")).toBe(BARBER_PRESET);
    expect(presetFor("plumber")).toBeNull();
  });

  it("leads with the hero and ends with the closing call to action", () => {
    const kinds = BARBER_PRESET.sections.map((s) => s.kind);
    expect(kinds[0]).toBe("hero");
    expect(kinds[kinds.length - 1]).toBe("cta");
  });
});
