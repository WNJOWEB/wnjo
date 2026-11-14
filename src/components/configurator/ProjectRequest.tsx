"use client";

import Link from "next/link";
import { useState } from "react";
import type { ProjectErrors } from "@/lib/project-request";
import { CARE_PLANS, ONE_OFF_TIERS, WEBSITE_PAGE_BANDS, formatGBP, tierForPages, type CarePlan, type WebsitePageBand } from "@/lib/pricing";
import { DETAIL_LIMITS, EMPTY_DETAILS, type WebsiteDetails } from "@/lib/website-enquiry";
import { useEnquirySubmit } from "../useEnquirySubmit";
import { ProjectBrief } from "./ProjectBrief";
import styles from "./Configurator.module.css";

/**
 * Buy a website outright: who is asking, nothing else. Their goals, pages and style come next, in their account, with the
 * same steps a monthly customer fills in (and no page limit). Then a written proposal by email and in the account. The
 * deposit (50%) is taken only after the proposal is accepted.
 */
export function ProjectRequest({ pages, care }: { pages?: string; care?: string }) {
  const [details, setDetails] = useState<WebsiteDetails>(EMPTY_DETAILS);
  const [errors, setErrors] = useState<ProjectErrors>({});
  const [honeypot, setHoneypot] = useState("");
  const [startedAt] = useState(() => Date.now());
  const { state, submit } = useEnquirySubmit();
  // What was chosen on the services page. An address without a choice starts from Essential with no hosting.
  const tier = ONE_OFF_TIERS[tierForPages(pages && pages in WEBSITE_PAGE_BANDS ? (pages as WebsitePageBand) : "4-5")];
  const hosting: CarePlan = care && care in CARE_PLANS ? (care as CarePlan) : "none";

  const setDetail = (key: keyof WebsiteDetails, value: string) => {
    setDetails((d) => ({ ...d, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const found: ProjectErrors = {};
    if (details.name.trim().length < 2) found.name = "Please tell us your name.";
    if (details.businessName.trim().length < 2) found.businessName = "Please tell us your business name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(details.email.trim())) found.email = "Please enter a valid email address.";
    if (Object.keys(found).length) {
      setErrors(found);
      return;
    }
    const result = await submit({ kind: "project", pages, care, details, website: honeypot, startedAt });
    if (result?.status === "error" && result.fields) setErrors(result.fields as ProjectErrors);
  };

  // The short form is in: the six questions open on this same page, with a pass for this one brief.
  if (state.status === "success" && state.briefId && state.pass && state.reference) {
    return <ProjectBrief briefId={state.briefId} pass={state.pass} reference={state.reference} name={details.name} businessName={details.businessName} email={details.email} phone={details.phone} />;
  }

  if (state.status === "success") {
    return (
      <div className={styles.done}>
        <div className="card card--raised stack" style={{ "--stack": "var(--space-5)" } as React.CSSProperties}>
          <h2 className="h2" tabIndex={-1} ref={(el) => el?.focus()}>
            Thank you, {details.name.trim().split(/\s+/)[0]}.
          </h2>
          <p className="muted">
            Next, tell us about your website. Sign in at <strong>{details.email}</strong> and answer a few questions. There&apos;s no page limit and nothing to pay yet. Your reference is{" "}
            <strong>{state.reference}</strong>.
          </p>
          <ol className="steps4" aria-label="What happens next">
            {["Send your brief", "Review our quote", "Pay 50% and we build", "Approve and pay the rest"].map((label, i) => (
              <li key={label} className={i === 0 ? "is-current" : undefined}>
                <span className="steps4__bar" />
                <span className="steps4__label">{label}</span>
              </li>
            ))}
          </ol>
          <div className="btn-row">
            {state.tracked && (
              <Link href="/account" className="btn btn--primary">
                Tell us about your website
              </Link>
            )}
            <Link href="/work" className="btn btn--secondary">
              See our work
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.done}>
      <form onSubmit={onSubmit} noValidate className="card card--raised stack form" style={{ "--stack": "var(--space-5)" } as React.CSSProperties}>
        <div>
          <p className="eyebrow">{tier.name} website</p>
          <h2 className="h2">From {formatGBP(tier.from)}</h2>
          {care && care in CARE_PLANS && (
            <p className="muted">
              {hosting === "none" ? "Hosted by you." : `With ${CARE_PLANS[hosting].label}, ${formatGBP(CARE_PLANS[hosting].monthly)} a month.`}{" "}
              <Link href="/website-projects#packages">Change</Link>
            </p>
          )}
          <p className="muted">Tell us who you are, then answer a few questions about your website. Nothing to pay yet.</p>
        </div>

        <TextField id="name" label="Your name" value={details.name} error={errors.name} onChange={(v) => setDetail("name", v)} autoComplete="name" />
        <TextField id="businessName" label="Business name" value={details.businessName} error={errors.businessName} onChange={(v) => setDetail("businessName", v)} autoComplete="organization" />
        <TextField id="email" label="Email" type="email" value={details.email} error={errors.email} onChange={(v) => setDetail("email", v)} autoComplete="email" />
        <TextField id="phone" label="Phone (optional)" type="tel" value={details.phone} error={errors.phone} onChange={(v) => setDetail("phone", v)} autoComplete="tel" />

        <div className="visually-hidden" aria-hidden="true">
          <label htmlFor="project-website">Leave this field empty</label>
          <input id="project-website" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
        </div>
        {state.status === "error" && !state.fields && (
          <p className="field-error" role="alert">
            {state.message}
          </p>
        )}
        {state.status === "not_configured" && (
          <p className="field-error" role="alert">
            {state.message} <Link href="/contact">Send us a message instead</Link>.
          </p>
        )}
        <div className="btn-row">
          <button type="submit" className="btn btn--primary" disabled={state.status === "submitting"}>
            {state.status === "submitting" ? "Sending…" : "Continue"}
          </button>
          <Link href="/contact?topic=website" className="btn btn--secondary">
            Talk to us first
          </Link>
        </div>
      </form>
    </div>
  );
}

function TextField({
  id,
  label,
  value,
  onChange,
  error,
  type = "text",
  autoComplete,
}: {
  id: keyof WebsiteDetails;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  type?: string;
  autoComplete?: string;
}) {
  const fieldId = `project-${id}`;
  return (
    <div className="field">
      <label htmlFor={fieldId}>{label}</label>
      <input
        id={fieldId}
        className="input"
        type={type}
        maxLength={DETAIL_LIMITS[id]}
        autoComplete={autoComplete}
        required
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${fieldId}-error` : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {error && (
        <p id={`${fieldId}-error`} className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}
