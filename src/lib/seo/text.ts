/** Trims a long real description down to a clean meta-description length
 *  (never mid-word) instead of letting the browser/search engine hard-cut
 *  it mid-sentence. Collapses newlines/extra whitespace first, since
 *  product descriptions are stored as free-form multi-line text. */
export function truncateForMeta(text: string, maxLength = 160): string {
  const collapsed = text.replace(/\s+/g, " ").trim();
  if (collapsed.length <= maxLength) {
    return collapsed;
  }
  const cut = collapsed.slice(0, maxLength - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 40 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/** De-duplicated, trimmed, non-empty keyword list - used to build a
 *  product/category's meta keywords and JSON-LD from real fields
 *  (name/category/brand/material/tags) rather than inventing any. */
export function buildKeywords(parts: (string | undefined | null)[]): string[] {
  const seen = new Set<string>();
  const keywords: string[] = [];
  for (const part of parts) {
    const value = part?.trim();
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    keywords.push(value);
  }
  return keywords;
}
