/** Small, pure helpers for judging the model's wording. */

/** The words in a text, lower-cased, with punctuation dropped. Apostrophes stay, so "don't" is one word. */
export function wordsOf(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s'-]/gu, " ")
    .split(/\s+/)
    .filter((w) => /[\p{L}\p{N}]/u.test(w));
}

export const wordCount = (text: string): number => wordsOf(text).length;

/** The sentences in a text, split after a full stop, question mark or exclamation mark followed by a space. */
export function sentencesOf(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Cuts text to at most `maxWords` words, at the end of a sentence if one fits, otherwise at a word. */
export function cutWords(text: string, maxWords: number): string {
  const t = text.trim();
  if (wordCount(t) <= maxWords) return t;
  let out = "";
  for (const sentence of sentencesOf(t)) {
    const next = out ? `${out} ${sentence}` : sentence;
    if (wordCount(next) > maxWords) break;
    out = next;
  }
  if (out) return out;
  // No whole sentence fits: take whole words, counted the same way the check counts them.
  const tokens = t.split(/\s+/);
  let k = 0;
  while (k < tokens.length && wordCount(tokens.slice(0, k + 1).join(" ")) <= maxWords) k++;
  return tokens.slice(0, k).join(" ").replace(/[,;:\s]+$/, "");
}
