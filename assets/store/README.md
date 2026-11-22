# Store screenshots and graphics

Remade 2026-11-20 (round 642) in the new look. The screenshots in `raw/` were taken from smashy.gg in Chrome
with a phone (440 × 956 at 3×) and an iPad (1032 × 1376 at 2×) screen, dark, signed out, made to look like the
app (the site hides its "get the app" buttons there). The first set (2026-11-14) came from the iOS simulators. The pictures to
upload frame them: a headline (second line in flame colors) over Smashy's dark red background, with
the screenshot tilted below it. Upload them in this order.

| File | Size | Where it goes | Headline |
|---|---|---|---|
| `iphone-1-feed.png` | 1320 × 2868 | App Store, iPhone 6.9" | Everything Smash. |
| `iphone-2-events.png` | 1320 × 2868 | App Store, iPhone 6.9" | Find your local. |
| `iphone-3-bracket.png` | 1320 × 2868 | App Store, iPhone 6.9" | Follow every set, live. |
| `iphone-4-history.png` | 1320 × 2868 | App Store, iPhone 6.9" | 500+ majors, since 2003. |
| `iphone-5-new-players.png` | 1320 × 2868 | App Store, iPhone 6.9" | New to smash? Start here. |
| `ipad-1-feed.png` … `ipad-4-new-players.png` | 2064 × 2752 | App Store, iPad 13" | The same, without the bracket |
| `google-phone-1-feed.png` … `google-phone-5-new-players.png` | 1320 × 2640 | Google Play, phone screenshots | The iPhone pictures, a little shorter: Google allows at most 2:1 |
| `google-feature-graphic-1024x500.jpg` | 1024 × 500 | Google Play, feature graphic | The site's link card ("Everything Smash."), resized |

None has transparency (both stores refuse it).

Left out on purpose: Reels (the clip is Nintendo gameplay and a streamer's camera), a player's page
(a famous player's name in the marketing), Play and Seasons (mostly empty when signed out), and the
iPad bracket (one player tag on screen carries a political slogan). The event pages show the
tournaments' own logos as listings; the big Port Priority banner was avoided.

To change the words or the look: edit `source/render.py` (the headlines) or `source/frame.html`
(the design), then run `python assets/store/source/render.py` (Windows or Mac; needs Chrome and Pillow).

To retake the screenshots: build the app for the simulator, `xcrun simctl ui <device> appearance dark`,
`xcrun simctl status_bar <device> override --time 9:41 --batteryState charged --batteryLevel 100`,
open pages with `xcrun simctl openurl <device> https://smashy.gg/...` (they open in the app), and
save with `xcrun simctl io <device> screenshot` into `raw/`. Devices: iPhone 18 Pro Max, iPad Pro 13-inch (M5).
