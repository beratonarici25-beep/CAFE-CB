# CAFE C&B: Claude Code için notlar

Kullanıcıyla Türkçe konuş. Oyun TR/EN bir barista simülatörü; yapı ve testler için `README.md`'ye bak.

## "Demoya başlıyoruz" denince
Kullanıcı **"demoya başlıyoruz"** (veya benzeri: "demoya başla", "demo işlerine başla") dediğinde, **#24 Yol haritası** issue'sundaki **"1. Demo"** bölümüne göre çalış:

1. `gh issue view 24 --comments` ile yol haritasını oku.
2. Sıradaki işaretlenmemiş issue'yu seç. Başlamadan önce o issue'yu **yorumlarıyla birlikte** oku (`gh issue view <no> --comments`); sonradan eklenen kullanıcı kararları yorumlarda ve issue'nun en üstünde.
3. İşi yap (testleri sadece kullanıcı "test et" derse çalıştır), commit at, issue'yu kapat ve #24'teki maddeyi işaretle. Kullanıcıya kısaca ne bittiğini söyle, sonra sıradakine geç.

Demo sırası (#24 ile aynı):
1. #27 Mobil: Android APK + iPhone'da bağlantıdan direkt oynama (fontlar da burada oyunun içine alınır)
2. #15 Küçük arayüz hataları
3. #14 Ekrana sığma (yatay)
4. #23 Ülkü/Jesica konuşurken büyük
5. #21 Tarif dükkânı: içecekler oyun parasıyla açılır
6. #16 Görsel tarz denemesi (B tarzı). **Kullanıcı bir varyasyon seçmeden #17'ye geçme.** Bu iş kullanıcının seçimini beklediği için erken başlatmak iyi olur; görseller 1-5 ile paralel yürüyebilir.
7. #17 Bütün kafe tek Blender sahnesi + makineler tezgâh üstünde
8. #18 Karakter modelleri: **beklemede**, kullanıcı planını paylaşınca
9. #28 Açılış animasyonu: **hazır** (`acilis-animasyonu` dalında, `assets/intro/`), demo işleri bitince oyuna ekle; ayrıntı #28 yorumunda
10. #26 Kapak görseli: **hazır**, kullanıcı logoyu verdi (`assets/cover/cafecb-logo-orijinal.jpg`); ayrıntı #26 yorumunda
11. #25 Demo paketi (7 gün, demo bitti ekranı, APK + bağlantı)

`beklemede` etiketli issue'lara kullanıcı etiketi kaldırmadan veya açıkça istemeden **başlama**. Sıra onlara gelince kullanıcıya ne beklendiğini hatırlat ve beklemeyenlere devam et.

## Kullanıcı kararları (özet; ayrıntı issue'larda)
- **Demo sadece telefonda.** Bilgisayardan oynayan olmayacak; exe (#13) demodan sonra.
- Kullanıcı sadece **dosya (Android APK) veya bağlantı (iPhone)** gönderecek, arkadaşlar **direkt oyuna girecek**. QR kodu, talimat, "ana ekrana ekle" şartı yok.
- **2026-10-25 kararı:** Arkadaşlar iPhone kullanıyor; demo **GitHub Pages bağlantısıyla** gönderilecek. Android APK (Capacitor) şimdilik yapılmıyor, Android'li biri çıkarsa sonra. Fontlar oyunun içinde (`assets/fonts/`, OFL).
- Mobilde görünüm **yatay**; telefonda **sorunsuz** çalışması önemli. Her değişikliği telefon yatayda da kontrol et.
- Görsel tarz **B**: Good Pizza, Great Pizza'nın sevimliliği ve okunaklılığı, ama düz 2D değil; yumuşak 3D gölge, gerçek malzemeler, sevimli ama gerçekçiye yakın oranlar.
- **Model tasarımı önemli:** demo, bütün görseller (kafe, makineler, karakterler) bitmeden verilmez.
- İçecekler **oyun parasıyla** açılır (günle otomatik değil).
- Hikâye ve müdavimler (#22): beklemede, demoya dahil değil.

## Her işte kurallar
- Testleri **sadece kullanıcı "test et" deyince** çalıştır: `node tests/e2e.js`, `node tests/tutorial.js`, `node tests/fuzz.js 3000`, `FUZZ_TUT=1 node tests/fuzz.js 1500` (+ işle eklenen yeni testler).
- Bir işte projenin tamamını okuma; sadece işle ilgili dosyalara/bölümlere bak.
- Her yeni metin `en` ve `tr` (`js/i18n.js`).
- Eski kayıtlar bozulmamalı.
- İnternetten bir şey (HDRI, doku, model, eklenti, font) **indirmeden önce kullanıcıdan izin al**; sadece açık lisanslı kaynaklar, `assets/CREDITS.md`'ye yaz.
- Gereken araçları (Android SDK, JDK vb.) iş başladığında kurmak sorun değil; önceden kurma.
- Web sürümü (GitHub Pages, `index.html`) derleme olmadan çalışmaya devam etmeli; iPhone'lular demoyu buradan oynayacak.
