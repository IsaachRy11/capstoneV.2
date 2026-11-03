// Phone-width check. Opens the login page and every page for each role at 390×844,
// reports sideways overflow, small tap targets (<36px) and the login field position,
// saves a full-page screenshot per page, and exits 1 if anything needs fixing.
//
//   npm run check:mobile                      (dev server must be running on :5173)
//   npm run check:mobile -- http://localhost:5174 secretary
//
// Passwords come from .env.local (never printed). Browser: Edge by default, or set CHROME_PATH.
import { chromium } from "playwright-core";
import { readFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const [base = "http://localhost:5173", only = ""] = process.argv.slice(2);
const outDir = join(tmpdir(), "ccs-mobile-check");
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";

const envFile = join(root, ".env.local");
if (!existsSync(envFile)) {
  console.error("Missing .env.local (demo passwords live there).");
  process.exit(1);
}
const env = Object.fromEntries(readFileSync(envFile, "utf8").split(/\r?\n/)
  .filter((l) => l.includes("=")).map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]));
mkdirSync(outDir, { recursive: true });

const roles = {
  secretary: { id: "demo.secretary@ccs-monitor.test", pw: env.DEMO_SECRETARY_PASSWORD,
    pages: ["/", "/students", "/students/2025-0002", "/sections", "/schedules", "/curriculum", "/profile", "/settings"] },
  student: { id: "2025-0001", pw: env.STUDENT_DEFAULT_PASSWORD || env.DEMO_STUDENT_PASSWORD,
    pages: ["/", "/schedule", "/progress", "/record", "/curriculum"] },
};

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || EDGE });
const phone = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true };
let problems = 0;

// Phones open on a landing screen: its Sign in button must be on the first screen,
// and tapping it must show the form near the top.
const lctx = await browser.newContext(phone);
const lp = await lctx.newPage();
await lp.goto(base + "/", { waitUntil: "networkidle" });
await lp.screenshot({ path: join(outDir, "landing.png") });
const landing = await lp.evaluate(() => {
  const b = [...document.querySelectorAll("button")].find((x) => x.textContent.trim().startsWith("Sign in") && x.offsetParent);
  const r = b?.getBoundingClientRect();
  return { bottom: r ? Math.round(r.bottom) : -1, height: r ? Math.round(r.height) : 0, overflow: document.documentElement.scrollHeight - innerHeight };
});
const landingOk = landing.bottom > 0 && landing.bottom <= 844 && landing.height >= 44;
if (!landingOk) problems++;
console.log(`${landingOk ? "ok  " : "FIX "} landing    Sign in button ends ${landing.bottom}px down (screen 844px), ${landing.height}px tall, page scrolls ${Math.max(0, landing.overflow)}px`);
if (landing.bottom > 0) await lp.getByRole("button", { name: "Sign in" }).first().click();
await lp.waitForSelector("#email", { state: "visible", timeout: 5000 }).catch(() => {});
await lp.screenshot({ path: join(outDir, "login.png") });
const formTop = Math.round(await lp.evaluate(() => { const e = document.querySelector("#email"); return e?.offsetParent ? e.getBoundingClientRect().top : -1; }));
const loginOk = formTop >= 0 && formTop < 400;
if (!loginOk) problems++;
console.log(`${loginOk ? "ok  " : "FIX "} login      email field starts ${formTop}px from the top (should be well under 400px)`);
await lp.goBack();
const backOk = await lp.evaluate(() => !new URLSearchParams(location.search).has("signin"));
if (!backOk) problems++;
console.log(`${backOk ? "ok  " : "FIX "} back       phone back button ${backOk ? "returns to the landing screen" : "does not return to the landing screen"}`);
await lctx.close();

for (const [role, cfg] of Object.entries(roles)) {
  if (only && only !== role) continue;
  if (!cfg.pw) { console.log(`skip ${role}: no password in .env.local`); continue; }
  const ctx = await browser.newContext(phone);
  const page = await ctx.newPage();
  await page.goto(base + "/?signin", { waitUntil: "networkidle" });
  await page.fill("#email", cfg.id);
  await page.fill("#password", cfg.pw);
  await page.click('button[type="submit"]');
  await page.waitForSelector("aside nav", { state: "attached", timeout: 15000 });
  await page.waitForTimeout(600);
  for (const p of cfg.pages) {
    await page.goto(base + p, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    const r = await page.evaluate(() => {
      const vw = window.innerWidth;
      const pageOverflow = document.documentElement.scrollWidth - vw;
      const offenders = [];
      for (const el of document.querySelectorAll("main *, header *")) {
        const b = el.getBoundingClientRect();
        if (b.width === 0 || b.right <= vw + 1) continue;
        let q = el.parentElement, scrolled = false;
        while (q) { const s = getComputedStyle(q); if (/(auto|scroll|hidden)/.test(s.overflowX)) { scrolled = true; break; } q = q.parentElement; }
        if (!scrolled) offenders.push(`${el.tagName.toLowerCase()}.${String(el.className).split(" ").slice(0, 3).join(".")} (+${Math.round(b.right - vw)}px)`);
      }
      const small = [...document.querySelectorAll("main button, main a, header button")]
        .filter((el) => { const b = el.getBoundingClientRect(); return b.width > 0 && (b.width < 36 || b.height < 36); }).length;
      return { pageOverflow, offenders: [...new Set(offenders)].slice(0, 4), small };
    });
    const bad = r.pageOverflow > 0 || r.offenders.length > 0;
    if (bad) problems++;
    console.log(`${bad ? "FIX " : "ok  "} ${role.padEnd(9)} ${p.padEnd(20)} overflow ${r.pageOverflow}px · small tap targets ${r.small}${r.offenders.length ? " · " + r.offenders.join(", ") : ""}`);
    await page.screenshot({ path: join(outDir, `${role}${p.replace(/\//g, "_") || "_home"}.png`), fullPage: true });
  }
  await ctx.close();
}
await browser.close();
console.log(`\nScreenshots: ${outDir}`);
console.log(problems ? `${problems} page(s) need fixing.` : "All pages fit a phone screen.");
process.exit(problems ? 1 : 0);
