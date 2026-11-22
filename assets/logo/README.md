# Logo artwork

The Smashy logo: "SMASHY" in heavy serif capitals with a flame fill, a white band, a dark outline
and a soft shadow, with a diagonal cross through the S.

| File | What it is | Used by |
| --- | --- | --- |
| `wordmark.svg` | The full wordmark (source drawing) | Same drawing as `src/components/Logo.tsx` |
| `mark.svg` | Just the S (source drawing) | Same drawing as `Logo` with `markOnly` |
| `tile.svg` | App icon: the S on a dark red tile (source drawing) | |
| `tile-maskable.svg` | App icon with a smaller S, for Android's round crops (source drawing) | |
| `wordmark.png` | `wordmark.svg` at 546 × 144, see-through background | Link previews (`src/lib/ogCard.tsx`) |
| `tile.png` | `tile.svg` at 512 × 512 | Browser tab, Apple and home-screen icons (`src/lib/iconArt.tsx`) |
| `tile-maskable.png` | `tile-maskable.svg` at 512 × 512 | Maskable home-screen icons |
| `mark.png` | `mark.svg` trimmed to the S and centred, 512 × 512, see-through background | Browser tab icon (`src/app/icon.tsx`) |
| `wordmark-large.png` | `wordmark.svg` at 2118 × 558, see-through background | Posters, social posts (round 649) |
| `wordmark-gg.svg` | Alternate logo "SMASHY.gg" for promotion off the site (source drawing) | Not used by the site |
| `wordmark-gg.png` | `wordmark-gg.svg` at 2820 × 644, see-through background | Posters, social posts, streams |
| `wordmark-gg-dark.png`, `wordmark-gg-light.png` | The same on Smashy's night and day backgrounds | Same |

The PNGs exist because the image drawer behind icons and link previews (next/og) can't draw the
flame texture, which is made with SVG filters. To remake one after changing a drawing, open the
SVG in Chrome at the size above and take a screenshot with a transparent background, e.g.

    chrome --headless --screenshot=tile.png --window-size=512,512 --default-background-color=00000000 page-showing-tile.svg.html

If the drawing itself changes, update `src/components/Logo.tsx` to match: it holds the same shapes.

The letters are outlines of Playfair Display Black, © Claus Eggers Sørensen, licensed under the
SIL Open Font License 1.1 (https://openfontlicense.org), which allows this use. The logo itself is
shapes, not text, so it never waits for a font; the site loads the same typeface for headings.

## SMASHY.gg (alternate logo)

Picked by Matthew on 2026-11-20 (round 648, option "A · One flame"): the wordmark with ".gg" after it
in the same flame, white band, outline and shadow, lowercase so the name still leads. It is for
promotion off the website (posters, social posts, stream overlays); the site keeps the plain SMASHY
logo. The ".gg" is outlined from Playfair Display at weight 900, 240 units, starting at x = 1036 with
-6 letter spacing, so it sits on the same baseline as SMASHY. The PNGs were taken with headless Chrome
as above (`--window-size=2820,644`).

## X (Twitter) header

`assets/social/x-header.png` (1500 × 500, round 649): the SMASHY logo centred on the night background
with an ember glow. X crops the top and bottom a little on some screens and puts the profile picture over
the bottom left, so the logo stays in the middle.
