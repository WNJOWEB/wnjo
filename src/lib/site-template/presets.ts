/**
 * A sector preset says which sections a sector's site has, in what order, which are required, and what the writer
 * should aim for in each. Barber is the first. A new sector is a new preset on the same sections.
 */
import type { CustomerFacts, Look, SectionKind } from "./schema";

export type SectionPreset = {
  kind: SectionKind;
  /** A site without this section fails the checks. */
  required: boolean;
  /** One line for the writer: what this section is for in this sector. */
  guidance: string;
};

/** A fact the customer can tick, shown as one tile in the facts strip. Nothing is shown unless they tick it. */
export type HighlightOption = { id: string; value: string; label: string };

/** The three groups a customer chooses from. Each sector belongs to one. */
export const BUSINESS_GROUPS = {
  booking: { label: "Booking services", hint: "Appointments, bookings and enquiries" },
  hospitality: { label: "Hospitality", hint: "Food, drink and places to visit" },
  trades: { label: "Trades", hint: "Work done on site" },
} as const;
export type BusinessGroup = keyof typeof BUSINESS_GROUPS;

/**
 * Wording a sector's site must never use. The check looks at everything the writer produces except the facts the
 * customer ticked themselves. `unless` lets a customer's own tick permit a claim (for example a registration).
 */
export type RestrictedClaim = { pattern: RegExp; reason: string; unless?: (facts: CustomerFacts) => boolean };

export type SectorPreset = {
  id: string;
  label: string;
  group: BusinessGroup;
  defaultLook: Look;
  /** One line on the voice, passed to the writer. */
  voice: string;
  sections: SectionPreset[];
  highlights: HighlightOption[];
  /** What the customer's list is called in this sector, for the writer: "Services", "Menu items". */
  itemsLabel: string;
  /** Where "find us" comes from: the shop's address, or the areas a trade covers. */
  areaSource: "address" | "areas";
  /** The label on the free-text box of the request form. */
  enquiryPrompt: string;
  /** For a sector where some claims are regulated or risky: wording the site may not use. */
  restrictedClaims?: RestrictedClaim[];
};

export const BARBER_PRESET: SectorPreset = {
  id: "barber",
  label: "Grooming",
  group: "booking",
  defaultLook: "classic",
  itemsLabel: "Services",
  areaSource: "address",
  enquiryPrompt: "When suits you?",
  voice: "Confident, friendly and plain. Short sentences. No hype and no slang.",
  highlights: [
    { id: "walk-ins", value: "Walk-ins", label: "Always welcome" },
    { id: "cards", value: "Card", label: "Payments taken" },
    { id: "kids", value: "Kids", label: "Cuts for children" },
    { id: "appointments", value: "Appointments", label: "Booked by request" },
  ],
  sections: [
    { kind: "hero", required: true, guidance: "Say what the shop does and where, in one headline. The call to action is booking." },
    { kind: "services", required: true, guidance: "The cuts and treatments the customer listed, each with their own price if they gave one." },
    { kind: "hours", required: true, guidance: "Opening hours exactly as the customer gave them." },
    { kind: "gallery", required: false, guidance: "Photos the customer uploaded, with short plain captions." },
    { kind: "facts", required: false, guidance: "Up to four short facts the customer told us, such as years open or walk-ins welcome. Never invent one." },
    { kind: "area", required: false, guidance: "Where the shop is and how to find it, from the address the customer gave." },
    { kind: "enquiry", required: true, guidance: "A request-a-booking form: the customer asks for a time and the shop replies." },
    { kind: "faq", required: false, guidance: "Up to four questions a new customer asks, answered only from facts the customer gave." },
    { kind: "cta", required: true, guidance: "A closing line that points back to booking." },
  ],
};

export const CAFE_PRESET: SectorPreset = {
  id: "cafe",
  label: "Hospitality",
  group: "hospitality",
  defaultLook: "warm",
  itemsLabel: "Menu items",
  areaSource: "address",
  enquiryPrompt: "Date, time and how many of you?",
  voice: "Warm, welcoming and simple. Short sentences. Talk about the food and the room, never about hype.",
  highlights: [
    { id: "dogs", value: "Dogs", label: "Welcome inside" },
    { id: "vegan", value: "Vegan", label: "Options on the menu" },
    { id: "takeaway", value: "Takeaway", label: "Food and drink to go" },
    { id: "outdoor", value: "Outdoor", label: "Seating available" },
  ],
  sections: [
    { kind: "hero", required: true, guidance: "Say what the café is and where, in one headline. The call to action is booking a table." },
    { kind: "services", required: true, guidance: "The menu items the customer listed, each with their own price if they gave one. The heading should say menu." },
    { kind: "hours", required: true, guidance: "Opening hours exactly as the customer gave them." },
    { kind: "gallery", required: false, guidance: "Photos the customer uploaded, with short plain captions." },
    { kind: "facts", required: false, guidance: "Up to four short facts the customer told us, such as dogs welcome or vegan options. Never invent one." },
    { kind: "area", required: false, guidance: "Where the café is and how to find it, from the address the customer gave." },
    { kind: "enquiry", required: true, guidance: "A request-a-table form: the customer asks for a date, a time and a party size, and the café replies." },
    { kind: "faq", required: false, guidance: "Up to four questions a new customer asks, answered only from facts the customer gave." },
    { kind: "cta", required: true, guidance: "A closing line that points back to booking a table." },
  ],
};

export const ELECTRICIAN_PRESET: SectorPreset = {
  id: "electrician",
  label: "Tradesman",
  group: "trades",
  defaultLook: "bold",
  itemsLabel: "Services",
  areaSource: "areas",
  enquiryPrompt: "What do you need doing?",
  voice: "Direct, calm and reassuring. Short sentences. Say what is done and where, with no jargon and no big promises.",
  highlights: [
    { id: "free-quotes", value: "Free", label: "Quotes" },
    { id: "same-day", value: "Same day", label: "Call-outs available" },
    { id: "insured", value: "Insured", label: "Public liability cover" },
    { id: "certificates", value: "Certificates", label: "Provided for notifiable work" },
  ],
  sections: [
    { kind: "hero", required: true, guidance: "Say what the electrician does and where, in one headline. The call to action is asking for a quote." },
    { kind: "services", required: true, guidance: "The jobs the customer listed, each with their own price if they gave one." },
    { kind: "facts", required: false, guidance: "Up to four short facts the customer told us, such as free quotes or same-day call-outs. Never invent one, and never claim a registration or qualification." },
    { kind: "gallery", required: false, guidance: "Photos of work the customer uploaded, with short plain captions." },
    { kind: "area", required: true, guidance: "The areas covered. Name each area exactly as the customer gave it and add no others." },
    { kind: "hours", required: false, guidance: "When the electrician is available, exactly as the customer gave it." },
    { kind: "enquiry", required: true, guidance: "A request-a-quote form: the customer describes the job and the electrician replies." },
    { kind: "faq", required: false, guidance: "Up to four questions a new customer asks, answered only from facts the customer gave." },
    { kind: "cta", required: true, guidance: "A closing line that points back to asking for a quote." },
  ],
};

export const PHYSIO_PRESET: SectorPreset = {
  id: "physio",
  label: "Health",
  group: "booking",
  defaultLook: "minimal",
  itemsLabel: "Treatments",
  areaSource: "address",
  enquiryPrompt: "What would you like help with?",
  voice: "Calm, clear and reassuring. Short sentences. Say what a treatment involves, and never promise a result or a cure.",
  restrictedClaims: [
    { pattern: /\b(cure[sd]?|curing|guarantee[sd]?|heal(?:s|ed|ing)?|miracle|permanent(?:ly)?|risk[- ]free|100%)\b/i, reason: "A physio site must not promise a result or a cure." },
    {
      pattern: /\b(HCPC|registered|chartered|qualified|accredited|member of)\b/i,
      reason: "A registration or qualification can only be mentioned if the customer ticked it.",
      unless: (facts) => Boolean(facts.highlights?.some((h) => h.value === "HCPC")),
    },
  ],
  highlights: [
    { id: "same-week", value: "Same week", label: "Appointments available" },
    { id: "evenings", value: "Evening", label: "Slots available" },
    { id: "home-visits", value: "Home visits", label: "Available" },
    { id: "hcpc", value: "HCPC", label: "Registered physiotherapist" },
  ],
  sections: [
    { kind: "hero", required: true, guidance: "Say what the clinic offers and where, in one headline. The call to action is requesting an appointment. Never promise a result." },
    { kind: "services", required: true, guidance: "The treatments the customer listed, each with their own price if they gave one. The heading should say treatments." },
    { kind: "hours", required: true, guidance: "Opening hours exactly as the customer gave them." },
    { kind: "gallery", required: false, guidance: "Photos the customer uploaded, such as the clinic, with short plain captions." },
    { kind: "facts", required: false, guidance: "Up to four short facts the customer told us, such as same-week appointments. Never invent one, and never claim a registration or qualification." },
    { kind: "area", required: false, guidance: "Where the clinic is and how to find it, from the address the customer gave." },
    { kind: "enquiry", required: true, guidance: "A request-an-appointment form: the customer says what they need help with and when suits, and the clinic replies." },
    { kind: "faq", required: false, guidance: "Up to four questions a new patient asks, answered only from facts the customer gave. Never give medical advice." },
    { kind: "cta", required: true, guidance: "A closing line that points back to requesting an appointment." },
  ],
};

export const MASSAGE_PRESET: SectorPreset = {
  id: "massage",
  label: "Wellbeing",
  group: "booking",
  defaultLook: "warm",
  itemsLabel: "Treatments",
  areaSource: "address",
  enquiryPrompt: "What would you like to book?",
  voice: "Calm, warm and unhurried. Short sentences. Describe the treatment and the room, and never promise a result.",
  restrictedClaims: [
    { pattern: /\b(cure[sd]?|curing|heal(?:s|ed|ing)?|guarantee[sd]?|miracle|permanent(?:ly)?|diagnos(?:e|es|ed|is)|100%)\b/i, reason: "A massage site must not promise a cure or a medical result, or offer a diagnosis." },
    {
      pattern: /\b(qualified|accredited|registered|certified|member of)\b/i,
      reason: "A qualification or membership can only be mentioned if the customer ticked it.",
      unless: (facts) => Boolean(facts.highlights?.some((h) => h.value === "Qualified")),
    },
  ],
  highlights: [
    { id: "couples", value: "Couples", label: "Treatment rooms for two" },
    { id: "home-visits", value: "Home visits", label: "Available" },
    { id: "evenings", value: "Evening", label: "Slots available" },
    { id: "qualified", value: "Qualified", label: "Qualified therapists" },
  ],
  sections: [
    { kind: "hero", required: true, guidance: "Say what the treatments are and where, in one headline. The call to action is booking a treatment. Never promise a result." },
    { kind: "services", required: true, guidance: "The treatments the customer listed, each with its own price if they gave one. The heading should say treatments." },
    { kind: "hours", required: true, guidance: "Opening hours exactly as the customer gave them." },
    { kind: "facts", required: false, guidance: "Up to four short facts the customer told us, such as evening slots or home visits. Never invent one, and never claim a qualification." },
    { kind: "gallery", required: false, guidance: "Photos the customer uploaded, such as the treatment room, with short plain captions." },
    { kind: "area", required: false, guidance: "Where the treatment room is and how to find it, from the address the customer gave." },
    { kind: "enquiry", required: true, guidance: "A request-a-treatment form: the customer says which treatment and when suits, and the therapist replies to confirm." },
    { kind: "faq", required: false, guidance: "Up to four questions a new client asks, answered only from facts the customer gave. Never give medical advice." },
    { kind: "cta", required: true, guidance: "A closing line that points back to booking a treatment." },
  ],
};

export const FITNESS_PRESET: SectorPreset = {
  id: "fitness",
  label: "Fitness",
  group: "booking",
  defaultLook: "bold",
  itemsLabel: "Classes and sessions",
  areaSource: "address",
  enquiryPrompt: "Which class or session interests you?",
  voice: "Energetic but plain. Short sentences. Say what a session involves and who it suits. No hype and no promised results.",
  restrictedClaims: [
    { pattern: /\b(guarantee[sd]?|transform(?:s|ed|ation)?|miracle|lose \d+|burn \d+|results? (?:in|within) \d+)\b/i, reason: "A fitness site must not promise a result, such as weight lost or how soon it will show." },
    {
      pattern: /\b(qualified|accredited|certified|registered|REPS|member of)\b/i,
      reason: "A qualification or membership can only be mentioned if the customer ticked it.",
      unless: (facts) => Boolean(facts.highlights?.some((h) => h.value === "Qualified")),
    },
  ],
  highlights: [
    { id: "beginners", value: "Beginners", label: "Welcome at every level" },
    { id: "kids", value: "Kids", label: "Classes for children" },
    { id: "equipment", value: "Equipment", label: "Provided for you" },
    { id: "qualified", value: "Qualified", label: "Qualified coaches" },
  ],
  sections: [
    { kind: "hero", required: true, guidance: "Say what the business offers and where, in one headline. The call to action is booking a free trial or a session." },
    { kind: "services", required: true, guidance: "The classes and sessions the customer listed, each with its price if they gave one, and when it runs if they said." },
    { kind: "hours", required: true, guidance: "Opening hours exactly as the customer gave them." },
    { kind: "facts", required: false, guidance: "Up to four short facts the customer told us, such as beginners welcome or equipment provided. Never invent one, and never claim a qualification." },
    { kind: "gallery", required: false, guidance: "Photos the customer uploaded, such as the studio or a class, with short plain captions." },
    { kind: "area", required: false, guidance: "Where the studio or gym is and how to find it, from the address the customer gave." },
    { kind: "enquiry", required: true, guidance: "A request-a-trial form: the customer asks about a class or session, and the business replies." },
    { kind: "faq", required: false, guidance: "Up to four questions a new member asks, answered only from facts the customer gave. Never give medical advice." },
    { kind: "cta", required: true, guidance: "A closing line that points back to booking a trial." },
  ],
};

export const HOLIDAY_LET_PRESET: SectorPreset = {
  id: "holiday-let",
  label: "Accommodation",
  group: "hospitality",
  defaultLook: "minimal",
  itemsLabel: "Stays",
  areaSource: "areas",
  enquiryPrompt: "When would you like to stay?",
  voice: "Warm and practical. Short sentences. Describe the place, the rooms and what is nearby. Never invent a rating or an award.",
  restrictedClaims: [
    { pattern: /\b(award[- ]winning|5[- ]star|five[- ]star|top[- ]rated|best[- ]rated|guarantee[sd]?)\b/i, reason: "A holiday let must not claim a rating, an award or a guarantee the customer hasn't given." },
  ],
  highlights: [
    { id: "pets", value: "Dogs", label: "Dogs welcome" },
    { id: "parking", value: "Parking", label: "On-site parking" },
    { id: "wifi", value: "Wi-Fi", label: "Free Wi-Fi" },
    { id: "kitchen", value: "Kitchen", label: "Fully equipped" },
  ],
  sections: [
    { kind: "hero", required: true, guidance: "Say what the place is and where, in one headline. The call to action is asking about dates." },
    { kind: "services", required: true, guidance: "The stays the customer listed, each with its price per night if they gave one. The heading should say stays." },
    { kind: "facts", required: false, guidance: "Up to four short facts the customer told us, such as check-in times, dogs welcome or parking. Never invent one." },
    { kind: "gallery", required: false, guidance: "Photos the customer uploaded, such as the rooms or the view, with short plain captions." },
    { kind: "area", required: true, guidance: "The places nearby. Name each exactly as the customer gave it and add no others." },
    { kind: "enquiry", required: true, guidance: "A request-to-stay form: the customer gives dates and how many are coming, and the owner replies to confirm." },
    { kind: "faq", required: false, guidance: "Up to four questions a guest asks, answered only from facts the customer gave." },
    { kind: "cta", required: true, guidance: "A closing line that points back to asking about dates." },
  ],
};

export const SECTOR_PRESETS: Record<string, SectorPreset> = {
  [BARBER_PRESET.id]: BARBER_PRESET,
  [CAFE_PRESET.id]: CAFE_PRESET,
  [ELECTRICIAN_PRESET.id]: ELECTRICIAN_PRESET,
  [PHYSIO_PRESET.id]: PHYSIO_PRESET,
  [MASSAGE_PRESET.id]: MASSAGE_PRESET,
  [FITNESS_PRESET.id]: FITNESS_PRESET,
  [HOLIDAY_LET_PRESET.id]: HOLIDAY_LET_PRESET,
};

export function presetFor(sector: string): SectorPreset | null {
  return SECTOR_PRESETS[sector] ?? null;
}
