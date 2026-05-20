# 🌍 Müşteri önizleme (özel teklif linki)

**Sadece bu klasördeki dosyaları düzenle** — müşteriye gönderdiğin önizleme linki burada.

| Dosya | Ne işe yarar |
|-------|----------------|
| **`index.html`** | Tüm site (Finlandiya örneği dolu) |
| `effects.js` | Küçük animasyonlar |
| `robots.txt` | Arama motorlarına “indexleme” |

## Ne zaman burayı değiştirirsin?

- Helsinki / başka ülkeden kalkış
- Tek bir müşteriye veya gruba özel fiyat ve program
- Göndermeden önce kontrol ettiğin link

## Yerel önizleme

```bash
cd musteri-onizleme
npx --yes serve . -p 3001
```

Tarayıcı: http://localhost:3001  
Üstte mavi **“Private preview”** şeridi görürsün.

## Yeni müşteri = klasör kopyala

```bash
cd ..
cp -r musteri-onizleme musteri-onizleme-finlandiya-ahmet
```

Sonra sadece `musteri-onizleme-finlandiya-ahmet/index.html` içeriğini güncelle.

## Ana site (Türkiye)

**Bu klasör değil.** Halka açık site → `../ana-site/`
