import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteRender } from "@/components/site-template/SiteRender";
import { BRIEF_BUCKET } from "@/lib/brief-store";
import { serviceClient } from "@/lib/quote-store";
import { previewExpired } from "@/lib/preview-access";
import { photoPath, photoRefs, resolvePhotos } from "@/lib/site-template/photos";
import type { SiteContent } from "@/lib/site-template/schema";
import type { WebsiteBrief } from "@/lib/website-brief";

export const dynamic = "force-dynamic";
// A private preview: kept out of search, and never sends the address on to other sites.
export const metadata: Metadata = { title: "Website preview", robots: { index: false, follow: false }, referrer: "no-referrer" };

const TOKEN = /^[A-Za-z0-9_-]{20,64}$/;

/**
 * A private preview of a template website, laid out by our own renderer from checked content. Reached only through
 * its long random address, which staff keep until a person releases the build to the customer. A withdrawn build
 * shows nothing. The booking form is inactive here: a preview must never send anything.
 */
export default async function SitePreviewPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ sent?: string; page?: string }> }) {
  const { token } = await params;
  const { sent, page } = await searchParams;
  if (!TOKEN.test(token)) notFound();
  const db = serviceClient();
  if (!db) notFound();
  const { data } = await db.from("website_site_builds").select("status, released_at, checks_ok, content, website_briefs(brief)").eq("access_token", token).maybeSingle();
  const row = data as { status: "draft" | "released" | "withdrawn"; released_at: string | null; checks_ok: boolean; content: SiteContent; website_briefs: { brief: Pick<WebsiteBrief, "files"> } | null } | null;
  if (!row || row.status === "withdrawn" || !Array.isArray(row.content?.sections)) notFound();
  if (previewExpired(row.released_at)) notFound();

  // Photos are private files. Each one gets a short-lived link, and only if it is one of this website's own uploads.
  const own = new Set((row.website_briefs?.brief?.files ?? []).map((f) => f.path));
  const urls = new Map<string, string>();
  await Promise.all(
    photoRefs(row.content)
      .filter((ref) => own.has(photoPath(ref)))
      .slice(0, 12)
      .map(async (ref) => {
        const { data: signed } = await db.storage.from(BRIEF_BUCKET).createSignedUrl(photoPath(ref), 3600);
        if (signed?.signedUrl) urls.set(ref, signed.signedUrl);
      }),
  );
  const { content, heroImage } = resolvePhotos(row.content, urls);

  return (
    <div className="sitepv preview-mark">
      <p className="sitepv__banner">
        {row.status === "draft" ? "Draft preview. Not shared with the customer yet." : "Private preview of your website."}
        {!row.checks_ok && " Some automatic checks failed, so look closely."}
      </p>
      <SiteRender
        content={content}
        heroImage={heroImage}
        page={typeof page === "string" ? page : ""}
        // Only a build a person has released takes booking requests. A draft is a private preview and sends nothing.
        enquiry={row.status === "released" ? { action: "/api/site-enquiry", token, state: sent === "1" ? "sent" : sent === "0" ? "error" : undefined } : undefined}
      />
    </div>
  );
}
