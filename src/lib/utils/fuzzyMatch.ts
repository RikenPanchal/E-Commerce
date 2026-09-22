// Small, dependency-free typo tolerance for search suggestions - no need
// for an external search platform (Elasticsearch, Algolia, Atlas Search)
// at this catalog's scale. Plain substring matching (already what the
// product search filter does) already handles partial typing ("dre"
// finding "dress"); this only adds a fallback for genuine misspellings
// ("drses"), by scoring edit distance against each word of the target text.

/** Classic Levenshtein edit distance between two strings (case-sensitive -
 *  callers normalize case first). */
function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const previousRow = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i++) {
    let previousDiagonal = previousRow[0];
    previousRow[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const temp = previousRow[j];
      previousRow[j] =
        a[i - 1] === b[j - 1]
          ? previousDiagonal
          : 1 + Math.min(previousDiagonal, previousRow[j], previousRow[j - 1]);
      previousDiagonal = temp;
    }
  }
  return previousRow[b.length];
}

/** True if `query` is a close-enough misspelling of any whitespace-
 *  separated word in `text` - tolerance scales with word length (roughly
 *  one allowed edit per three characters, capped at 2) so short words
 *  don't match everything and long words still tolerate a couple of typos.
 *  Skipped for very short queries, where "close enough" stops being
 *  meaningful (almost everything is 1-2 edits from a 2-3 letter string). */
export function isFuzzyMatch(query: string, text: string): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  if (normalizedQuery.length < 3) return false;

  const words = text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  return words.some((word) => {
    if (Math.abs(word.length - normalizedQuery.length) > 2) return false;
    const tolerance = Math.min(2, Math.max(1, Math.floor(word.length / 3)));
    return levenshteinDistance(normalizedQuery, word) <= tolerance;
  });
}
