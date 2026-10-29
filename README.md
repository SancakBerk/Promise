# Aslı & Berk · Söz İsteme

14 Kasım 2026 Cumartesi, 18.00 - 21.00 · Faralya Davet Evi, Pendik / İstanbul

Dijital davetiyenin tasarımıyla (krem kağıt, zeytin yeşili el yazısı, suluboya papatya çayırı) hazırlanmış, bağımlılıksız statik site.

## İçerik
- Davetiye ekranı (isimler, aileler, tarih, mekan)
- Geri sayım: İstanbul saatine sabit, misafir yurt dışında olsa da doğru sayar; tören sırasında ve sonrasında mesaj gösterir
- Konum: Google Maps haritası, Google Maps ile yol tarifi, Yandex ve Apple Haritalar, adres kopyalama
- Takvime ekleme: Google Takvim ve iPhone/Outlook için `.ics` (1 gün ve 2 saat önce hatırlatma)
- Dijital davetiye görseli, indirme ve paylaşma (WhatsApp yedekli)
- WhatsApp'ta paylaşınca görünen önizleme görseli
- Mobilde aşağı kaydırınca çıkan "Yol Tarifi" butonu
- Anılarımız: misafirler fotoğraflarını siteden yükler, Google Drive klasörüne kaydedilir (kurulum: `apps-script/README.md`)

## Yayınlama (GitHub Pages)
Settings → Pages → Source: "Deploy from a branch" → dalı ve `/ (root)` klasörünü seçin.
Adres `https://asliberkisteme.approds.com/` (alan adı `CNAME` dosyasında; GoDaddy'de `asliberkisteme` CNAME → `sancakberk.github.io`). Adres değişirse `CNAME` ile `index.html` içindeki `og:url` ve `og:image` adreslerini güncelleyin.

## Test
```bash
npx http-server -p 8080 -s .
NODE_PATH=$(npm root -g) node tests/responsive-test.cjs
```
51 cihaz boyutunda (Galaxy Fold 280px'ten masaüstüne; uzun ince 21:9, kısa geniş, yatay telefon ve tabletler dahil) giriş kapısının yerleşimi, yatay taşma, ekran dışı öğe, dokunma hedefi boyu, font yükleme, geri sayım, linkler, saat dilimi, tören anı mesajları, kopyalama ve paylaşma kontrol edilir. Ekran görüntüleri `tests/screenshots/` altına yazılır.
