"use client";

import { openFileTab } from "@/lib/open-tab";
import { useEffect, useId, useRef, useState } from "react";
import { uploadBriefFile } from "@/lib/brief-upload-client";
import {
  type BriefFile,
  BRIEF_LIMITS,
  BRIEF_UPLOAD,
  GOALS,
  STYLES,
  SUGGESTED_PAGES,
  cleanReference,
  type GoalId,
  type StyleId,
  type WebsiteBrief,
} from "@/lib/website-brief";
import styles from "./Configurator.module.css";

/** Accepts a patch, or a function of the latest brief (for updates that finish later, like uploads). */
export type BriefChange = (patch: Partial<WebsiteBrief> | ((current: WebsiteBrief) => Partial<WebsiteBrief>)) => void;
type Change = BriefChange;

const GOAL_ORDER = Object.keys(GOALS) as GoalId[];
const STYLE_ORDER = Object.keys(STYLES) as StyleId[];

/** What the website is for. Tiles; the first one chosen is marked as the main goal. */
export function GoalsField({ brief, onChange, error }: { brief: WebsiteBrief; onChange: Change; error?: string }) {
  const id = useId();
  const toggle = (g: GoalId) =>
    onChange({ goals: brief.goals.includes(g) ? brief.goals.filter((x) => x !== g) : [...brief.goals, g] });
  return (
    <>
      <fieldset className={styles.group} aria-describedby={error ? `${id}-error` : undefined}>
        <legend className={styles.legend}>Choose what matters most</legend>
        <div className={`${styles.choices} ${styles.cols2}`}>
          {GOAL_ORDER.map((g) => (
            <label key={g} className={styles.choice}>
              <input type="checkbox" checked={brief.goals.includes(g)} onChange={() => toggle(g)} />
              <span className={styles.choiceBody}>
                <span className={styles.choiceLabel}>
                  {GOALS[g].label}
                  {brief.goals[0] === g && <span className="cfg-tag">Main goal</span>}
                </span>
                <span className={styles.choiceHint}>{GOALS[g].hint}</span>
              </span>
            </label>
          ))}
        </div>
        {error && (
          <p id={`${id}-error`} className="field-error" role="alert">
            {error}
          </p>
        )}
      </fieldset>
      <TextField
        id="goalNote"
        label="What would make this website a success?"
        optional
        textarea
        max={BRIEF_LIMITS.goalNote}
        value={brief.goalNote}
        placeholder="For example: 20 new bookings a month"
        onChange={(v) => onChange({ goalNote: v })}
      />
    </>
  );
}

/** The pages by name. Suggested pages toggle on and off; custom pages can be added. */
export function PagesField({
  brief,
  onChange,
  error,
  bandMax,
  hardMax = null,
  choices,
}: {
  brief: WebsiteBrief;
  onChange: Change;
  error?: string;
  /** What the chosen price band covers. A hint only: more pages can be bought. */
  bandMax: number | null;
  /** The most pages the customer's plan allows. Past it, no more pages can be added. */
  hardMax?: number | null;
  /** A template site can build only these pages. Home is always included, and no others can be added. */
  choices?: readonly string[];
}) {
  const [custom, setCustom] = useState("");
  const has = (p: string) => brief.pages.some((x) => x.toLowerCase() === p.toLowerCase());
  const full = hardMax !== null && brief.pages.length >= hardMax;
  const toggle = (p: string) => {
    if (choices && p === choices[0]) return;
    if (!has(p) && full) return;
    onChange({ pages: has(p) ? brief.pages.filter((x) => x.toLowerCase() !== p.toLowerCase()) : [...brief.pages, p] });
  };
  const add = () => {
    const name = custom.trim().slice(0, BRIEF_LIMITS.pageName);
    if (full || !name || has(name) || brief.pages.length >= BRIEF_LIMITS.pages) return;
    onChange({ pages: [...brief.pages, name] });
    setCustom("");
  };
  const extras = choices ? [] : brief.pages.filter((p) => !SUGGESTED_PAGES.some((s) => s.toLowerCase() === p.toLowerCase()));
  const overPlan = hardMax !== null && brief.pages.length > hardMax;
  const over = overPlan || (bandMax !== null && brief.pages.length > bandMax);
  return (
    <fieldset className={styles.group}>
      <legend className={styles.legend}>Your pages</legend>
      <div className="brief-chips" role="group" aria-label="Pages">
        {[...(choices ?? SUGGESTED_PAGES), ...extras].map((p) => (
          <button key={p} type="button" className="brief-chip" aria-pressed={has(p)} disabled={(!has(p) && full) || (choices !== undefined && p === choices[0])} onClick={() => toggle(p)}>
            {p}
          </button>
        ))}
      </div>
      {!choices && <div className="brief-add">
        <label htmlFor="brief-custom-page" className="visually-hidden">
          Add a page
        </label>
        <input
          id="brief-custom-page"
          className="input"
          value={custom}
          maxLength={BRIEF_LIMITS.pageName}
          placeholder="Add another page"
          disabled={full}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <button type="button" className="btn btn--secondary" onClick={add} disabled={full || !custom.trim()}>
          Add
        </button>
      </div>}
      <p className={`brief-count${over ? " brief-count--over" : ""}`} aria-live="polite">
        {hardMax !== null ? (
          overPlan ? (
            `${brief.pages.length} pages. Your plan covers up to ${hardMax}. Remove ${brief.pages.length - hardMax} to continue.`
          ) : (
            `${brief.pages.length} of ${hardMax} pages in your plan${full ? ". That's your limit." : ""}`
          )
        ) : (
          <>
            {brief.pages.length} page{brief.pages.length === 1 ? "" : "s"}
            {bandMax !== null && ` · your price covers up to ${bandMax}`}
            {over && ". Choose a larger number of pages above, or remove some."}
          </>
        )}
      </p>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </fieldset>
  );
}

/** A look to start from (swatch previews), colours, websites they like and anything to avoid. */
export function DesignFields({ brief, onChange }: { brief: WebsiteBrief; onChange: Change }) {
  const [refs, setRefs] = useState<string[]>(() => {
    const r = [...brief.references];
    while (r.length < BRIEF_LIMITS.references) r.push("");
    return r;
  });
  const [refErrors, setRefErrors] = useState<Record<number, boolean>>({});
  const setRef = (i: number, v: string) => {
    const next = refs.map((r, j) => (j === i ? v : r));
    setRefs(next);
    onChange({ references: next.map(cleanReference).filter((r): r is string => Boolean(r)) });
  };
  return (
    <>
      <fieldset className={styles.group}>
        <legend className={styles.legend}>Pick a starting look</legend>
        <div className="brief-styles">
          {STYLE_ORDER.map((s) => {
            const [bg, ink, accent] = STYLES[s].swatch;
            return (
              <label key={s} className="brief-style">
                <input
                  type="radio"
                  name="brief-style"
                  className="visually-hidden"
                  checked={brief.style === s}
                  onChange={() => onChange({ style: s })}
                />
                <span className="brief-style__preview" style={{ background: bg, color: ink }} aria-hidden="true">
                  <span className="brief-style__nav" style={{ background: ink }} />
                  <span className={`brief-style__type brief-style__type--${STYLES[s].font}`}>Aa</span>
                  <span className="brief-style__line" style={{ background: ink }} />
                  <span className="brief-style__line brief-style__line--short" style={{ background: ink }} />
                  <span className="brief-style__btn" style={{ background: accent }} />
                </span>
                <span className="brief-style__label">{STYLES[s].label}</span>
              </label>
            );
          })}
        </div>
        <button
          type="button"
          className="arrow-link brief-style__clear"
          onClick={() => onChange({ style: null })}
          disabled={brief.style === null}
        >
          No preference
        </button>
      </fieldset>
      <TextField
        id="colours"
        label="Brand colours"
        optional
        max={BRIEF_LIMITS.colours}
        value={brief.colours}
        placeholder="For example: navy and gold, or #1d3557"
        onChange={(v) => onChange({ colours: v })}
      />
      <fieldset className={styles.group}>
        <legend className={styles.legend}>
          Websites you like <span className="optional">(optional)</span>
        </legend>
        <div className="cfg-fields">
          {refs.map((r, i) => (
            <div key={i} className="field">
              <label htmlFor={`brief-ref-${i}`} className="visually-hidden">
                Website {i + 1}
              </label>
              <input
                id={`brief-ref-${i}`}
                className="input"
                inputMode="url"
                value={r}
                maxLength={BRIEF_LIMITS.referenceUrl}
                placeholder="example.co.uk"
                aria-invalid={refErrors[i] ? true : undefined}
                onChange={(e) => setRef(i, e.target.value)}
                onBlur={() => setRefErrors((x) => ({ ...x, [i]: Boolean(r.trim()) && !cleanReference(r) }))}
              />
              {refErrors[i] && <p className="field-error">That doesn&apos;t look like a web address.</p>}
            </div>
          ))}
        </div>
      </fieldset>
      <TextField
        id="avoid"
        label="Anything to avoid?"
        optional
        textarea
        max={BRIEF_LIMITS.avoid}
        value={brief.avoid}
        onChange={(v) => onChange({ avoid: v })}
      />
    </>
  );
}

export function FunctionalityField({ brief, onChange }: { brief: WebsiteBrief; onChange: Change }) {
  return (
    <TextField
      id="functionality"
      label="Anything else it needs to do?"
      optional
      textarea
      max={BRIEF_LIMITS.functionality}
      value={brief.functionality}
      placeholder="For example: customers upload a photo with their enquiry"
      onChange={(v) => onChange({ functionality: v })}
    />
  );
}

const sizeLabel = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

const isImage = (f: BriefFile) => f.type.startsWith("image/") && f.type !== "image/svg+xml";
const kindLabel = (f: BriefFile) => (f.type.startsWith("image/") && f.type !== "image/svg+xml" ? "IMG" : f.type === "application/pdf" ? "PDF" : f.type === "image/svg+xml" ? "SVG" : f.type.includes("word") ? "DOC" : f.type === "text/plain" ? "TXT" : "FILE");

/**
 * Logo, photos and documents. Each file goes straight to private storage; failures are shown per file. A file picked
 * in this session can be looked at straight away, from the copy already in the browser. A file saved earlier is opened
 * through `view`, which asks the server for a short-lived link (only for the website's owner).
 */
export function FilesField({
  brief,
  onChange,
  draftId,
  view,
}: {
  brief: WebsiteBrief;
  onChange: Change;
  draftId: string | null;
  view?: (file: BriefFile) => Promise<string | null>;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  // Local copies of the files picked in this session, keyed by storage path.
  const [local, setLocal] = useState<Record<string, string>>({});
  const [opening, setOpening] = useState<string | null>(null);
  const localRef = useRef(local);
  useEffect(() => {
    localRef.current = local;
  }, [local]);
  // Release the browser's copies when the form goes away.
  useEffect(() => () => Object.values(localRef.current).forEach((u) => URL.revokeObjectURL(u)), []);

  const pick = async (list: FileList | null) => {
    if (!list || !draftId) return;
    const room = BRIEF_LIMITS.files - brief.files.length;
    const files = Array.from(list).slice(0, Math.max(0, room));
    const problems: string[] = list.length > room ? [`You can attach up to ${BRIEF_LIMITS.files} files.`] : [];
    setBusy((b) => b + files.length);
    for (const f of files) {
      const r = await uploadBriefFile(draftId, f);
      setBusy((b) => b - 1);
      if (r.ok) {
        const added = r.file;
        setLocal((l) => ({ ...l, [added.path]: URL.createObjectURL(f) }));
        onChange((current) => ({ files: [...current.files, added].slice(0, BRIEF_LIMITS.files) }));
      }
      else problems.push(`${f.name}: ${r.reason}`);
    }
    setErrors(problems);
    if (input.current) input.current.value = "";
  };

  const open = async (f: BriefFile) => {
    if (local[f.path]) {
      window.open(local[f.path], "_blank", "noopener,noreferrer");
      return;
    }
    const opened = view
      ? await openFileTab(async () => {
          setOpening(f.path);
          try {
            return await view(f);
          } finally {
            setOpening(null);
          }
        })
      : false;
    if (!opened) setErrors([`${f.name}: couldn't be opened just now. Please try again.`]);
  };

  const canOpen = (f: BriefFile) => Boolean(local[f.path] || view);

  return (
    <fieldset className={styles.group}>
      <legend className={styles.legend}>
        Logo, photos and documents <span className="optional">(optional)</span>
      </legend>
      <label className="brief-drop">
        <input
          ref={input}
          type="file"
          multiple
          className="visually-hidden"
          accept={Object.keys(BRIEF_UPLOAD.types).join(",")}
          disabled={!draftId || busy > 0 || brief.files.length >= BRIEF_LIMITS.files}
          onChange={(e) => void pick(e.target.files)}
        />
        <span className="brief-drop__title">{busy > 0 ? `Uploading ${busy}…` : "Add files"}</span>
        <span className="brief-drop__hint">Images, PDF or Word · up to 20 MB each · {BRIEF_LIMITS.files} files</span>
      </label>
      {brief.files.length > 0 && (
        <ul className="brief-files" role="list">
          {brief.files.map((f) => (
            <li key={f.path}>
              {isImage(f) && local[f.path] ? (
                <button type="button" className="brief-files__thumb" aria-label={`View ${f.name}`} onClick={() => void open(f)}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- a preview of the file the customer just picked, held in their browser */}
                  <img src={local[f.path]} alt="" />
                </button>
              ) : (
                <span className="brief-files__kind" aria-hidden="true">{kindLabel(f)}</span>
              )}
              <span className="brief-files__info">
                <span className="brief-files__name">{f.name}</span>
                <span className="brief-files__size">{sizeLabel(f.size)}</span>
              </span>
              <span className="brief-files__actions">
                {isImage(f) && (
                  <select
                    className="input"
                    aria-label={`What ${f.name} is for`}
                    value={f.role ?? ""}
                    onChange={(e) => {
                      const role = e.target.value === "logo" || e.target.value === "hero" ? e.target.value : undefined;
                      // Only one main photo and one logo: choosing it again moves it.
                      onChange({ files: brief.files.map((x) => ({ ...x, role: x.path === f.path ? role : x.role === role ? undefined : x.role })) });
                    }}
                  >
                    <option value="">Photo</option>
                    <option value="hero">Main photo</option>
                    <option value="logo">Logo</option>
                  </select>
                )}
                {canOpen(f) && (
                  <button type="button" className="brief-files__btn" disabled={opening === f.path} onClick={() => void open(f)}>
                    {opening === f.path ? "Opening…" : "View"}
                  </button>
                )}
                <button
                  type="button"
                  className="brief-files__btn"
                  aria-label={`Remove ${f.name}`}
                  onClick={() => onChange({ files: brief.files.filter((x) => x.path !== f.path) })}
                >
                  Remove
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
      {errors.length > 0 && (
        <ul className="field-error brief-errors" role="alert">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
    </fieldset>
  );
}

/** The brief at a glance on the review step, with a link back to each part. */
export function BriefSummary({ brief, onEdit }: { brief: WebsiteBrief; onEdit: (step: "goals" | "pages" | "design" | "content") => void }) {
  const style = brief.style ? STYLES[brief.style] : null;
  return (
    <dl className="brief-summary">
      <div>
        <dt>Goals</dt>
        <dd>{brief.goals.map((g) => GOALS[g].label).join(", ") || "None chosen"}</dd>
        <EditLink onClick={() => onEdit("goals")} />
      </div>
      <div>
        <dt>Pages</dt>
        <dd>{brief.pages.join(", ")}</dd>
        <EditLink onClick={() => onEdit("pages")} />
      </div>
      <div>
        <dt>Look</dt>
        <dd>
          {style ? (
            <span className="brief-summary__style">
              <span className="brief-swatch" aria-hidden="true">
                {style.swatch.map((c) => (
                  <span key={c} style={{ background: c }} />
                ))}
              </span>
              {style.label}
            </span>
          ) : (
            "No preference"
          )}
          {brief.references.length > 0 && ` · ${brief.references.length} reference site${brief.references.length === 1 ? "" : "s"}`}
        </dd>
        <EditLink onClick={() => onEdit("design")} />
      </div>
      <div>
        <dt>Files</dt>
        <dd>{brief.files.length ? brief.files.map((f) => f.name).join(", ") : "None yet"}</dd>
        <EditLink onClick={() => onEdit("content")} />
      </div>
    </dl>
  );
}

function EditLink({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="arrow-link brief-summary__edit" onClick={onClick}>
      Edit
    </button>
  );
}

function TextField({
  id,
  label,
  value,
  onChange,
  optional,
  textarea,
  max,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  optional?: boolean;
  textarea?: boolean;
  max: number;
  placeholder?: string;
}) {
  const fieldId = `brief-${id}`;
  return (
    <div className="field">
      <label htmlFor={fieldId}>
        {label} {optional && <span className="optional">(optional)</span>}
      </label>
      {textarea ? (
        <textarea id={fieldId} className="textarea" rows={3} maxLength={max} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input id={fieldId} className="input" maxLength={max} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}
