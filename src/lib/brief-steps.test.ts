import { describe, expect, it } from "vitest";
import { firstIncompleteStep, stepsFor, validateStep, withKnownContact, type StepContext } from "./brief-steps";
import { EMPTY_BRIEF, EMPTY_PROFILE, type WebsiteBrief } from "./website-brief";

const ctx = (over: Partial<StepContext> = {}): StepContext => ({ typesOn: true, allowedPages: 5, name: "Sam", businessName: "Hartley & Sons", ...over });
const week = (["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const).map((day) => (day === "Sun" ? { day, closed: true } : { day, open: "09:00", close: "17:00" }));
const barber: WebsiteBrief = {
  ...EMPTY_BRIEF,
  goals: ["bookings"],
  site: { sector: "barber", answers: { servicesText: "Cut £20", about: "A family barber shop.", hours: week, email: "book@hartley.example", phone: "01632 960123" } },
};
const other: WebsiteBrief = {
  ...EMPTY_BRIEF,
  goals: ["enquiries"],
  otherBusinessType: "Dog grooming",
  profile: { ...EMPTY_PROFILE, services: "Full groom", email: "sam@example.com", phone: "07700 900123", differentiator: "We come to you" },
};

describe("which steps a brief goes through", () => {
  it("has all six for a business without a template", () => {
    expect(stepsFor(other, ctx())).toEqual(["about", "offer", "goals", "look", "files", "review"]);
  });
  it("skips Look for a template site, which sets its look in the offer step", () => {
    expect(stepsFor(barber, ctx())).toEqual(["about", "offer", "goals", "files", "review"]);
  });
  it("has no business type or offer step when types are switched off", () => {
    expect(stepsFor(EMPTY_BRIEF, ctx({ typesOn: false }))).toEqual(["about", "goals", "look", "files", "review"]);
  });
});

describe("what each step needs", () => {
  it("about: a business name and a kind of business, when types are on", () => {
    expect(validateStep("about", EMPTY_BRIEF, ctx({ businessName: "" }))).toEqual({ businessName: "Add your business name.", type: "Choose the kind of business, or tell us what it is." });
    expect(validateStep("about", barber, ctx())).toEqual({});
    expect(validateStep("about", other, ctx())).toEqual({});
    expect(validateStep("about", EMPTY_BRIEF, ctx({ typesOn: false, businessName: "" }))).toEqual({});
  });

  it("offer: a template site's own answers, or the business questions", () => {
    expect(validateStep("offer", barber, ctx())).toEqual({});
    expect(Object.keys(validateStep("offer", { ...barber, site: { sector: "barber", answers: {} } }, ctx())).sort()).toEqual(expect.arrayContaining(["services", "hours", "email"]));
    expect(validateStep("offer", other, ctx())).toEqual({});
    expect(Object.keys(validateStep("offer", { ...other, profile: EMPTY_PROFILE }, ctx())).sort()).toEqual(["differentiator", "email", "services"]);
  });

  it("offer: uses the business name from the first step for a template site", () => {
    expect(validateStep("offer", barber, ctx({ businessName: "" }))).toHaveProperty("businessName");
  });

  it("goals: at least one goal, and no more pages than the plan covers", () => {
    expect(validateStep("goals", { ...other, goals: [] }, ctx())).toHaveProperty("goals");
    const many = { ...other, pages: ["Home", "About", "Services", "Contact", "Gallery", "Reviews", "Pricing"] };
    expect(validateStep("goals", many, ctx()).pages).toBe("Your plan covers up to 5 pages. Remove 2 to continue.");
    expect(validateStep("goals", many, ctx({ allowedPages: null }))).toEqual({});
    expect(validateStep("goals", many, ctx({ allowedPages: 10 }))).toEqual({});
  });

  it("goals: a template site has fixed pages, so only goals are asked for", () => {
    expect(validateStep("goals", { ...barber, pages: Array.from({ length: 9 }, (_, i) => `P${i}`) }, ctx())).toEqual({});
  });

  it("look, files and review never block", () => {
    for (const s of ["look", "files", "review"] as const) expect(validateStep(s, EMPTY_BRIEF, ctx())).toEqual({});
  });
});

describe("firstIncompleteStep", () => {
  it("finds the first step that needs something, in order", () => {
    expect(firstIncompleteStep(EMPTY_BRIEF, ctx({ businessName: "" }))?.step).toBe("about");
    expect(firstIncompleteStep({ ...other, profile: EMPTY_PROFILE }, ctx())?.step).toBe("offer");
    expect(firstIncompleteStep({ ...other, goals: [] }, ctx())?.step).toBe("goals");
  });
  it("is null when everything is complete", () => {
    expect(firstIncompleteStep(other, ctx())).toBeNull();
    expect(firstIncompleteStep(barber, ctx())).toBeNull();
  });
});

describe("withKnownContact", () => {
  const known = { email: "owner@shop.co.uk", phone: "07700 900123" };
  const blank = { ...EMPTY_BRIEF, otherBusinessType: "Florist" };

  it("fills an empty email and phone from the sign-up details", () => {
    const r = withKnownContact(blank, known);
    expect(r.changed).toBe(true);
    expect(r.brief.profile).toMatchObject({ email: "owner@shop.co.uk", phone: "07700 900123" });
  });

  it("fills a template site's answers instead", () => {
    const r = withKnownContact({ ...EMPTY_BRIEF, site: { sector: "barber", answers: {} } }, known);
    expect(r.brief.site?.answers).toMatchObject({ email: "owner@shop.co.uk", phone: "07700 900123" });
  });

  it("never overwrites what the customer typed, and fills only the gaps", () => {
    const typed = { ...blank, profile: { ...blank.profile, email: "me@mine.example" } };
    const r = withKnownContact(typed, known);
    expect(r.brief.profile.email).toBe("me@mine.example");
    expect(r.brief.profile.phone).toBe("07700 900123");
  });

  it("returns the same brief when there is nothing to fill or nothing known", () => {
    const full = { ...blank, profile: { ...blank.profile, email: "a@b.example", phone: "0113 496 0000" } };
    expect(withKnownContact(full, known)).toEqual({ brief: full, changed: false });
    expect(withKnownContact(blank, null)).toEqual({ brief: blank, changed: false });
    expect(withKnownContact(blank, { email: "", phone: "" })).toEqual({ brief: blank, changed: false });
  });
});
