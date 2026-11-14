/** Small, pure helpers for judging the model's wording. */

/** The words in a text, lower-cased, with punctuation dropped. Apostrophes stay, so "don't" is one word. */
export function wordsOf(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s']/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
}
