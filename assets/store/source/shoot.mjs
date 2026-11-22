// Raw store screenshots of smashy.gg through Chrome's DevTools protocol, as the app shows them (round 642).
// node assets/store/source/shoot.mjs assets/store/raw 440 956 3 iphone-1-feed=https://smashy.gg/ ...   (iPad: 1032 1376 2)
// Edit CHROME below on a Mac: /Applications/Google Chrome.app/Contents/MacOS/Google Chrome
// node shoot.mjs <outDir> <width> <height> <scale> name=url [name=url ...]
import { spawn } from "node:child_process";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const [outDir, w, h, scale, ...jobs] = process.argv.slice(2);
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const profile = mkdtempSync(join(tmpdir(), "shot-"));
const chrome = spawn(CHROME, ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--remote-debugging-port=9333", `--user-data-dir=${profile}`, "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let ver;
for (let i = 0; i < 50 && !ver; i++) {
  await sleep(300);
  ver = await fetch("http://127.0.0.1:9333/json/list").then((r) => r.json()).catch(() => null);
}
const page = ver.find((t) => t.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r));
let id = 0;
const waiting = new Map();
ws.addEventListener("message", (e) => {
  const m = JSON.parse(e.data);
  if (m.id && waiting.has(m.id)) {
    waiting.get(m.id)(m);
    waiting.delete(m.id);
  }
});
const send = (method, params = {}) => new Promise((r) => {
  const n = ++id;
  waiting.set(n, r);
  ws.send(JSON.stringify({ id: n, method, params }));
});

const W = Number(w), H = Number(h), S = Number(scale);
await send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: S, mobile: true });
await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "dark" }] });
await send("Emulation.setUserAgentOverride", { userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1", acceptLanguage: "en-US,en" });
await send("Page.enable");
// Look like the store app (apps/mobile): the site hides its "get the app" buttons there.
await send("Page.addScriptToEvaluateOnNewDocument", { source: "window.Capacitor = { isNativePlatform: () => true, getPlatform: () => 'ios', Plugins: {} };" });
await send("Runtime.enable");
for (const job of jobs) {
  const at = job.indexOf("=");
  const name = job.slice(0, at), url = job.slice(at + 1);
  await send("Page.navigate", { url });
  await sleep(9000);
  // Scroll a little and back so lazy pictures load, then wait for them.
  await send("Runtime.evaluate", { expression: "window.scrollTo(0, 400); setTimeout(() => window.scrollTo(0, 0), 300); 1" });
  await sleep(2500);
  const shot = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync(join(outDir, `${name}.png`), Buffer.from(shot.result.data, "base64"));
  console.log("saved", name);
}
ws.close();
chrome.kill();
