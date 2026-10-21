import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { posts, getPost } from "@/content/posts";
import { JsonLd } from "@/components/JsonLd";
import { RelatedLinks } from "@/components/RelatedLinks";
import { blogPostSchema } from "@/lib/schema";

export function generateStaticParams() {
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  return {
    title: post?.metaTitle ?? post?.title ?? "Blog",
    description: post?.metaDescription ?? post?.excerpt,
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  // RelatedLinks auto-adds Home + a Contact CTA; drop them from the list to avoid dupes.
  const related = post.related.filter(
    (l) => l.href !== "/" && l.href !== "/contact"
  );

  return (
    <>
      <JsonLd data={blogPostSchema(post)} />

      <article>
        <div className="container-page py-16">
          <div className="mx-auto max-w-3xl">
            <Link
              href="/blog"
              className="text-sm font-medium text-[color:var(--fg-subtle)] hover:text-[color:var(--brand)]"
            >
              ← All posts
            </Link>
            <p className="mt-6 text-xs font-medium uppercase tracking-wider text-[color:var(--fg-subtle)]">
              {post.date} · {post.readMinutes} min read · {post.city}
            </p>
            <h1 className="mt-2 text-4xl font-bold leading-tight tracking-tight text-[color:var(--fg)]">
              {post.title}
            </h1>

            <div className="mt-8 flex aspect-[16/9] items-center justify-center rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] text-[color:var(--fg-subtle)]">
              <span className="text-sm">Cover image · set per post</span>
            </div>

            {post.sections.map((s, i) => (
              <section key={i} className="mt-10">
                <h2 className="mb-3 text-2xl font-bold tracking-tight text-[color:var(--fg)]">
                  {s.heading}
                </h2>
                <div
                  className="rich"
                  dangerouslySetInnerHTML={{ __html: s.html }}
                />
              </section>
            ))}
          </div>
        </div>
      </article>

      {/* HARD RULE interlinking: home + money pages + contact CTA */}
      <RelatedLinks links={related} heading="Related pages" />
    </>
  );
}
