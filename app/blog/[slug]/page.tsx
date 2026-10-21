import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { posts, getPost, postImage, postImageAlt } from "@/content/posts";
import { JsonLd } from "@/components/JsonLd";
import { RelatedLinks } from "@/components/RelatedLinks";
import { relatedPosts } from "@/lib/related-posts";
import { PROCESS_STEPS } from "@/components/editorial";
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
      {/* Resolve the image before it reaches schema, so a post without its own
          photograph still carries one and stays eligible for the article rich
          result. */}
      <JsonLd data={blogPostSchema({ ...post, imageUrl: postImage(post) })} />

      <article>
        <div className="container-page py-16">
          <div className="mx-auto max-w-3xl">
            <Link
              href="/blog"
              className="text-sm font-medium text-[color:var(--fg-subtle)] hover:text-[color:var(--brand-ink)]"
            >
              ← All posts
            </Link>
            <p className="mt-6 text-xs font-medium uppercase tracking-wider text-[color:var(--fg-subtle)]">
              {post.date} · {post.readMinutes} min read · {post.city}
            </p>
            <h1 className="mt-2 text-4xl font-bold leading-tight tracking-tight text-[color:var(--fg)]">
              {post.title}
            </h1>

            {/* Real photograph when the post has one, generated title card when
                it does not. Never the grey "set per post" box that used to ship
                on every article. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={postImage(post)}
              alt={postImageAlt(post)}
              width={1200}
              height={630}
              className="mt-8 aspect-[16/9] w-full rounded-xl border border-[color:var(--border)] object-cover"
            />

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
      {/* Every post ends by pointing at the method. A reader who finished an
          article is warmer than one who landed on a service page. Links, not
          prose: a shared paragraph repeated across every post is duplicate
          content and the gate correctly treats it as such. */}
      <section className="surface-paper">
        <div className="mx-auto max-w-3xl px-5 py-12">
          <p className="ed-eyebrow mb-3">The method</p>
          <h2 className="display-h1 text-2xl sm:text-3xl">
            Where this fits in how we sell
          </h2>
          <ul className="mt-6 flex list-none flex-wrap gap-x-6 gap-y-2 p-0">
            {PROCESS_STEPS.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/process#${s.id}`}
                  className="inline-flex min-h-[44px] items-center font-semibold text-[color:var(--brand-ink)] hover:underline"
                >
                  {s.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <RelatedLinks
        links={[
          ...related,
          ...relatedPosts({
            places: [post.city],
            keywords: [post.primaryKeyword],
            page: `/blog/${post.slug}`,
            exclude: post.slug,
          }).filter((l) => !related.some((r) => r.href === l.href)),
        ]}
        heading="Related pages"
      />
    </>
  );
}
