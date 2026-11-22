"""Renders the store pictures from raw/ screenshots through frame.html with headless Chrome.

Works on Windows and the Mac (round 642; render.sh is the older Mac-only version).
Usage: python assets/store/source/render.py   (writes the finished PNGs into assets/store/)
Needs Chrome and Pillow (pip install pillow).
"""
import os
import platform
import subprocess
import tempfile
import urllib.parse
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent
OUT = HERE.parent
CHROME = (
    "C:/Program Files/Google/Chrome/Application/chrome.exe"
    if platform.system() == "Windows"
    else "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
)


def render(name: str, w: int, h: int, shot: str, t1: str, t2: str, sub: str, top: str = "") -> None:
    qs = urllib.parse.urlencode({"w": w, "h": h, "shot": shot, "t1": t1, "t2": t2, "sub": sub, "top": top})
    with tempfile.TemporaryDirectory() as tmp:
        png = os.path.join(tmp, "frame.png")
        subprocess.run(
            [CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1",
             "--allow-file-access-from-files", "--virtual-time-budget=8000", f"--window-size={w},{h}",
             f"--screenshot={png}", f"{(HERE / 'frame.html').as_uri()}?{qs}"],
            check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        )
        # Both stores refuse transparency: save without an alpha channel.
        Image.open(png).convert("RGB").save(OUT / f"{name}.png")
    print(name)


# key, line 1, line 2 (flame colors), the line under it
PHONE = [
    ("1-feed", "Everything", "Smash.", "Majors, locals, results and clips, all in one app."),
    ("2-events", "Find your", "local.", "Weeklies near you, majors worldwide, and who's going."),
    ("3-bracket", "Follow every", "set, live.", "Brackets round by round, straight from start.gg."),
    ("4-history", "500+ majors,", "since 2003.", "Winners, top 8s and all-time records for every game."),
    ("5-new-players", "New to smash?", "Start here.", "Guides, netplay and people at your level."),
]
for key, t1, t2, sub in PHONE:
    render(f"iphone-{key}", 1320, 2868, f"iphone-{key}.png", t1, t2, sub)
    render(f"google-phone-{key}", 1320, 2640, f"iphone-{key}.png", t1, t2, sub, "960")

TABLET = [
    ("1-feed", "Everything", "Smash.", "Majors, locals, results and clips, all in one app."),
    ("2-events", "Find your", "local.", "Weeklies near you, majors worldwide, and who's going."),
    ("3-history", "500+ majors,", "since 2003.", "Winners, top 8s and all-time records for every game."),
    ("4-new-players", "New to smash?", "Start here.", "Guides, netplay and people at your level."),
]
for key, t1, t2, sub in TABLET:
    render(f"ipad-{key}", 2064, 2752, f"ipad-{key}.png", t1, t2, sub)
