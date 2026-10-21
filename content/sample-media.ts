/**
 * SAMPLE MEDIA — placeholders, every one of them. None of this ships.
 *
 * Every photo and video slot on the redesigned site reads from this registry,
 * so no frame is ever empty while real photography is still being shot, and so
 * the registry doubles as the SHOT LIST: each entry's `need` says what the real
 * photograph has to show.
 *
 * Where the samples come from:
 *   - Photographs: Wikimedia Commons, linked at 1920px, each with its licence
 *     and credit recorded in sample-media.json. Real photos of the actual towns
 *     wherever Commons has them; subject photos where it does not.
 *   - Video: Mixkit free clips, linked at 720p, with posters in
 *     public/images/samples/.
 *
 * They are LINKED, not copied into the repo, so replacing them later leaves no
 * trace in git history and costs nothing to remove.
 *
 * `npm run launch:check` FAILS on any page that still renders a sample host
 * (see SAMPLE_HOSTS). That is deliberate: a stock photograph standing in for a
 * real town is fine on a preview and wrong on the live site, and
 * .claude/rules/image-sourcing.md says so. Replace a slot by changing its
 * `src` to a real file under public/images/ — or remove the entry and the page
 * falls back to the agent's own library image.
 */
import manifest from "./sample-media.json";

type Slot = {
  key: string;
  src?: string;
  original?: string;
  license?: string;
  credit?: string;
  title?: string;
  need?: string;
  missing?: boolean;
};

const SLOTS = new Map<string, Slot>(
  ((manifest as { slots?: Slot[] }).slots ?? [])
    .filter((s) => s.src && !s.missing)
    .map((s) => [s.key, s])
);

/** Anything served from these is a sample, and the launch gate blocks it. */
export const SAMPLE_HOSTS = [
  "upload.wikimedia.org",
  "thumb.wikimedia.org",
  "assets.mixkit.co",
  "/images/samples/",
];

export type Img = { src: string; alt: string };

/** A sample photo by slot key, or the fallback when the slot is not filled. */
export function sampleSrc(key: string, fallback = ""): string {
  return SLOTS.get(key)?.src ?? fallback;
}

export function sampleImg(key: string, alt: string, fallback = ""): Img {
  return { src: sampleSrc(key, fallback), alt };
}

/* Posters used to point at files under /images/samples/ that the seed never
   shipped, so every new site logged three 404s and showed a blank frame until
   the clip buffered. A poster is just a still, so it comes from the registry
   like everything else. */
export const SAMPLE_VIDEOS = {
  aerial: {
    src: "https://assets.mixkit.co/videos/48394/48394-720.mp4",
    poster: sampleSrc("home.hero.2") || sampleSrc("home.hero.3"),
    license: "Mixkit Free License",
    need: "Drone footage over your service area: rooftops and streets at golden hour, 20 to 30 seconds, no faces and no readable signs.",
  },
  hills: {
    src: "https://assets.mixkit.co/videos/8603/8603-720.mp4",
    poster: sampleSrc("home.hero.2") || sampleSrc("home.hero.3"),
    license: "Mixkit Free License",
    need: "A slow aerial of the landmark your area is known for, at golden hour, 20 to 40 seconds.",
  },
  tour: {
    src: "https://assets.mixkit.co/videos/36087/36087-720.mp4",
    poster: sampleSrc("home.hero.2") || sampleSrc("home.hero.3"),
    license: "Mixkit Free License",
    need: "A walkthrough of your own work, filmed with written permission from anyone who appears in it. 15 to 25 seconds.",
  },
} as const;
