/**
 * Is this value missing, or still one of the seed's [BRACKETED] placeholders?
 *
 * The seed ships with stand-ins like "[Neighborhood One]", "[DRE #00000000]" and
 * "[123 Example St]", and the launch gate blocks a site from going live while any
 * remain. But the AI phone assistant and the chat can be connected BEFORE launch
 * (setup's "listings first" starting point), and they read the same config and
 * content. Without this check they tell a caller the agent serves
 * "[Neighborhood One]", or that there are three homes for sale when one of them
 * is the example.
 *
 * So anything still bracketed is left out of what an assistant is given. A gap
 * the assistant can admit to beats a placeholder read aloud as a fact.
 *
 * A bracket has to contain a letter to count, so coordinates such as
 * [37.90, -122.06] are never mistaken for one.
 */
const PLACEHOLDER = /\[[^\]\n]*[A-Za-z][^\]\n]*\]/;

export function isUnfilled(value: string | undefined | null): boolean {
  return !value || PLACEHOLDER.test(value);
}

/** The real parts only, joined. */
export function filled(parts: (string | undefined | null)[], separator = " "): string {
  return parts.filter((p): p is string => !isUnfilled(p)).join(separator);
}
