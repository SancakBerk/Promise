# Fotoğraf yükleme kurulumu (5 dakika)

Sitedeki "Anılarımız" bölümü, misafirlerin seçtiği fotoğrafları bu küçük Google betiğine gönderir; betik de onları Drive klasörüne kaydeder. Misafirlerin Google hesabı açması gerekmez.

1. https://script.google.com adresine fotoğrafların duracağı Google hesabıyla girin → **Yeni proje**.
2. Açılan `Kod.gs` dosyasının içini silin, bu klasördeki `Code.gs` dosyasının tamamını yapıştırın. Proje adını "Aslı Berk Fotoğraf" yapın.
3. Üstteki fonksiyon listesinden **testFolder** seçip **Çalıştır**'a basın. İzin ister:
   *İzinleri incele → hesabınızı seçin → Gelişmiş → Aslı Berk Fotoğraf (güvenli değil) sayfasına git → İzin ver.*
   (Uyarı, betiği Google'a doğrulatmadığımız için çıkar; betik sizin hesabınızda, yalnız sizin klasörünüze yazar.)
4. Sağ üstte **Dağıt → Yeni dağıtım** → tür olarak **Web uygulaması**:
   - Şu kullanıcı olarak çalıştır: **Ben**
   - Erişimi olan kullanıcılar: **Herkes**
   → **Dağıt**.
5. Verilen **Web uygulaması URL**'sini (`https://script.google.com/macros/s/.../exec`) kopyalayın.
6. `index.html` içinde `id="fotograflar"` bölümündeki `data-endpoint=""` alanına yapıştırın.

Klasörü değiştirmek için `Code.gs` içindeki `FOLDER_ID` değerini yeni klasör adresindeki `/folders/` sonrasındaki kısımla değiştirin ve **Dağıt → Dağıtımları yönet → düzenle → Yeni sürüm** ile yeniden yayınlayın (URL değişmez).

Dosya adları `2026-11-14_19-32-05_Ayşe Yılmaz_IMG_1234.jpg` biçimindedir; misafir adı sorulmadığı için "Misafir" yazar.
