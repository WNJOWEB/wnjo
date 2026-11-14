import { wordsOf } from "./text";

/**
 * The copied-wording check. A draft is compared with wording from sites we have been asked to avoid (a competitor's
 * site a customer pointed at, for example), and any long exact match is flagged for a person to look at. A run of this
 * many words in a row, copied exactly, is too long to be a coincidence in ordinary website wording.
 */
export const COPY_RUN_WORDS = 7;

const runs = (text: string, n: number): Set<string> => {
  const words = wordsOf(text);
  const out = new Set<string>();
  for (let i = 0; i + n <= words.length; i++) out.add(words.slice(i, i + n).join(" "));
  return out;
};

/**
 * The first run of `n` words that `draft` shares exactly with any of the `avoid` texts, or null. A run the customer
 * wrote themselves (in `ignore`) is theirs to use, so it is not counted.
 */
export function findCopiedRun(draft: string, avoid: readonly string[], ignore = "", n = COPY_RUN_WORDS): string | null {
  if (avoid.length === 0) return null;
  const theirs = runs(ignore, n);
  const copied = new Set<string>();
  for (const text of avoid) for (const run of runs(text, n)) copied.add(run);
  for (const run of runs(draft, n)) if (copied.has(run) && !theirs.has(run)) return run;
  return null;
}
