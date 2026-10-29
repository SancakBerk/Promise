/*
 * Misafir fotoğraf yükleme
 * Seçilen her fotoğraf tek tek, Berk'in Google Drive klasörüne kaydeden
 * Google Apps Script web uygulamasına gönderilir (bkz. apps-script/).
 * Büyük fotoğraflar telefonda küçültülür; böylece mobil veriyle de hızlı yüklenir.
 */
(function () {
  "use strict";

  var section = document.getElementById("fotograflar");
  var input = document.getElementById("upload-files");
  if (!section || !input) return;

  var ENDPOINT = (section.getAttribute("data-endpoint") || "").trim();
  var MAX_SIDE = 3200;              // uzun kenar (px); daha büyükse küçültülür
  var KEEP_ORIGINAL_UNDER = 4e6;    // 4 MB altındaki JPEG/PNG olduğu gibi gider
  var MAX_SEND = 35e6;              // Apps Script istek sınırının (50 MB) güvenli altı
  var PARALLEL = 2;

  var nameInput = document.getElementById("upload-name");
  var list = document.getElementById("upload-list");
  var statusEl = document.getElementById("upload-status");

  var queue = [], active = 0, done = 0, failed = 0, total = 0;
  var thumbs = Promise.resolve();

  try { nameInput.value = localStorage.getItem("upload-name") || ""; } catch (e) {}
  nameInput.addEventListener("change", function () {
    try { localStorage.setItem("upload-name", nameInput.value.trim()); } catch (e) {}
  });

  function setStatus() {
    statusEl.hidden = total === 0;
    statusEl.classList.remove("is-done");
    if (active || queue.length) {
      statusEl.textContent = "Yükleniyor… " + done + " / " + total + " gönderildi";
    } else if (failed) {
      statusEl.textContent = done + " fotoğraf gönderildi, " + failed + " tanesi gönderilemedi. Tekrar denemek için fotoğrafa dokunun.";
    } else if (done) {
      statusEl.classList.add("is-done");
      statusEl.textContent = "Teşekkürler! " + done + " fotoğraf albümümüze eklendi.";
    }
  }

  function busy() { return active > 0 || queue.length > 0; }
  window.addEventListener("beforeunload", function (e) {
    if (busy()) { e.preventDefault(); e.returnValue = ""; }
  });

  input.addEventListener("change", function () {
    var files = Array.prototype.slice.call(input.files || []);
    input.value = "";
    if (!files.length) return;
    if (!ENDPOINT) {
      toast("Fotoğraf yükleme henüz açılmadı, lütfen biraz sonra tekrar deneyin.");
      return;
    }
    files.forEach(function (file) {
      if (file.type && file.type.indexOf("image/") !== 0) return;
      var job = { file: file, el: addItem(file) };
      queue.push(job);
      total++;
    });
    setStatus();
    pump();
  });

  function addItem(file) {
    var li = document.createElement("li");
    li.className = "upload__item";
    var img = document.createElement("img");
    img.alt = "";
    // Küçük önizleme ayrı üretilir: 12 MP'lik fotoğrafı 84 px'lik kutuda tutmak eski telefonlarda belleği doldurur
    thumbs = thumbs.then(function () {
      return loadImage(file).then(function (bmp) {
        var k = 240 / Math.min(bmp.width, bmp.height), c = document.createElement("canvas");
        c.width = Math.max(1, Math.round(bmp.width * Math.min(1, k)));
        c.height = Math.max(1, Math.round(bmp.height * Math.min(1, k)));
        c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
        if (bmp.close) bmp.close();
        img.src = c.toDataURL("image/jpeg", 0.8);
      }).catch(function () {});
    });
    var badge = document.createElement("span");
    badge.className = "upload__badge";
    badge.textContent = "Sırada";
    var bar = document.createElement("span");
    bar.className = "upload__bar";
    bar.appendChild(document.createElement("span"));
    li.appendChild(img);
    li.appendChild(badge);
    li.appendChild(bar);
    list.appendChild(li);
    return li;
  }

  function pump() {
    while (active < PARALLEL && queue.length) {
      var job = queue.shift();
      active++;
      run(job);
    }
    setStatus();
  }

  function run(job) {
    var badge = job.el.querySelector(".upload__badge");
    var fill = job.el.querySelector(".upload__bar span");
    job.el.classList.remove("is-error");
    badge.textContent = "Hazırlanıyor";
    prepare(job.file).then(function (prepared) {
      badge.textContent = "%0";
      return send(prepared, function (p) {
        var pct = Math.round(p * 100);
        fill.style.width = pct + "%";
        badge.textContent = "%" + pct;
      });
    }).then(function () {
      job.el.classList.add("is-done");
      badge.textContent = "";
      done++;
    }, function () {
      job.el.classList.add("is-error");
      badge.textContent = "Gönderilemedi · tekrar dene";
      fill.style.width = "0";
      failed++;
      var retry = document.createElement("button");
      retry.type = "button";
      retry.className = "upload__retry";
      retry.setAttribute("aria-label", "Bu fotoğrafı tekrar gönder");
      retry.addEventListener("click", function () {
        retry.remove();
        failed--;
        badge.textContent = "Sırada";
        queue.push(job);
        pump();
      });
      job.el.appendChild(retry);
    }).then(function () {
      active--;
      pump();
    });
  }

  /* Fotoğrafı gönderilecek hale getirir: gerekiyorsa küçültüp JPEG yapar */
  function prepare(file) {
    var simple = /^image\/(jpeg|png)$/.test(file.type) && file.size <= KEEP_ORIGINAL_UNDER;
    if (simple) return readBase64(file).then(function (b64) { return pack(file.name, file.type, b64); });
    return shrink(file).then(function (blob) {
      return readBase64(blob).then(function (b64) { return pack(jpegName(file.name), "image/jpeg", b64); });
    }, function () {
      // Tarayıcı çözemediyse (ör. bazı HEIC'ler) aslını gönder
      if (file.size > MAX_SEND) return Promise.reject(new Error("too big"));
      return readBase64(file).then(function (b64) { return pack(file.name, file.type || "image/jpeg", b64); });
    });
  }

  function pack(fileName, mimeType, data) {
    return { fileName: fileName || "foto.jpg", mimeType: mimeType, data: data, name: nameInput.value.trim().slice(0, 40) };
  }

  function jpegName(n) { return (n || "foto").replace(/\.[^.]+$/, "") + ".jpg"; }

  function loadImage(file) {
    if (window.createImageBitmap) {
      // imageOrientation varsayılanı EXIF yönünü uygular
      return createImageBitmap(file).catch(function () { return loadViaImg(file); });
    }
    return loadViaImg(file);
  }
  function loadViaImg(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error("decode")); };
      img.src = url;
    });
  }

  function shrink(file) {
    return loadImage(file).then(function (img) {
      var w = img.width, h = img.height, k = Math.min(1, MAX_SIDE / Math.max(w, h));
      var c = document.createElement("canvas");
      c.width = Math.round(w * k);
      c.height = Math.round(h * k);
      var ctx = c.getContext("2d");
      ctx.fillStyle = "#fff"; // şeffaf PNG'ler siyah olmasın
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      if (img.close) img.close();
      return new Promise(function (resolve, reject) {
        c.toBlob(function (b) { b ? resolve(b) : reject(new Error("encode")); }, "image/jpeg", 0.9);
      });
    });
  }

  function readBase64(blob) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { resolve(String(r.result).split(",")[1] || ""); };
      r.onerror = function () { reject(r.error); };
      r.readAsDataURL(blob);
    });
  }

  /* Basit istek (text/plain) olarak gönderilir; Apps Script için CORS ön kontrolü gerekmez */
  function send(payload, onProgress) {
    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open("POST", ENDPOINT);
      xhr.setRequestHeader("Content-Type", "text/plain;charset=utf-8");
      xhr.timeout = 180000;
      xhr.upload.onprogress = function (e) { if (e.lengthComputable) onProgress(Math.min(.98, e.loaded / e.total)); };
      xhr.onload = function () {
        var res = null;
        try { res = JSON.parse(xhr.responseText); } catch (e) {}
        if (xhr.status >= 200 && xhr.status < 300 && res && res.ok) { onProgress(1); resolve(res); }
        else reject(new Error((res && res.error) || "HTTP " + xhr.status));
      };
      xhr.onerror = xhr.ontimeout = function () { reject(new Error("network")); };
      xhr.send(JSON.stringify(payload));
    });
  }

  function toast(text) {
    var el = document.getElementById("toast");
    if (!el) return;
    el.textContent = text;
    el.classList.add("is-visible");
    clearTimeout(toast.t);
    toast.t = setTimeout(function () { el.classList.remove("is-visible"); }, 3200);
  }
})();
