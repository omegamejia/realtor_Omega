/**
 * Renders a JSON-LD graph into a <script type="application/ld+json"> tag.
 * The only place structured data touches the DOM.
 */
export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      // Schema is generated server-side from config. Escape `<` so a value
      // containing "</script>" can never break out of the tag (defense in depth
      // for any future source that feeds external text into schema).
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
