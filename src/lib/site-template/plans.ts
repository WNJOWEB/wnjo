/**
 * Which sections a template site has at each plan level. The plan sets the structure; the sector (see presets.ts)
 * sets the content. A build with no plan keeps every section its sector has, so nothing changes for a site whose plan
 * isn't known. See docs/PLAN_TEMPLATES_BY_TIER.md.
 */
import { ONE_OFF_TIERS } from "@/lib/pricing";
import type { SectorPreset } from "./presets";
import { SECTION_KINDS, type SectionKind } from "./schema";

export const PLAN_LEVELS = ["essential", "professional", "premium"] as const;
export type PlanLevel = (typeof PLAN_LEVELS)[number];

/** The section kinds each plan includes. A kind a plan lacks is left out of the site and out of the writer's brief. */
export const PLAN_SECTIONS: Record<PlanLevel, readonly SectionKind[]> = {
  essential: ["hero", "services", "hours", "gallery", "area", "enquiry", "cta"],
  professional: SECTION_KINDS,
  premium: SECTION_KINDS,
};

/** The plan whose page limit covers a number of pages: up to 5 is Essential, up to 10 Professional, more is Premium. */
export function planForPages(pages: number): PlanLevel {
  return PLAN_LEVELS.find((id) => ONE_OFF_TIERS[id].pageLimit >= pages) ?? "premium";
}

/** A sector's preset as it applies at a plan level. With no plan the preset is returned as it is. */
export function applyPlan(preset: SectorPreset, plan?: PlanLevel): SectorPreset {
  if (!plan) return preset;
  const kinds = PLAN_SECTIONS[plan];
  return { ...preset, sections: preset.sections.filter((s) => kinds.includes(s.kind)) };
}
