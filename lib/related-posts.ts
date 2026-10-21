import { posts, type Post } from "@/content/posts";

/**
 * The posts that belong on a page, best match first, as links.
 *
 * Every blog post has to be linked from somewhere other than the blog index,
 * or Google and the reader only ever reach it by scrolling an archive. The seed
 * used to link posts outward (5-8 links each) and nothing linked back in: on a
 * real site twelve imported articles had one inbound link or none. So the
 * area, situation and post pages each offer their best-matching posts here, and
 * the launch gate fails any post linked from fewer than two pages.
 *
 * A post scores for the place it is filed under (the page's own place most, the
 * parent city next, nearby places a little), for naming that place, and for
 * topic words it shares with the page. Ties are broken by hashing `page`, not
 * by post order: with the order tie-break, 45 posts about one city scored alike
 * on every page of that city and the same few won everywhere.
 */
export function relatedPosts({
  places = [],
  keywords = [],
  limit = 3,
  page,
  exclude,
}: {
  /** The page's own place first, then its parent city, then nearby places. */
  places?: (string | undefined)[];
  /** Topic words, e.g. the situation a page is about. */
  keywords?: string[];
  limit?: number;
  /** The page asking, e.g. its path. Spreads equally scored posts across pages. */
  page: string;
  /** A post never recommends itself. */
  exclude?: string;
}): { label: string; href: string }[] {
  const norm = (s: string) => s.toLowerCase().trim();
  const placeList = places.filter((p): p is string => Boolean(p)).map(norm);
  const words = keywords.filter((k) => k && k.length > 3).map(norm);
  const real = (p: Post) => !p.slug.startsWith("[") && !/^\[/.test(p.title);

  return posts
    .filter((p) => p.slug !== exclude && real(p))
    .map((p) => {
      const text = norm(`${p.title} ${p.excerpt} ${p.primaryKeyword} ${p.secondaryKeywords.join(" ")}`);
      let score = 0;
      placeList.forEach((place, rank) => {
        const weight = rank === 0 ? 6 : rank === 1 ? 3 : 1;
        if (norm(p.city) === place) score += weight;
        else if (text.includes(place)) score += weight / 2;
      });
      for (const w of words) if (text.includes(w)) score += 2;
      return { p, score, tie: spread(page, p.slug) };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.tie - b.tie)
    .slice(0, limit)
    .map(({ p }) => ({ label: p.title, href: `/blog/${p.slug}` }));
}

/** A stable pseudo-random rank for a post on a given page (FNV-1a). */
function spread(page: string, slug: string): number {
  let h = 2166136261;
  for (const c of `${page}|${slug}`) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}
