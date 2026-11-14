import { describe, expect, it } from "vitest";
import { ONE_OFF_TIERS } from "@/lib/pricing";
import { applyPlan, PLAN_LEVELS, planForPages } from "./plans";
import { SECTOR_PRESETS } from "./presets";

describe("plan levels", () => {
  it("picks the plan whose page limit covers the pages", () => {
    expect(planForPages(1)).toBe("essential");
    expect(planForPages(ONE_OFF_TIERS.essential.pageLimit)).toBe("essential");
    expect(planForPages(ONE_OFF_TIERS.essential.pageLimit + 1)).toBe("professional");
    expect(planForPages(ONE_OFF_TIERS.professional.pageLimit)).toBe("professional");
    expect(planForPages(ONE_OFF_TIERS.premium.pageLimit)).toBe("premium");
    expect(planForPages(100)).toBe("premium");
  });

  it("returns the preset untouched when there is no plan", () => {
    for (const preset of Object.values(SECTOR_PRESETS)) expect(applyPlan(preset)).toBe(preset);
  });

  it("leaves out the facts strip and the FAQ at Essential, and keeps them above it", () => {
    const barber = SECTOR_PRESETS.barber;
    const essential = applyPlan(barber, "essential").sections.map((s) => s.kind);
    expect(essential).not.toContain("facts");
    expect(essential).not.toContain("faq");
    for (const plan of ["professional", "premium"] as const) {
      expect(applyPlan(barber, plan).sections).toEqual(barber.sections);
    }
  });

  it("keeps the preset's own order", () => {
    const electrician = SECTOR_PRESETS.electrician;
    const order = electrician.sections.map((s) => s.kind);
    const kept = applyPlan(electrician, "essential").sections.map((s) => s.kind);
    expect(kept).toEqual(order.filter((k) => kept.includes(k)));
  });

  it("never drops a section a sector requires, at any plan or sector", () => {
    for (const preset of Object.values(SECTOR_PRESETS)) {
      for (const plan of PLAN_LEVELS) {
        const kinds = applyPlan(preset, plan).sections.map((s) => s.kind);
        for (const s of preset.sections.filter((x) => x.required)) expect(kinds, `${preset.id} at ${plan}`).toContain(s.kind);
      }
    }
  });
});
