/**
 * The content of a template-based customer website. A template is a fixed layout of sections; the AI fills in the
 * content below and our own code lays it out. Every field is plain text with a length limit: no HTML, no scripts, no
 * links, so nothing the model writes can run in a visitor's browser. See docs/AI_BUILD_SPEC.md.
 */

/** The kinds of section a template can have. A sector preset chooses which ones appear, and in what order. */
export const SECTION_KINDS = ["hero", "services", "hours", "gallery", "facts", "area", "enquiry", "faq", "cta"] as const;
export type SectionKind = (typeof SECTION_KINDS)[number];

export const LOOKS = ["minimal", "warm", "bold", "classic"] as const;
export type Look = (typeof LOOKS)[number];

/** The most each text field may hold. The checks enforce these; the page layouts are designed to fit them. */
export const FIELD_LIMITS = {
  tagline: 100,
  headline: 120,
  intro: 300,
  heading: 80,
  body: 600,
  itemName: 60,
  itemText: 200,
  price: 20,
  question: 120,
  answer: 400,
  cta: 40,
  factValue: 24,
  factLabel: 60,
  alt: 120,
  prompt: 60,
  area: 40,
  areas: 8,
  items: 12,
} as const;

/** The most words in the places the model writes. Short wording reads better and fits the layouts. */
export const WORD_LIMITS = { headline: 12, intro: 40, sentence: 35 } as const;

export type ServiceItem = { name: string; description?: string; price?: string };
export type HoursItem = { day: string; open?: string; close?: string; closed?: boolean };
export type GalleryImage = { src: string; alt: string };
export type Fact = { value: string; label: string };
export type FaqItem = { question: string; answer: string };

export type Section =
  | { kind: "hero"; variant: "photo" | "video" | "plain"; headline: string; intro: string; cta: string; image?: string }
  | { kind: "services"; heading: string; items: ServiceItem[] }
  | { kind: "hours"; heading: string; items: HoursItem[] }
  | { kind: "gallery"; heading: string; images: GalleryImage[] }
  | { kind: "facts"; items: Fact[] }
  | { kind: "area"; heading: string; text: string }
  | { kind: "enquiry"; heading: string; intro: string; cta: string; prompt?: string }
  | { kind: "faq"; heading: string; items: FaqItem[] }
  | { kind: "cta"; headline: string; cta: string };

export type BusinessDetails = {
  name: string;
  tagline?: string;
  phone?: string;
  email?: string;
  address?: string;
};

export type SiteContent = {
  business: BusinessDetails;
  theme: { colour: string; look: Look };
  sections: Section[];
};

/**
 * What the customer told us, in structured form. The checks compare the AI's output against this, so a price,
 * a phone number or an address the customer never gave can't appear on their site.
 */
export type CustomerFacts = {
  businessName: string;
  services: { name: string; price?: string }[];
  hours?: HoursItem[];
  /** Short facts the customer ticked or typed, such as "Walk-ins welcome". Shown as the facts strip. */
  highlights?: Fact[];
  /** Places a trade covers, each named as the customer gave it. */
  areas?: string[];
  phone?: string;
  email?: string;
  address?: string;
  /** The customer's own words on what makes the business different. The writer may rephrase it, never add to it. */
  about?: string;
  /** The customer's answers to the sector's own questions, each with the question it answers. */
  details?: { label: string; value: string }[];
};
