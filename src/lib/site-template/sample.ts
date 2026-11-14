/** A made-up barber used to prove the Barber template: its content passes every check and renders in full. */
import { DAYS, type DayAnswer, type RawAnswers } from "./answers";
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
  about: "A family barber shop on the high street.",
  details: [
    { label: "What are you best known for?", value: "Skin fades and hot towel shaves" },
    { label: "How should customers book?", value: "Walk-ins welcome, or call to book" },
    { label: "How long have you been trading?", value: "Since 2012" },
  ],
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
    { name: "Sourdough toast", price: "£4" },
    { name: "Cake of the day" },
  ],
  hours: cafeHours,
  highlights: [{ value: "Dogs", label: "Welcome inside" }, { value: "Vegan", label: "Options on the menu" }],
  phone: "01274 960456",
  email: "hello@harbourbakery.example",
  address: "4 Quay Street, Whitby",
  about: "A harbourside bakery that bakes everything each morning.",
  details: [
    { label: "What are you known for?", value: "Sourdough and cakes" },
    { label: "What is the place like?", value: "Bright, with seating by the window" },
    { label: "Do you take bookings?", value: "Walk-ins only, or book for groups" },
  ],
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
        { name: "Sourdough toast", price: "£4" },
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
  about: "A one-man electrician who answers his own phone.",
  details: [
    { label: "What jobs do you do most?", value: "Rewires, fuse boards and alarms" },
    { label: "Who do you work for?", value: "Homeowners and landlords" },
    { label: "Do you charge a call-out fee, or give free quotes?", value: "Free quotes, no call-out fee" },
    { label: "How long have you been trading?", value: "Since 2015" },
  ],
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
  about: "A small clinic run by one physiotherapist.",
  details: [
    { label: "What do you help with most?", value: "Back pain and sports injuries" },
    { label: "What happens at a first appointment?", value: "An assessment, then a plan agreed with you" },
    { label: "How should patients book?", value: "Book by phone or email" },
  ],
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
  about: "A quiet treatment room by the harbour.",
  details: [
    { label: "What is a visit like?", value: "An hour in a warm, quiet room" },
    { label: "What are you best known for?", value: "Deep tissue and hot stone" },
    { label: "How should clients book?", value: "Book by phone or message" },
  ],
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
  about: "A small gym where everyone knows your name.",
  details: [
    { label: "Who is it for?", value: "Beginners and returning exercisers" },
    { label: "What can a new member expect?", value: "A short chat, then a trial class" },
    { label: "How do people join or book?", value: "Book a class or join monthly" },
  ],
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
  about: "A converted barn with a garden and sea views.",
  details: [
    { label: "What is the place like?", value: "A quiet barn with views of the coast" },
    { label: "Who is it good for?", value: "Couples and families" },
    { label: "When can guests arrive and leave, and how do they book?", value: "Check-in from 4pm, check-out by 10am, book by message" },
  ],
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


const beautyHours = [
  { day: "Mon", closed: true },
  { day: "Tue to Fri", open: "09:00", close: "18:00" },
  { day: "Sat", open: "09:00", close: "16:00" },
  { day: "Sun", closed: true },
];

export const SAMPLE_BEAUTY_FACTS: CustomerFacts = {
  businessName: "Rosewood Beauty",
  services: [
    { name: "Cut & blow dry", price: "£35" },
    { name: "Gel manicure", price: "£28" },
    { name: "Lash lift", price: "£45" },
    { name: "Full colour" },
  ],
  hours: beautyHours,
  highlights: [{ value: "Bridal", label: "Bridal and event bookings" }, { value: "Vouchers", label: "Gift vouchers available" }],
  about: "A friendly two-chair salon run by one stylist.",
  details: [
    { label: "What are you best known for?", value: "Colour and bridal hair" },
    { label: "Is there a patch test or consultation first?", value: "A patch test before any colour" },
    { label: "How should clients book?", value: "Book by phone or message" },
  ],
  phone: "01524 720319",
  email: "hello@rosewoodbeauty.example",
  address: "22 Market Street, Lancaster",
};

export const SAMPLE_BEAUTY: SiteContent = {
  business: { name: "Rosewood Beauty", tagline: "Hair and beauty in Lancaster", phone: "01524 720319", email: "hello@rosewoodbeauty.example", address: "22 Market Street, Lancaster" },
  theme: { colour: "#6d1f2f", look: "warm" },
  sections: [
    { kind: "hero", variant: "plain", headline: "Hair and beauty on Market Street", intro: "Colour, cuts, nails and lashes at Rosewood Beauty, a friendly two-chair salon in Lancaster.", cta: "Request a booking" },
    {
      kind: "services",
      heading: "Treatments",
      items: [
        { name: "Cut & blow dry", price: "£35" },
        { name: "Gel manicure", price: "£28" },
        { name: "Lash lift", price: "£45" },
        { name: "Full colour" },
      ],
    },
    { kind: "hours", heading: "Opening hours", items: beautyHours },
    { kind: "facts", items: [{ value: "Bridal", label: "Bridal and event bookings" }, { value: "Vouchers", label: "Gift vouchers available" }] },
    { kind: "area", heading: "Find us", text: "We are at 22 Market Street, Lancaster." },
    { kind: "enquiry", heading: "Request a booking", intro: "Tell us which treatment and when suits, and we will reply to confirm.", cta: "Send request", prompt: "What would you like to book?" },
    { kind: "cta", headline: "Ready to book?", cta: "Request a booking" },
  ],
};

export const SAMPLE_PLUMBING_FACTS: CustomerFacts = {
  businessName: "Tidewater Plumbing & Heating",
  services: [{ name: "Boiler service", price: "£75" }, { name: "Leaking tap repair" }, { name: "Bathroom fitting" }, { name: "Radiator replacement" }],
  areas: ["Preston", "Chorley", "Leyland"],
  highlights: [{ value: "Free", label: "Quotes" }, { value: "Emergency", label: "Call-outs available" }],
  about: "A local plumber who answers his own phone.",
  details: [
    { label: "What jobs do you do most?", value: "Boiler servicing, leaks and bathrooms" },
    { label: "Who do you work for?", value: "Homeowners and landlords" },
    { label: "Do you charge a call-out fee, or give free quotes?", value: "Free quotes, no call-out fee" },
    { label: "How long have you been trading?", value: "Since 2014" },
  ],
  phone: "01772 960234",
  email: "jobs@tidewater.example",
};

export const SAMPLE_PLUMBING: SiteContent = {
  business: { name: "Tidewater Plumbing & Heating", tagline: "Plumbers across Preston", phone: "01772 960234", email: "jobs@tidewater.example" },
  theme: { colour: "#1d3557", look: "bold" },
  sections: [
    { kind: "hero", variant: "plain", headline: "Plumbers for Preston, Chorley and Leyland", intro: "Boiler servicing, repairs and bathrooms from Tidewater Plumbing & Heating, a local plumber who answers his own phone.", cta: "Get a free quote" },
    {
      kind: "services",
      heading: "What we do",
      items: [{ name: "Boiler service", price: "£75" }, { name: "Leaking tap repair" }, { name: "Bathroom fitting" }, { name: "Radiator replacement" }],
    },
    { kind: "facts", items: [{ value: "Free", label: "Quotes" }, { value: "Emergency", label: "Call-outs available" }] },
    { kind: "area", heading: "Areas we cover", text: "We work in Preston, Chorley and Leyland." },
    { kind: "enquiry", heading: "Get a free quote", intro: "Tell us what needs fixing and we will reply.", cta: "Send request", prompt: "What needs fixing?" },
    { kind: "cta", headline: "Need a plumber?", cta: "Get a free quote" },
  ],
};

export const SAMPLE_BUILDING_FACTS: CustomerFacts = {
  businessName: "Granite & Oak Building",
  services: [{ name: "Home extensions" }, { name: "Loft conversions" }, { name: "Kitchen fitting" }, { name: "Decorating and plastering" }],
  areas: ["Kendal", "Windermere", "Ulverston"],
  highlights: [{ value: "Free", label: "Quotes" }, { value: "Insured", label: "Public liability cover" }],
  about: "A small family firm that does the work itself.",
  details: [
    { label: "What kinds of job do you take on?", value: "Extensions, lofts and kitchens" },
    { label: "Who do you work for?", value: "Homeowners" },
    { label: "How do customers get a quote?", value: "A free visit to talk it through" },
    { label: "How long have you been trading?", value: "A family firm for fifteen years" },
  ],
  phone: "01539 720411",
  email: "enquiries@graniteandoak.example",
};

export const SAMPLE_BUILDING: SiteContent = {
  business: { name: "Granite & Oak Building", tagline: "Builders in South Lakeland", phone: "01539 720411", email: "enquiries@graniteandoak.example" },
  theme: { colour: "#2b2b2b", look: "classic" },
  sections: [
    { kind: "hero", variant: "plain", headline: "Builders for Kendal, Windermere and Ulverston", intro: "Extensions, lofts and kitchens from Granite & Oak Building, a small family firm that does the work itself.", cta: "Get a free quote" },
    {
      kind: "services",
      heading: "What we do",
      items: [{ name: "Home extensions" }, { name: "Loft conversions" }, { name: "Kitchen fitting" }, { name: "Decorating and plastering" }],
    },
    { kind: "facts", items: [{ value: "Free", label: "Quotes" }, { value: "Insured", label: "Public liability cover" }] },
    { kind: "area", heading: "Areas we cover", text: "We work in Kendal, Windermere and Ulverston." },
    { kind: "enquiry", heading: "Get a free quote", intro: "Tell us about the job and we will arrange a visit.", cta: "Send request", prompt: "Tell us about the job" },
    { kind: "cta", headline: "Planning some work?", cta: "Get a free quote" },
  ],
};

export const SAMPLE_CLEANING_FACTS: CustomerFacts = {
  businessName: "Fresh Start Cleaning",
  services: [{ name: "Regular home clean", price: "£45" }, { name: "End of tenancy clean" }, { name: "Office cleaning" }, { name: "Oven cleaning", price: "£60" }],
  areas: ["Bolton", "Bury", "Wigan"],
  highlights: [{ value: "Insured", label: "Public liability cover" }, { value: "Supplies", label: "Products and equipment brought" }],
  about: "A small team who clean your home as carefully as their own.",
  details: [
    { label: "Who do you clean for?", value: "Homes and small offices" },
    { label: "Do you do regular cleans, one-off cleans, or both?", value: "Weekly, fortnightly and one-off cleans" },
    { label: "Who brings the products and equipment?", value: "We bring everything" },
    { label: "How long have you been trading?", value: "Since 2018" },
  ],
  phone: "01204 960777",
  email: "hello@freshstart.example",
};

export const SAMPLE_CLEANING: SiteContent = {
  business: { name: "Fresh Start Cleaning", tagline: "Cleaners across Greater Manchester", phone: "01204 960777", email: "hello@freshstart.example" },
  theme: { colour: "#1f3a34", look: "minimal" },
  sections: [
    { kind: "hero", variant: "plain", headline: "Cleaners for Bolton, Bury and Wigan", intro: "Regular and one-off cleans for homes and small offices from Fresh Start Cleaning.", cta: "Get a free quote" },
    {
      kind: "services",
      heading: "What we clean",
      items: [{ name: "Regular home clean", price: "£45" }, { name: "End of tenancy clean" }, { name: "Office cleaning" }, { name: "Oven cleaning", price: "£60" }],
    },
    { kind: "facts", items: [{ value: "Insured", label: "Public liability cover" }, { value: "Supplies", label: "Products and equipment brought" }] },
    { kind: "area", heading: "Areas we cover", text: "We work in Bolton, Bury and Wigan." },
    { kind: "enquiry", heading: "Get a free quote", intro: "Tell us what needs cleaning and we will reply.", cta: "Send request", prompt: "What needs cleaning?" },
    { kind: "cta", headline: "Ready for a clean?", cta: "Get a free quote" },
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
  beauty: { content: SAMPLE_BEAUTY, facts: SAMPLE_BEAUTY_FACTS },
  plumbing: { content: SAMPLE_PLUMBING, facts: SAMPLE_PLUMBING_FACTS },
  building: { content: SAMPLE_BUILDING, facts: SAMPLE_BUILDING_FACTS },
  cleaning: { content: SAMPLE_CLEANING, facts: SAMPLE_CLEANING_FACTS },
};

/** A week from Monday to Sunday: opening and closing times, or null for closed. */
const wk = (...d: ([string, string] | null)[]): DayAnswer[] => DAYS.map((day, i) => (d[i] ? { day, open: d[i]![0], close: d[i]![1] } : { day, closed: true }));

/**
 * What a real customer would enter in the form for each template, answering every question it asks. Each one parses
 * into the facts its sample build was written from, which is how we know the form collects enough to write the site.
 */
export const SAMPLE_ANSWERS: Record<string, RawAnswers> = {
  barber: {
    businessName: "Hartley & Sons",
    servicesText: "Cut & style £22\nSkin fade £20\nHot towel shave £18\nBeard trim",
    hours: wk(["09:00", "18:00"], ["09:00", "18:00"], ["09:00", "18:00"], ["09:00", "18:00"], ["09:00", "18:00"], ["09:00", "16:00"], null),
    about: "A family barber shop on the high street.",
    details: { speciality: "Skin fades and hot towel shaves", booking: "Walk-ins welcome, or call to book", history: "Since 2012" },
    phone: "01632 960123",
    email: "book@hartley.example",
    address: "12 High Street, Leeds",
  },
  cafe: {
    businessName: "Harbour Bakery",
    servicesText: "Flat white £3.20\nBacon roll £5.50\nSourdough toast £4\nCake of the day",
    hours: wk(["08:00", "16:00"], ["08:00", "16:00"], ["08:00", "16:00"], ["08:00", "16:00"], ["08:00", "16:00"], ["09:00", "17:00"], ["09:00", "17:00"]),
    highlights: ["dogs", "vegan"],
    about: "A harbourside bakery that bakes everything each morning.",
    details: { speciality: "Sourdough and cakes", place: "Bright, with seating by the window", booking: "Walk-ins only, or book for groups" },
    phone: "01274 960456",
    email: "hello@harbourbakery.example",
    address: "4 Quay Street, Whitby",
  },
  electrician: {
    businessName: "Spark & Co",
    servicesText: "Full rewire\nFuse board upgrade £450\nSmoke alarm testing",
    areas: "Leeds, Wakefield, Harrogate",
    highlights: ["free-quotes", "same-day"],
    about: "A one-man electrician who answers his own phone.",
    details: { jobs: "Rewires, fuse boards and alarms", workFor: "Homeowners and landlords", callout: "Free quotes, no call-out fee", history: "Since 2015" },
    phone: "0113 496 0789",
    email: "jobs@sparkandco.example",
  },
  physio: {
    businessName: "Calm Physio",
    servicesText: "Initial assessment £60\nFollow-up session £45\nSports injury treatment\nRehabilitation plan",
    hours: wk(["08:00", "19:00"], ["08:00", "19:00"], ["08:00", "19:00"], ["08:00", "19:00"], ["08:00", "17:00"], ["09:00", "13:00"], null),
    highlights: ["same-week", "evenings"],
    about: "A small clinic run by one physiotherapist.",
    details: { helpWith: "Back pain and sports injuries", firstVisit: "An assessment, then a plan agreed with you", booking: "Book by phone or email" },
    phone: "0117 496 0321",
    email: "appointments@calmphysio.example",
    address: "8 Park Row, Bristol",
  },
  massage: {
    businessName: "Still Waters Massage",
    servicesText: "Swedish massage £55\nDeep tissue massage £65\nHot stone massage",
    hours: wk(["10:00", "20:00"], ["10:00", "20:00"], ["10:00", "20:00"], ["10:00", "20:00"], ["10:00", "20:00"], ["10:00", "16:00"], null),
    highlights: ["couples", "evenings"],
    about: "A quiet treatment room by the harbour.",
    details: { visit: "An hour in a warm, quiet room", speciality: "Deep tissue and hot stone", booking: "Book by phone or message" },
    phone: "01253 720418",
    email: "book@stillwaters.example",
    address: "9 Harbour Street, Fleetwood",
  },
  fitness: {
    businessName: "Kettle Works",
    servicesText: "Group class £10\nOne-to-one session £35\nOnline coaching",
    hours: wk(["06:00", "21:00"], ["06:00", "21:00"], ["06:00", "21:00"], ["06:00", "21:00"], ["06:00", "21:00"], ["08:00", "13:00"], null),
    highlights: ["beginners", "equipment"],
    about: "A small gym where everyone knows your name.",
    details: { audience: "Beginners and returning exercisers", firstSession: "A short chat, then a trial class", joining: "Book a class or join monthly" },
    phone: "0161 496 2200",
    email: "hello@kettleworks.example",
    address: "4 Mill Lane, Bolton",
  },
  "holiday-let": {
    businessName: "The Old Byre",
    servicesText: "Double room £95\nFamily cottage £180\nStudio £70",
    areas: "Lytham, St Annes, Blackpool",
    highlights: ["pets", "parking"],
    about: "A converted barn with a garden and sea views.",
    details: { setting: "A quiet barn with views of the coast", guests: "Couples and families", arrival: "Check-in from 4pm, check-out by 10am, book by message" },
    email: "stay@theoldbyre.example",
  },
  beauty: {
    businessName: "Rosewood Beauty",
    servicesText: "Cut & blow dry £35\nGel manicure £28\nLash lift £45\nFull colour",
    hours: wk(null, ["09:00", "18:00"], ["09:00", "18:00"], ["09:00", "18:00"], ["09:00", "18:00"], ["09:00", "16:00"], null),
    highlights: ["bridal", "vouchers"],
    about: "A friendly two-chair salon run by one stylist.",
    details: { speciality: "Colour and bridal hair", firstVisit: "A patch test before any colour", booking: "Book by phone or message" },
    phone: "01524 720319",
    email: "hello@rosewoodbeauty.example",
    address: "22 Market Street, Lancaster",
  },
  plumbing: {
    businessName: "Tidewater Plumbing & Heating",
    servicesText: "Boiler service £75\nLeaking tap repair\nBathroom fitting\nRadiator replacement",
    areas: "Preston, Chorley, Leyland",
    highlights: ["free-quotes", "emergency"],
    about: "A local plumber who answers his own phone.",
    details: { jobs: "Boiler servicing, leaks and bathrooms", workFor: "Homeowners and landlords", callout: "Free quotes, no call-out fee", history: "Since 2014" },
    phone: "01772 960234",
    email: "jobs@tidewater.example",
  },
  building: {
    businessName: "Granite & Oak Building",
    servicesText: "Home extensions\nLoft conversions\nKitchen fitting\nDecorating and plastering",
    areas: "Kendal, Windermere, Ulverston",
    highlights: ["free-quotes", "insured"],
    about: "A small family firm that does the work itself.",
    details: { jobs: "Extensions, lofts and kitchens", workFor: "Homeowners", quote: "A free visit to talk it through", history: "A family firm for fifteen years" },
    phone: "01539 720411",
    email: "enquiries@graniteandoak.example",
  },
  cleaning: {
    businessName: "Fresh Start Cleaning",
    servicesText: "Regular home clean £45\nEnd of tenancy clean\nOffice cleaning\nOven cleaning £60",
    areas: "Bolton, Bury, Wigan",
    highlights: ["insured", "supplies"],
    about: "A small team who clean your home as carefully as their own.",
    details: { workFor: "Homes and small offices", frequency: "Weekly, fortnightly and one-off cleans", supplies: "We bring everything", history: "Since 2018" },
    phone: "01204 960777",
    email: "hello@freshstart.example",
  },
};
