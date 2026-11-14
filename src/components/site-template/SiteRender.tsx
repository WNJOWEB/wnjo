import type { CSSProperties } from "react";
import type { HoursItem, Section, SiteContent } from "@/lib/site-template/schema";
import css from "./SiteRender.module.css";

/**
 * Lays a template build out as a page. It reads typed content only and never writes HTML from it: every string
 * goes through React as text, links are built here from the checked phone and email, and image addresses must be
 * https or a path on this site. A page that gets this far has passed `checkSite`, but nothing here relies on that.
 */

const HEX = /^#[0-9a-f]{6}$/i;

/** Black or white, whichever reads better on the theme colour. */
function onColour(hex: string): string {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.4 ? "#161616" : "#ffffff";
}

/** Only https addresses and paths on this site are shown as images. */
export function safeImage(src: string | undefined): string | null {
  if (!src) return null;
  if (/^https:\/\//i.test(src)) return src;
  if (src.startsWith("/") && !src.startsWith("//")) return src;
  return null;
}

const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;

function hoursText(h: HoursItem): string {
  if (h.closed) return "Closed";
  if (h.open && h.close) return `${h.open} to ${h.close}`;
  return h.open ?? "";
}

const ANCHOR_IDS: Partial<Record<Section["kind"], { id: string; fallback: string }>> = {
  services: { id: "services", fallback: "Services" },
  hours: { id: "hours", fallback: "Hours" },
  gallery: { id: "gallery", fallback: "Gallery" },
  area: { id: "find-us", fallback: "Find us" },
  faq: { id: "faq", fallback: "Questions" },
};

/** The nav names a section by its own short heading ("Menu", "Prices"), and falls back to a plain word. */
function navLabel(s: Section): string | null {
  const a = ANCHOR_IDS[s.kind];
  if (!a) return null;
  const heading = "heading" in s ? s.heading.trim() : "";
  return heading && heading.length <= 16 ? heading : a.fallback;
}

/** The sections of the page being shown. The home page is the content's own sections. */
function pageSections(content: SiteContent, slug: string): { sections: Section[]; slug: string } {
  const page = slug ? content.pages?.find((p) => p.slug === slug) : undefined;
  return page ? { sections: page.sections, slug: page.slug } : { sections: content.sections, slug: "" };
}

/** The page whose sections hold the request form, so every "book" button can point there. */
function bookingSlug(content: SiteContent): string | null {
  if (content.sections.some((s) => s.kind === "enquiry")) return "";
  return content.pages?.find((p) => p.sections.some((s) => s.kind === "enquiry"))?.slug ?? null;
}

/** The link to a page. A preview or staff view can swap it for its own (a tab, `?page=`). */
export const defaultPageHref = (slug: string) => (slug ? `?page=${slug}` : "?");

/** Where the booking form posts, and what happened the last time it did. Without it the form is inactive (a preview). */
export type EnquiryProps = { action: string; token: string; state?: "sent" | "error" };

export type SiteRenderProps = {
  content: SiteContent;
  heroImage?: string;
  enquiry?: EnquiryProps;
  /** The page to show, by slug. Empty or unknown means the home page. */
  page?: string;
  /** Builds the link to a page. Defaults to `?page=slug`. */
  pageHref?: (slug: string) => string;
};

export function SiteRender({ content, heroImage, enquiry, page = "", pageHref = defaultPageHref }: SiteRenderProps) {
  const { business, theme } = content;
  const current = pageSections(content, page);
  const multi = (content.pages?.length ?? 0) > 0;
  const bookOn = bookingSlug(content);
  // Every "book" button goes to the form, on this page or on the page that holds it.
  const bookHref = bookOn === null || bookOn === current.slug ? "#book" : `${pageHref(bookOn)}#book`;
  const colour = HEX.test(theme.colour) ? theme.colour : "#1a1a1a";
  const style = { "--accent": colour, "--on-accent": onColour(colour) } as CSSProperties;
  const bookable = bookOn === null ? undefined : [...content.sections, ...(content.pages ?? []).flatMap((p) => p.sections)].find((s): s is Extract<Section, { kind: "enquiry" }> => s.kind === "enquiry");
  const photo = safeImage(heroImage);
  // A section that draws nothing (a gallery with no usable pictures) gets no nav link, so no link points at nothing.
  const nav = current.sections.flatMap((s) => (ANCHOR_IDS[s.kind] && !(s.kind === "gallery" && !s.images.some((im) => safeImage(im.src))) ? [{ id: ANCHOR_IDS[s.kind]!.id, label: navLabel(s)! }] : []));

  return (
    <div className={css.site} data-look={theme.look} style={style}>
      <header className={css.nav}>
        <b className={css.logo}>{business.name}</b>
        <nav aria-label={multi ? "Pages" : "Sections"} className={css.links}>
          {multi
            ? [{ slug: "", title: "Home" }, ...(content.pages ?? [])].map((p) => (
                <a key={p.slug} href={pageHref(p.slug)} aria-current={p.slug === current.slug ? "page" : undefined}>
                  {p.title}
                </a>
              ))
            : nav.map((n) => (
                <a key={n.id} href={`#${n.id}`}>
                  {n.label}
                </a>
              ))}
        </nav>
        {bookable && (
          <a className={css.btn} href={bookHref}>
            {bookable.cta}
          </a>
        )}
      </header>

      {current.sections.map((s, i) => {
        switch (s.kind) {
          case "hero":
            return (
              <section key={i} className={css.hero} data-variant={photo && s.variant !== "plain" ? "photo" : "plain"}>
                {photo && s.variant !== "plain" && (
                  // eslint-disable-next-line @next/next/no-img-element -- customer uploads come from private storage, not the image optimiser
                  <img className={css.heroImg} src={photo} alt="" />
                )}
                <div className={css.heroCopy}>
                  <h1>{s.headline}</h1>
                  <p>{s.intro}</p>
                  <span className={css.heroActions}>
                    <a className={css.btn} href={bookHref}>
                      {s.cta}
                    </a>
                    {business.phone && (
                      <a className={css.btnGhost} href={telHref(business.phone)}>
                        Call {business.phone}
                      </a>
                    )}
                  </span>
                </div>
              </section>
            );
          case "services":
            return (
              <section key={i} id="services" className={css.section}>
                <h2>{s.heading}</h2>
                <ul className={css.menu}>
                  {(s.teaser ? s.items.slice(0, s.teaser) : s.items).map((it, j) => (
                    <li key={j}>
                      <span className={css.menuName}>{it.name}</span>
                      {it.price && <span className={css.price}>{it.price}</span>}
                      {it.description && <span className={css.menuText}>{it.description}</span>}
                    </li>
                  ))}
                </ul>
                {s.teaser && s.items.length > s.teaser && (
                  <a className={css.link} href={pageHref("services")}>
                    See all {s.items.length}
                  </a>
                )}
              </section>
            );
          case "hours":
            return (
              <section key={i} id="hours" className={css.section}>
                <h2>{s.heading}</h2>
                <dl className={css.hours}>
                  {s.items.map((h, j) => (
                    <div key={j} data-closed={h.closed ? "" : undefined}>
                      <dt>{h.day}</dt>
                      <dd>{hoursText(h)}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            );
          case "gallery": {
            const images = s.images.flatMap((im) => {
              const src = safeImage(im.src);
              return src ? [{ src, alt: im.alt }] : [];
            });
            if (!images.length) return null;
            return (
              <section key={i} id="gallery" className={css.section}>
                <h2>{s.heading}</h2>
                <div className={css.gallery}>
                  {images.map((im, j) => (
                    // eslint-disable-next-line @next/next/no-img-element -- see the hero image
                    <img key={j} src={im.src} alt={im.alt} loading="lazy" />
                  ))}
                </div>
              </section>
            );
          }
          case "facts":
            return (
              <section key={i} className={css.facts}>
                {s.items.map((f, j) => (
                  <p key={j}>
                    <b>{f.value}</b>
                    <span>{f.label}</span>
                  </p>
                ))}
              </section>
            );
          case "area":
            return (
              <section key={i} id="find-us" className={css.section}>
                <h2>{s.heading}</h2>
                <p className={css.body}>{s.text}</p>
                {business.address && (
                  <a className={css.link} href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(business.address)}`}>
                    Get directions
                  </a>
                )}
              </section>
            );
          case "enquiry":
            return (
              <section key={i} id="book" className={`${css.section} ${css.book}`}>
                <h2>{s.heading}</h2>
                <p className={css.body}>{s.intro}</p>
                {enquiry?.state === "sent" ? (
                  <div className={css.sent} role="status">
                    <b>Request sent</b>
                    <span>Thanks. {business.name} has your request and will reply to confirm a time.</span>
                  </div>
                ) : (
                  <form className={css.form} action={enquiry?.action} method={enquiry ? "post" : undefined}>
                    {enquiry?.state === "error" && (
                      <p className={css.formError} role="alert">
                        That didn&apos;t send. Check your phone number or email and try again.
                      </p>
                    )}
                    {enquiry && <input type="hidden" name="token" value={enquiry.token} />}
                    {/* A field real visitors never see: bots fill it in, and the request is dropped. */}
                    <input className={css.trap} name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
                    <label>
                      Name
                      <input name="name" autoComplete="name" maxLength={80} required />
                    </label>
                    <label>
                      Phone or email
                      <input name="contact" autoComplete="email" maxLength={120} required />
                    </label>
                    <label>
                      {s.prompt || "Anything we should know?"}
                      <textarea name="message" rows={3} maxLength={1000} />
                    </label>
                    <button className={css.btn} type={enquiry ? "submit" : "button"}>
                      {s.cta}
                    </button>
                  </form>
                )}
                {(business.phone || business.email) && (
                  <p className={css.contact}>
                    {business.phone && <a href={telHref(business.phone)}>{business.phone}</a>}
                    {business.email && <a href={`mailto:${business.email}`}>{business.email}</a>}
                  </p>
                )}
              </section>
            );
          case "faq":
            return (
              <section key={i} id="faq" className={css.section}>
                <h2>{s.heading}</h2>
                <div className={css.faq}>
                  {s.items.map((q, j) => (
                    <details key={j}>
                      <summary>{q.question}</summary>
                      <p>{q.answer}</p>
                    </details>
                  ))}
                </div>
              </section>
            );
          case "cta":
            return (
              <section key={i} className={css.closing}>
                <h2>{s.headline}</h2>
                <a className={css.btn} href={bookHref}>
                  {s.cta}
                </a>
              </section>
            );
          case "pagehead":
            return (
              <section key={i} className={css.pagehead}>
                <h1>{s.headline}</h1>
                <p>{s.intro}</p>
              </section>
            );
          case "about":
            return (
              <section key={i} id="about" className={css.section}>
                <h2>{s.heading}</h2>
                {s.text && <p className={css.body}>{s.text}</p>}
                {s.points.length > 0 && (
                  <dl className={css.points}>
                    {s.points.map((pt, j) => (
                      <div key={j}>
                        <dt>{pt.label}</dt>
                        <dd>{pt.text}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </section>
            );
        }
      })}

      <footer className={css.foot}>
        <span>{business.name}</span>
        {business.address && <span>{business.address}</span>}
      </footer>
    </div>
  );
}
