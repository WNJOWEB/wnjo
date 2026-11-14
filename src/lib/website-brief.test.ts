import { describe, expect, it } from "vitest";
import {
  EMPTY_BRIEF,
  briefUploadPath,
  cleanBrief,
  cleanReference,
  formatBrief,
  pagesBeyondBand,
  safeFileName,
  validateBrief,
  validateBriefUpload,
} from "./website-brief";

const DRAFT = "3f1c2a4e-9b7d-4c2a-8e1f-0a1b2c3d4e5f";

describe("cleanBrief", () => {
  it("keeps known goals in the order chosen and drops unknown ones and duplicates", () => {
    const b = cleanBrief({ goals: ["bookings", "free-money", "enquiries", "bookings"] });
    expect(b.goals).toEqual(["bookings", "enquiries"]);
  });

  it("trims page names, removes duplicates and caps the list", () => {
    const b = cleanBrief({ pages: [" Home ", "Home", "", "About", ...Array.from({ length: 40 }, (_, i) => `P${i}`)] });
    expect(b.pages[0]).toBe("Home");
    expect(b.pages[1]).toBe("About");
    expect(b.pages).toHaveLength(30);
  });

  it("drops an unknown style instead of failing", () => {
    expect(cleanBrief({ style: "neon" }).style).toBeNull();
    expect(cleanBrief({ style: "warm" }).style).toBe("warm");
  });

  it("strips control characters and limits free text", () => {
    const b = cleanBrief({ goalNote: "Hi\u0000 there", functionality: "x".repeat(5000) });
    expect(b.goalNote).toBe("Hi there");
    expect(b.functionality).toHaveLength(2000);
  });

  it("accepts only files stored under this draft's own folder", () => {
    const own = { path: `drafts/${DRAFT}/abc-logo.png`, name: "logo.png", size: 1000, type: "image/png" };
    const other = { path: "drafts/11111111-1111-4111-8111-111111111111/x.png", name: "x.png", size: 10, type: "image/png" };
    const escape = { path: `drafts/${DRAFT}/../secret.pdf`, name: "s.pdf", size: 10, type: "application/pdf" };
    const exe = { path: `drafts/${DRAFT}/x.exe`, name: "x.exe", size: 10, type: "application/x-msdownload" };
    expect(cleanBrief({ files: [own, other, escape, exe, own] }, DRAFT).files).toEqual([own]);
  });

  it("accepts no files at all without a valid draft id", () => {
    const own = { path: `drafts/${DRAFT}/abc-logo.png`, name: "logo.png", size: 1000, type: "image/png" };
    expect(cleanBrief({ files: [own] }).files).toEqual([]);
    expect(cleanBrief({ files: [own] }, "not-a-uuid").files).toEqual([]);
  });

  it("returns the default pages for a missing brief", () => {
    expect(cleanBrief(null)).toEqual(EMPTY_BRIEF);
  });
});

describe("references", () => {
  it("adds https and keeps only real web addresses", () => {
    expect(cleanReference("example.co.uk")).toBe("https://example.co.uk/");
    expect(cleanReference("http://example.com/page")).toBe("http://example.com/page");
    expect(cleanReference("javascript:alert(1)")).toBeNull();
    expect(cleanReference("https://user:pass@example.com")).toBeNull();
    expect(cleanReference("localhost")).toBeNull();
  });

  it("keeps at most three", () => {
    expect(cleanBrief({ references: ["a.com", "b.com", "c.com", "d.com"] }).references).toHaveLength(3);
  });
});

describe("validation", () => {
  it("needs a goal and a page", () => {
    expect(validateBrief({ ...EMPTY_BRIEF, pages: [] })).toEqual({
      goals: "Choose at least one goal.",
      pages: "Add at least one page.",
    });
    expect(validateBrief({ ...EMPTY_BRIEF, goals: ["enquiries"] })).toEqual({});
  });

  it("counts pages beyond the chosen band without pricing them", () => {
    const brief = { ...EMPTY_BRIEF, pages: ["a", "b", "c", "d", "e"] };
    expect(pagesBeyondBand(brief, 3)).toBe(2);
    expect(pagesBeyondBand(brief, 5)).toBe(0);
    expect(pagesBeyondBand(brief, null)).toBe(0);
  });
});

describe("uploads", () => {
  it("allows images, PDFs and documents up to 20 MB", () => {
    expect(validateBriefUpload({ fileName: "logo.svg", mimeType: "image/svg+xml", sizeBytes: 2000 })).toBeNull();
    expect(validateBriefUpload({ fileName: "a.zip", mimeType: "application/zip", sizeBytes: 2000 })).toMatch(/Upload/);
    expect(validateBriefUpload({ fileName: "big.png", mimeType: "image/png", sizeBytes: 21 * 1024 * 1024 })).toMatch(/20 MB/);
    expect(validateBriefUpload({ fileName: "", mimeType: "image/png", sizeBytes: 10 })).toMatch(/name/);
  });

  it("makes file names safe and keeps uploads in the draft's folder", () => {
    expect(safeFileName("../../Café logo (final).png")).toBe("Cafe-logo-final.png");
    expect(safeFileName("???")).toBe("file");
    expect(briefUploadPath(DRAFT, "u1", "My Logo.png")).toBe(`drafts/${DRAFT}/u1-My-Logo.png`);
  });
});

describe("formatBrief", () => {
  it("summarises the brief as plain text", () => {
    const text = formatBrief({
      ...EMPTY_BRIEF,
      goals: ["bookings"],
      style: "warm",
      references: ["https://example.com/"],
      files: [{ path: "p", name: "logo.png", size: 2048, type: "image/png" }],
    });
    expect(text).toContain("Goals: Online bookings");
    expect(text).toContain("Pages (4): Home, About, Services, Contact");
    expect(text).toContain("Style: Warm and friendly");
    expect(text).toContain("logo.png (2 KB)");
  });
});

describe("the template site answers in a brief", () => {
  it("are kept when the sector is known, and dropped when it isn't", () => {
    const kept = cleanBrief({ goals: ["bookings"], site: { sector: "barber", answers: { businessName: "Hartley & Sons" } } });
    expect(kept.site).toMatchObject({ sector: "barber", answers: { businessName: "Hartley & Sons" } });
    expect(cleanBrief({ site: { sector: "plumber", answers: {} } }).site).toBeNull();
    expect(cleanBrief({}).site).toBeNull();
  });

  it("show in the plain-text brief", () => {
    const text = formatBrief({ ...EMPTY_BRIEF, site: { sector: "barber", answers: { businessName: "Hartley & Sons" } } });
    expect(text).toContain("Template site: Grooming, Hartley & Sons");
  });
});

describe("the typed business type", () => {
  it("keeps the customer's words, plain and short", () => {
    expect(cleanBrief({ otherBusinessType: "  Dog <b>grooming</b>  " }).otherBusinessType).toBe("Dog grooming");
    expect(cleanBrief({ otherBusinessType: "x".repeat(200) }).otherBusinessType).toHaveLength(80);
    expect(cleanBrief({}).otherBusinessType).toBe("");
  });

  it("shows in the plain-text brief", () => {
    expect(formatBrief({ ...EMPTY_BRIEF, otherBusinessType: "Florist" })).toContain("Business type (their words): Florist");
  });
});
