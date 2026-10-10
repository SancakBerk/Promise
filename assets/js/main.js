(function () {
  "use strict";

  var root = document.documentElement;
  root.classList.add("js");

  /* ---------------- Giriş kapısı ---------------- */
  var door = document.getElementById("door");
  if (door) {
    var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var openDoor = function () {
      if (door.classList.contains("is-opening")) return;
      window.scrollTo(0, 0);
      door.classList.add("is-opening");
      // Kanatlar aralanırken davetiye canlanmaya başlar
      setTimeout(function () { root.classList.remove("is-door-closed"); }, reduced ? 0 : 450);
      setTimeout(function () {
        door.parentNode.removeChild(door);
        var skip = document.querySelector(".hero");
        if (skip) { skip.setAttribute("tabindex", "-1"); skip.focus({ preventScroll: true }); }
      }, reduced ? 450 : 1850);
    };
    door.addEventListener("click", openDoor);
    door.focus({ preventScroll: true });
  } else {
    root.classList.remove("is-door-closed");
  }

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

  /* ---------------- Aşağı kaydır oku ---------------- */
  var hint = document.querySelector(".scroll-hint");
  if (hint) {
    var onScroll = function () { hint.classList.toggle("is-hidden", window.scrollY > 40); };
    // Ortada yazının üstüne biniyorsa sağ alt köşeye geç (yazılar ortalı, köşe genelde boş)
    var content = document.querySelector(".hero__content");
    var covers = function () {
      // Kutuların değil, yazının ve çizgilerin gerçekte kapladığı alan ölçülür
      var h = hint.getBoundingClientRect(), pad = 6, range = document.createRange(), rects = [];
      var walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT);
      for (var n = walker.nextNode(); n; n = walker.nextNode()) {
        if (!n.nodeValue.trim()) continue;
        range.selectNodeContents(n);
        Array.prototype.push.apply(rects, range.getClientRects());
      }
      Array.prototype.forEach.call(content.querySelectorAll("img, .date__side"), function (el) { rects.push(el.getBoundingClientRect()); });
      return rects.some(function (b) {
        return b.height && h.left - pad < b.right && b.left < h.right + pad && h.top - pad < b.bottom && b.top < h.bottom + pad;
      });
    };
    var place = function () {
      if (window.scrollY > 40) return;
      hint.classList.remove("is-corner");
      if (covers()) {
        hint.classList.add("is-corner");
        if (covers()) hint.classList.remove("is-corner");
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", place);
    window.addEventListener("load", place);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(place);
    onScroll();
    place();
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
