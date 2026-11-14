"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type TouchEvent } from "react";
import { ExtraFields } from "@/components/configurator/ExtraFields";
import { PAGE_CHOICES } from "@/lib/site-template/pages";
import { DesignFields, FilesField, FunctionalityField, GoalsField, PagesField, type BriefChange } from "@/components/configurator/BriefSteps";
import { BusinessTypeField, ProfileFields, SiteFields } from "@/components/configurator/SiteFields";
import { firstIncompleteStep, stepsFor, STEP_TITLES, validateStep, withKnownContact, type KnownContact, type StepContext, type StepErrors, type StepId } from "@/lib/brief-steps";
import type { Progress } from "@/lib/brief-progress";
import { SECTOR_PRESETS } from "@/lib/site-template/presets";
import { GOALS, STYLES, type BriefFile, type WebsiteBrief } from "@/lib/website-brief";

/** What the wizard asks of the server. Passed in, so the form can be tried without one. */
export type WizardApi = {
  loadAllowance(): Promise<number | null>;
  loadProgress(): Promise<Progress | null>;
  /** What the customer gave at sign-up, so the form doesn't ask again. */
  loadKnown(): Promise<KnownContact | null>;
  saveProgress(progress: Progress): Promise<boolean>;
  viewFile(file: BriefFile): Promise<string | null>;
  send(input: { name: string; businessName: string; brief: WebsiteBrief; draftId: string | null }): Promise<{ ok: true } | { ok: false; error: string }>;
};

const HEADINGS: Record<StepId, string> = {
  about: "About you and your business",
  offer: "What you offer",
  goals: "What the website is for",
  look: "How it should look",
  files: "Logo, photos and extras",
  review: "Check and send",
};

type SaveState = "idle" | "saving" | "saved" | "error";
const SAVE_DELAY_MS = 800;
const SWIPE_MIN_PX = 80;

/**
 * The details form a customer fills in after paying, one short step at a time. Every step is saved to the server as
 * they go, so closing the page by accident loses at most the last few seconds, and they come back to the step they
 * were on. Saving progress never sends anything to the team: only "Send to the team" does that.
 */
export function BriefWizard({
  initial,
  name: savedName,
  businessName: savedBusiness,
  typesOn,
  api,
  onSent,
  bespoke = false,
}: {
  initial: WebsiteBrief;
  name: string;
  businessName: string;
  typesOn: boolean;
  api: WizardApi;
  onSent: () => void;
  /** A website bought outright: adds the budget and deadline questions staff quote from. */
  bespoke?: boolean;
}) {
  const [brief, setBrief] = useState<WebsiteBrief>(initial);
  const [name, setName] = useState(savedName);
  const [businessName, setBusinessName] = useState(savedBusiness);
  const [step, setStep] = useState<StepId>("about");
  const [allowed, setAllowed] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [restored, setRestored] = useState(false);
  const [known, setKnown] = useState<KnownContact | null>(null);
  // Set once the contact fields were filled from the sign-up details, so a note can say why.
  const [filledFromSignup, setFilledFromSignup] = useState(false);
  const [errors, setErrors] = useState<StepErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  // A folder for this form's uploads. Kept across a resume, so earlier uploads stay with the form.
  const [draftId, setDraftId] = useState<string | null>(() => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : null));
  const dirty = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);

  const ctx: StepContext = useMemo(() => ({ typesOn, allowedPages: allowed, name, businessName }), [typesOn, allowed, name, businessName]);
  const steps = stepsFor(brief, ctx);
  const current: StepId = steps.includes(step) ? step : steps[0];
  const index = steps.indexOf(current);

  // Load the plan's page allowance and any saved progress once, then show the form.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [pages, saved, knownContact] = await Promise.all([api.loadAllowance().catch(() => null), api.loadProgress().catch(() => null), api.loadKnown().catch(() => null)]);
      if (cancelled) return;
      setAllowed(pages);
      setKnown(knownContact);
      if (saved) {
        // Coming back to the step that asks for contact details: fill any gap there too.
        setBrief(saved.step === "offer" ? withKnownContact(saved.brief, knownContact).brief : saved.brief);
        setName(saved.name || savedName);
        setBusinessName(saved.businessName || savedBusiness);
        setStep(saved.step);
        if (saved.draftId) setDraftId(saved.draftId);
        setRestored(true);
      }
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
    // The inputs are read once, on first load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The latest answers, so a save always sends what is on screen now.
  const latest = useRef<Progress | null>(null);
  useEffect(() => {
    latest.current = { name, businessName, brief, step: current, draftId };
  });

  // Save a moment after the customer stops typing, and after they change step.
  useEffect(() => {
    if (!loaded || !dirty.current) return;
    const t = setTimeout(() => {
      const progress = latest.current;
      if (!progress) return;
      setSaveState("saving");
      void api
        .saveProgress(progress)
        .catch(() => false)
        .then((ok) => setSaveState(ok ? "saved" : "error"));
    }, SAVE_DELAY_MS);
    return () => clearTimeout(t);
  }, [loaded, brief, name, businessName, current, api]);

  // Each step starts at its heading, so a screen reader and a phone both land in the right place.
  useEffect(() => {
    if (loaded) heading.current?.focus({ preventScroll: false });
  }, [current, loaded]);

  const touched = () => {
    dirty.current = true;
    setErrors({});
    setMessage(null);
  };
  const update: BriefChange = (patch) => {
    touched();
    setBrief((b) => ({ ...b, ...(typeof patch === "function" ? patch(b) : patch) }));
  };

  const go = (to: StepId) => {
    dirty.current = true;
    setRestored(false);
    // Reaching the step that asks for contact details: use what they gave at sign-up, never what they typed.
    if (to === "offer") {
      const filled = withKnownContact(brief, known);
      if (filled.changed) {
        setBrief(filled.brief);
        setFilledFromSignup(true);
      }
    }
    setErrors({});
    setMessage(null);
    setStep(to);
  };

  const next = () => {
    const found = validateStep(current, brief, ctx);
    if (Object.keys(found).length) {
      setErrors(found);
      setMessage("A few answers need another look. They are marked below.");
      return;
    }
    go(steps[Math.min(index + 1, steps.length - 1)]);
  };
  const back = () => go(steps[Math.max(index - 1, 0)]);

  // A swipe on empty space moves between steps. A touch that starts on a field or a button is left alone.
  const onTouchStart = (e: TouchEvent) => {
    const t = e.touches[0];
    touch.current = (e.target as HTMLElement).closest("input,textarea,select,button,label,a,summary") ? null : { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e: TouchEvent) => {
    const start = touch.current;
    touch.current = null;
    if (!start || current === "review") return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    if (Math.abs(dx) < SWIPE_MIN_PX || Math.abs(dx) < Math.abs(t.clientY - start.y) * 2) return;
    if (dx < 0) next();
    else if (index > 0) back();
  };

  const finalBrief = (): WebsiteBrief => ({ ...brief, site: brief.site ? { ...brief.site, answers: { ...brief.site.answers, businessName } } : null });

  const send = async () => {
    const incomplete = firstIncompleteStep(brief, ctx);
    if (incomplete) {
      setStep(incomplete.step);
      setErrors(incomplete.errors);
      setMessage("A few answers need another look. They are marked below.");
      return;
    }
    setBusy(true);
    setMessage(null);
    const result = await api.send({ name, businessName, brief: finalBrief(), draftId });
    setBusy(false);
    if (result.ok) onSent();
    else setMessage(result.error);
  };

  if (!loaded) return <p className="acct-meta" role="status">Opening your form…</p>;

  const typeLabel = brief.site ? (SECTOR_PRESETS[brief.site.sector]?.label ?? "") : brief.otherBusinessType;
  const saveText = saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : saveState === "error" ? "Couldn't save just now. Your answers are still on this page." : "";

  return (
    <div className="wiz" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <header className="wiz__head">
        <p className="wiz__step">
          Step {index + 1} of {steps.length} <span>{STEP_TITLES[current]}</span>
        </p>
        <div className="wiz__bar" role="progressbar" aria-label="Form progress" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={index + 1}>
          {steps.map((s, i) => (
            <span key={s} data-state={i < index ? "done" : i === index ? "now" : "todo"} />
          ))}
        </div>
      </header>

      {restored && (
        <p className="wiz__restored" role="status">
          Welcome back. We kept your answers so far.
        </p>
      )}

      <h3 ref={heading} tabIndex={-1} className="wiz__title">
        {HEADINGS[current]}
      </h3>

      <div className="wiz__body stack" style={{ "--stack": "var(--space-5)" } as CSSProperties}>
        {current === "about" && (
          <>
            {(savedName || savedBusiness) && (
              <p className="wiz__restored">We&apos;ve kept the details you gave when you signed up. Check they&apos;re still right.</p>
            )}
            <div className="field">
              <label htmlFor="wiz-name">Your name</label>
              <input id="wiz-name" className="input" maxLength={100} autoComplete="name" value={name} onChange={(e) => (touched(), setName(e.target.value))} />
            </div>
            <div className="field">
              <label htmlFor="wiz-biz">Business name</label>
              <input id="wiz-biz" className="input" maxLength={120} autoComplete="organization" value={businessName} aria-invalid={errors.businessName ? true : undefined} onChange={(e) => (touched(), setBusinessName(e.target.value))} />
              {errors.businessName && <p className="field-error" role="alert">{errors.businessName}</p>}
            </div>
            {typesOn && (
              <>
                <BusinessTypeField brief={brief} onChange={update} />
                {errors.type && <p className="field-error" role="alert">{errors.type}</p>}
              </>
            )}
          </>
        )}

        {current === "offer" && filledFromSignup && <p className="wiz__restored">We&apos;ve filled in the contact details you gave when you signed up. Change them if they&apos;re not right.</p>}

        {current === "offer" && (brief.site ? <SiteFields brief={brief} onChange={update} errors={errors} businessName={businessName} /> : <ProfileFields brief={brief} onChange={update} errors={errors} />)}

        {current === "goals" && (
          <>
            <GoalsField brief={brief} onChange={update} error={errors.goals} />
            <PagesField brief={brief} onChange={update} error={errors.pages} bandMax={null} hardMax={allowed} choices={brief.site ? Object.values(PAGE_CHOICES) : undefined} />
          </>
        )}

        {current === "look" && <DesignFields brief={brief} onChange={update} />}

        {current === "files" && (
          <>
            <FilesField brief={brief} onChange={update} draftId={draftId} view={api.viewFile} />
            <FunctionalityField brief={brief} onChange={update} />
          </>
        )}

        {current === "review" && (
          <dl className="wiz__summary">
            <SummaryRow label="Business" onEdit={() => go("about")}>
              {businessName || "Not added yet"}
              {typeLabel && ` · ${typeLabel}`}
            </SummaryRow>
            {typesOn && (
              <SummaryRow label="What you offer" onEdit={() => go("offer")}>
                {brief.site ? `${(brief.site.answers.servicesText ?? "").split("\n").filter((l) => l.trim()).length} listed` : offerSummary(brief)}
              </SummaryRow>
            )}
            <SummaryRow label="Goals" onEdit={() => go("goals")}>
              {brief.goals.map((g) => GOALS[g].label).join(", ") || "None chosen"}
            </SummaryRow>
            {!brief.site && <SummaryRow label="Pages" onEdit={() => go("goals")}>{brief.pages.join(", ")}</SummaryRow>}
            {!brief.site && <SummaryRow label="Look" onEdit={() => go("look")}>{brief.style ? STYLES[brief.style].label : "No preference"}</SummaryRow>}
            <SummaryRow label="Files" onEdit={() => go("files")}>{brief.files.length ? `${brief.files.length} attached` : "None"}</SummaryRow>
          </dl>
        )}
        <ExtraFields step={current} brief={brief} onChange={update} bespoke={bespoke} />
      </div>

      {message && (
        <p className="field-error" role="alert">
          {message}
        </p>
      )}

      <footer className="wiz__nav">
        <p className="wiz__saved" role="status" aria-live="polite">
          {saveText}
        </p>
        <div className="wiz__buttons">
          {index > 0 && (
            <button type="button" className="btn btn--secondary" onClick={back} disabled={busy}>
              Back
            </button>
          )}
          {current === "review" ? (
            <button type="button" className="btn btn--primary" onClick={() => void send()} disabled={busy}>
              {busy ? "Sending…" : "Send to the team"}
            </button>
          ) : (
            <button type="button" className="btn btn--primary" onClick={next}>
              Next
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}

function offerSummary(brief: WebsiteBrief): string {
  const lines = brief.profile.services.split("\n").filter((l) => l.trim());
  if (!lines.length) return "Not added yet";
  return lines.length === 1 ? lines[0] : `${lines[0]} and ${lines.length - 1} more`;
}

function SummaryRow({ label, onEdit, children }: { label: string; onEdit: () => void; children: React.ReactNode }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{children}</dd>
      <button type="button" className="arrow-link brief-summary__edit" onClick={onEdit}>
        Edit
      </button>
    </div>
  );
}
