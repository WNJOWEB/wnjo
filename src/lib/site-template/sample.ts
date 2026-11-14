/** A made-up barber used to prove the Barber template: its content passes every check and renders in full. */
import type { CustomerFacts, SiteContent } from "./schema";

const hours = [
  { day: "Mon to Fri", open: "09:00", close: "18:00" },
  { day: "Sat", open: "09:00", close: "16:00" },
  { day: "Sun", closed: true },
];

export const SAMPLE_BARBER_FACTS: CustomerFacts = {
  businessName: "Hartley & Sons",
  services: [
    { name: "Cut & style", price: "£22" },
    { name: "Skin fade", price: "£20" },
    { name: "Hot towel shave", price: "£18" },
    { name: "Beard trim" },
  ],
  hours,
  phone: "01632 960123",
  email: "book@hartley.example",
  address: "12 High Street, Leeds",
};

export const SAMPLE_BARBER: SiteContent = {
  business: { name: "Hartley & Sons", tagline: "Barbers in Leeds", phone: "01632 960123", email: "book@hartley.example", address: "12 High Street, Leeds" },
  theme: { colour: "#1f3a34", look: "classic" },
  sections: [
    { kind: "hero", variant: "photo", headline: "Sharp cuts on High Street", intro: "Walk-ins and bookings at Hartley & Sons, Leeds.", cta: "Request a booking" },
    {
      kind: "services",
      heading: "Cuts and prices",
      items: [
        { name: "Cut & style", price: "£22" },
        { name: "Skin fade", price: "£20" },
        { name: "Hot towel shave", price: "£18" },
        { name: "Beard trim" },
      ],
    },
    { kind: "hours", heading: "Opening hours", items: hours },
    { kind: "facts", items: [{ value: "Walk-ins", label: "Always welcome" }, { value: "Leeds", label: "High Street" }] },
    { kind: "area", heading: "Find us", text: "We are at 12 High Street, Leeds." },
    { kind: "enquiry", heading: "Request a booking", intro: "Tell us when suits and we will reply.", cta: "Send request" },
    { kind: "cta", headline: "Ready for a fresh cut?", cta: "Request a booking" },
  ],
};

const cafeHours = [
  { day: "Mon to Fri", open: "08:00", close: "16:00" },
  { day: "Sat, Sun", open: "09:00", close: "17:00" },
];

export const SAMPLE_CAFE_FACTS: CustomerFacts = {
  businessName: "Harbour Bakery",
  services: [
    { name: "Flat white", price: "£3.20" },
    { name: "Bacon roll", price: "£5.50" },
    { name: "Sourdough toast", price: "£4.00" },
    { name: "Cake of the day" },
  ],
  hours: cafeHours,
  highlights: [{ value: "Dogs", label: "Welcome inside" }, { value: "Vegan", label: "Options on the menu" }],
  phone: "01274 960456",
  address: "4 Quay Street, Whitby",
};

export const SAMPLE_CAFE: SiteContent = {
  business: { name: "Harbour Bakery", tagline: "Bakery and café in Whitby", phone: "01274 960456", address: "4 Quay Street, Whitby" },
  theme: { colour: "#a84a26", look: "warm" },
  sections: [
    { kind: "hero", variant: "plain", headline: "Fresh bread and good coffee on Quay Street", intro: "Breakfast, lunch and cake at Harbour Bakery in Whitby.", cta: "Request a table" },
    {
      kind: "services",
      heading: "Menu",
      items: [
        { name: "Flat white", price: "£3.20" },
        { name: "Bacon roll", price: "£5.50" },
        { name: "Sourdough toast", price: "£4.00" },
        { name: "Cake of the day" },
      ],
    },
    { kind: "hours", heading: "Opening hours", items: cafeHours },
    { kind: "facts", items: [{ value: "Dogs", label: "Welcome inside" }, { value: "Vegan", label: "Options on the menu" }] },
    { kind: "area", heading: "Find us", text: "We are at 4 Quay Street, Whitby." },
    { kind: "enquiry", heading: "Request a table", intro: "Tell us the day and time and we will reply.", cta: "Send request", prompt: "Date, time and how many of you?" },
    { kind: "cta", headline: "Save a table for breakfast?", cta: "Request a table" },
  ],
};

export const SAMPLE_ELECTRICIAN_FACTS: CustomerFacts = {
  businessName: "Spark & Co",
  services: [{ name: "Full rewire" }, { name: "Fuse board upgrade", price: "£450" }, { name: "Smoke alarm testing" }],
  areas: ["Leeds", "Wakefield", "Harrogate"],
  highlights: [{ value: "Free", label: "Quotes" }, { value: "Same day", label: "Call-outs available" }],
  phone: "0113 496 0789",
  email: "jobs@sparkandco.example",
};

export const SAMPLE_ELECTRICIAN: SiteContent = {
  business: { name: "Spark & Co", tagline: "Electricians across West Yorkshire", phone: "0113 496 0789", email: "jobs@sparkandco.example" },
  theme: { colour: "#2b2b2b", look: "bold" },
  sections: [
    { kind: "hero", variant: "plain", headline: "Electricians for Leeds, Wakefield and Harrogate", intro: "Rewires, fuse boards and alarm testing from Spark & Co.", cta: "Get a free quote" },
    {
      kind: "services",
      heading: "What we do",
      items: [{ name: "Full rewire" }, { name: "Fuse board upgrade", price: "£450" }, { name: "Smoke alarm testing" }],
    },
    { kind: "facts", items: [{ value: "Free", label: "Quotes" }, { value: "Same day", label: "Call-outs available" }] },
    { kind: "area", heading: "Areas we cover", text: "We work in Leeds, Wakefield and Harrogate." },
    { kind: "enquiry", heading: "Get a free quote", intro: "Tell us about the job and we will reply.", cta: "Send request", prompt: "What do you need doing?" },
    { kind: "cta", headline: "Need an electrician?", cta: "Get a free quote" },
  ],
};

const physioHours = [
  { day: "Mon to Thu", open: "08:00", close: "19:00" },
  { day: "Fri", open: "08:00", close: "17:00" },
  { day: "Sat", open: "09:00", close: "13:00" },
  { day: "Sun", closed: true },
];

export const SAMPLE_PHYSIO_FACTS: CustomerFacts = {
  businessName: "Calm Physio",
  services: [
    { name: "Initial assessment", price: "£60" },
    { name: "Follow-up session", price: "£45" },
    { name: "Sports injury treatment" },
    { name: "Rehabilitation plan" },
  ],
  hours: physioHours,
  highlights: [{ value: "Same week", label: "Appointments available" }, { value: "Evening", label: "Slots available" }],
  phone: "0117 496 0321",
  email: "appointments@calmphysio.example",
  address: "8 Park Row, Bristol",
};

export const SAMPLE_PHYSIO: SiteContent = {
  business: { name: "Calm Physio", tagline: "Physiotherapy in Bristol", phone: "0117 496 0321", email: "appointments@calmphysio.example", address: "8 Park Row, Bristol" },
  theme: { colour: "#3d3a7a", look: "minimal" },
  sections: [
    { kind: "hero", variant: "plain", headline: "Physiotherapy on Park Row", intro: "Assessment, treatment and rehabilitation at Calm Physio, Bristol.", cta: "Request an appointment" },
    {
      kind: "services",
      heading: "Treatments",
      items: [
        { name: "Initial assessment", price: "£60" },
        { name: "Follow-up session", price: "£45" },
        { name: "Sports injury treatment" },
        { name: "Rehabilitation plan" },
      ],
    },
    { kind: "hours", heading: "Opening hours", items: physioHours },
    { kind: "facts", items: [{ value: "Same week", label: "Appointments available" }, { value: "Evening", label: "Slots available" }] },
    { kind: "area", heading: "Find us", text: "We are at 8 Park Row, Bristol." },
    { kind: "enquiry", heading: "Request an appointment", intro: "Tell us what you need help with and when suits, and we will reply.", cta: "Send request", prompt: "What would you like help with?" },
    { kind: "cta", headline: "Ready to book an assessment?", cta: "Request an appointment" },
  ],
};

const massageHours = [
  { day: "Mon to Fri", open: "10:00", close: "20:00" },
  { day: "Sat", open: "10:00", close: "16:00" },
  { day: "Sun", closed: true },
];

export const SAMPLE_MASSAGE_FACTS: CustomerFacts = {
  businessName: "Still Waters Massage",
  services: [
    { name: "Swedish massage", price: "£55" },
    { name: "Deep tissue massage", price: "£65" },
    { name: "Hot stone massage" },
  ],
  hours: massageHours,
  highlights: [{ value: "Couples", label: "Treatment rooms for two" }, { value: "Evening", label: "Slots available" }],
  phone: "01253 720418",
  email: "book@stillwaters.example",
  address: "9 Harbour Street, Fleetwood",
};

export const SAMPLE_MASSAGE: SiteContent = {
  business: { name: "Still Waters Massage", tagline: "Massage in Fleetwood", phone: "01253 720418", email: "book@stillwaters.example", address: "9 Harbour Street, Fleetwood" },
  theme: { colour: "#6d1f2f", look: "warm" },
  sections: [
    { kind: "hero", variant: "plain", headline: "Massage on Harbour Street", intro: "Relaxing treatments in a quiet room at Still Waters Massage, Fleetwood.", cta: "Request a treatment" },
    {
      kind: "services",
      heading: "Treatments",
      items: [
        { name: "Swedish massage", price: "£55" },
        { name: "Deep tissue massage", price: "£65" },
        { name: "Hot stone massage" },
      ],
    },
    { kind: "hours", heading: "Opening hours", items: massageHours },
    { kind: "facts", items: [{ value: "Couples", label: "Treatment rooms for two" }, { value: "Evening", label: "Slots available" }] },
    { kind: "area", heading: "Find us", text: "We are at 9 Harbour Street, Fleetwood." },
    { kind: "enquiry", heading: "Request a treatment", intro: "Tell us which treatment and when suits, and we will reply to confirm.", cta: "Send request", prompt: "What would you like to book?" },
    { kind: "cta", headline: "Ready to book your treatment?", cta: "Request a treatment" },
  ],
};

const fitnessHours = [
  { day: "Mon to Fri", open: "06:00", close: "21:00" },
  { day: "Sat", open: "08:00", close: "13:00" },
  { day: "Sun", closed: true },
];

export const SAMPLE_FITNESS_FACTS: CustomerFacts = {
  businessName: "Kettle Works",
  services: [
    { name: "Group class", price: "£10" },
    { name: "One-to-one session", price: "£35" },
    { name: "Online coaching" },
  ],
  hours: fitnessHours,
  highlights: [{ value: "Beginners", label: "Welcome at every level" }, { value: "Equipment", label: "Provided for you" }],
  phone: "0161 496 2200",
  email: "hello@kettleworks.example",
  address: "4 Mill Lane, Bolton",
};

export const SAMPLE_FITNESS: SiteContent = {
  business: { name: "Kettle Works", tagline: "Fitness classes in Bolton", phone: "0161 496 2200", email: "hello@kettleworks.example", address: "4 Mill Lane, Bolton" },
  theme: { colour: "#2b2b2b", look: "bold" },
  sections: [
    { kind: "hero", variant: "plain", headline: "Strength classes in Bolton", intro: "Group classes and one-to-one sessions at Kettle Works, Mill Lane.", cta: "Request a free trial" },
    {
      kind: "services",
      heading: "Classes and sessions",
      items: [
        { name: "Group class", price: "£10" },
        { name: "One-to-one session", price: "£35" },
        { name: "Online coaching" },
      ],
    },
    { kind: "hours", heading: "Opening hours", items: fitnessHours },
    { kind: "facts", items: [{ value: "Beginners", label: "Welcome at every level" }, { value: "Equipment", label: "Provided for you" }] },
    { kind: "area", heading: "Find us", text: "We are at 4 Mill Lane, Bolton." },
    { kind: "enquiry", heading: "Request a free trial", intro: "Tell us which class or session interests you, and we will reply.", cta: "Send request", prompt: "Which class or session interests you?" },
    { kind: "cta", headline: "Ready to try a class?", cta: "Request a free trial" },
  ],
};

export const SAMPLE_HOLIDAY_LET_FACTS: CustomerFacts = {
  businessName: "The Old Byre",
  services: [
    { name: "Double room", price: "£95" },
    { name: "Family cottage", price: "£180" },
    { name: "Studio", price: "£70" },
  ],
  highlights: [{ value: "Dogs", label: "Dogs welcome" }, { value: "Parking", label: "On-site parking" }],
  areas: ["Lytham", "St Annes", "Blackpool"],
  email: "stay@theoldbyre.example",
};

export const SAMPLE_HOLIDAY_LET: SiteContent = {
  business: { name: "The Old Byre", tagline: "Holiday stays near the coast", email: "stay@theoldbyre.example" },
  theme: { colour: "#1f3a34", look: "minimal" },
  sections: [
    { kind: "hero", variant: "plain", headline: "Stay at The Old Byre", intro: "Self-catering rooms and cottages a short drive from the coast.", cta: "Ask about dates" },
    {
      kind: "services",
      heading: "Stays",
      items: [
        { name: "Double room", description: "A quiet room with its own bathroom.", price: "£95" },
        { name: "Family cottage", description: "Room for a family, with a garden.", price: "£180" },
        { name: "Studio", description: "A small studio with a kitchen.", price: "£70" },
      ],
    },
    { kind: "facts", items: [{ value: "Dogs", label: "Dogs welcome" }, { value: "Parking", label: "On-site parking" }] },
    { kind: "area", heading: "Nearby", text: "Close to Lytham, St Annes and Blackpool." },
    { kind: "enquiry", heading: "Ask about dates", intro: "Tell us the dates and how many are coming, and we will reply to confirm.", cta: "Send request", prompt: "When would you like to stay?" },
    { kind: "cta", headline: "Ready to book a stay?", cta: "Ask about dates" },
  ],
};

/** Every sector's sample build, with the facts it was written from. */
export const SAMPLES: Record<string, { content: SiteContent; facts: CustomerFacts }> = {
  barber: { content: SAMPLE_BARBER, facts: SAMPLE_BARBER_FACTS },
  cafe: { content: SAMPLE_CAFE, facts: SAMPLE_CAFE_FACTS },
  electrician: { content: SAMPLE_ELECTRICIAN, facts: SAMPLE_ELECTRICIAN_FACTS },
  physio: { content: SAMPLE_PHYSIO, facts: SAMPLE_PHYSIO_FACTS },
  massage: { content: SAMPLE_MASSAGE, facts: SAMPLE_MASSAGE_FACTS },
  fitness: { content: SAMPLE_FITNESS, facts: SAMPLE_FITNESS_FACTS },
  "holiday-let": { content: SAMPLE_HOLIDAY_LET, facts: SAMPLE_HOLIDAY_LET_FACTS },
};
