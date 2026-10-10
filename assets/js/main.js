(function () {
  "use strict";

  document.documentElement.classList.add("js");

  // Etkinlik zamanı İstanbul saatine (UTC+3, yaz saati yok) sabitlenmiştir;
  // misafirin telefonu hangi saat diliminde olursa olsun doğru sayar.
  var EVENT_START = Date.UTC(2026, 10, 14, 15, 0, 0); // 14 Kasım 2026 18.00 (TR)
  var EVENT_END = Date.UTC(2026, 10, 14, 18, 0, 0);   // 14 Kasım 2026 21.00 (TR)

  /* ---------------- Geri sayım ---------------- */
  var countdown = document.getElementById("countdown");
  var message = document.getElementById("countdown-message");
  var nums = {};
  if (countdown) {
    Array.prototype.forEach.call(countdown.querySelectorAll("[data-unit]"), function (el) {
      nums[el.getAttribute("data-unit")] = el;
    });
  }

  function pad(n) { return n < 10 ? "0" + n : String(n); }

  function showMessage(text) {
    countdown.classList.add("is-done");
    message.textContent = text;
    message.hidden = false;
  }

  var timer = null;
  function tick() {
    if (!countdown) return;
    var now = Date.now();
    if (now >= EVENT_END) {
      showMessage("Bu güzel günü bizimle paylaştığınız için teşekkür ederiz.");
      clearInterval(timer);
      return;
    }
    if (now >= EVENT_START) {
      showMessage("Şu an birlikteyiz, iyi ki geldiniz!");
      return;
    }
    var diff = Math.floor((EVENT_START - now) / 1000);
    var d = Math.floor(diff / 86400);
    var h = Math.floor((diff % 86400) / 3600);
    var m = Math.floor((diff % 3600) / 60);
    var s = diff % 60;
    nums.days.textContent = String(d);
    nums.hours.textContent = pad(h);
    nums.minutes.textContent = pad(m);
    nums.seconds.textContent = pad(s);
    countdown.setAttribute("aria-label", d + " gün " + h + " saat " + m + " dakika kaldı");
  }
  tick();
  timer = setInterval(tick, 1000);
  // Arka plandan dönünce anında güncelle
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) tick();
  });

  /* ---------------- Toast ---------------- */
  var toastEl = document.getElementById("toast");
  var toastTimer = null;
  function toast(text) {
    if (!toastEl) return;
    toastEl.textContent = text;
    toastEl.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("is-visible"); }, 2400);
  }

  /* ---------------- Kopyalama ---------------- */
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.top = "-1000px";
      ta.style.fontSize = "16px"; // iOS yakınlaştırmasın
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, text.length);
      var ok = false;
      try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      ok ? resolve() : reject(new Error("copy failed"));
    });
  }

  var copyBtn = document.getElementById("btn-copy-address");
  if (copyBtn) {
    copyBtn.addEventListener("click", function () {
      copyText(copyBtn.getAttribute("data-copy")).then(
        function () { toast("Adres kopyalandı"); },
        function () { toast("Kopyalanamadı, adresi basılı tutarak kopyalayabilirsiniz"); }
      );
    });
  }

  /* ---------------- Paylaş ---------------- */
  var shareBtn = document.getElementById("btn-share");
  if (shareBtn) {
    shareBtn.addEventListener("click", function () {
      var url = location.href.split("#")[0];
      var text = "Aslı & Berk söz isteme törenine davetlisiniz. 14 Kasım 2026 Cumartesi, 18.00 · Faralya Davet Evi, Pendik";
      if (navigator.share) {
        navigator.share({ title: "Aslı & Berk · Söz İsteme", text: text, url: url }).catch(function () {});
      } else {
        window.open("https://wa.me/?text=" + encodeURIComponent(text + "\n" + url), "_blank", "noopener");
      }
    });
  }

  /* ---------------- Görünür olunca yumuşak giriş ---------------- */
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
    Array.prototype.forEach.call(reveals, function (el) { io.observe(el); });
  } else {
    Array.prototype.forEach.call(reveals, function (el) { el.classList.add("is-in"); });
  }

  /* ---------------- Yüzen "Yol Tarifi" butonu ---------------- */
  var fab = document.getElementById("fab");
  var hero = document.getElementById("davetiye");
  var konum = document.getElementById("konum");
  if (fab && hero && konum && "IntersectionObserver" in window) {
    var heroVisible = true, konumVisible = false;
    var update = function () { fab.classList.toggle("is-visible", !heroVisible && !konumVisible); };
    new IntersectionObserver(function (e) { heroVisible = e[0].isIntersecting; update(); }, { threshold: 0.15 }).observe(hero);
    new IntersectionObserver(function (e) { konumVisible = e[0].isIntersecting; update(); }, { threshold: 0.1 }).observe(konum);
  }
})();
