/** Renders one JSON-LD `<script>` block. `<` is escaped to `<` so a
 *  real product name/description containing something like `</script>`
 *  (unlikely, but real free-text admin input) can never break out of the
 *  script tag - the same defence React itself can't provide here since
 *  `dangerouslySetInnerHTML` is unavoidable for inline JSON-LD. */
export function JsonLd({ data }: { data: object }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
