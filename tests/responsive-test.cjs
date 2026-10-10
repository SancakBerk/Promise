/*
 * Responsive + işlev testi
 *
 *   npx http-server -p 8080 -s .     (repo kökünde)
 *   node tests/responsive-test.cjs   (BASE_URL ile farklı adres verilebilir)
 *
 * Her cihazda: yatay taşma, ekran dışına çıkan öğe, dokunma hedefi boyu,
 * font yüklemesi, geri sayımın akması ve linklerin doğruluğu kontrol edilir;
 * tam sayfa ekran görüntüsü tests/screenshots/ altına kaydedilir.
 */
const { chromium, devices } = require("playwright");
const fs = require("fs");
const path = require("path");

const BASE_URL = process.env.BASE_URL || "http://localhost:8080/";
const OUT = path.join(__dirname, "screenshots");
fs.mkdirSync(OUT, { recursive: true });

const pick = (name) => {
  const d = devices[name];
  return { name, viewport: d.viewport, deviceScaleFactor: d.deviceScaleFactor, isMobile: d.isMobile, hasTouch: d.hasTouch, userAgent: d.userAgent };
};
const custom = (name, width, height, extra = {}) => ({ name, viewport: { width, height }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, ...extra });

const DEVICES = [
  custom("Galaxy Z Fold (kapalı) 280x653", 280, 653),
  custom("iPhone SE 1. nesil 320x568", 320, 568),
  pick("Galaxy S8"),
  pick("Galaxy S9+"),
  pick("Galaxy S24"),
  pick("Galaxy A55"),
  pick("Moto G4"),
  pick("Pixel 5"),
  pick("Pixel 7"),
  pick("iPhone SE"),
  pick("iPhone SE (3rd gen)"),
  pick("iPhone 8 Plus"),
  pick("iPhone X"),
  pick("iPhone 11"),
  pick("iPhone 12 Mini"),
  pick("iPhone 13"),
  pick("iPhone 14 Pro"),
  pick("iPhone 14 Pro Max"),
  pick("iPhone 15 Pro Max"),
  custom("Xiaomi Redmi Note 393x873", 393, 873),
  custom("Huawei P30 360x780", 360, 780),
  custom("Galaxy Z Fold (açık) 690x837", 690, 837),
  // Uzun-ince ekranlar (20:9 - 22:9)
  custom("Sony Xperia 1 (21:9) 411x960", 411, 960),
  custom("Galaxy Z Flip (22:9) 360x880", 360, 880),
  custom("Galaxy S24 Ultra 412x915", 412, 915),
  custom("Pixel 8 Pro 448x998", 448, 998),
  // Kısa-geniş ekranlar ve tarayıcı çubuklarıyla kısalan görünür alan
  custom("iPhone 4 (3:2) 320x480", 320, 480),
  custom("iPhone SE + Safari çubukları 375x548", 375, 548),
  custom("iPhone 13 + Safari çubukları 390x664", 390, 664),
  custom("Surface Duo 540x720", 540, 720),
  custom("Pixel Fold açık (geniş) 841x701", 841, 701),
  custom("Android tablet 800x1280", 800, 1280, { deviceScaleFactor: 1.5 }),
  custom("iPad Pro 12.9 1024x1366", 1024, 1366),
  custom("iPad yatay 1024x768", 1024, 768),
  custom("Çok kısa yatay telefon 568x320", 568, 320),
  custom("Galaxy S24 Ultra yatay 915x412", 915, 412),
  pick("iPad Mini"),
  pick("Galaxy Tab S4"),
  pick("iPad Pro 11"),
  pick("iPhone 13 landscape"),
  pick("Galaxy S8 landscape"),
  pick("Pixel 7 landscape"),
  { name: "Masaüstü 1366x768", viewport: { width: 1366, height: 768 }, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
  { name: "Masaüstü 1920x1080", viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
];

// Giriş kapısını açıp animasyonun bitmesini bekler
async function openDoor(page) {
  await page.click("#door");
  await page.waitForSelector("#door", { state: "detached", timeout: 4000 });
}

let failures = 0;
const fail = (dev, msg) => { failures++; console.log(`  ✗ [${dev}] ${msg}`); };

async function checkLayout(page, dev) {
  const r = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const scrollW = document.documentElement.scrollWidth;
    const offenders = [];
    document.querySelectorAll("body *").forEach((el) => {
      if (el.closest("svg[width='0']") || el.classList.contains("skip-link")) return;
      const cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden") return;
      const b = el.getBoundingClientRect();
      if (b.width === 0 || b.height === 0) return;
      if (b.right > vw + 1 || b.left < -1) {
        // picture içindeki img tam genişliktir; meadow kendisi kesilmiş olabilir
        offenders.push(`${el.tagName.toLowerCase()}.${[...el.classList].join(".")} (${Math.round(b.left)}→${Math.round(b.right)} / ${vw})`);
      }
    });
    const smallTargets = [];
    document.querySelectorAll("a.btn, button.btn, .fab").forEach((el) => {
      const b = el.getBoundingClientRect();
      if (b.height && b.height < 44) smallTargets.push(`${el.textContent.trim()} (${Math.round(b.height)}px)`);
    });
    // Metin taşması: kutusundan geniş içerik
    const clipped = [];
    document.querySelectorAll(".btn, .date__side, .countdown__label, .countdown__num, .family span, .venue p, .names").forEach((el) => {
      if (el.scrollWidth > el.clientWidth + 1) clipped.push(`${el.className}: "${el.textContent.trim().slice(0, 30)}"`);
    });
    const names = document.querySelector(".names").getBoundingClientRect();
    const nameLines = Math.round(names.height / parseFloat(getComputedStyle(document.querySelector(".names")).fontSize) / 1.05);
    return { vw, scrollW, offenders, smallTargets, clipped, nameLines,
      fonts: ["Ms Madi", "Cormorant Garamond", "Marcellus"].map((f) => [f, document.fonts.check(`16px "${f}"`)]) };
  });
  if (r.scrollW > r.vw) fail(dev, `yatay taşma: scrollWidth ${r.scrollW} > ${r.vw}`);
  if (r.offenders.length) fail(dev, `ekran dışına taşan öğeler: ${r.offenders.slice(0, 5).join(", ")}`);
  if (r.smallTargets.length) fail(dev, `44px altı dokunma hedefi: ${r.smallTargets.join(", ")}`);
  if (r.clipped.length) fail(dev, `kutusundan taşan metin: ${r.clipped.join(" | ")}`);
  r.fonts.forEach(([f, ok]) => { if (!ok) fail(dev, `font yüklenmedi: ${f}`); });
  return r;
}

async function checkCountdown(page, dev) {
  const read = () => page.$$eval("[data-unit]", (els) => els.map((e) => e.textContent));
  const a = await read();
  await page.waitForTimeout(1100);
  const b = await read();
  if (a.some((v) => v === "--")) fail(dev, `geri sayım dolmadı: ${a}`);
  if (a.join() === b.join()) fail(dev, `geri sayım akmıyor: ${a} → ${b}`);
  return b;
}

async function checkLinks(page, dev) {
  const hrefs = await page.$$eval("a[href]", (as) => as.map((a) => a.href));
  const g = hrefs.find((h) => h.startsWith("https://www.google.com/maps/dir/"));
  if (!g || !decodeURIComponent(g).includes("Faralya Davet Evi")) fail(dev, "Google Maps yol tarifi linki yok/yanlış");
  const cal = hrefs.find((h) => h.startsWith("https://calendar.google.com/"));
  if (!cal || !cal.includes("20261114T150000Z%2F20261114T180000Z")) fail(dev, "Google Takvim saati yanlış");
  for (const local of hrefs.filter((h) => h.startsWith(BASE_URL))) {
    const res = await page.request.get(local);
    if (!res.ok()) fail(dev, `kırık link: ${local} (${res.status()})`);
  }
}

(async () => {
  const browser = await chromium.launch();

  console.log(`\n== ${DEVICES.length} cihazda düzen testi ==`);
  for (const d of DEVICES) {
    const ctx = await browser.newContext({ ...d, name: undefined, locale: "tr-TR", timezoneId: "Europe/Istanbul" });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => { if (m.type() === "error" && !/google|gstatic|maps/i.test(m.text())) errors.push(m.text()); });
    await page.goto(BASE_URL, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(OUT, "door_" + d.name.replace(/[^\w]+/g, "_") + ".png") });
    await openDoor(page);
    // Tüm reveal animasyonlarını tetiklemek için sayfayı baştan sona kaydır
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += window.innerHeight / 2) { window.scrollTo({ top: y, behavior: "instant" }); await new Promise((r) => setTimeout(r, 60)); }
      window.scrollTo({ top: 0, behavior: "instant" });
    });
    await page.waitForTimeout(900);
    const before = failures;
    const r = await checkLayout(page, d.name);
    const cd = await checkCountdown(page, d.name);
    if (d === DEVICES[0]) await checkLinks(page, d.name);
    errors.forEach((e) => fail(d.name, `JS hatası: ${e}`));
    const file = d.name.replace(/[^\w]+/g, "_") + ".png";
    await page.screenshot({ path: path.join(OUT, "first-screen_" + file) });
    await page.screenshot({ path: path.join(OUT, "full_" + file), fullPage: true });
    console.log(`${failures === before ? "✓" : "✗"} ${d.name.padEnd(34)} ${r.vw}px  isim satırı:${r.nameLines}  sayaç:${cd.join(":")}`);
    await ctx.close();
  }

  console.log("\n== Saat dilimi: misafir yurt dışındaysa da aynı süre gösterilmeli ==");
  const counts = {};
  for (const tz of ["Europe/Istanbul", "America/New_York", "Asia/Tokyo"]) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: tz });
    const page = await ctx.newPage();
    await page.clock.setFixedTime(new Date("2026-11-13T12:00:00Z"));
    await page.goto(BASE_URL);
    counts[tz] = (await page.$$eval("[data-unit]", (els) => els.map((e) => e.textContent))).join(":");
    console.log(`  ${tz.padEnd(18)} ${counts[tz]}`);
    await ctx.close();
  }
  if (new Set(Object.values(counts)).size !== 1) fail("saat dilimi", JSON.stringify(counts));
  if (counts["Europe/Istanbul"] !== "1:03:00:00") fail("saat dilimi", `13 Kasım 15.00 TR için 1:03:00:00 beklendi, ${counts["Europe/Istanbul"]} geldi`);

  console.log("\n== Etkinlik anı ve sonrası mesajları ==");
  const states = [
    ["2026-11-14T14:59:58Z", null],
    ["2026-11-14T15:30:00Z", "Şu an birlikteyiz"],
    ["2026-11-14T18:00:01Z", "teşekkür ederiz"],
  ];
  for (const [t, expect] of states) {
    const ctx = await browser.newContext({ viewport: { width: 375, height: 667 } });
    const page = await ctx.newPage();
    await page.clock.setFixedTime(new Date(t));
    await page.goto(BASE_URL);
    const msg = await page.$eval("#countdown-message", (e) => (e.hidden ? null : e.textContent));
    const ok = expect ? msg && msg.includes(expect) : msg === null;
    if (!ok) fail("durum " + t, `beklenen "${expect}", gelen "${msg}"`);
    console.log(`  ${ok ? "✓" : "✗"} ${t} → ${msg || "geri sayım: " + (await page.$$eval("[data-unit]", (els) => els.map((e) => e.textContent))).join(":")}`);
    await page.screenshot({ path: path.join(OUT, `state_${t.replace(/[:]/g, "-")}.png`) });
    await ctx.close();
  }

  console.log("\n== Adres kopyalama ve paylaş butonu ==");
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, permissions: ["clipboard-read", "clipboard-write"] });
    await ctx.route(/wa\.me|whatsapp/, (r) => r.fulfill({ body: "ok", contentType: "text/html" }));
    const page = await ctx.newPage();
    await page.goto(BASE_URL);
    await openDoor(page);
    await page.click("#btn-copy-address");
    await page.waitForTimeout(200);
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    const toast = await page.$eval("#toast", (e) => e.textContent);
    if (!clip.includes("Pasinler Sok. No:19")) fail("kopyala", `panoda: ${clip}`);
    console.log(`  ${clip.includes("Pasinler") ? "✓" : "✗"} pano: "${clip}" · bildirim: "${toast}"`);
    // navigator.share yoksa WhatsApp'a düşmeli
    const [popup] = await Promise.all([page.waitForEvent("popup").catch(() => null), page.click("#btn-share")]);
    const popupUrl = popup ? popup.url() : "";
    if (!/wa\.me|whatsapp/.test(popupUrl)) fail("paylaş", `WhatsApp yedeği açılmadı: ${popupUrl}`);
    console.log(`  ${/wa\.me|whatsapp/.test(popupUrl) ? "✓" : "✗"} paylaş yedeği → ${popupUrl.slice(0, 60)}…`);
    await ctx.close();
  }

  console.log("\n== Giriş kapısı ==");
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    await page.goto(BASE_URL);
    const before = await page.evaluate(() => ({
      covers: (() => { const b = document.getElementById("door").getBoundingClientRect(); return b.width >= innerWidth && b.height >= innerHeight; })(),
      locked: getComputedStyle(document.body).overflow === "hidden",
      names: getComputedStyle(document.querySelector(".names")).opacity,
    }));
    if (!before.covers) fail("kapı", "kapı ekranı kaplamıyor");
    if (!before.locked) fail("kapı", "kapı kapalıyken sayfa kayıyor");
    if (before.names !== "0") fail("kapı", `kapı kapalıyken davetiye görünüyor (opacity ${before.names})`);
    await page.keyboard.press("Enter");
    await page.waitForSelector("#door", { state: "detached", timeout: 4000 }).catch(() => fail("kapı", "Enter ile açılmadı"));
    await page.waitForTimeout(900);
    const after = await page.evaluate(() => ({
      names: getComputedStyle(document.querySelector(".names")).opacity,
      locked: getComputedStyle(document.body).overflow === "hidden",
    }));
    if (after.names !== "1") fail("kapı", `açılınca isimler görünmüyor (opacity ${after.names})`);
    if (after.locked) fail("kapı", "açılınca sayfa kaymıyor");
    console.log(`  ${before.covers && before.locked && after.names === "1" && !after.locked ? "✓" : "✗"} kapalı: kaplıyor+kilitli · Enter ile açıldı · davetiye görünür`);
    await ctx.close();
  }

  console.log("\n== JavaScript kapalıyken içerik görünür mü ==");
  {
    const ctx = await browser.newContext({ viewport: { width: 375, height: 667 }, javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto(BASE_URL);
    const op = await page.$eval(".names", (e) => getComputedStyle(e).opacity);
    if (op !== "1") fail("JS kapalı", `isimler görünmüyor (opacity ${op})`);
    const doorShown = await page.$eval("#door", (e) => getComputedStyle(e).display !== "none");
    if (doorShown) fail("JS kapalı", "kapı açılamayacakken görünüyor");
    console.log(`  ${op === "1" ? "✓" : "✗"} isim opaklığı ${op}`);
    await ctx.close();
  }

  await browser.close();
  console.log(failures ? `\n${failures} HATA` : "\nTüm testler geçti ✓");
  process.exit(failures ? 1 : 0);
})();
