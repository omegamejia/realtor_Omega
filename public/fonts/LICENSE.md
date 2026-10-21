# Fonts bundled with this site

Both files here are served from this site rather than fetched from Google at
build time. That is deliberate: `next/font/google` downloads the font during
`next build`, so a Google Fonts outage or rate-limit becomes a failed deploy —
and the error it produces is a webpack stack trace about a file nobody here
wrote. Self-hosting removes a third party from the build entirely.

| File | Family | Licence |
|---|---|---|
| `Inter-latin.woff2` | Inter (variable, 100–900) | SIL Open Font License 1.1 |
| `Fraunces-latin.woff2` | Fraunces (variable, 400–700) | SIL Open Font License 1.1 |

The SIL Open Font License permits bundling and redistribution, including in a
commercial product, provided the fonts are not sold on their own. Full text:
<https://openfontlicense.org/>

Upstream sources: <https://github.com/rsms/inter> ·
<https://github.com/undercasetype/Fraunces>

Latin subset only, which is what the site declared when it used the Google
loader. Any other subset needs adding here deliberately.
