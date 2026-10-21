/**
 * Blog posts. Blogs exist to SUPPORT the money pages , capture keywords and
 * funnel readers to action.
 *
 * HARD RULES enforced in every post (the content skill applies them):
 *  - The company is named, and its FIRST mention links to the home page ("/").
 *  - The location (city/neighborhood) is named in the title, intro, and body.
 *  - In-content links point to the relevant money pages (e.g. selling in [City]).
 *  - A closing call-to-action links to /contact.
 *  - Verified facts only; any local stat is written as [PLACEHOLDER: ...].
 *
 * SEED STATE: one EXAMPLE post below, written as a scaffold (guidance + lorem)
 * so you can see the shape. Replace it and add real posts. The launch gate
 * blocks any post still containing scaffold/placeholder text.
 */

export type PostSection = { heading: string; html: string };
export type PostLink = { label: string; href: string };
export type Post = {
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  date: string;
  city: string;
  readMinutes: number;
  /** Featured image. Google requires an image on Article/BlogPosting for the
   *  rich result to appear at all.
   *
   *  Optional, because most posts will not have a photograph of their own and a
   *  post is not worth blocking over one. Leave it empty and `postImage()` falls
   *  back to a generated title card, so the post still has a real image rather
   *  than nothing. Set it and yours wins. */
  imageUrl?: string;
  imageAlt?: string;
  excerpt: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  sections: PostSection[];
  related: PostLink[];
};

/**
 * Posts in the order they were written into this file. Nothing renders from
 * this directly. Use the sorted `posts` export below.
 */
const allPosts: Post[] = [
  {
    slug: "example-blog-post",
    title: "[EXAMPLE] How to [Do Something] in [City]",
    metaTitle: "[EXAMPLE meta title, <60 chars, primary keyword near front]",
    metaDescription:
      "[EXAMPLE meta description, 150-160 chars, primary keyword in the first 120.]",
    date: "2026-01-01",
    city: "[City]",
    readMinutes: 5,
    excerpt:
      "[EXAMPLE excerpt, 1-2 sentences with the primary keyword. Replace this whole post.]",
    primaryKeyword: "[primary keyword, e.g. sell your home in city]",
    secondaryKeywords: ["[secondary 1]", "[secondary 2]", "[secondary 3]"],
    sections: [
      {
        heading: "[Section 1 heading : hook plus name the problem]",
        html:
          "<p><strong>[SCAFFOLD: replace this post.]</strong> Open with the reader's problem in [City]. Name the company and link it home the first time: <a href=\"/\">[Business Name]</a>. Put the primary keyword in the first 100 words.</p><p>This post has not been written yet. The real article goes here , your take, your market, your voice.</p>",
      },
      {
        heading: "[Section 2 heading  the useful, specific advice]",
        html:
          "<p>Give real, specific advice for [City]. Any local number is a <em>[PLACEHOLDER: local stat to verify]</em>, never invented. Link to the matching money page with a descriptive anchor, e.g. <a href=\"/areas/neighborhood-one/selling-your-home\">selling your home in [Neighborhood One]</a>.</p><p>This section has not been written yet , the real advice for this market goes here.</p>",
      },
      {
        heading: "[Section 3 heading : call to action]",
        html:
          "<p>Close by telling the reader the next step and link the contact page: <a href=\"/contact\">get in touch with [Business Name]</a>.</p>",
      },
    ],
    related: [
      { label: "[Business Name]", href: "/" },
      { label: "Selling Your Home in [Neighborhood One]", href: "/areas/neighborhood-one/selling-your-home" },
      { label: "Contact", href: "/contact" },
    ],
  },
];

/**
 * The image a post should use, and the one thing every caller must go through.
 *
 * A real photograph always wins. When there is not one, this returns the
 * generated title card rather than an empty string, because a post with no
 * image is ineligible for Google's article rich result and looks unfinished on
 * the index. An agent who adds their own photo later simply sets `imageUrl` and
 * it takes over. Nothing is ever overwritten.
 */
export function postImage(post: Pick<Post, "slug" | "imageUrl">): string {
  return post.imageUrl?.trim() || `/api/blog-card/${post.slug}`;
}

/** Alt text to match. A generated card is described as what it is, never as a
 *  photograph of a place it has not seen. */
export function postImageAlt(post: Pick<Post, "title" | "imageAlt">): string {
  return post.imageAlt?.trim() || `Title card for the article: ${post.title}`;
}

/**
 * Every post, NEWEST FIRST. This is the only export anything should render from.
 *
 * Sorting happens here, once, at the source, rather than in each page. Before
 * this, the blog index, the home page and the knowledge feed all rendered raw
 * array order, which meant a new post appended to the bottom of this file
 * appeared LAST on the site and the home page's "latest" block showed the
 * oldest posts. Nothing warned about it, because rendering in array order is
 * not an error, it is just wrong.
 *
 * Sorting in one place rather than in each consumer is deliberate. A component
 * that quietly reorders its input is a trap: the caller sorts, the component
 * re-sorts, and the page comes out backwards under a heading promising
 * otherwise. One sorted source, and every consumer inherits it.
 *
 * Dates are ISO (YYYY-MM-DD), so string comparison is chronological. Posts with
 * the same date keep the order they were written in this file.
 */
export const posts: Post[] = [...allPosts].sort((a, b) =>
  a.date < b.date ? 1 : a.date > b.date ? -1 : 0
);

export function getPost(slug: string): Post | undefined {
  return posts.find((p) => p.slug === slug);
}
