import { describe, expect, it } from "vitest";
import { checkSite } from "./checks";
import { DAYS, cleanSiteAnswers, groupHours, parseAnswers, parseServicesText, type DayAnswer, type RawAnswers } from "./answers";
import { BARBER_PRESET } from "./presets";

const week = (over: Partial<Record<(typeof DAYS)[number], Partial<DayAnswer>>> = {}): DayAnswer[] =>
  DAYS.map((day) => ({ day, ...(day === "Sun" ? { closed: true } : { open: "09:00", close: "18:00" }), ...over[day] }));

const raw = (over: RawAnswers = {}): RawAnswers => ({
  businessName: "Hartley & Sons",
  servicesText: "Cut & style £22\nSkin fade - 20\nBeard trim",
  about: "A family barber shop on the high street.",
  hours: week(),
  phone: "01632 960123",
  email: "Book@Hartley.example",
  address: "12 High Street, Leeds",
  highlights: ["walk-ins"],
  look: "classic",
  colour: "#1F3A34",
  ...over,
});

const parse = (over?: RawAnswers) => parseAnswers(raw(over), BARBER_PRESET, { colour: "#222222" });

describe("parseServicesText", () => {
  it("reads names with and without prices", () => {
    expect(parseServicesText("Cut & style £22\nSkin fade - 20\nHot shave: £18.5\nBeard trim").services).toEqual([
      { name: "Cut & style", price: "£22" },
      { name: "Skin fade", price: "£20" },
      { name: "Hot shave", price: "£18.50" },
      { name: "Beard trim" },
    ]);
  });

  it("does not mistake a number in a name for a price", () => {
    expect(parseServicesText("Grade 2 cut\nGrade 2 cut £15").services).toEqual([{ name: "Grade 2 cut" }]);
  });

  it("drops blank lines and repeats, and strips tags", () => {
    expect(parseServicesText("\n<b>Cut</b> £10\n\ncut £12\n").services).toEqual([{ name: "Cut", price: "£10" }]);
  });

  it("reports names that are too long and too many services", () => {
    expect(parseServicesText("x".repeat(80)).errors[0]).toMatch(/too long/);
    const many = Array.from({ length: 14 }, (_, i) => `Service ${String.fromCharCode(65 + i)}`).join("\n");
    const r = parseServicesText(many);
    expect(r.services).toHaveLength(12);
    expect(r.errors[0]).toMatch(/up to 12/);
  });
});

describe("groupHours", () => {
  it("joins runs of identical days", () => {
    expect(groupHours(week())).toEqual([
      { day: "Mon to Sat", open: "09:00", close: "18:00" },
      { day: "Sun", closed: true },
    ]);
  });

  it("names a pair with a comma and keeps different days apart", () => {
    const rows = groupHours(week({ Sat: { open: "09:00", close: "16:00" }, Fri: { open: "09:00", close: "16:00" } }));
    expect(rows.map((r) => r.day)).toEqual(["Mon to Thu", "Fri, Sat", "Sun"]);
  });
});

describe("parseAnswers", () => {
  it("accepts good answers and returns facts the writer can use", () => {
    const r = parse();
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.facts.email).toBe("book@hartley.example");
      expect(r.colour).toBe("#1f3a34");
      expect(r.facts.highlights).toEqual([{ value: "Walk-ins", label: "Always welcome" }]);
      expect(r.facts.hours).toHaveLength(2);
    }
  });

  it("produces facts the checks accept as a basis", () => {
    const r = parse();
    if (!r.ok) throw new Error("fixture");
    // A site that restates the facts exactly passes the checks.
    const site = {
      business: { name: r.facts.businessName, phone: r.facts.phone, email: r.facts.email, address: r.facts.address },
      theme: { colour: r.colour, look: r.look },
      sections: [
        { kind: "hero" as const, variant: "plain" as const, headline: "Hartley & Sons, Leeds", intro: "Cuts and fades.", cta: "Request a booking" },
        { kind: "services" as const, heading: "Prices", items: r.facts.services },
        { kind: "hours" as const, heading: "Hours", items: r.facts.hours! },
        { kind: "facts" as const, items: r.facts.highlights! },
        { kind: "area" as const, heading: "Find us", text: "We are on High Street." },
        { kind: "enquiry" as const, heading: "Request a booking", intro: "Tell us when suits.", cta: "Send" },
        { kind: "cta" as const, headline: "Ready?", cta: "Request a booking" },
      ],
    };
    expect(checkSite(site, r.facts, BARBER_PRESET).issues).toEqual([]);
  });

  it("asks for what is missing", () => {
    const r = parse({ businessName: "", servicesText: "", phone: "", email: "" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["businessName", "email", "services"]);
  });

  it("needs an email, and takes a phone only if given", () => {
    const noEmail = parse({ email: "", phone: "01632 960123" });
    expect(noEmail.ok === false && noEmail.errors.email).toBe("Add an email address we can reply to.");
    const phoneOnly = parse({ email: "", phone: "" });
    expect(phoneOnly.ok).toBe(false);
    const emailOnly = parse({ email: "sam@example.com", phone: "" });
    expect(emailOnly.ok).toBe(true);
    if (emailOnly.ok) expect(emailOnly.facts.phone).toBeUndefined();
  });

  it("rejects a bad phone, email or colour", () => {
    const r = parse({ phone: "abc", email: "nope", colour: "red" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["colour", "email", "phone"]);
  });

  it("checks every day of the week", () => {
    const missing = parse({ hours: week().slice(0, 6) });
    expect(missing.ok === false && missing.errors.hours).toMatch(/Sun/);
    const badTime = parse({ hours: week({ Tue: { open: "9am", close: "6pm" } }) });
    expect(badTime.ok === false && badTime.errors.hours).toMatch(/Tue/);
    const backwards = parse({ hours: week({ Wed: { open: "18:00", close: "09:00" } }) });
    expect(backwards.ok === false && backwards.errors.hours).toMatch(/Wed closes before it opens/);
  });

  it("uses the default colour and look when none is chosen, and ignores unknown highlights", () => {
    const r = parse({ colour: "", look: "neon", highlights: ["walk-ins", "free-beer"] });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.colour).toBe("#222222");
      expect(r.look).toBe("classic");
      expect(r.facts.highlights).toHaveLength(1);
    }
  });

  it("copes with junk input without throwing", () => {
    const r = parseAnswers({ hours: [null as never, 5 as never], highlights: "x" as never, servicesText: 7 as never }, BARBER_PRESET, { colour: "#222222" });
    expect(r.ok).toBe(false);
  });
});

describe("cleanSiteAnswers", () => {
  const known = ["barber"];

  it("keeps a half-finished draft, bounded", () => {
    const r = cleanSiteAnswers({ sector: "barber", answers: { businessName: "x".repeat(200), hours: [{ day: "Mon", open: "09:00", close: "18:00" }, { day: "Mon", closed: true }, { day: "Funday" }], highlights: ["walk-ins", "walk-ins", 5], colour: "#1f3a34" } }, known);
    expect(r?.sector).toBe("barber");
    expect(r?.answers.businessName).toHaveLength(60);
    expect(r?.answers.hours).toEqual([{ day: "Mon", open: "09:00", close: "18:00" }]);
    expect(r?.answers.highlights).toEqual(["walk-ins"]);
  });

  it("drops unknown sectors and junk", () => {
    expect(cleanSiteAnswers({ sector: "plumber", answers: {} }, known)).toBeNull();
    expect(cleanSiteAnswers(null, known)).toBeNull();
    expect(cleanSiteAnswers("x", known)).toBeNull();
  });

  it("strips control characters", () => {
    expect(cleanSiteAnswers({ sector: "barber", answers: { phone: "01632\u0000 960123" } }, known)?.answers.phone).toBe("01632 960123");
  });
});
