# Ev Kütüphanesi

Evdeki kitaplarını kaydet, ISBN veya isimle ara, aynı kitabı tekrar alma.
Her kullanıcının kendi rafı, profili ve okuduğu kitaplara yorumları vardır.

## Özellikler

- E-posta/şifre ile giriş ve kayıt (Supabase Auth)
- Kişiye özel kütüphane (RLS: sadece kendi kitapların)
- Profil: görünen ad, kullanıcı adı, avatar, biyografi
- Profilde okunan kitaplar ve kitap yorumları (`/profil/kullaniciadi`)
- Okuma durumu (okunacak / okunuyor / okundu) ve puan + yorum
- Ödünç takibi, raf haritası, arama/filtre/sıralama
- Open Library + Google Books katalog araması, barkod tarama, toplu ISBN
- Benzer başlık-yazar için çift kayıt uyarısı
- CSV/JSON yedekleme (kendi profilinde), PWA
- Katalog önbelleği: tarayıcı (7 gün) + Supabase (30 gün) + kitap başına kalıcı metadata
- `/ekle` içinden kitap, film veya dizi seçimi
- TMDB ile film (`/search/movie`) ve dizi (`/search/tv`) arama, afiş/metadata kaydı
- Kullanıcı + tür + TMDB ID bazında tekrar kayıt koruması; `/medya` listesi

## Kurulum

```bash
npm install
cp .env.example .env.local
npm run dev
```

`.env.local` içine Supabase URL ve anon key yaz:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
# Opsiyonel ama Vercel için önerilir (Google Books IP kotası):
GOOGLE_BOOKS_API_KEY=...
# Film/dizi araması için zorunlu; sadece sunucuda kullanılır, tarayıcıya gönderilmez:
TMDB_API_KEY=...
```

## Supabase migration (zorunlu)

`supabase/migrations/` altındaki SQL dosyalarını sırasıyla Supabase SQL Editor'da
çalıştır.

`202611170005_auth_profiles_comments_cache.sql`:

- `books` tablosuna `user_id` ekler, eski kayıtları ilk kayıtlı kullanıcıya atar
- ISBN benzersizliğini **kullanıcı başına** yapar
- Anon CRUD politikalarını kaldırır; kitaplar sadece sahibi tarafından görülür/değiştirilir
- `profiles`, `book_comments` ve `book_metadata` tablolarını oluşturur
- Yorumları `books.review`/`rating` alanlarından otomatik senkronize eder
- Profil için okunan kitapları döndüren güvenli RPC fonksiyonunu ekler

`20261117120000_media_items.sql`:

- `books` tablosuna varsayılan `book` değeriyle `content_type` ekler
- `media_items` tablosunu oluşturur: TMDB kimliği, afiş, metadata, izleme durumu,
  puan/yorum ve `(user_id, content_type, tmdb_id)` benzersizliği
- Kitapları ve filmleri/dizileri birlikte sunan `library_items` görünümünü ekler
- Yeni tabloda da sadece kaydın sahibi okuma/yazma/silme yapabilir (RLS)

İlk kullanıcı kaydolurken eski (auth öncesi) kitaplar otomatik olarak ona atanır.
E-posta onayı açıksa kayıttan sonra gelen bağlantıyı onaylaman gerekir;
yönlendirme `/auth/callback` üzerinden yapılır.

## Önbellek nasıl çalışır?

1. Tarayıcı aynı aramayı 7 gün boyunca `localStorage`'dan okur.
2. Sunucu, arama sonucunu `catalog_cache` tablosunda 30 gün tutar.
3. Her kitabın metadata'sı ISBN ve başlık anahtarıyla `book_metadata` tablosunda
   süresiz saklanır; aynı kitap ikinci kez API'den çekilmez.
4. Kütüphanende zaten olan bir kitap ISBN ile arandığında doğrudan kendi
   kaydından döndürülür, dış API çağrılmaz.

## Not

Proje Vercel + Supabase için yapılandırılmıştır. `proxy.ts` oturumsuz kullanıcıları
`/giris` sayfasına yönlendirir; asıl güvenlik Supabase RLS ve sunucu tarafındaki
veri erişim katmanı (`src/lib/dal.ts`) tarafından sağlanır.
