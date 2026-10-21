/**
 * Shown at the top of any page still rendering its SCAFFOLD (no real content yet).
 * Makes the un-written state unmistakable to the agent — and the launch gate
 * blocks the page anyway.
 */
export function ScaffoldBanner() {
  return (
    <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-5 py-4">
      <p className="text-sm font-semibold text-amber-900">
        ⚠ This page is a content scaffold. Not published.
      </p>
      <p className="mt-1 text-sm text-amber-800">
        Each section below shows what to write, the target length, and lorem to
        show the shape. Tell Claude to write this page and it will fill each
        section per these instructions. The launch check blocks this page until
        real content replaces the scaffold.
      </p>
    </div>
  );
}
