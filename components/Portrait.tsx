import { site } from "@/site.config";

/**
 * A person's photo, or a designed stand-in when there is not one yet.
 *
 * The seed used to render an empty grey box with a camera emoji and the word
 * "Photo". That is the one slot where licensed stock is NOT the answer: a
 * headshot is a claim about what a named person looks like, so a stranger's
 * face under somebody's name and licence number is worse than no photo at all
 * (see public/images/STAND-INS.md and .claude/rules/image-sourcing.md).
 *
 * So the gap gets a designed monogram in the brand colours instead. It reads as
 * finished rather than broken, it asserts nothing, and the missing photo is
 * tracked as an open item rather than hidden.
 */
export function Portrait({
  name,
  photoUrl,
  rounded = "rounded-2xl",
  className = "",
}: {
  name: string;
  photoUrl?: string;
  rounded?: string;
  className?: string;
}) {
  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl}
        alt={name}
        className={`h-full w-full ${rounded} object-cover ${className}`}
      />
    );
  }

  const initials = name
    .replace(/^(Dr|Dr\.|Mr|Mrs|Ms|Miss)\s+/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div
      aria-hidden
      className={`flex h-full w-full items-center justify-center ${rounded} ${className}`}
      style={{
        background: `linear-gradient(140deg, ${site.brand.primaryColor} 0%, ${site.brand.accentColor} 190%)`,
      }}
    >
      <span
        className="display-h1 select-none text-white/90"
        style={{ fontSize: "clamp(2.25rem, 18cqw, 6rem)", letterSpacing: "0.02em" }}
      >
        {initials}
      </span>
    </div>
  );
}
