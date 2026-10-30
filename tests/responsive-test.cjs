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
  custom("Uzun ince 360x900", 360, 900),
  custom("Kısa geniş 480x720", 480, 720),
  custom("Galaxy Z Flip açık 412x1004", 412, 1004),
  pick("iPad Mini"),
  pick("Galaxy Tab S4"),
  pick("iPad Pro 11"),
  pick("iPhone 13 landscape"),
  pick("Galaxy S8 landscape"),
  pick("Pixel 7 landscape"),
  pick("iPad Mini landscape"),
  pick("iPad Pro 11 landscape"),
  custom("Galaxy Z Fold (açık, yatay) 837x690", 837, 690),
  custom("Kısa yatay telefon 640x320", 640, 320),
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

// Kapı: her parça ekranda, isimler kanadına sığıyor, parçalar üst üste binmiyor
async function checkDoor(page, dev) {
  const r = await page.evaluate(() => {
    const vw = innerWidth, vh = innerHeight;
    const q = (s) => document.querySelector(s).getBoundingClientRect();
    const box = (b) => ({ l: b.left, r: b.right, t: b.top, b: b.bottom });
    // İsimlerde dolgu değil harflerin kendisi ölçülür
    const text = (sel) => { const g = document.createRange(); g.selectNodeContents(document.querySelector(sel)); return g.getBoundingClientRect(); };
    const parts = {
      "sol isim": box(text(".door__leaf--left .door__name")), "sağ isim": box(text(".door__leaf--right .door__name")),
      "mühür": box(q(".door__seal")), "yazı": box(q(".door__hint")),
      "sol kol": box(q(".door__leaf--left .door__handle")), "sağ kol": box(q(".door__leaf--right .door__handle")),
    };
    // Yazının metin genişliği (kutu tam genişlik olduğu için)
    const hint = document.querySelector(".door__hint"); const rg = document.createRange(); rg.selectNodeContents(hint);
    const hb = rg.getBoundingClientRect(); parts["yazı"] = { l: hb.left, r: hb.right, t: hb.top, b: hb.bottom };
    const issues = [];
    for (const [k, b] of Object.entries(parts)) if (b.l < 0 || b.r > vw + 1 || b.t < 0 || b.b > vh + 1) issues.push(`${k} ekran dışında`);
    const L = q(".door__leaf--left"), R = q(".door__leaf--right");
    if (parts["sol isim"].l < L.left || parts["sol isim"].r > L.right + 1) issues.push("Aslı kanadına sığmıyor");
    if (parts["sağ isim"].l < R.left - 1 || parts["sağ isim"].r > R.right) issues.push("Berk kanadına sığmıyor");
    const hit = (a, b) => a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b;
    const pairs = [["sol isim", "mühür"], ["sağ isim", "mühür"], ["mühür", "yazı"], ["yazı", "sol kol"], ["yazı", "sağ kol"], ["sol isim", "yazı"], ["sağ isim", "yazı"]];
    pairs.forEach(([a, b]) => { if (hit(parts[a], parts[b])) issues.push(`${a} ile ${b} üst üste`); });
    if (hint.scrollWidth > hint.clientWidth + 1) issues.push("yazı taşıyor");
    return issues;
  });
  r.forEach((m) => fail(dev, `kapı: ${m}`));
}

// Aşağı kaydır oku: ilk ekranda tamamen görünür ve yazıların üstüne binmez
async function checkScrollHint(page, dev) {
  const r = await page.evaluate(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    window.dispatchEvent(new Event("resize"));
    const h = document.querySelector(".scroll-hint").getBoundingClientRect();
    // İlk ekranda okun altında kalan yazı var mı
    const rects = [], rg = document.createRange();
    const w = document.createTreeWalker(document.querySelector(".hero__content"), NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) if (n.nodeValue.trim()) { rg.selectNodeContents(n); rects.push(...rg.getClientRects()); }
    document.querySelectorAll(".hero__content img, .date__side").forEach((e) => rects.push(e.getBoundingClientRect()));
    const t = rects.reduce((m, b) => (b.height && h.left < b.right && b.left < h.right && h.top < b.bottom && b.top < h.bottom ? b : m), { bottom: -1e9 });
    const heroFits = document.querySelector(".hero").getBoundingClientRect().height <= innerHeight + 1;
    return { inView: h.top >= 0 && h.bottom <= innerHeight + 1, overlap: t.bottom > -1e9, heroFits };
  });
  if (!r.inView) fail(dev, "kaydırma oku ilk ekranda tam görünmüyor");
  if (r.overlap) console.log(`  · [${dev}] ok ilk ekranda yazının üstünde (köşede de yer yok)`);
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
    await checkDoor(page, d.name);
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
    await checkScrollHint(page, d.name);
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

  console.log("\n== Kaydırma oku: sona kadar görünür, sonraki bölüme geçer ==");
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 664 }, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    await page.goto(BASE_URL);
    await openDoor(page);
    const visible = () => page.$eval(".scroll-hint", (e) => getComputedStyle(e).visibility === "visible" && !e.classList.contains("is-hidden"));
    const steps = [];
    for (let i = 0; i < 8; i++) {
      if (!(await visible())) break;
      await page.click(".scroll-hint", { force: true }); // ok sürekli zıpladığı için "durağan" beklenmez
      await page.waitForTimeout(1200);
      steps.push(await page.evaluate(() => Math.round(scrollY)));
    }
    const endHidden = !(await visible());
    const atEnd = await page.evaluate(() => scrollY + innerHeight >= document.documentElement.scrollHeight - 60);
    const increasing = steps.every((y, i) => i === 0 || y > steps[i - 1]);
    if (steps.length < 4) fail("kaydırma oku", `bölümler arasında yeterince ilerlemedi: ${steps}`);
    if (!increasing) fail("kaydırma oku", `geri gitti: ${steps}`);
    if (!atEnd || !endHidden) fail("kaydırma oku", `sonda kaybolmadı (sonda: ${atEnd}, gizli: ${endHidden})`);
    await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight / 2, behavior: "instant" }));
    await page.waitForTimeout(400);
    const midVisible = await visible();
    if (!midVisible) fail("kaydırma oku", "sayfanın ortasında görünmüyor");
    console.log(`  ${steps.length >= 4 && increasing && atEnd && endHidden && midVisible ? "✓" : "✗"} ${steps.length} dokunuşta sona geldi (${steps.join(" → ")}) · ortada görünür · sonda gizli`);
    await ctx.close();
  }

  console.log("\n== Fotoğraf yükleme (Drive betiği taklit edilerek) ==");
  {
    const FAKE = "https://script.google.com/macros/s/TEST/exec";
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    // Sayfayı, yükleme adresi dolu haliyle sun
    await ctx.route((u) => u.href === BASE_URL || u.href === BASE_URL + "index.html", async (route) => {
      const res = await route.fetch();
      const html = (await res.text()).replace(/data-endpoint="[^"]*"/, `data-endpoint="${FAKE}"`);
      await route.fulfill({ response: res, body: html });
    });
    const got = [];
    let failFirst = true, preflight = false;
    await ctx.route(FAKE, async (route) => {
      // Gerçek Apps Script OPTIONS isteğine cevap vermez: ön kontrol çıkarsa yükleme canlıda bozulur
      if (route.request().method() === "OPTIONS") { preflight = true; return route.abort(); }
      const body = JSON.parse(route.request().postData());
      if (failFirst) { failFirst = false; return route.fulfill({ status: 500, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: '{"ok":false}' }); }
      got.push(body);
      await new Promise((r) => setTimeout(r, 300));
      route.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: '{"ok":true,"id":"x"}' });
    });
    const page = await ctx.newPage();
    await page.goto(BASE_URL);
    await openDoor(page);
    // Biri büyük (5000x3500, ~6 MB) iki fotoğraf ve bir küçük PNG tarayıcıda üretilir
    const files = await page.evaluate(async () => {
      const make = async (w, h, type, q) => {
        const c = document.createElement("canvas"); c.width = w; c.height = h;
        const x = c.getContext("2d"), d = x.createImageData(w, h);
        for (let i = 0; i < d.data.length; i += 4) { const v = (Math.random() * 255) | 0; d.data[i] = v; d.data[i + 1] = (i / 4) % 255; d.data[i + 2] = 255 - v; d.data[i + 3] = 255; }
        x.putImageData(d, 0, 0);
        const b = await new Promise((r) => c.toBlob(r, type, q));
        const buf = new Uint8Array(await b.arrayBuffer());
        let s = ""; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
        return btoa(s);
      };
      return [await make(5000, 3500, "image/jpeg", 0.92), await make(1200, 900, "image/jpeg", 0.8), await make(400, 300, "image/png")];
    });
    await page.setInputFiles("#upload-files", [
      { name: "IMG_0001.JPG", mimeType: "image/jpeg", buffer: Buffer.from(files[0], "base64") },
      { name: "IMG_0002.JPG", mimeType: "image/jpeg", buffer: Buffer.from(files[1], "base64") },
      { name: "ekran.png", mimeType: "image/png", buffer: Buffer.from(files[2], "base64") },
    ]);
    await page.waitForFunction(() => !document.querySelector(".upload__item:not(.is-done):not(.is-error)"), null, { timeout: 30000 });
    const errorsShown = await page.$$eval(".upload__item.is-error", (e) => e.length);
    if (errorsShown !== 1) fail("yükleme", `ilk istek hata verince 1 hata kutusu beklendi, ${errorsShown} geldi`);
    await page.click(".upload__item.is-error .upload__retry");
    await page.waitForFunction(() => document.querySelectorAll(".upload__item.is-done").length === 3, null, { timeout: 30000 });
    const status = await page.textContent("#upload-status");
    await page.screenshot({ path: path.join(OUT, "upload_done.png") });
    await page.locator("#fotograflar").screenshot({ path: path.join(OUT, "upload_section.png") });
    const jpegSize = (b64) => {
      const b = Buffer.from(b64, "base64");
      for (let i = 2; i < b.length;) { const m = b[i + 1], len = b.readUInt16BE(i + 2); if (m >= 0xc0 && m <= 0xc3) return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)]; i += 2 + len; }
      return null;
    };
    const big = got.find((g) => g.fileName === "IMG_0001.jpg");
    const dims = big && jpegSize(big.data);
    const okNames = got.length === 3 && got.every((g) => !("name" in g));
    const okBig = dims && Math.max(...dims) <= 3200 && big.mimeType === "image/jpeg";
    const small = got.find((g) => g.fileName === "IMG_0002.JPG");
    const okSmall = small && Buffer.from(small.data, "base64").length === Buffer.from(files[1], "base64").length;
    const okPng = got.some((g) => g.fileName === "ekran.png" && g.mimeType === "image/png");
    if (!okNames) fail("yükleme", `3 fotoğraf isimsiz gelmeli: ${JSON.stringify(got.map((g) => [g.fileName, g.name]))}`);
    if (preflight) fail("yükleme", "CORS ön kontrolü çıktı; gerçek Apps Script bunu reddeder");
    if (!okBig) fail("yükleme", `büyük fotoğraf küçültülmeli: ${dims}`);
    if (!okSmall) fail("yükleme", "küçük JPEG olduğu gibi gönderilmeli");
    if (!okPng) fail("yükleme", "PNG olduğu gibi gönderilmeli");
    if (!/Teşekkürler! 3 fotoğraf/.test(status)) fail("yükleme", `durum yazısı: ${status}`);
    console.log(`  ${okNames && okBig && okSmall && okPng ? "✓" : "✗"} 3 fotoğraf · büyük olan ${dims && dims.join("x")} küçültüldü · hata sonrası tekrar dene çalıştı · "${status}"`);
    await ctx.close();
  }
  {
    // Adres girilmemişse misafire nazik bir uyarı çıkar, hiçbir şey gönderilmez
    const ctx = await browser.newContext({ viewport: { width: 375, height: 667 } });
    await ctx.route((u) => u.href === BASE_URL || u.href === BASE_URL + "index.html", async (route) => {
      const res = await route.fetch();
      route.fulfill({ response: res, body: (await res.text()).replace(/data-endpoint="[^"]*"/, 'data-endpoint=""') });
    });
    const page = await ctx.newPage();
    await page.goto(BASE_URL);
    await openDoor(page);
    await page.setInputFiles("#upload-files", [{ name: "a.jpg", mimeType: "image/jpeg", buffer: Buffer.from("ffd8ffd9", "hex") }]);
    const t = await page.textContent("#toast");
    const items = await page.$$eval(".upload__item", (e) => e.length);
    const ok = /henüz açılmadı/.test(t) && items === 0;
    if (!ok) fail("yükleme", `adres yokken uyarı beklendi: "${t}", ${items} öğe`);
    console.log(`  ${ok ? "✓" : "✗"} adres girilmemişken uyarı: "${t}"`);
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
