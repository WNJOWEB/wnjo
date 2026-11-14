"use client";

import Image from "next/image";
import Link from "next/link";
import { createContext, useContext, useState, type ReactNode } from "react";
import { depositPence } from "@/lib/deposit";
import {
  CARE_PLANS,
  ONE_OFF_TIERS,
  PACKAGES,
  formatGBP,
  type CarePlan,
  type PackageId,
} from "@/lib/pricing";
import {
  carePlanCards,
  ownHostingCard,
  packagePages,
  packagePlanCards,
} from "@/lib/plans";
import { PlanSwiper } from "./PlanSwiper";

/** The hosting choice: a plan, "none" for hosting it yourself, or nothing yet. */
type Care = CarePlan | null;

type FlowState = {
  pkg: PackageId | null;
  care: Care;
  setPkg: (id: PackageId) => void;
  setCare: (id: Care) => void;
};

const FlowContext = createContext<FlowState | null>(null);

function useFlow(): FlowState {
  const value = useContext(FlowContext);
  if (!value) throw new Error("Plan pickers must sit inside <PlanFlow>.");
  return value;
}

const isPackage = (id: string): id is PackageId => id in PACKAGES;
const isCare = (id: string): id is CarePlan => id in CARE_PLANS;

/**
 * Nothing is chosen on load. Pick a package, then hosting; the bar along the
 * bottom shows the running price and only continues once both are chosen.
 */
export function PlanFlow({ children }: { children: ReactNode }) {
  const [pkg, setPkgState] = useState<PackageId | null>(null);
  const [care, setCareState] = useState<Care>(null);

  const state: FlowState = {
    pkg,
    care,
    setPkg: (id) => setPkgState(id),
    setCare: (id) => setCareState(id),
  };

  return (
    <FlowContext.Provider value={state}>
      {children}
      <FlowBar />
    </FlowContext.Provider>
  );
}

/**
 * The tier cards, laid out and chosen the same way as the plans on the pricing page: a card each, with a button that
 * picks it and turns the card dark. Each card shows one of our own sites. The selection is held by the flow.
 */
export function PackagePicker() {
  const { pkg, setPkg } = useFlow();
  return (
    <div className="pkg-selector">
      <ul className="pkg-cards" role="list" aria-label="Website tiers">
        {packagePlanCards.map((card) => {
          if (!isPackage(card.id)) return null;
          const id = card.id;
          const isSelected = pkg === id;
          return (
            <li key={id} className={`pkg-card${isSelected ? " pkg-card--selected inverse" : ""}`} aria-current={isSelected || undefined}>
              {card.shot && (
                <figure className="plan__shot">
                  <Image src={card.shot.src} alt={card.shot.alt} sizes="(min-width: 56rem) 360px, 80vw" placeholder="blur" draggable={false} />
                  <figcaption>Example of our work: {card.shot.site}</figcaption>
                </figure>
              )}
              <h3 className="pkg-card__name">{card.name}</h3>
              <p className="pkg-card__price">
                <span className="pkg-card__unit">from</span>
                <span className="pkg-card__amount">{card.price}</span>
              </p>
              <p className="pkg-card__tagline">{card.summary}</p>
              <ul className="pkg-card__points" role="list">
                {(card.includes ?? []).slice(0, 4).map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
              <button
                type="button"
                className={`btn pkg-card__cta ${isSelected ? "btn--primary pkg-card__cta--selected" : "btn--secondary"}`}
                aria-pressed={isSelected}
                onClick={() => setPkg(id)}
              >
                {isSelected ? `${card.name} selected` : `Choose ${card.name}`}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** The hosting cards, plus an option to host the site yourself. */
export function HostingPicker() {
  const { care, setCare } = useFlow();
  return (
    <PlanSwiper
      plans={[...carePlanCards, ownHostingCard]}
      label="Hosting and care plans"
      selectedId={care}
      onSelect={(id) => {
        if (isCare(id)) setCare(id);
      }}
    />
  );
}

function FlowBar() {
  const { pkg, care } = useFlow();
  if (!pkg) return null;

  const pkgInfo = ONE_OFF_TIERS[pkg];
  const total = pkgInfo.from;
  const deposit = depositPence(total * 100) / 100;
  const href = care
    ? `/build/project?pages=${encodeURIComponent(packagePages[pkg])}&care=${care}`
    : null;

  let hostingText: string;
  if (care === "none") hostingText = "hosting yourself";
  else if (care)
    hostingText = `${CARE_PLANS[care].label} ${formatGBP(CARE_PLANS[care].monthly)}/month`;
  else hostingText = "choose hosting to continue";

  return (
    <section className="plan-bar" aria-label="Your choice">
      <div className="plan-bar__inner">
        <p className="plan-bar__summary">
          <strong>{pkgInfo.name}</strong> from {formatGBP(total)} +{" "}
          {hostingText}
          <span className="plan-bar__deposit">
            Deposit of 50% when you approve, from {formatGBP(deposit)}.
          </span>
        </p>
        {href ? (
          <Link href={href} className="btn btn--primary">
            Continue
          </Link>
        ) : (
          <span className="btn btn--secondary" aria-disabled="true">
            Continue
          </span>
        )}
      </div>
    </section>
  );
}
