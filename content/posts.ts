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
  excerpt: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  sections: PostSection[];
  related: PostLink[];
};

export const posts: Post[] = [
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
          "<p><strong>[SCAFFOLD: replace this post.]</strong> Open with the reader's problem in [City]. Name the company and link it home the first time: <a href=\"/\">[Business Name]</a>. Put the primary keyword in the first 100 words.</p><p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.</p>",
      },
      {
        heading: "[Section 2 heading  the useful, specific advice]",
        html:
          "<p>Give real, specific advice for [City]. Any local number is a <em>[PLACEHOLDER: local stat to verify]</em>, never invented. Link to the matching money page with a descriptive anchor, e.g. <a href=\"/areas/neighborhood-one/selling-your-home\">selling your home in [Neighborhood One]</a>.</p><p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>",
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

export function getPost(slug: string): Post | undefined {
  return posts.find((p) => p.slug === slug);
}
