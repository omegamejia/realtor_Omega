import { site } from "@/site.config";
import { ButtonLink } from "@/components/ui";

/**
 * The "ask about THIS house" block, pegged directly under the listing map.
 *
 * WHY IT SITS HERE AND NOT ONLY AT THE BOTTOM OF THE PAGE. Someone reading a
 * listing decides they are interested while they are looking at where it is.
 * Making them scroll back past the description to find a way to get in touch
 * loses the ones who were only mildly interested, which is most of them.
 *
 * WHY BOTH A PHONE NUMBER AND A FORM. They are different people. One wants to
 * dial right now and will not fill anything in; the other is not ready to speak
 * to a salesperson and will type. Offering only one of the two silently discards
 * the other, and neither of them tells you they left.
 *
 * WHY THE LINK CARRIES THE SLUG. `/contact?listing=<slug>` means the enquiry
 * arrives attached to a property instead of arriving as "someone was interested
 * in something". An untagged lead makes the agent open with a question they
 * should already know the answer to.
 */
export function ListingContactCard({
  slug,
  address,
}: {
  slug: string;
  address: string;
}) {
  const phone = site.agent.phone;
  // Read this defensively. `site.config.ts` belongs to the agent and
  // `update:engine` never touches it, so a site that installed before this block
  // existed has no `listings` key at all. Requiring it would break their build on
  // a file the updater is not allowed to fix. "both" is the default anyway.
  const mode =
    (site as { listings?: { contactCard?: "both" | "phone" | "form" } }).listings
      ?.contactCard ?? "both";
  const wantsPhone = mode !== "form" && Boolean(phone);
  const wantsForm = mode !== "phone";

  if (!wantsPhone && !wantsForm) return null;

  return (
    <div className="rounded-xl border border-[color:var(--border)] p-5">
      <p className="text-sm font-semibold text-[color:var(--fg)]">
        Ask about this home
      </p>
      <p className="mt-1 text-sm text-[color:var(--fg-muted)]">
        Questions about {address}? We will answer them straight.
      </p>

      <div className="mt-4 flex flex-col gap-2">
        {wantsPhone ? (
          <ButtonLink href={`tel:${phone.replace(/[^\d+]/g, "")}`}>
            Call {phone}
          </ButtonLink>
        ) : null}
        {wantsForm ? (
          <ButtonLink
            href={`/contact?listing=${encodeURIComponent(slug)}`}
            variant="outline"
          >
            Send a message instead
          </ButtonLink>
        ) : null}
      </div>
    </div>
  );
}
