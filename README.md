# Ev Kütüphanesi

Evdeki kitaplarını kaydet, ISBN veya isimle ara, ayni kitabi tekrar alma.

## Ozellikler

- Kütüphane listesi, anlik arama, filtre ve sıralama
- Raf haritası (oda / raf grupları)
- Kitap detay + düzenleme
- Okuma durumu (okunacak / okunuyor / okundu)
- Ödünç takibi (kimde, veriliş, dönüş)
- Open Library + Google Books katalog araması
- Barkod / kamera ile ISBN tarama
- Toplu ISBN ekleme
- Benzer başlık-yazar için çift kayıt uyarısı
- İstatistikler
- CSV / JSON dışa ve içe aktarma
- PWA (ana ekrana ekle)
- Veri: Supabase Postgres

## Kurulum

```bash
npm install
cp .env.example .env.local
```

`.env.local` icine Supabase URL ve anon key yaz:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

Calistir:

```bash
npm run dev
```

Tarayicide: [http://localhost:3000](http://localhost:3000)

## Supabase

Proje: `ev-kutuphanesi` (eu-west-1)

Tablo: `books` — ISBN unique index, okuma durumu ve ödünç alanları, RLS acik (anon CRUD, tek ev kullanimi icin).

## Not

Bu surum tek ev / paylasimli kullanim icin anon erisimle calisir. Ileride giris (auth) eklenebilir.
