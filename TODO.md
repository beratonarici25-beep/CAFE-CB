# Yarın yapılacaklar / Next session (2026-10-24)

## 1. Boyut hataları (önce bu)
- **Tamper dokununca çok büyüyor** (kullanıcı bildirdi). 2026-10-23'te headless Edge'de 1366 ve 375 px'te
  denendi, büyüme görülmedi: duruyor 48×62, üstüne gelince 50×65, sürüklerken 51×65 px.
  En olası sebep: tarayıcı yeni `index.html` ile **eski önbellekteki `css/bar.css`'i** birleştiriyor. O zaman
  `<img>`'lerin boyut kuralı yok, model doğal boyutunda (tamper 171×220) açılıyor.
  - Kullanıcıya sor: hangi cihaz/tarayıcı, ne zaman büyüyor (dokununca mı, sürükleyince mi, portafiltreye bırakınca mı)?
  - Düzeltme: CSS/JS linklerine sürüm ekle (`style.css?v=…`), her sprite `<img>`'e `width`/`height` attribute ver
    ki CSS gelmese bile taşmasın.
  - Bütün sprite'ların (pf, pitcher, bardak, şişe, hazne, zil, çöp) dokunma/sürükleme/bırakma boyutlarını ölçen bir test
    ekle (`tests/sizes.js`), masaüstü + telefon.
- Diğer boyut kontrolleri: telefonda öğretici balonu, tezgâh sprite oranları, müşteri sprite'ı (k=1.7'de bulanıklık?).

## 2. Her şey Blender'dan, gerçekçiye yakın
Hedef: modeller, arka planlar, müşteriler ve Ülkü/Jesica gerçekçiye yakın, hâlâ sıcak/sevimli.
Şu anki cel-shading (`tools/blender/models.py`, EEVEE) yerine **Cycles + PBR**.

Araştırıldı (2026-10-23):
- Blender 5.2 kurulu: `C:\Program Files\Blender Foundation\Blender 5.2\blender.exe`.
- GPU: **RTX 4050 Laptop (6 GB), OptiX çalışıyor**. 640×400, 64 sample + denoise test sahnesi **2,8 sn**.
- Prosedürel malzemeler çalışıyor (indirme gerekmez): ceviz (Wave rings + ramp + Coat), cam
  (Transmission 1, IOR 1.45), fırçalanmış çelik (Metallic 1, Anisotropic 0.8). Mermerin ramp'i düzeltilmeli.
- Principled BSDF girişleri (5.2): `Base Color, Metallic, Roughness, IOR, Alpha, Subsurface Weight/Radius/Scale,
  Specular IOR Level, Anisotropic, Anisotropic Rotation, Transmission Weight, Coat Weight/Roughness, Sheen Weight,
  Emission Color/Strength, Thin Film Thickness`.
- Çeliğin gerçekçi görünmesi için **HDRI ortam ışığı şart** (testte siyah/beyaz yansıdı).
  Poly Haven (CC0) erişilebilir: 96 stüdyo HDRI'si (ör. `studio_small_09`, 1K = 1,6 MB), 138 ahşap dokusu.
  **İndirmeden önce kullanıcıdan izin al.** İndirilenler `assets/CREDITS.md`'ye yazılır.
- Gerçekçi insanlar (müşteriler, Ülkü/Jesica) için seçenek: **MPFB2** (Blender için MakeHuman eklentisi, CC0 varlıklar).
  İndirme/kurulum gerektirir, önce izin al. Alternatif: prosedürel modeli SSS (cilt) + saç partikülleriyle geliştirmek.

Plan:
1. `tools/blender/models.py`'ye Cycles/PBR modu ekle (`--realistic`): GPU OptiX, AgX, denoise, HDRI + key light.
2. Malzeme kütüphanesi: paslanmaz çelik, krom, pirinç, ceviz, mermer, seramik, kâğıt/karton, cam, süt, kahve, kauçuk.
3. Ekipmanı yeniden render et (aynı dosya adları, oyun kodu değişmeden). Kontrol sayfasında karşılaştır.
4. Makine gövdesi, öğütücü gövdesi, tezgâh üstü (mermer) ve önü (ceviz) de render olsun (şu an CSS).
5. Arka planlar: kafe duvarı, oturma alanı, arka raflar (`backbar.svg`), giriş ekranı. Blender'da 3D sahne kur,
   katman katman (uzak/orta/ön) render et; parallax katmanları korunur.
6. Müşteriler: gerçekçi gövde/saç; yüz ifadeleri ya render (ifade başına) ya da canvas çizimi; karar ver.
7. Ülkü/Jesica: gözlük, ombre saç, önlük; pozlar (konuşma, işaret, sevinç, uyarı, el sallama) render.
8. Boyut bütçesi: toplam görseller ~2 MB altında, WebP, @2x. Telefon performansını ölç.
9. Her adımdan sonra: `tests/e2e.js`, `tests/tutorial.js`, `tests/fuzz.js 3000`, `FUZZ_TUT=1 tests/fuzz.js 1500`.
