/**
 * Automatic checks on a template build. A build is usable only if none of these report an issue. The model is never
 * asked whether it is happy with its own work; these decide. The owner can still override a failure when reviewing.
 */
import type { CustomerFacts, Section, SiteContent } from "./schema";
import { AVOID_WORDING } from "./avoid-wording";
import { findCopiedRun } from "./originality";
import { FIELD_LIMITS, LOOKS, SECTION_KINDS, WORD_LIMITS } from "./schema";
import { sentencesOf, wordCount } from "./text";
import type { SectorPreset } from "./presets";

export type CheckIssue = { code: string; message: string; where?: string };
export type CheckResult = { ok: boolean; issues: CheckIssue[] };

const PLACEHOLDERS = [
  /lorem/i,
  /ipsum/i,
  /your (headline|business|name|text|tagline|title) here/i,
  /\[[^\]]*\]/,
  /\{\{[^}]*\}\}/,
  /\bTODO\b/,
  /\bTBC\b/,
  /\bplaceholder\b/i,
  /\bsample text\b/i,
  /\binsert\b.{0,20}\bhere\b/i,
];

/**
 * Filler that says nothing. Phrases are lower-case with spaces: the check ignores case and treats hyphens as spaces. A
 * phrase the customer wrote themselves is theirs, so it is never flagged.
 */
export const FILLER_PHRASES = [
  "passionate team",
  "passionate about",
  "cutting edge",
  "one stop shop",
  "state of the art",
  "world class",
  "second to none",
  "look no further",
  "next level",
  "we pride ourselves",
  "top notch",
  "industry leading",
  "unparalleled",
  "unrivalled",
  "game changing",
  "tailored solutions",
] as const;

const plain = (text: string) => text.toLowerCase().replace(/[-–—]/g, " ").replace(/\s+/g, " ").trim();
const fillerIn = (text: string) => FILLER_PHRASES.find((phrase) => plain(text).includes(phrase));

const MARKUP = /<[a-z/!][^>]*>|https?:\/\/|www\./i;
const PRICE = /£\s?\d[\d,]*(?:\.\d{1,2})?/g;
const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE = /(?:\+44|0)[\d\s()-]{8,14}\d/g;

const digits = (s: string) => s.replace(/\D/g, "");
const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
const priceKey = (s: string) => s.replace(/[£\s,]/g, "").replace(/\.00$/, "");

/** Every piece of customer-facing text in the content, with where it sits, so checks can look at each one. */
function textFields(content: SiteContent): { where: string; text: string; limit?: number }[] {
  const out: { where: string; text: string; limit?: number }[] = [];
  const add = (where: string, text: string | undefined, limit?: number) => {
    if (text !== undefined) out.push({ where, text, limit });
  };
  const b = content.business;
  add("business.name", b.name, FIELD_LIMITS.heading);
  add("business.tagline", b.tagline, FIELD_LIMITS.tagline);
  content.sections.forEach((s, i) => {
    const at = `sections[${i}].${s.kind}`;
    switch (s.kind) {
      case "hero":
        add(`${at}.headline`, s.headline, FIELD_LIMITS.headline);
        add(`${at}.intro`, s.intro, FIELD_LIMITS.intro);
        add(`${at}.cta`, s.cta, FIELD_LIMITS.cta);
        break;
      case "services":
        add(`${at}.heading`, s.heading, FIELD_LIMITS.heading);
        s.items.forEach((it, j) => {
          add(`${at}.items[${j}].name`, it.name, FIELD_LIMITS.itemName);
          add(`${at}.items[${j}].description`, it.description, FIELD_LIMITS.itemText);
          add(`${at}.items[${j}].price`, it.price, FIELD_LIMITS.price);
        });
        break;
      case "hours":
        add(`${at}.heading`, s.heading, FIELD_LIMITS.heading);
        break;
      case "gallery":
        add(`${at}.heading`, s.heading, FIELD_LIMITS.heading);
        s.images.forEach((im, j) => add(`${at}.images[${j}].alt`, im.alt, FIELD_LIMITS.alt));
        break;
      case "facts":
        s.items.forEach((f, j) => {
          add(`${at}.items[${j}].value`, f.value, FIELD_LIMITS.factValue);
          add(`${at}.items[${j}].label`, f.label, FIELD_LIMITS.factLabel);
        });
        break;
      case "area":
        add(`${at}.heading`, s.heading, FIELD_LIMITS.heading);
        add(`${at}.text`, s.text, FIELD_LIMITS.body);
        break;
      case "enquiry":
        add(`${at}.heading`, s.heading, FIELD_LIMITS.heading);
        add(`${at}.intro`, s.intro, FIELD_LIMITS.intro);
        add(`${at}.cta`, s.cta, FIELD_LIMITS.cta);
        add(`${at}.prompt`, s.prompt, FIELD_LIMITS.prompt);
        break;
      case "faq":
        add(`${at}.heading`, s.heading, FIELD_LIMITS.heading);
        s.items.forEach((q, j) => {
          add(`${at}.items[${j}].question`, q.question, FIELD_LIMITS.question);
          add(`${at}.items[${j}].answer`, q.answer, FIELD_LIMITS.answer);
        });
        break;
      case "cta":
        add(`${at}.headline`, s.headline, FIELD_LIMITS.headline);
        add(`${at}.cta`, s.cta, FIELD_LIMITS.cta);
        break;
    }
  });
  return out;
}

/** Whether a section has anything in it. An empty section must not reach the preview. */
function isFilled(s: Section): boolean {
  switch (s.kind) {
    case "hero":
      return !!s.headline.trim();
    case "services":
    case "hours":
    case "facts":
    case "faq":
      return s.items.length > 0;
    case "gallery":
      return s.images.length > 0;
    case "area":
      return !!s.text.trim();
    case "enquiry":
      return !!s.heading.trim() && !!s.cta.trim();
    case "cta":
      return !!s.headline.trim() && !!s.cta.trim();
  }
}

/** `avoid` is wording from sites we shouldn't copy; it defaults to the list kept in avoid-wording.ts. */
export function checkSite(content: SiteContent, facts: CustomerFacts, preset: SectorPreset, options: { avoid?: readonly string[] } = {}): CheckResult {
  const issues: CheckIssue[] = [];
  const flag = (code: string, message: string, where?: string) => issues.push({ code, message, where });

  // Structure: known kinds, only kinds the preset allows, no repeats, in the preset's order.
  const allowed = preset.sections.map((p) => p.kind);
  const seen = new Set<string>();
  let lastIndex = -1;
  content.sections.forEach((s, i) => {
    if (!SECTION_KINDS.includes(s.kind)) return flag("unknown-section", `Unknown section "${String(s.kind)}".`, `sections[${i}]`);
    if (!allowed.includes(s.kind)) return flag("section-not-in-preset", `A ${preset.label} site has no "${s.kind}" section.`, `sections[${i}]`);
    if (seen.has(s.kind)) return flag("duplicate-section", `The "${s.kind}" section appears twice.`, `sections[${i}]`);
    seen.add(s.kind);
    const order = allowed.indexOf(s.kind);
    if (order < lastIndex) flag("section-order", `The "${s.kind}" section is out of order.`, `sections[${i}]`);
    lastIndex = Math.max(lastIndex, order);
    if (!isFilled(s)) flag("empty-section", `The "${s.kind}" section is empty.`, `sections[${i}]`);
  });

  // Required sections are present.
  for (const p of preset.sections) {
    if (p.required && !seen.has(p.kind)) flag("missing-section", `The required "${p.kind}" section is missing.`);
  }

  if (!(LOOKS as readonly string[]).includes(content.theme.look)) flag("bad-look", `"${content.theme.look}" is not an allowed look.`, "theme.look");
  if (!/^#[0-9a-f]{6}$/i.test(content.theme.colour)) flag("bad-colour", "The theme colour must be a hex colour such as #1a2b3c.", "theme.colour");

  const fields = textFields(content);
  const theirWords = [facts.about ?? "", ...(facts.details ?? []).map((d) => d.value)].join(" ");

  for (const f of fields) {
    if (f.limit && f.text.length > f.limit) flag("too-long", `Text is ${f.text.length} characters; the limit is ${f.limit}.`, f.where);
    if (PLACEHOLDERS.some((re) => re.test(f.text))) flag("placeholder", `Placeholder text left in: "${f.text.slice(0, 40)}".`, f.where);
    if (MARKUP.test(f.text)) flag("markup", "Text must be plain: no HTML or links.", f.where);
  }
  for (const [i, s] of content.sections.entries()) {
    if (s.kind === "gallery") s.images.forEach((im, j) => !im.alt.trim() && flag("missing-alt", "Image needs a short description.", `sections[${i}].images[${j}]`));
    if (s.kind === "services" && s.items.length > FIELD_LIMITS.items) flag("too-many-items", `More than ${FIELD_LIMITS.items} services.`, `sections[${i}]`);
    if (s.kind === "faq" && s.items.length > 4) flag("too-many-items", "More than four FAQ items.", `sections[${i}]`);
    if (s.kind === "facts" && s.items.length > 4) flag("too-many-items", "More than four facts.", `sections[${i}]`);
  }

  // Regulated or risky wording for this sector. Facts the customer ticked themselves are theirs to claim.
  for (const claim of preset.restrictedClaims ?? []) {
    if (claim.unless?.(facts)) continue;
    for (const f of fields) {
      // The customer's own service names and prices, and the facts they ticked, are theirs to say.
      if (f.where.includes(".facts.") || /\.items\[\d+\]\.(name|price)$/.test(f.where)) continue;
      const hit = f.text.match(claim.pattern);
      if (hit) flag("restricted-claim", `${claim.reason} ("${hit[0]}")`, f.where);
    }
  }

  // Quality: one clear next step, short plain wording, and something for search to show.
  const hero = content.sections.find((s) => s.kind === "hero");
  const closing = content.sections.find((s) => s.kind === "cta");
  if (hero && hero.kind === "hero") {
    if (!hero.cta.trim()) flag("cta-missing", "The top of the page needs one clear next step.", "hero.cta");
    if (!hero.intro.trim()) flag("no-description", "The page needs an intro: search results show it as the page description.", "hero.intro");
    if (closing && closing.kind === "cta" && norm(closing.cta) !== norm(hero.cta)) {
      flag("cta-mismatch", `The page should point to one next step, but the top says "${hero.cta}" and the end says "${closing.cta}".`, "cta");
    }
  }
  const theirs = plain(theirWords);
  const avoid = options.avoid ?? AVOID_WORDING;
  for (const f of fields) {
    // The customer's own names and prices, and the facts they ticked, are theirs: only wording is judged.
    if (f.where.includes(".facts.") || f.where === "business.name" || /\.items\[\d+\]\.(name|price)$/.test(f.where)) continue;
    const words = f.where.endsWith(".hero.headline") ? WORD_LIMITS.headline : f.where.endsWith(".hero.intro") || f.where.endsWith(".enquiry.intro") ? WORD_LIMITS.intro : undefined;
    if (words && wordCount(f.text) > words) flag("too-many-words", `Use at most ${words} words here; this has ${wordCount(f.text)}.`, f.where);
    const filler = fillerIn(f.text);
    if (filler && !theirs.includes(filler)) flag("filler", `"${filler}" says nothing. Say what the business does instead.`, f.where);
    for (const sentence of sentencesOf(f.text)) {
      if (wordCount(sentence) > WORD_LIMITS.sentence && !theirs.includes(plain(sentence))) {
        flag("long-sentence", `A sentence of ${wordCount(sentence)} words is hard to read. Keep sentences under ${WORD_LIMITS.sentence + 1} words.`, f.where);
      }
    }
    const copied = findCopiedRun(f.text, avoid, theirWords);
    if (copied) flag("copied-wording", `These words match another site exactly: "${copied}". Write it in your own words.`, f.where);
  }

  // The customer's own details appear.
  const allText = norm(fields.map((f) => f.text).join(" "));
  if (norm(content.business.name) !== norm(facts.businessName)) {
    flag("business-name", `The business name should be "${facts.businessName}".`, "business.name");
  } else if (!allText.includes(norm(facts.businessName))) {
    flag("business-name", "The business name does not appear.", "business.name");
  }

  const services = content.sections.find((s) => s.kind === "services");
  const listed = services && services.kind === "services" ? services.items : [];
  for (const svc of facts.services) {
    const match = listed.find((it) => norm(it.name) === norm(svc.name));
    if (!match) {
      flag("service-missing", `The service "${svc.name}" is missing.`, "services");
    } else if (svc.price && priceKey(match.price ?? "") !== priceKey(svc.price)) {
      flag("price-changed", `"${svc.name}" should cost ${svc.price}.`, "services");
    } else if (!svc.price && match.price) {
      flag("price-invented", `No price was given for "${svc.name}".`, "services");
    }
  }
  for (const it of listed) {
    if (!facts.services.some((s) => norm(s.name) === norm(it.name))) flag("service-invented", `"${it.name}" was not one of the customer's services.`, "services");
  }

  // Nothing invented: every price, email, phone number and address in the text must come from the customer.
  // Whatever the customer typed in their own words counts as theirs too: a price, an email or a number they wrote.
  const knownPrices = new Set([...facts.services.map((s) => s.price).filter(Boolean), ...(theirWords.match(PRICE) ?? [])].map((p) => priceKey(p!)));
  const knownEmails = new Set([facts.email, ...(theirWords.match(EMAIL) ?? [])].filter(Boolean).map((e) => norm(e!)));
  const knownPhones = new Set([facts.phone, ...(theirWords.match(PHONE) ?? [])].filter(Boolean).map((p) => digits(p!)));
  for (const f of fields) {
    for (const m of f.text.match(PRICE) ?? []) {
      if (!knownPrices.has(priceKey(m))) flag("price-invented", `The price ${m} was not given by the customer.`, f.where);
    }
    for (const m of f.text.match(EMAIL) ?? []) {
      if (!knownEmails.has(norm(m))) flag("email-invented", `The email ${m} was not given by the customer.`, f.where);
    }
    for (const m of f.text.match(PHONE) ?? []) {
      if (!knownPhones.has(digits(m))) flag("phone-invented", `The phone number ${m} was not given by the customer.`, f.where);
    }
  }
  const b = content.business;
  if (b.phone && (!facts.phone || digits(b.phone) !== digits(facts.phone))) flag("phone-invented", "The phone number does not match the customer's.", "business.phone");
  if (b.email && (!facts.email || norm(b.email) !== norm(facts.email))) flag("email-invented", "The email does not match the customer's.", "business.email");
  if (b.address && (!facts.address || norm(b.address) !== norm(facts.address))) flag("address-invented", "The address does not match the customer's.", "business.address");

  // Opening hours must be the customer's, unchanged.
  const hours = content.sections.find((s) => s.kind === "hours");
  if (hours && hours.kind === "hours") {
    if (!facts.hours) {
      flag("hours-invented", "The customer gave no opening hours.", "hours");
    } else if (JSON.stringify(hours.items) !== JSON.stringify(facts.hours)) {
      flag("hours-changed", "Opening hours differ from what the customer gave.", "hours");
    }
  }

  // "Find us" needs something true to say: the address for a shop, the areas for a trade.
  if (seen.has("area")) {
    if (preset.areaSource === "address" && !facts.address) flag("area-without-address", "The customer gave no address, so there is nothing to put in the area section.", "area");
    if (preset.areaSource === "areas") {
      if (!facts.areas?.length) flag("area-without-areas", "The customer gave no areas, so there is nothing to put in the area section.", "area");
      const areaSection = content.sections.find((s) => s.kind === "area");
      const areaText = areaSection && areaSection.kind === "area" ? norm(`${areaSection.heading} ${areaSection.text}`) : "";
      for (const place of facts.areas ?? []) if (!areaText.includes(norm(place))) flag("area-missing", `The area "${place}" is missing.`, "area");
    }
  }

  return { ok: issues.length === 0, issues };
}

/** The reasons, as one block of text, for retrying a failed build once with the failure reasons. */
export function describeIssues(result: CheckResult): string {
  return result.issues.map((i) => `- ${i.where ? `${i.where}: ` : ""}${i.message}`).join("\n");
}
