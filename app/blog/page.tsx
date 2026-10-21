import type { Metadata } from "next";
import Link from "next/link";
import { posts, postImage, postImageAlt } from "@/content/posts";
import { Section } from "@/components/ui";
import { PageHero } from "@/components/PageHero";
import { JsonLd } from "@/components/JsonLd";
import { pageSchema } from "@/lib/schema";

export const metadata: Metadata = { title: "Blog" };

export default function BlogPage() {
  return (
    <>
      <JsonLd
        data={pageSchema({
          path: "/blog",
          title: "Blog",
          description: "Notes on the local market.",
          type: "CollectionPage",
          crumbs: [
            { name: "Home", path: "/" },
            { name: "Blog", path: "/blog" },
          ],
        })}
      />
      <PageHero
        eyebrow="Blog"
        title="Notes on the local market"
      />
    <Section>
      <div className="divide-y divide-[color:var(--border)] border-y border-[color:var(--border)]">
        {posts.map((p) => (
          <Link
            key={p.slug}
            href={`/blog/${p.slug}`}
            className="grid grid-cols-1 gap-5 py-8 transition-colors hover:bg-[color:var(--surface-muted)] sm:grid-cols-[minmax(0,14rem)_1fr] sm:gap-6 sm:px-2"
          >
            {/* Thumbnail. Real photo when the post has one, generated title card
                when it does not, so the index never has a row that looks unfinished. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={postImage(p)}
              alt={postImageAlt(p)}
              width={1200}
              height={630}
              className="aspect-[16/9] w-full rounded-lg border border-[color:var(--border)] object-cover"
            />
            <div className="flex flex-col gap-1">
              <p className="text-xs font-medium uppercase tracking-wider text-[color:var(--fg-subtle)]">
                {p.date} · {p.readMinutes} min read
              </p>
              <h2 className="text-xl font-semibold text-[color:var(--fg)]">{p.title}</h2>
              <p className="mt-1 max-w-2xl text-[color:var(--fg-muted)]">{p.excerpt}</p>
              <span className="mt-2 text-sm font-semibold text-[color:var(--brand)]">
                Read more →
              </span>
            </div>
          </Link>
        ))}
      </div>
    </Section>
    </>
  );
}
