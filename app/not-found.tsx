import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-page flex flex-col items-center justify-center py-32 text-center">
      <p className="text-6xl">🏡</p>
      <h1 className="mt-4 text-2xl font-bold text-[color:var(--fg)]">Page not found</h1>
      <p className="mt-2 text-[color:var(--fg-muted)]">
        That page moved or never existed. Let&apos;s get you home.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex items-center rounded-md bg-[var(--brand)] px-6 py-3 text-sm font-semibold text-white hover:opacity-90"
      >
        Back home
      </Link>
    </div>
  );
}
