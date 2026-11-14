/**
 * A sector preset says which sections a sector's site has, in what order, which are required, what the writer should
 * aim for in each, and which questions the customer answers so there is enough to write a good site. A new sector is
 * a new preset on the same sections.
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

/**
 * A question about the business that the writer needs answered to write well. The answer is kept in the customer's own
 * words and given to the writer as a fact. Optional unless `required`.
 */
export type SectorQuestion = { id: string; label: string; hint: string; placeholder?: string; required?: boolean };

/** Asked of every template: the one thing a services list can't say. Required, so a site never rests on a list alone. */
export const ABOUT_QUESTION = {
  label: "What makes your business different?",
  hint: "A sentence or two, in your own words. We only use what you tell us, so say what matters most.",
  placeholder: "For example: a family business, open late, or known for one thing.",
} as const;

/** The groups a customer chooses from. Each sector belongs to one. */
export const BUSINESS_GROUPS = {
  booking: { label: "Booking services", hint: "Appointments, bookings and enquiries" },
  hospitality: { label: "Hospitality", hint: "Food, drink and places to visit" },
  trades: { label: "Trades", hint: "Work done on site" },
} as const;
export type BusinessGroup = keyof typeof BUSINESS_GROUPS;

/**
 * Wording a sector's site must never use. The check looks at everything the writer produces except the facts the
 * customer ticked themselves and the customer's own service names and prices. `unless` lets a customer's own tick
 * permit a claim (for example a registration).
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
  /** The label above the services box on the form. */
  servicesPrompt: string;
  /** An example of the services box, one per line, so the customer sees how to write it. */
  servicesExample: string;
  /** The label on the opening hours, where the sector has them. */
  hoursPrompt: string;
  /** The sector's own questions, asked after the services. Each answer reaches the writer as a fact. */
  questions: SectorQuestion[];
  /** Where "find us" comes from: the shop's address, or the areas a trade covers. */
  areaSource: "address" | "areas";
  /** The label on the free-text box of the request form. */
  enquiryPrompt: string;
  /** For a sector where some claims are regulated or risky: wording the site may not use. */
  restrictedClaims?: RestrictedClaim[];
};

/** A tick lifts a restricted claim: true when the customer ticked any of these facts. */
const ticked =
  (...values: string[]) =>
  (facts: CustomerFacts) =>
    Boolean(facts.highlights?.some((h) => values.includes(h.value)));

/** The question every booking sector asks about how customers book, so the site says what is true. */
const bookingQuestion = (who: string): SectorQuestion => ({
  id: "booking",
  label: `How should ${who} book?`,
  hint: "For example: walk-ins welcome, call to book, or message us. We show only what you say.",
});

const historyQuestion: SectorQuestion = {
  id: "history",
  label: "How long have you been trading?",
  hint: "For example: since 2012, or a family business.",
};

export const BARBER_PRESET: SectorPreset = {
  id: "barber",
  label: "Grooming",
  group: "booking",
  defaultLook: "classic",
  itemsLabel: "Services",
  servicesPrompt: "Your services and prices",
  servicesExample: "Cut & style £22\nSkin fade £20\nHot towel shave £18\nBeard trim",
  hoursPrompt: "Opening hours",
  areaSource: "address",
  enquiryPrompt: "When suits you?",
  voice: "Confident, friendly and plain. Short sentences. No hype and no slang.",
  questions: [
    { id: "speciality", label: "What are you best known for?", hint: "For example: skin fades, traditional shaves, kids' cuts." },
    bookingQuestion("customers"),
    historyQuestion,
  ],
  highlights: [
    { id: "walk-ins", value: "Walk-ins", label: "Always welcome" },
    { id: "cards", value: "Card", label: "Payments taken" },
    { id: "kids", value: "Kids", label: "Cuts for children" },
    { id: "appointments", value: "Appointments", label: "Booked by request" },
  ],
  sections: [
    { kind: "hero", required: true, guidance: "Say what the shop does and where, in one headline. The intro draws on what makes the shop different, in the customer's own words. The call to action is booking." },
    { kind: "services", required: true, guidance: "The cuts and treatments the customer listed, each with their own price if they gave one." },
    { kind: "hours", required: true, guidance: "Opening hours exactly as the customer gave them." },
    { kind: "gallery", required: false, guidance: "Photos the customer uploaded, with short plain captions." },
    { kind: "facts", required: false, guidance: "Up to four short facts the customer told us, such as years open or walk-ins welcome. Never invent one." },
    { kind: "area", required: false, guidance: "Where the shop is and how to find it, from the address the customer gave." },
    { kind: "enquiry", required: true, guidance: "A request-a-booking form: the customer asks for a time and the shop replies." },
    { kind: "faq", required: false, guidance: "Up to four questions a new customer asks, such as how to book, answered only from facts the customer gave." },
    { kind: "cta", required: true, guidance: "A closing line that points back to booking." },
  ],
};

export const CAFE_PRESET: SectorPreset = {
  id: "cafe",
  label: "Hospitality",
  group: "hospitality",
  defaultLook: "warm",
  itemsLabel: "Menu items",
  servicesPrompt: "Your menu and prices",
  servicesExample: "Flat white £3.20\nBacon roll £5.50\nCake of the day",
  hoursPrompt: "Opening hours",
  areaSource: "address",
  enquiryPrompt: "Date, time and how many of you?",
  voice: "Warm, welcoming and simple. Short sentences. Talk about the food and the room, never about hype.",
  questions: [
    { id: "speciality", label: "What are you known for?", hint: "For example: breakfasts, homemade cakes, coffee roasted nearby." },
    { id: "place", label: "What is the place like?", hint: "For example: garden seating, dog-friendly, space for pushchairs." },
    { id: "booking", label: "Do you take bookings?", hint: "For example: walk-ins only, or book a table for groups." },
  ],
  restrictedClaims: [
    {
      pattern: /\b(gluten[- ]free|dairy[- ]free|nut[- ]free|allergen[- ]free|halal|kosher)\b/i,
      reason: "A dietary or allergen claim can only be made if the customer ticked it.",
      unless: ticked("Gluten free", "Halal"),
    },
  ],
  highlights: [
    { id: "dogs", value: "Dogs", label: "Welcome inside" },
    { id: "vegan", value: "Vegan", label: "Options on the menu" },
    { id: "gluten-free", value: "Gluten free", label: "Options on the menu" },
    { id: "takeaway", value: "Takeaway", label: "Food and drink to go" },
    { id: "outdoor", value: "Outdoor", label: "Seating available" },
  ],
  sections: [
    { kind: "hero", required: true, guidance: "Say what the place is and where, in one headline. The intro draws on what the customer says it is known for. The call to action is booking a table." },
    { kind: "services", required: true, guidance: "The menu items the customer listed, each with their own price if they gave one. The heading should say menu." },
    { kind: "hours", required: true, guidance: "Opening hours exactly as the customer gave them." },
    { kind: "gallery", required: false, guidance: "Photos the customer uploaded, with short plain captions." },
    { kind: "facts", required: false, guidance: "Up to four short facts the customer told us, such as dogs welcome or vegan options. Never invent one." },
    { kind: "area", required: false, guidance: "Where the place is and how to find it, from the address the customer gave." },
    { kind: "enquiry", required: true, guidance: "A request-a-table form: the customer asks for a date, a time and a party size, and the place replies." },
    { kind: "faq", required: false, guidance: "Up to four questions a new customer asks, such as bookings or dogs, answered only from facts the customer gave." },
    { kind: "cta", required: true, guidance: "A closing line that points back to booking a table." },
  ],
};

export const ELECTRICIAN_PRESET: SectorPreset = {
  id: "electrician",
  label: "Tradesman",
  group: "trades",
  defaultLook: "bold",
  itemsLabel: "Services",
  servicesPrompt: "Your services and prices",
  servicesExample: "Full rewire\nFuse board upgrade £450\nSmoke alarm testing",
  hoursPrompt: "When are you available?",
  areaSource: "areas",
  enquiryPrompt: "What do you need doing?",
  voice: "Direct, calm and reassuring. Short sentences. Say what is done and where, with no jargon and no big promises.",
  questions: [
    { id: "jobs", label: "What jobs do you do most?", hint: "For example: rewires, fuse boards, lighting, EV chargers." },
    { id: "workFor", label: "Who do you work for?", hint: "For example: homeowners, landlords, businesses." },
    { id: "callout", label: "Do you charge a call-out fee, or give free quotes?", hint: "We only mention a fee or a free quote if you say so." },
    historyQuestion,
  ],
  restrictedClaims: [
    {
      pattern: /\b(niceic|napit|part p|registered|accredited|approved|certified|qualified)\b/i,
      reason: "A registration or qualification can only be mentioned if the customer ticked it.",
      unless: ticked("Registered"),
    },
    {
      pattern: /\b(24\/7|24[- ]hours?|emergency)\b/i,
      reason: "Emergency or round-the-clock cover can only be mentioned if the customer ticked it.",
      unless: ticked("Emergency", "Same day"),
    },
  ],
  highlights: [
    { id: "free-quotes", value: "Free", label: "Quotes" },
    { id: "same-day", value: "Same day", label: "Call-outs available" },
    { id: "emergency", value: "Emergency", label: "Call-outs available" },
    { id: "insured", value: "Insured", label: "Public liability cover" },
    { id: "certificates", value: "Certificates", label: "Provided for notifiable work" },
    { id: "registered", value: "Registered", label: "With an approved scheme" },
  ],
  sections: [
    { kind: "hero", required: true, guidance: "Say what the electrician does and where, in one headline. The intro draws on what makes them different, in the customer's own words. The call to action is asking for a quote." },
    { kind: "services", required: true, guidance: "The jobs the customer listed, each with their own price if they gave one." },
    { kind: "facts", required: false, guidance: "Up to four short facts the customer told us, such as free quotes or same-day call-outs. Never invent one, and never claim a registration or qualification." },
    { kind: "gallery", required: false, guidance: "Photos of work the customer uploaded, with short plain captions." },
    { kind: "area", required: true, guidance: "The areas covered. Name each area exactly as the customer gave it and add no others." },
    { kind: "hours", required: false, guidance: "When the electrician is available, exactly as the customer gave it." },
    { kind: "enquiry", required: true, guidance: "A request-a-quote form: the customer describes the job and the electrician replies." },
    { kind: "faq", required: false, guidance: "Up to four questions a new customer asks, such as call-out fees or what jobs are covered, answered only from facts the customer gave." },
    { kind: "cta", required: true, guidance: "A closing line that points back to asking for a quote." },
  ],
};

export const PHYSIO_PRESET: SectorPreset = {
  id: "physio",
  label: "Health",
  group: "booking",
  defaultLook: "minimal",
  itemsLabel: "Treatments",
  servicesPrompt: "Your treatments and prices",
  servicesExample: "Initial assessment £60\nFollow-up session £45\nSports injury treatment",
  hoursPrompt: "Opening hours",
  areaSource: "address",
  enquiryPrompt: "What would you like help with?",
  voice: "Calm, clear and reassuring. Short sentences. Say what a treatment involves, and never promise a result or a cure.",
  questions: [
    { id: "helpWith", label: "What do you help with most?", hint: "Describe what you help with, for example back pain or sports injuries. Not what you cure." },
    { id: "firstVisit", label: "What happens at a first appointment?", hint: "For example: an assessment, then a plan agreed with you." },
    bookingQuestion("patients"),
  ],
  restrictedClaims: [
    { pattern: /\b(cure[sd]?|curing|guarantee[sd]?|heal(?:s|ed|ing)?|miracle|permanent(?:ly)?|risk[- ]free|100%)\b/i, reason: "A physio site must not promise a result or a cure." },
    {
      pattern: /\b(HCPC|registered|chartered|qualified|accredited|member of)\b/i,
      reason: "A registration or qualification can only be mentioned if the customer ticked it.",
      unless: ticked("HCPC"),
    },
  ],
  highlights: [
    { id: "same-week", value: "Same week", label: "Appointments available" },
    { id: "evenings", value: "Evening", label: "Slots available" },
    { id: "home-visits", value: "Home visits", label: "Available" },
    { id: "hcpc", value: "HCPC", label: "Registered physiotherapist" },
  ],
  sections: [
    { kind: "hero", required: true, guidance: "Say what the clinic offers and where, in one headline. The intro draws on what the customer says they help with. The call to action is requesting an appointment. Never promise a result." },
    { kind: "services", required: true, guidance: "The treatments the customer listed, each with their own price if they gave one. The heading should say treatments." },
    { kind: "hours", required: true, guidance: "Opening hours exactly as the customer gave them." },
    { kind: "gallery", required: false, guidance: "Photos the customer uploaded, such as the clinic, with short plain captions." },
    { kind: "facts", required: false, guidance: "Up to four short facts the customer told us, such as same-week appointments. Never invent one, and never claim a registration or qualification." },
    { kind: "area", required: false, guidance: "Where the clinic is and how to find it, from the address the customer gave." },
    { kind: "enquiry", required: true, guidance: "A request-an-appointment form: the customer says what they need help with and when suits, and the clinic replies." },
    { kind: "faq", required: false, guidance: "Up to four questions a new patient asks, such as what happens at a first visit, answered only from facts the customer gave. Never give medical advice." },
    { kind: "cta", required: true, guidance: "A closing line that points back to requesting an appointment." },
  ],
};

export const MASSAGE_PRESET: SectorPreset = {
  id: "massage",
  label: "Wellbeing",
  group: "booking",
  defaultLook: "warm",
  itemsLabel: "Treatments",
  servicesPrompt: "Your treatments and prices",
  servicesExample: "Swedish massage £55\nDeep tissue massage £65\nHot stone massage",
  hoursPrompt: "Opening hours",
  areaSource: "address",
  enquiryPrompt: "What would you like to book?",
  voice: "Calm, warm and unhurried. Short sentences. Describe the treatment and the room, and never promise a result.",
  questions: [
    { id: "visit", label: "What is a visit like?", hint: "The room, how long it lasts, what to wear." },
    { id: "speciality", label: "What are you best known for?", hint: "For example: deep tissue, pregnancy massage, treatments for two." },
    bookingQuestion("clients"),
  ],
  restrictedClaims: [
    { pattern: /\b(cure[sd]?|curing|heal(?:s|ed|ing)?|guarantee[sd]?|miracle|permanent(?:ly)?|diagnos(?:e|es|ed|is)|100%)\b/i, reason: "A massage site must not promise a cure or a medical result, or offer a diagnosis." },
    {
      pattern: /\b(qualified|accredited|registered|certified|member of)\b/i,
      reason: "A qualification or membership can only be mentioned if the customer ticked it.",
      unless: ticked("Qualified"),
    },
  ],
  highlights: [
    { id: "couples", value: "Couples", label: "Treatment rooms for two" },
    { id: "home-visits", value: "Home visits", label: "Available" },
    { id: "evenings", value: "Evening", label: "Slots available" },
    { id: "qualified", value: "Qualified", label: "Qualified therapists" },
  ],
  sections: [
    { kind: "hero", required: true, guidance: "Say what the treatments are and where, in one headline. The intro draws on what a visit is like, in the customer's own words. The call to action is booking a treatment. Never promise a result." },
    { kind: "services", required: true, guidance: "The treatments the customer listed, each with its own price if they gave one. The heading should say treatments." },
    { kind: "hours", required: true, guidance: "Opening hours exactly as the customer gave them." },
    { kind: "facts", required: false, guidance: "Up to four short facts the customer told us, such as evening slots or home visits. Never invent one, and never claim a qualification." },
    { kind: "gallery", required: false, guidance: "Photos the customer uploaded, such as the treatment room, with short plain captions." },
    { kind: "area", required: false, guidance: "Where the treatment room is and how to find it, from the address the customer gave." },
    { kind: "enquiry", required: true, guidance: "A request-a-treatment form: the customer says which treatment and when suits, and the therapist replies to confirm." },
    { kind: "faq", required: false, guidance: "Up to four questions a new client asks, such as what a visit involves, answered only from facts the customer gave. Never give medical advice." },
    { kind: "cta", required: true, guidance: "A closing line that points back to booking a treatment." },
  ],
};

export const BEAUTY_PRESET: SectorPreset = {
  id: "beauty",
  label: "Beauty",
  group: "booking",
  defaultLook: "warm",
  itemsLabel: "Treatments",
  servicesPrompt: "Your treatments and prices",
  servicesExample: "Cut & blow dry £35\nGel manicure £28\nLash lift £45\nFull colour",
  hoursPrompt: "Opening hours",
  areaSource: "address",
  enquiryPrompt: "What would you like to book?",
  voice: "Friendly, polished and reassuring. Short sentences. Describe the treatment and the experience, and never promise a result.",
  questions: [
    { id: "speciality", label: "What are you best known for?", hint: "For example: colour, bridal hair, nails, lashes." },
    { id: "firstVisit", label: "Is there a patch test or consultation first?", hint: "For example: a patch test before colour. We show only what you say." },
    bookingQuestion("clients"),
  ],
  restrictedClaims: [
    { pattern: /\b(guarantee[sd]?|miracle|permanent(?:ly)?|cure[sd]?|anti-?ag(?:e|ing)|clinically proven|100%)\b/i, reason: "A beauty site must not promise a result, a cure or an anti-ageing effect." },
    {
      pattern: /\b(qualified|accredited|certified|registered|member of)\b/i,
      reason: "A qualification or membership can only be mentioned if the customer ticked it.",
      unless: ticked("Qualified"),
    },
  ],
  highlights: [
    { id: "qualified", value: "Qualified", label: "Qualified therapists" },
    { id: "mobile", value: "Mobile", label: "We come to you" },
    { id: "bridal", value: "Bridal", label: "Bridal and event bookings" },
    { id: "vouchers", value: "Vouchers", label: "Gift vouchers available" },
  ],
  sections: [
    { kind: "hero", required: true, guidance: "Say what the salon offers and where, in one headline. The intro draws on what makes it different, in the customer's own words. The call to action is booking a treatment. Never promise a result." },
    { kind: "services", required: true, guidance: "The treatments the customer listed, each with its own price if they gave one. The heading should say treatments." },
    { kind: "hours", required: true, guidance: "Opening hours exactly as the customer gave them." },
    { kind: "gallery", required: false, guidance: "Photos the customer uploaded, such as their work or the salon, with short plain captions." },
    { kind: "facts", required: false, guidance: "Up to four short facts the customer told us, such as bridal bookings or gift vouchers. Never invent one, and never claim a qualification." },
    { kind: "area", required: false, guidance: "Where the salon is and how to find it, from the address the customer gave." },
    { kind: "enquiry", required: true, guidance: "A request-a-booking form: the customer says which treatment and when suits, and the salon replies to confirm." },
    { kind: "faq", required: false, guidance: "Up to four questions a new client asks, such as patch tests or how to book, answered only from facts the customer gave." },
    { kind: "cta", required: true, guidance: "A closing line that points back to booking a treatment." },
  ],
};

export const FITNESS_PRESET: SectorPreset = {
  id: "fitness",
  label: "Fitness",
  group: "booking",
  defaultLook: "bold",
  itemsLabel: "Classes and sessions",
  servicesPrompt: "Your classes, sessions and prices",
  servicesExample: "Group class £10\nOne-to-one session £35\nOnline coaching",
  hoursPrompt: "Opening hours",
  areaSource: "address",
  enquiryPrompt: "Which class or session interests you?",
  voice: "Energetic but plain. Short sentences. Say what a session involves and who it suits. No hype and no promised results.",
  questions: [
    { id: "audience", label: "Who is it for?", hint: "For example: beginners, women only, over-50s, runners." },
    { id: "firstSession", label: "What can a new member expect?", hint: "For example: a short chat, a trial class, kit provided." },
    { id: "joining", label: "How do people join or book?", hint: "For example: drop in, book a class, or a monthly membership." },
  ],
  restrictedClaims: [
    { pattern: /\b(guarantee[sd]?|transform(?:s|ed|ation)?|miracle|lose \d+|burn \d+|results? (?:in|within) \d+)\b/i, reason: "A fitness site must not promise a result, such as weight lost or how soon it will show." },
    {
      pattern: /\b(qualified|accredited|certified|registered|REPS|member of)\b/i,
      reason: "A qualification or membership can only be mentioned if the customer ticked it.",
      unless: ticked("Qualified"),
    },
  ],
  highlights: [
    { id: "beginners", value: "Beginners", label: "Welcome at every level" },
    { id: "kids", value: "Kids", label: "Classes for children" },
    { id: "equipment", value: "Equipment", label: "Provided for you" },
    { id: "qualified", value: "Qualified", label: "Qualified coaches" },
  ],
  sections: [
    { kind: "hero", required: true, guidance: "Say what the business offers and where, in one headline. The intro draws on who it is for, in the customer's own words. The call to action is booking a free trial or a session." },
    { kind: "services", required: true, guidance: "The classes and sessions the customer listed, each with its price if they gave one, and when it runs if they said." },
    { kind: "hours", required: true, guidance: "Opening hours exactly as the customer gave them." },
    { kind: "facts", required: false, guidance: "Up to four short facts the customer told us, such as beginners welcome or equipment provided. Never invent one, and never claim a qualification." },
    { kind: "gallery", required: false, guidance: "Photos the customer uploaded, such as the studio or a class, with short plain captions." },
    { kind: "area", required: false, guidance: "Where the studio or gym is and how to find it, from the address the customer gave." },
    { kind: "enquiry", required: true, guidance: "A request-a-trial form: the customer asks about a class or session, and the business replies." },
    { kind: "faq", required: false, guidance: "Up to four questions a new member asks, such as what to bring or how to join, answered only from facts the customer gave. Never give medical advice." },
    { kind: "cta", required: true, guidance: "A closing line that points back to booking a trial." },
  ],
};

export const HOLIDAY_LET_PRESET: SectorPreset = {
  id: "holiday-let",
  label: "Accommodation",
  group: "hospitality",
  defaultLook: "minimal",
  itemsLabel: "Stays",
  servicesPrompt: "Your stays and prices per night",
  servicesExample: "Double room £95\nFamily cottage £180\nStudio £70",
  hoursPrompt: "Check-in and check-out",
  areaSource: "areas",
  enquiryPrompt: "When would you like to stay?",
  voice: "Warm and practical. Short sentences. Describe the place, the rooms and what is nearby. Never invent a rating or an award.",
  questions: [
    { id: "setting", label: "What is the place like?", hint: "The setting, the views, what you can walk to." },
    { id: "guests", label: "Who is it good for?", hint: "For example: couples, families, walkers, groups." },
    { id: "arrival", label: "When can guests arrive and leave, and how do they book?", hint: "For example: check-in from 4pm, check-out by 10am, book by message." },
  ],
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
    { kind: "hero", required: true, guidance: "Say what the place is and where, in one headline. The intro draws on what the place is like, in the customer's own words. The call to action is asking about dates." },
    { kind: "services", required: true, guidance: "The stays the customer listed, each with its price per night if they gave one. The heading should say stays." },
    { kind: "facts", required: false, guidance: "Up to four short facts the customer told us, such as check-in times, dogs welcome or parking. Never invent one." },
    { kind: "gallery", required: false, guidance: "Photos the customer uploaded, such as the rooms or the view, with short plain captions." },
    { kind: "area", required: true, guidance: "The places nearby. Name each exactly as the customer gave it and add no others." },
    { kind: "enquiry", required: true, guidance: "A request-to-stay form: the customer gives dates and how many are coming, and the owner replies to confirm." },
    { kind: "faq", required: false, guidance: "Up to four questions a guest asks, such as arrival times or dogs, answered only from facts the customer gave." },
    { kind: "cta", required: true, guidance: "A closing line that points back to asking about dates." },
  ],
};

export const PLUMBING_PRESET: SectorPreset = {
  id: "plumbing",
  label: "Plumbing",
  group: "trades",
  defaultLook: "bold",
  itemsLabel: "Services",
  servicesPrompt: "Your services and prices",
  servicesExample: "Boiler service £75\nLeaking tap repair\nBathroom fitting\nRadiator replacement",
  hoursPrompt: "When are you available?",
  areaSource: "areas",
  enquiryPrompt: "What needs fixing?",
  voice: "Direct, calm and reassuring. Short sentences. Say what is done and where, with no jargon and no big promises.",
  questions: [
    { id: "jobs", label: "What jobs do you do most?", hint: "For example: boiler servicing, leaks, bathrooms, central heating." },
    { id: "workFor", label: "Who do you work for?", hint: "For example: homeowners, landlords, businesses." },
    { id: "callout", label: "Do you charge a call-out fee, or give free quotes?", hint: "We only mention a fee or a free quote if you say so." },
    historyQuestion,
  ],
  restrictedClaims: [
    {
      pattern: /\b(gas safe|oftec|registered|accredited|approved|certified|qualified)\b/i,
      reason: "A registration or qualification can only be mentioned if the customer ticked it.",
      unless: ticked("Gas Safe"),
    },
    {
      pattern: /\b(24\/7|24[- ]hours?|emergency)\b/i,
      reason: "Emergency or round-the-clock cover can only be mentioned if the customer ticked it.",
      unless: ticked("Emergency"),
    },
    { pattern: /\b(guarantee[sd]?|cheapest|lowest price)\b/i, reason: "A plumbing site must not promise a guarantee or the lowest price." },
  ],
  highlights: [
    { id: "free-quotes", value: "Free", label: "Quotes" },
    { id: "emergency", value: "Emergency", label: "Call-outs available" },
    { id: "gas-safe", value: "Gas Safe", label: "Registered engineer" },
    { id: "insured", value: "Insured", label: "Public liability cover" },
  ],
  sections: [
    { kind: "hero", required: true, guidance: "Say what the plumber does and where, in one headline. The intro draws on what makes them different, in the customer's own words. The call to action is asking for a quote." },
    { kind: "services", required: true, guidance: "The jobs the customer listed, each with their own price if they gave one." },
    { kind: "facts", required: false, guidance: "Up to four short facts the customer told us, such as free quotes or emergency call-outs. Never invent one, and never claim a registration." },
    { kind: "gallery", required: false, guidance: "Photos of work the customer uploaded, with short plain captions." },
    { kind: "area", required: true, guidance: "The areas covered. Name each area exactly as the customer gave it and add no others." },
    { kind: "hours", required: false, guidance: "When the plumber is available, exactly as the customer gave it." },
    { kind: "enquiry", required: true, guidance: "A request-a-quote form: the customer describes the job and the plumber replies." },
    { kind: "faq", required: false, guidance: "Up to four questions a new customer asks, such as call-out fees or what jobs are covered, answered only from facts the customer gave." },
    { kind: "cta", required: true, guidance: "A closing line that points back to asking for a quote." },
  ],
};

export const BUILDING_PRESET: SectorPreset = {
  id: "building",
  label: "Building",
  group: "trades",
  defaultLook: "classic",
  itemsLabel: "Services",
  servicesPrompt: "Your services and prices",
  servicesExample: "Home extensions\nLoft conversions\nKitchen fitting\nDecorating and plastering",
  hoursPrompt: "When are you available?",
  areaSource: "areas",
  enquiryPrompt: "Tell us about the job",
  voice: "Practical, steady and plain. Short sentences. Say what is built and where, with no jargon and no big promises.",
  questions: [
    { id: "jobs", label: "What kinds of job do you take on?", hint: "For example: small repairs, extensions, full renovations." },
    { id: "workFor", label: "Who do you work for?", hint: "For example: homeowners, landlords, developers." },
    { id: "quote", label: "How do customers get a quote?", hint: "For example: a free visit, or send photos. We show only what you say." },
    historyQuestion,
  ],
  restrictedClaims: [
    {
      pattern: /\b(trustmark|fmb|federation of master builders|registered|accredited|approved|certified|qualified)\b/i,
      reason: "A trade body membership or accreditation can only be mentioned if the customer ticked it.",
      unless: ticked("Accredited"),
    },
    {
      pattern: /\b(guarantee[sd]?|warranty|warranties)\b/i,
      reason: "A guarantee can only be mentioned if the customer ticked it.",
      unless: ticked("Guaranteed"),
    },
  ],
  highlights: [
    { id: "free-quotes", value: "Free", label: "Quotes" },
    { id: "insured", value: "Insured", label: "Public liability cover" },
    { id: "accredited", value: "Accredited", label: "Trade body member" },
    { id: "guaranteed", value: "Guaranteed", label: "Work is guaranteed" },
  ],
  sections: [
    { kind: "hero", required: true, guidance: "Say what the builder does and where, in one headline. The intro draws on what makes them different, in the customer's own words. The call to action is asking for a quote." },
    { kind: "services", required: true, guidance: "The jobs the customer listed, each with their own price if they gave one." },
    { kind: "facts", required: false, guidance: "Up to four short facts the customer told us, such as free quotes or insured work. Never invent one, and never claim an accreditation or a guarantee." },
    { kind: "gallery", required: false, guidance: "Photos of work the customer uploaded, with short plain captions." },
    { kind: "area", required: true, guidance: "The areas covered. Name each area exactly as the customer gave it and add no others." },
    { kind: "hours", required: false, guidance: "When the builder is available, exactly as the customer gave it." },
    { kind: "enquiry", required: true, guidance: "A request-a-quote form: the customer describes the job and the builder replies." },
    { kind: "faq", required: false, guidance: "Up to four questions a new customer asks, such as how quotes work or what jobs are taken on, answered only from facts the customer gave." },
    { kind: "cta", required: true, guidance: "A closing line that points back to asking for a quote." },
  ],
};

export const CLEANING_PRESET: SectorPreset = {
  id: "cleaning",
  label: "Cleaning",
  group: "trades",
  defaultLook: "minimal",
  itemsLabel: "Services",
  servicesPrompt: "Your services and prices",
  servicesExample: "Regular home clean £45\nEnd of tenancy clean\nOffice cleaning\nOven cleaning £60",
  hoursPrompt: "When are you available?",
  areaSource: "areas",
  enquiryPrompt: "What needs cleaning?",
  voice: "Friendly, reliable and plain. Short sentences. Say what is cleaned and where, with no hype and no promised results.",
  questions: [
    { id: "workFor", label: "Who do you clean for?", hint: "For example: homes, offices, rental properties." },
    { id: "frequency", label: "Do you do regular cleans, one-off cleans, or both?", hint: "For example: weekly, fortnightly, or one-off deep cleans." },
    { id: "supplies", label: "Who brings the products and equipment?", hint: "For example: we bring everything, or you provide the products." },
    historyQuestion,
  ],
  restrictedClaims: [
    { pattern: /\b(kills? (?:\d+% of )?germs|disinfect(?:s|ed|ing)?|sterili[sz](?:e|ed|ing)|100%|guarantee[sd]?)\b/i, reason: "A cleaning site must not promise germ-free results or a guarantee." },
    { pattern: /\b(insured|bonded)\b/i, reason: "Cover can only be mentioned if the customer ticked it.", unless: ticked("Insured") },
    { pattern: /\b(dbs[- ]checked|dbs|vetted|police[- ]checked)\b/i, reason: "A background check can only be mentioned if the customer ticked it.", unless: ticked("DBS checked") },
    { pattern: /\b(eco[- ]friendly|green|non[- ]toxic|environmentally friendly)\b/i, reason: "An eco claim can only be made if the customer ticked it.", unless: ticked("Eco") },
  ],
  highlights: [
    { id: "free-quotes", value: "Free", label: "Quotes" },
    { id: "insured", value: "Insured", label: "Public liability cover" },
    { id: "dbs", value: "DBS checked", label: "Staff are DBS checked" },
    { id: "supplies", value: "Supplies", label: "Products and equipment brought" },
    { id: "eco", value: "Eco", label: "Eco-friendly products" },
  ],
  sections: [
    { kind: "hero", required: true, guidance: "Say what the cleaner does and where, in one headline. The intro draws on what makes them different, in the customer's own words. The call to action is asking for a quote." },
    { kind: "services", required: true, guidance: "The cleans the customer listed, each with their own price if they gave one." },
    { kind: "facts", required: false, guidance: "Up to four short facts the customer told us, such as insured, products brought or free quotes. Never invent one." },
    { kind: "gallery", required: false, guidance: "Photos the customer uploaded, with short plain captions." },
    { kind: "area", required: true, guidance: "The areas covered. Name each area exactly as the customer gave it and add no others." },
    { kind: "hours", required: false, guidance: "When the cleaner is available, exactly as the customer gave it." },
    { kind: "enquiry", required: true, guidance: "A request-a-quote form: the customer describes what needs cleaning and the cleaner replies." },
    { kind: "faq", required: false, guidance: "Up to four questions a new customer asks, such as who brings the products or how often cleans happen, answered only from facts the customer gave." },
    { kind: "cta", required: true, guidance: "A closing line that points back to asking for a quote." },
  ],
};

export const SECTOR_PRESETS: Record<string, SectorPreset> = {
  [BARBER_PRESET.id]: BARBER_PRESET,
  [BEAUTY_PRESET.id]: BEAUTY_PRESET,
  [MASSAGE_PRESET.id]: MASSAGE_PRESET,
  [FITNESS_PRESET.id]: FITNESS_PRESET,
  [PHYSIO_PRESET.id]: PHYSIO_PRESET,
  [CAFE_PRESET.id]: CAFE_PRESET,
  [HOLIDAY_LET_PRESET.id]: HOLIDAY_LET_PRESET,
  [ELECTRICIAN_PRESET.id]: ELECTRICIAN_PRESET,
  [PLUMBING_PRESET.id]: PLUMBING_PRESET,
  [BUILDING_PRESET.id]: BUILDING_PRESET,
  [CLEANING_PRESET.id]: CLEANING_PRESET,
};

export function presetFor(sector: string): SectorPreset | null {
  return SECTOR_PRESETS[sector] ?? null;
}
