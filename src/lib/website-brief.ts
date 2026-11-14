/**
 * The website brief: what a customer tells us beyond the price, in the "Build my website" journey. Business goals,
 * the pages they want, design preferences, functionality notes and uploaded files.
 *
 * Pure (no database, no browser), so the same rules check the brief in the form and on the server. Anything typed
 * here is stored as plain text and is never rendered as HTML. The brief is versioned: every saved change is a new
 * row in website_briefs, so the history of what the customer asked for is never overwritten.
 */

import { cleanExtras, EMPTY_EXTRAS, extrasRows, type BriefExtras } from "./brief-extras";
import { cleanSiteAnswers, type SiteAnswers } from "@/lib/site-template/answers";
import { SECTOR_PRESETS } from "@/lib/site-template/presets";

export const BRIEF_VERSION = 1;

/** What the website is for. The customer picks one or more; the first one chosen is treated as the main goal. */
export const GOALS = {
  enquiries: { label: "More enquiries", hint: "Calls, forms and messages" },
  bookings: { label: "Online bookings", hint: "Customers book without calling" },
  sales: { label: "Sell online", hint: "Products or vouchers" },
  trust: { label: "Look established", hint: "Credibility and reviews" },
  showcase: { label: "Show our work", hint: "Gallery and portfolio" },
  local: { label: "Be found locally", hint: "Google and maps" },
  time: { label: "Save admin time", hint: "Fewer repeat questions" },
  recruit: { label: "Recruit staff", hint: "Jobs and applications" },
} as const;
export type GoalId = keyof typeof GOALS;

/** Suggested page names. Customers can add their own. */
export const SUGGESTED_PAGES = [
  "Home",
  "About",
  "Services",
  "Contact",
  "Gallery",
  "Reviews",
  "Pricing",
  "FAQs",
  "Blog",
  "Book online",
  "Team",
  "Careers",
] as const;

/** Visual directions, shown as swatches. Each maps to a palette and type pairing in the preview tile. */
export const STYLES = {
  minimal: { label: "Clean and minimal", swatch: ["#f7f5f0", "#1d1b18", "#c9c2b5"], font: "sans" },
  warm: { label: "Warm and friendly", swatch: ["#f3e6d6", "#5a3825", "#d9825b"], font: "serif" },
  bold: { label: "Bold and modern", swatch: ["#111111", "#ffffff", "#ff5a1f"], font: "sans" },
  luxury: { label: "Premium and refined", swatch: ["#14130f", "#e8dcc4", "#a88b57"], font: "serif" },
  natural: { label: "Natural and calm", swatch: ["#eef0e8", "#2f3b2c", "#8fa382"], font: "serif" },
  playful: { label: "Bright and playful", swatch: ["#fff7e0", "#23205c", "#ff6f91"], font: "sans" },
} as const;
export type StyleId = keyof typeof STYLES;

export const BRIEF_LIMITS = {
  goalNote: 600,
  pageName: 40,
  pages: 30,
  references: 3,
  referenceUrl: 200,
  colours: 120,
  avoid: 600,
  functionality: 2000,
  files: 10,
  fileName: 140,
} as const;

/** Upload rules for the brief: logos, photos and documents. Smaller than project files, as nobody is signed in. */
export const BRIEF_UPLOAD = {
  maxBytes: 20 * 1024 * 1024,
  types: {
    "image/jpeg": "JPEG image",
    "image/png": "PNG image",
    "image/webp": "WebP image",
    "image/svg+xml": "SVG logo",
    "application/pdf": "PDF",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "Word document",
    "text/plain": "Text file",
  } as Record<string, string>,
} as const;

export type BriefFile = { path: string; name: string; size: number; type: string; /** What the customer says this picture is for. Left out for an ordinary photo. */ role?: "logo" | "hero" };

export type WebsiteBrief = {
  goals: GoalId[];
  goalNote: string;
  pages: string[];
  style: StyleId | null;
  references: string[];
  colours: string;
  avoid: string;
  functionality: string;
  files: BriefFile[];
  /** The sector questions for a template site. Null when the customer hasn't answered them. */
  site: SiteAnswers | null;
  /** The customer's own words for their business, when none of our sectors fits. Plain text. */
  otherBusinessType: string;
  /** What a first website needs for a business with no template. Used only when otherBusinessType is set. */
  profile: BusinessProfile;
  /** Extra questions for every brief: role, offer, what must be easy to find, look, and what to show. All optional. */
  extras: BriefExtras;
};

export const CUSTOMERS = { individuals: "Individuals", businesses: "Businesses", both: "Both" } as const;
export const FIRST_ACTIONS = { call: "Call", book: "Book online", quote: "Request a quote", email: "Email", visit: "Visit" } as const;
export const TONES = { friendly: "Friendly", professional: "Professional", premium: "Premium", straightforward: "Straightforward" } as const;
export type CustomerType = keyof typeof CUSTOMERS;
export type FirstAction = keyof typeof FIRST_ACTIONS;
export type Tone = keyof typeof TONES;

export const PROFILE_LIMITS = { services: 2000, phone: 20, email: 120, areas: 300, differentiator: 200, hours: 300, proof: 300, about: 1000 } as const;

export type BusinessProfile = {
  services: string;
  phone: string;
  email: string;
  differentiator: string;
  customers: CustomerType | "";
  areas: string;
  firstActions: FirstAction[];
  hours: string;
  proof: string;
  /** A few sentences in the customer's own words: who runs the business and why. Optional. */
  about: string;
  tone: Tone | "";
};

export const EMPTY_PROFILE: BusinessProfile = {
  services: "",
  phone: "",
  email: "",
  differentiator: "",
  customers: "",
  areas: "",
  firstActions: [],
  hours: "",
  proof: "",
  about: "",
  tone: "",
};

export const EMPTY_BRIEF: WebsiteBrief = {
  goals: [],
  goalNote: "",
  pages: ["Home", "About", "Services", "Contact"],
  style: null,
  references: [],
  colours: "",
  avoid: "",
  functionality: "",
  files: [],
  site: null,
  otherBusinessType: "",
  profile: EMPTY_PROFILE,
  extras: EMPTY_EXTRAS,
};

/** A random id for this browser's draft. Uploads sit under it until the brief is sent. */
export const DRAFT_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** Where an upload for a draft is stored. The server picks the unique part; the name is made safe. */
export function briefUploadPath(draftId: string, unique: string, fileName: string): string {
  return `drafts/${draftId}/${unique}-${safeFileName(fileName)}`;
}

export function safeFileName(name: string): string {
  const cleaned = name
    .normalize("NFKD")
    .replace(/[^\w.\- ]+/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(-80);
  return cleaned.replace(/^[.-]+/, "") || "file";
}

export function validateBriefUpload(input: { fileName: unknown; mimeType: unknown; sizeBytes: unknown }): string | null {
  if (typeof input.fileName !== "string" || !input.fileName.trim() || input.fileName.length > BRIEF_LIMITS.fileName) {
    return "That file name isn't valid.";
  }
  if (typeof input.mimeType !== "string" || !(input.mimeType in BRIEF_UPLOAD.types)) {
    return "Upload images (JPEG, PNG, WebP, SVG), PDFs, Word documents or text files.";
  }
  if (typeof input.sizeBytes !== "number" || !Number.isFinite(input.sizeBytes) || input.sizeBytes <= 0) {
    return "That file is empty.";
  }
  if (input.sizeBytes > BRIEF_UPLOAD.maxBytes) return "Files can be up to 20 MB.";
  return null;
}

const text = (v: unknown, max: number) =>
  typeof v === "string"
    ? v
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
        .trim()
        .slice(0, max)
    : "";

/** A web address the customer gave as a reference. Only http(s), host required; stored as typed (no fetching). */
export function cleanReference(v: unknown): string | null {
  const raw = text(v, BRIEF_LIMITS.referenceUrl);
  if (!raw) return null;
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(withScheme);
    if (!/^https?:$/.test(url.protocol) || !url.hostname.includes(".") || url.username || url.password) return null;
    return url.toString().slice(0, BRIEF_LIMITS.referenceUrl);
  } catch {
    return null;
  }
}

/**
 * Cleans a brief from the browser. Unknown goals, styles and file entries are dropped rather than rejected, so an
 * old saved draft never blocks someone. Files are only accepted under this draft's folder; the server then checks
 * each one exists in storage.
 */
export function cleanBrief(input: unknown, draftId?: string): WebsiteBrief {
  const o = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const goals = Array.isArray(o.goals)
    ? [...new Set(o.goals.filter((g): g is GoalId => typeof g === "string" && g in GOALS))]
    : [];
  const pages = Array.isArray(o.pages)
    ? [...new Set(o.pages.map((p) => text(p, BRIEF_LIMITS.pageName)).filter(Boolean))].slice(0, BRIEF_LIMITS.pages)
    : EMPTY_BRIEF.pages;
  const style = typeof o.style === "string" && o.style in STYLES ? (o.style as StyleId) : null;
  const references = Array.isArray(o.references)
    ? [...new Set(o.references.map(cleanReference).filter((r): r is string => Boolean(r)))].slice(0, BRIEF_LIMITS.references)
    : [];
  const prefix = draftId && DRAFT_ID_RE.test(draftId) ? `drafts/${draftId}/` : null;
  const files = Array.isArray(o.files)
    ? o.files
        .map((f) => {
          const r = (f && typeof f === "object" ? f : {}) as Record<string, unknown>;
          const path = typeof r.path === "string" ? r.path : "";
          const type = typeof r.type === "string" ? r.type : "";
          const size = typeof r.size === "number" && Number.isFinite(r.size) ? Math.round(r.size) : 0;
          const name = text(r.name, BRIEF_LIMITS.fileName);
          if (!prefix || !path.startsWith(prefix) || path.includes("..") || path.length > 260) return null;
          if (!(type in BRIEF_UPLOAD.types) || size <= 0 || size > BRIEF_UPLOAD.maxBytes || !name) return null;
          return { path, name, size, type, ...(r.role === "logo" || r.role === "hero" ? { role: r.role } : {}) };
        })
        .filter((f): f is BriefFile => f !== null)
        .filter((f, i, all) => all.findIndex((g) => g.path === f.path) === i)
        .slice(0, BRIEF_LIMITS.files)
    : [];
  return {
    goals,
    goalNote: text(o.goalNote, BRIEF_LIMITS.goalNote),
    pages,
    style,
    references,
    colours: text(o.colours, BRIEF_LIMITS.colours),
    avoid: text(o.avoid, BRIEF_LIMITS.avoid),
    functionality: text(o.functionality, BRIEF_LIMITS.functionality),
    files,
    site: cleanSiteAnswers(o.site, Object.keys(SECTOR_PRESETS)),
    otherBusinessType: text(o.otherBusinessType, 80).replace(/<[^>]*>/g, "").trim(),
    profile: cleanProfile(o.profile),
    extras: cleanExtras(o.extras),
  };
}

/** Cleans the profile the form sends. Unknown choices are dropped; nothing is judged here. */
export function cleanProfile(input: unknown): BusinessProfile {
  const o = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const pick = <T extends string>(v: unknown, options: Record<T, string>): T | "" => (typeof v === "string" && v in options ? (v as T) : "");
  const phone = text(o.phone, PROFILE_LIMITS.phone);
  return {
    services: text(o.services, PROFILE_LIMITS.services),
    phone,
    email: text(o.email, PROFILE_LIMITS.email).toLowerCase(),
    differentiator: text(o.differentiator, PROFILE_LIMITS.differentiator),
    customers: pick<CustomerType>(o.customers, CUSTOMERS),
    areas: text(o.areas, PROFILE_LIMITS.areas),
    firstActions: Array.isArray(o.firstActions) ? [...new Set(o.firstActions.filter((a): a is FirstAction => typeof a === "string" && a in FIRST_ACTIONS))] : [],
    hours: text(o.hours, PROFILE_LIMITS.hours),
    proof: text(o.proof, PROFILE_LIMITS.proof),
    about: text(o.about, PROFILE_LIMITS.about).replace(/<[^>]*>/g, "").trim(),
    tone: pick<Tone>(o.tone, TONES),
  };
}

/** The questions a first website needs, for a business with no template. Required: services, contact, what makes them different. */
export function validateProfile(brief: WebsiteBrief): Partial<Record<keyof BusinessProfile, string>> {
  if (!brief.otherBusinessType) return {};
  const p = brief.profile;
  const errors: Partial<Record<keyof BusinessProfile, string>> = {};
  if (!p.services) errors.services = "Tell us what you offer.";
  if (!p.email) errors.email = "Add an email address we can reply to.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(p.email)) errors.email = "Check the email address.";
  if (p.phone && !/^\+?[\d\s()-]{9,16}$/.test(p.phone)) errors.phone = "Check the phone number.";
  if (!p.differentiator) errors.differentiator = "Tell us what makes you different.";
  return errors;
}

export type BriefErrors = Partial<Record<"goals" | "pages", string>>;

/** The only required parts: at least one goal and at least one page. Everything else helps but is optional. */
export function validateBrief(brief: WebsiteBrief): BriefErrors {
  const errors: BriefErrors = {};
  if (brief.goals.length === 0) errors.goals = "Choose at least one goal.";
  if (brief.pages.length === 0) errors.pages = "Add at least one page.";
  return errors;
}

/**
 * Pages beyond what the chosen band covers. Shown as a hint, never charged from here: the price always comes from
 * the page band in the calculator, so a long list can't change the price without the customer seeing it.
 */
export function pagesBeyondBand(brief: WebsiteBrief, bandMax: number | null): number {
  if (bandMax === null) return 0;
  return Math.max(0, brief.pages.length - bandMax);
}

const kb = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

/** The profile as plain lines, for the email and the admin view. Empty answers are left out. */
export function profileLines(p: BusinessProfile): string[] {
  const out: string[] = [];
  if (p.services) out.push(`Offers: ${p.services.replace(/\n/g, "; ")}`);
  if (p.phone) out.push(`Phone: ${p.phone}`);
  if (p.email) out.push(`Email: ${p.email}`);
  if (p.differentiator) out.push(`What makes them different: ${p.differentiator}`);
  if (p.customers) out.push(`Customers: ${CUSTOMERS[p.customers]}`);
  if (p.areas) out.push(`Areas covered: ${p.areas}`);
  if (p.firstActions.length) out.push(`First action wanted: ${p.firstActions.map((a) => FIRST_ACTIONS[a]).join(", ")}`);
  if (p.hours) out.push(`Hours or availability: ${p.hours}`);
  if (p.about) out.push(`About the business, in their words: ${p.about}`);
  if (p.proof) out.push(`Proof to show: ${p.proof}`);
  if (p.tone) out.push(`Tone: ${TONES[p.tone]}`);
  return out;
}

/** The brief as plain text, for the owner's email and the admin view. */
export function formatBrief(brief: WebsiteBrief): string {
  const lines = [
    "BRIEF",
    `Goals: ${brief.goals.length ? brief.goals.map((g) => GOALS[g].label).join(", ") : "none chosen"}`,
    ...(brief.goalNote ? [`In their words: ${brief.goalNote}`] : []),
    `Pages (${brief.pages.length}): ${brief.pages.join(", ") || "none"}`,
    `Style: ${brief.style ? STYLES[brief.style].label : "no preference"}`,
    ...(brief.colours ? [`Colours: ${brief.colours}`] : []),
    ...(brief.references.length ? [`Websites they like: ${brief.references.join(" , ")}`] : []),
    ...(brief.avoid ? [`Avoid: ${brief.avoid}`] : []),
    ...(brief.functionality ? [`Functionality: ${brief.functionality}`] : []),
    ...(brief.site ? [`Template site: ${SECTOR_PRESETS[brief.site.sector]?.label ?? brief.site.sector}, ${brief.site.answers.businessName || "no name yet"}`] : []),
    ...(brief.otherBusinessType ? [`Business type (their words): ${brief.otherBusinessType}`] : []),
    ...(brief.otherBusinessType ? profileLines(brief.profile) : []),
    ...extrasRows(brief.extras).map(([label, value]) => `${label} ${value}`),
    `Files: ${brief.files.length ? brief.files.map((f) => `${f.name} (${kb(f.size)})`).join(", ") : "none"}`,
  ];
  return lines.join("\n");
}
