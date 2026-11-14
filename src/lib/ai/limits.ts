/**
 * The two limits on what the AI may do for one website. Quality is judged by checks, not by money, so the money limit
 * is only a safety net against a runaway loop, and a draft that keeps failing the checks goes to a person.
 */

/** Tries at one piece of wording: the first, then two more with the reasons it failed. After that a person sees it. */
export const MAX_ROUNDS = 3;

/** The most the AI may spend on one website, in pence: £10. Far more than a site costs; it only stops a loop. */
export const DEFAULT_MAX_PENCE_PER_BRIEF = 1000;
