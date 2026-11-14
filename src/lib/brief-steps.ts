/**
 * The steps of the details form a customer fills in after paying, and what each one needs before they can move on.
 * Pure (no network, no browser), so the form and the tests share the same rules. The server still checks everything
 * again when the details are sent: these rules only decide when the form lets someone go forward.
 */
import { pageKindFor } from "./site-template/pages";
import { parseAnswers } from "./site-template/answers";
import { SECTOR_PRESETS } from "./site-template/presets";
import { validateBrief, validateProfile, type WebsiteBrief } from "./website-brief";

export const STEP_IDS = ["about", "offer", "goals", "look", "files", "review"] as const;
export type StepId = (typeof STEP_IDS)[number];

export const STEP_TITLES: Record<StepId, string> = {
  about: "About you",
  offer: "What you offer",
  goals: "Goals and pages",
  look: "Look and feel",
  files: "Files and extras",
  review: "Check and send",
};

export type StepContext = {
  /** Whether the business type question is on. Off, the form has no type or offer step. */
  typesOn: boolean;
  /** How many pages the plan covers, once known. */
  allowedPages: number | null;
  name: string;
  businessName: string;
};

export type StepErrors = Record<string, string>;

/** The steps this brief goes through, in order. A template site sets its look in "What you offer", so skips "Look". */
export function stepsFor(brief: WebsiteBrief, ctx: Pick<StepContext, "typesOn">): StepId[] {
  return STEP_IDS.filter((s) => (s === "offer" ? ctx.typesOn : s === "look" ? !brief.site : true));
}

const hasType = (b: WebsiteBrief) => Boolean(b.site || b.otherBusinessType);

/** What a step still needs. An empty result means the customer can move on. */
export function validateStep(step: StepId, brief: WebsiteBrief, ctx: StepContext): StepErrors {
  switch (step) {
    case "about": {
      const errors: StepErrors = {};
      if (ctx.typesOn) {
        if (!ctx.businessName.trim()) errors.businessName = "Add your business name.";
        if (!hasType(brief)) errors.type = "Choose the kind of business, or tell us what it is.";
      }
      return errors;
    }
    case "offer": {
      if (brief.site) {
        const preset = SECTOR_PRESETS[brief.site.sector];
        if (!preset) return { type: "Choose the kind of business." };
        const parsed = parseAnswers({ ...brief.site.answers, businessName: ctx.businessName }, preset, { colour: "#1f3a34" });
        return parsed.ok ? {} : parsed.errors;
      }
      return validateProfile(brief) as StepErrors;
    }
    case "goals": {
      const errors: StepErrors = { ...validateBrief(brief) };
      if (!errors.pages && !brief.site && ctx.allowedPages !== null && brief.pages.length > ctx.allowedPages) {
        errors.pages = `Your plan covers up to ${ctx.allowedPages} pages. Remove ${brief.pages.length - ctx.allowedPages} to continue.`;
      }
      // A template site builds only the pages its layouts hold, and Home is always one of them.
      if (brief.site) {
        delete errors.pages;
        const named = brief.pages.filter((p) => p.trim().toLowerCase() !== "home");
        if (named.some((p) => !pageKindFor(p))) errors.pages = "Choose from Services, About, Gallery, FAQs and Contact.";
        else if (ctx.allowedPages !== null && named.length + 1 > ctx.allowedPages) errors.pages = `Your plan covers up to ${ctx.allowedPages} pages. Remove ${named.length + 1 - ctx.allowedPages} to continue.`;
      }
      return errors;
    }
    case "look":
    case "files":
    case "review":
      return {};
  }
}

/** The first step that still needs something, with what it needs, or null when the whole form is complete. */
export function firstIncompleteStep(brief: WebsiteBrief, ctx: StepContext): { step: StepId; errors: StepErrors } | null {
  for (const step of stepsFor(brief, ctx)) {
    const errors = validateStep(step, brief, ctx);
    if (Object.keys(errors).length) return { step, errors };
  }
  return null;
}

export type KnownContact = { email: string; phone: string };

/**
 * Fills the contact fields the customer hasn't answered with what they gave at sign-up, so the form doesn't ask for it
 * again. Anything already typed is kept as it is. Returns the same brief, unchanged, when there is nothing to fill.
 */
export function withKnownContact(brief: WebsiteBrief, known: KnownContact | null): { brief: WebsiteBrief; changed: boolean } {
  if (!known) return { brief, changed: false };
  const current = brief.site ? { email: brief.site.answers.email ?? "", phone: brief.site.answers.phone ?? "" } : { email: brief.profile.email, phone: brief.profile.phone };
  const fill = { ...(current.email || !known.email ? {} : { email: known.email }), ...(current.phone || !known.phone ? {} : { phone: known.phone }) };
  if (!Object.keys(fill).length) return { brief, changed: false };
  return {
    changed: true,
    brief: brief.site ? { ...brief, site: { ...brief.site, answers: { ...brief.site.answers, ...fill } } } : { ...brief, profile: { ...brief.profile, ...fill } },
  };
}
