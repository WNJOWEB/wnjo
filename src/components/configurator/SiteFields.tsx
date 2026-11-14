"use client";

import { useId, useState } from "react";
import { DAYS, type DayAnswer, type RawAnswers } from "@/lib/site-template/answers";
import { ABOUT_QUESTION, BUSINESS_GROUPS, SECTOR_PRESETS, type BusinessGroup } from "@/lib/site-template/presets";
import { LOOKS, type Look } from "@/lib/site-template/schema";
import { CUSTOMERS, FIRST_ACTIONS, PROFILE_LIMITS, TONES, type BusinessProfile, type FirstAction, type WebsiteBrief } from "@/lib/website-brief";
import type { BriefChange } from "./BriefSteps";
import styles from "./Configurator.module.css";

const LOOK_LABELS: Record<Look, string> = { minimal: "Clean and minimal", warm: "Warm and friendly", bold: "Bold", classic: "Classic" };

/** Theme colours the customer can pick. Dark enough for white text, so every look stays readable. */
export const SITE_COLOURS = [
  { hex: "#1f3a34", label: "Forest green" },
  { hex: "#1d3557", label: "Navy" },
  { hex: "#6d1f2f", label: "Burgundy" },
  { hex: "#2b2b2b", label: "Charcoal" },
  { hex: "#a84a26", label: "Terracotta" },
  { hex: "#3d3a7a", label: "Indigo" },
] as const;

const SECTOR_HINT: Record<string, string> = {
  barber: "Services and prices, opening hours, and booking requests",
  cafe: "Menu, opening hours, and table requests",
  electrician: "Services, areas you cover, and quote requests",
  physio: "Treatments and prices, opening hours, and appointment requests",
  massage: "Treatments and prices, opening hours, and booking requests",
  fitness: "Classes and sessions, opening hours, and trial requests",
  "holiday-let": "Stays and prices, the places nearby, and date requests",
  beauty: "Treatments and prices, opening hours, and booking requests",
  plumbing: "Services, areas you cover, and quote requests",
  building: "Services, areas you cover, and quote requests",
  cleaning: "Services, areas you cover, and quote requests",
};
const GROUP_ORDER = Object.keys(BUSINESS_GROUPS) as BusinessGroup[];

const emptyWeek = (): DayAnswer[] => DAYS.map((day) => ({ day, open: "", close: "" }));

/**
 * Choosing the kind of business: the templates we have, grouped, and "Another type of business" with a typed box.
 * Nothing is pre-selected. Choosing a template starts its questions with blank opening times and the sector's look.
 */
export function BusinessTypeField({ brief, onChange }: { brief: WebsiteBrief; onChange: BriefChange }) {
  const id = useId();
  const site = brief.site;
  // "Another type of business" is only selected when the customer picks it. Nothing is pre-selected for them.
  const [otherMode, setOtherMode] = useState(brief.otherBusinessType !== "");
  const choose = (sector: string | null) => {
    setOtherMode(false);
    onChange({ otherBusinessType: "", site: sector ? { sector, answers: { ...(site?.answers ?? {}), hours: site?.answers.hours?.length ? site.answers.hours : emptyWeek(), look: site?.answers.look ?? SECTOR_PRESETS[sector].defaultLook, colour: site?.answers.colour ?? SITE_COLOURS[0].hex } } : null });
  };

  return (
    <>
      <fieldset className={styles.group}>
        <legend className={styles.legend}>What kind of business is it?</legend>
        <div className={`${styles.choices} ${styles.cols2}`}>
          {/* One grid, in group order. Each tile names its group, so the groups stay visible without a half-empty row each. */}
          {GROUP_ORDER.flatMap((g) => Object.values(SECTOR_PRESETS).filter((p) => p.group === g)).map((p) => (
            <label key={p.id} className={styles.choice}>
              <input type="radio" name={`${id}-sector`} checked={site?.sector === p.id} onChange={() => choose(p.id)} />
              <span className={styles.choiceBody}>
                <span className="site-tile__group">{BUSINESS_GROUPS[p.group].label}</span>
                <span className={styles.choiceLabel}>{p.label}</span>
                <span className={styles.choiceHint}>{SECTOR_HINT[p.id] ?? ""}</span>
              </span>
            </label>
          ))}
          <label className={styles.choice}>
            <input type="radio" name={`${id}-sector`} checked={!site && otherMode} onChange={() => (setOtherMode(true), onChange({ site: null }))} />
            <span className={styles.choiceBody}>
              <span className="site-tile__group">Anything else</span>
              <span className={styles.choiceLabel}>Another type of business</span>
              <span className={styles.choiceHint}>Tell us what it is</span>
            </span>
          </label>
        </div>
        {!site && otherMode && (
          <div className="field site-other">
            <label htmlFor={`${id}-other`}>Tell us the type of business</label>
            <input
              id={`${id}-other`}
              className="input"
              maxLength={80}
              placeholder="For example: dog grooming, florist, accountant"
              value={brief.otherBusinessType}
              onChange={(e) => onChange({ otherBusinessType: e.target.value })}
            />
            <p className="field-hint">We&apos;ll plan your pages with you. Nothing is built from this yet.</p>
          </div>
        )}
      </fieldset>

    </>
  );
}

/**
 * The sector questions for a template site: tick boxes first, short text only where nothing else can capture the
 * answer. Nothing is pre-filled with a guess: opening times start blank, so what is shown is what the customer said.
 */
export function SiteFields({ brief, onChange, errors, businessName }: { brief: WebsiteBrief; onChange: BriefChange; errors: Record<string, string>; businessName: string }) {
  const id = useId();
  const site = brief.site;
  const preset = site ? SECTOR_PRESETS[site.sector] : null;
  const answers: RawAnswers = site?.answers ?? {};

  const set = (patch: Partial<RawAnswers>) => {
    if (!site) return;
    onChange({ site: { sector: site.sector, answers: { ...site.answers, ...patch } } });
  };

  const hasHours = Boolean(preset?.sections.some((x) => x.kind === "hours"));
  const hoursRequired = Boolean(preset?.sections.find((x) => x.kind === "hours")?.required);
  const hours = answers.hours?.length ? answers.hours : emptyWeek();
  const setDay = (day: DayAnswer["day"], patch: Partial<DayAnswer>) => {
    const next = hours.map((d) => (d.day === day ? ({ ...d, ...patch } as DayAnswer) : d));
    set({ hours: next });
  };
  const copyMonday = () => {
    const mon = hours.find((d) => d.day === "Mon");
    if (!mon) return;
    set({ hours: hours.map((d) => (["Tue", "Wed", "Thu", "Fri"].includes(d.day) ? { day: d.day, ...(mon.closed ? { closed: true } : { open: mon.open, close: mon.close }) } : d)) });
  };
  const ticked = new Set(answers.highlights ?? []);
  const toggleHighlight = (hid: string) => set({ highlights: ticked.has(hid) ? [...ticked].filter((x) => x !== hid) : [...ticked, hid] });
  const err = (key: string) => errors[key] && <p className="field-error" role="alert">{errors[key]}</p>;

  return (
    <>
      {site && preset && (
        <>
          <div className="field">
            <label htmlFor={`${id}-services`}>{preset.servicesPrompt}</label>
            <textarea
              id={`${id}-services`}
              className="textarea"
              rows={5}
              maxLength={2000}
              value={answers.servicesText ?? ""}
              placeholder={preset.servicesExample}
              aria-invalid={errors.services ? true : undefined}
              onChange={(e) => set({ servicesText: e.target.value })}
            />
            <p className="field-hint">One per line. Add a price if you want it shown.</p>
            {err("services")}
          </div>

          {preset.areaSource === "areas" && (
            <div className="field">
              <label htmlFor={`${id}-areas`}>Areas you cover</label>
              <textarea id={`${id}-areas`} className="textarea" rows={3} maxLength={300} value={answers.areas ?? ""} placeholder={"Leeds, Wakefield, Harrogate"} aria-invalid={errors.areas ? true : undefined} onChange={(e) => set({ areas: e.target.value })} />
              <p className="field-hint">One place per line, or separated by commas.</p>
              {err("areas")}
            </div>
          )}

          {hasHours && (
          <fieldset className={styles.group}>
            <legend className={styles.legend}>
              {preset.hoursPrompt} {!hoursRequired && <span className="optional">(optional)</span>}
            </legend>
            <div className="site-hours">
              {hours.map((d) => (
                <div key={d.day} className="site-hours__row">
                  <span className="site-hours__day">{d.day}</span>
                  <label className="site-hours__closed">
                    <input type="checkbox" checked={Boolean(d.closed)} onChange={(e) => setDay(d.day, e.target.checked ? { closed: true, open: undefined, close: undefined } : { closed: false, open: "", close: "" })} />
                    Closed
                  </label>
                  <input type="time" className="input" aria-label={`${d.day} opens`} disabled={d.closed} value={d.closed ? "" : (d.open ?? "")} onChange={(e) => setDay(d.day, { open: e.target.value })} />
                  <input type="time" className="input" aria-label={`${d.day} closes`} disabled={d.closed} value={d.closed ? "" : (d.close ?? "")} onChange={(e) => setDay(d.day, { close: e.target.value })} />
                </div>
              ))}
            </div>
            <button type="button" className="arrow-link" onClick={copyMonday}>
              Use Monday&apos;s hours for Tuesday to Friday
            </button>
            {err("hours")}
          </fieldset>
          )}

          <fieldset className={styles.group}>
            <legend className={styles.legend}>About your business</legend>
            <div className="field">
              <label htmlFor={`${id}-about`}>{ABOUT_QUESTION.label}</label>
              <textarea
                id={`${id}-about`}
                className="textarea"
                rows={3}
                maxLength={400}
                value={answers.about ?? ""}
                placeholder={ABOUT_QUESTION.placeholder}
                aria-invalid={errors.about ? true : undefined}
                onChange={(e) => set({ about: e.target.value })}
              />
              <p className="field-hint">{ABOUT_QUESTION.hint}</p>
              {err("about")}
            </div>
            {preset.questions.map((q) => (
              <div className="field" key={q.id}>
                <label htmlFor={`${id}-q-${q.id}`}>
                  {q.label} {!q.required && <span className="optional">(optional)</span>}
                </label>
                <textarea
                  id={`${id}-q-${q.id}`}
                  className="textarea"
                  rows={2}
                  maxLength={200}
                  value={answers.details?.[q.id] ?? ""}
                  placeholder={q.placeholder}
                  aria-invalid={errors[`detail-${q.id}`] ? true : undefined}
                  onChange={(e) => set({ details: { ...(answers.details ?? {}), [q.id]: e.target.value } })}
                />
                <p className="field-hint">{q.hint}</p>
                {err(`detail-${q.id}`)}
              </div>
            ))}
          </fieldset>

          <fieldset className={styles.group}>
            <legend className={styles.legend}>How can people reach you?</legend>
            <div className="cfg-fields">
              <div className="field">
                <label htmlFor={`${id}-phone`}>Phone <span className="optional">(optional)</span></label>
                <input id={`${id}-phone`} className="input" type="tel" autoComplete="tel" maxLength={20} value={answers.phone ?? ""} onChange={(e) => set({ phone: e.target.value })} />
                {err("phone")}
              </div>
              <div className="field">
                <label htmlFor={`${id}-email`}>Email</label>
                <input id={`${id}-email`} className="input" type="email" autoComplete="email" maxLength={120} value={answers.email ?? ""} onChange={(e) => set({ email: e.target.value })} />
                {err("email")}
              </div>
              <div className="field">
                <label htmlFor={`${id}-address`}>Address <span className="optional">(optional)</span></label>
                <input id={`${id}-address`} className="input" autoComplete="street-address" maxLength={160} value={answers.address ?? ""} onChange={(e) => set({ address: e.target.value })} />
                {err("address")}
              </div>
            </div>
            {err("contact")}
          </fieldset>

          <fieldset className={styles.group}>
            <legend className={styles.legend}>
              Tick what is true <span className="optional">(optional)</span>
            </legend>
            <div className="brief-chips" role="group" aria-label="Facts about your business">
              {preset.highlights.map((h) => (
                <button key={h.id} type="button" className="brief-chip" aria-pressed={ticked.has(h.id)} onClick={() => toggleHighlight(h.id)}>
                  {h.value}: {h.label.toLowerCase()}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className={styles.group}>
            <legend className={styles.legend}>Look and colour</legend>
            <div className="brief-chips" role="group" aria-label="Look">
              {LOOKS.map((l) => (
                <button key={l} type="button" className="brief-chip" aria-pressed={(answers.look ?? preset.defaultLook) === l} onClick={() => set({ look: l })}>
                  {LOOK_LABELS[l]}
                </button>
              ))}
            </div>
            <div className="site-swatches" role="radiogroup" aria-label="Colour">
              {SITE_COLOURS.map((c) => (
                <label key={c.hex} className="site-swatch" title={c.label}>
                  <input type="radio" name={`${id}-colour`} className="visually-hidden" checked={(answers.colour ?? SITE_COLOURS[0].hex) === c.hex} onChange={() => set({ colour: c.hex })} />
                  <span style={{ background: c.hex }} />
                  <span className="visually-hidden">{c.label}</span>
                </label>
              ))}
            </div>
            {err("colour")}
          </fieldset>
          {err("businessName") || (!businessName.trim() && <p className="field-hint">Add your business name above. It goes at the top of your site.</p>)}
        </>
      )}
    </>
  );
}

/**
 * The questions a first website needs, for a business with no template. Each question says what it is for, with an
 * example, so the customer knows what to write. Each answer is a fact the writer can use, so nothing is guessed.
 */
export function ProfileFields({ brief, onChange, errors }: { brief: WebsiteBrief; onChange: BriefChange; errors: Partial<Record<keyof BusinessProfile, string>> }) {
  const id = useId();
  const p = brief.profile;
  const set = (patch: Partial<BusinessProfile>) => onChange({ profile: { ...p, ...patch } });
  const toggleAction = (a: FirstAction) => set({ firstActions: p.firstActions.includes(a) ? p.firstActions.filter((x) => x !== a) : [...p.firstActions, a] });
  const err = (key: keyof BusinessProfile) => errors[key] && <p className="field-error" role="alert">{errors[key]}</p>;
  const chips = <K extends string>(options: Record<K, string>, value: K | "", onPick: (v: K | "") => void, label: string) => (
    <div className="brief-chips" role="group" aria-label={label}>
      {(Object.keys(options) as K[]).map((k) => (
        <button key={k} type="button" className="brief-chip" aria-pressed={value === k} onClick={() => onPick(value === k ? "" : k)}>
          {options[k]}
        </button>
      ))}
    </div>
  );
  return (
    <div className="site-profile">
      <div className="field">
        <label htmlFor={`${id}-services`}>What do you offer?</label>
        <p className="field-hint">List each service or product on its own line. Add a price only if you want it shown on the site. For example: &quot;Airport transfer £35&quot; or &quot;Long distance, quoted on request&quot;.</p>
        <textarea id={`${id}-services`} className="textarea" rows={4} maxLength={PROFILE_LIMITS.services} value={p.services} aria-invalid={errors.services ? true : undefined} onChange={(e) => set({ services: e.target.value })} />
        {err("services")}
      </div>

      <div className="site-profile__contact">
        <div className="field">
          <label htmlFor={`${id}-email`}>Email address</label>
          <p className="field-hint">Required. This is where enquiries and updates about your website reach you.</p>
          <input id={`${id}-email`} className="input" type="email" autoComplete="email" maxLength={PROFILE_LIMITS.email} value={p.email} aria-invalid={errors.email ? true : undefined} onChange={(e) => set({ email: e.target.value })} />
          {err("email")}
        </div>
        <div className="field">
          <label htmlFor={`${id}-phone`}>Phone number <span className="optional">(optional)</span></label>
          <p className="field-hint">Shown on the site so people can call you. Leave it out if you&apos;d rather not share it.</p>
          <input id={`${id}-phone`} className="input" type="tel" autoComplete="tel" maxLength={PROFILE_LIMITS.phone} value={p.phone} onChange={(e) => set({ phone: e.target.value })} />
          {err("phone")}
        </div>
      </div>

      <div className="field">
        <label htmlFor={`${id}-diff`}>What makes you different?</label>
        <p className="field-hint">One sentence about what sets you apart from others who do the same thing. For example: fixed prices, same-day service, or your own team.</p>
        <input id={`${id}-diff`} className="input" maxLength={PROFILE_LIMITS.differentiator} value={p.differentiator} aria-invalid={errors.differentiator ? true : undefined} onChange={(e) => set({ differentiator: e.target.value })} />
        {err("differentiator")}
      </div>

      <fieldset className={styles.group}>
        <legend className={styles.legend}>Who are your customers? <span className="optional">(optional)</span></legend>
        <p className="field-hint">Helps us choose the wording and what to show first. Pick the one that fits best.</p>
        {chips(CUSTOMERS, p.customers, (v) => set({ customers: v }), "Customers")}
      </fieldset>

      <fieldset className={styles.group}>
        <legend className={styles.legend}>What should a visitor do first? <span className="optional">(optional)</span></legend>
        <p className="field-hint">Pick one or more. The first one you pick becomes the main button on the site.</p>
        <div className="brief-chips" role="group" aria-label="First action">
          {(Object.keys(FIRST_ACTIONS) as FirstAction[]).map((a) => (
            <button key={a} type="button" className="brief-chip" aria-pressed={p.firstActions.includes(a)} onClick={() => toggleAction(a)}>
              {FIRST_ACTIONS[a]}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="field">
        <label htmlFor={`${id}-areas`}>Where do you work? <span className="optional">(optional)</span></label>
        <p className="field-hint">The places you cover, so people know if you can help them. Separate them with commas. For example: &quot;Leeds, Wakefield and within 20 miles&quot;.</p>
        <input id={`${id}-areas`} className="input" maxLength={PROFILE_LIMITS.areas} value={p.areas} onChange={(e) => set({ areas: e.target.value })} />
      </div>

      <div className="field">
        <label htmlFor={`${id}-hours`}>Opening hours or availability <span className="optional">(optional)</span></label>
        <p className="field-hint">Only what you&apos;re happy to show publicly. For example: &quot;24 hours a day&quot; or &quot;Mon to Fri 9am to 5pm, weekends by arrangement&quot;.</p>
        <input id={`${id}-hours`} className="input" maxLength={PROFILE_LIMITS.hours} value={p.hours} onChange={(e) => set({ hours: e.target.value })} />
      </div>

      <div className="field">
        <label htmlFor={`${id}-about`}>About you and the business <span className="optional">(optional)</span></label>
        <p className="field-hint">A few sentences in your own words: who runs it, how long you have done this, and what you care about. Only include what is true. We won&apos;t add anything you don&apos;t tell us.</p>
        <textarea id={`${id}-about`} className="textarea" rows={4} maxLength={PROFILE_LIMITS.about} value={p.about} onChange={(e) => set({ about: e.target.value })} />
      </div>

      <div className="field">
        <label htmlFor={`${id}-proof`}>Proof to show <span className="optional">(optional)</span></label>
        <p className="field-hint">Only facts you can back up, such as years trading, licences or memberships. Leave it blank if none apply.</p>
        <input id={`${id}-proof`} className="input" maxLength={PROFILE_LIMITS.proof} value={p.proof} onChange={(e) => set({ proof: e.target.value })} />
      </div>

      <fieldset className={styles.group}>
        <legend className={styles.legend}>How should the site sound? <span className="optional">(optional)</span></legend>
        <p className="field-hint">We match the wording to this. Pick the one closest to how you talk to customers.</p>
        {chips(TONES, p.tone, (v) => set({ tone: v }), "Tone")}
      </fieldset>
    </div>
  );
}
