import { BookCover } from "@/components/BookCover";
import { ImportExportPanel } from "@/components/ImportExportPanel";
import { ProfileEditor } from "@/components/ProfileEditor";
import type { Book, BookComment, Profile, PublicReadBook } from "@/lib/types";

type ProfileViewProps = {
  profile: Profile;
  readBooks: PublicReadBook[];
  comments: BookComment[];
  isOwn: boolean;
  backupBooks?: Book[];
};

function initials(profile: Profile) {
  const source = profile.display_name || profile.username;
  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase("tr") ?? "")
    .join("");
}

function Stars({ rating }: { rating: number | null }) {
  if (!rating) return null;
  return <span className="review-score">{"★".repeat(rating)}</span>;
}

export function ProfileView({
  profile,
  readBooks,
  comments,
  isOwn,
  backupBooks = [],
}: ProfileViewProps) {
  return (
    <div className="stack-lg">
      <section className="panel profile-hero">
        <div className="profile-avatar">
          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatar_url} alt={`${profile.username} avatarı`} />
          ) : (
            <span>{initials(profile)}</span>
          )}
        </div>
        <div className="stack-sm">
          <h1 className="page-title">
            {profile.display_name || profile.username}
          </h1>
          <p className="book-meta">@{profile.username}</p>
          {profile.bio ? <p className="page-lead">{profile.bio}</p> : null}
          <div className="chip-row">
            <span className="chip chip-accent">{readBooks.length} okunan</span>
            <span className="chip">{comments.length} yorum</span>
          </div>
        </div>
      </section>

      {isOwn ? <ProfileEditor profile={profile} /> : null}

      {isOwn ? <ImportExportPanel books={backupBooks} embedded /> : null}

      <section className="stack-md">
        <div className="section-head">
          <h2 className="section-title">Okuduğu kitaplar</h2>
          <span className="muted-note">{readBooks.length} kitap</span>
        </div>

        {readBooks.length ? (
          <div className="profile-book-grid">
            {readBooks.map((book) => (
              <article key={book.id} className="profile-book">
                <div className="profile-book-cover">
                  <BookCover
                    title={book.title}
                    coverUrl={book.cover_url}
                    className="profile-cover-img"
                  />
                </div>
                <h3 className="book-title">{book.title}</h3>
                <p className="book-meta">
                  {book.authors.length ? book.authors.join(", ") : "Yazar yok"}
                </p>
                <div className="chip-row">
                  <Stars rating={book.rating} />
                  {book.finished_at ? (
                    <span className="chip">{book.finished_at}</span>
                  ) : null}
                </div>
                {book.review ? (
                  <p className="clamp-3 profile-review">{book.review}</p>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <p className="muted-note">
            Henüz okundu olarak işaretlenmiş kitap yok.
          </p>
        )}
      </section>

      <section className="stack-md">
        <div className="section-head">
          <h2 className="section-title">Kitap yorumları</h2>
          <span className="muted-note">{comments.length} yorum</span>
        </div>

        {comments.length ? (
          <div className="profile-comment-list">
            {comments.map((comment) => (
              <blockquote key={comment.id} className="review-quote">
                <div className="profile-comment-head">
                  <strong>{comment.title}</strong>
                  {comment.authors.length ? (
                    <span className="book-meta">
                      {comment.authors.join(", ")}
                    </span>
                  ) : null}
                  <Stars rating={comment.rating} />
                  <span className="muted-note">
                    {comment.updated_at.slice(0, 10)}
                  </span>
                </div>
                {comment.body ? <p>{comment.body}</p> : null}
              </blockquote>
            ))}
          </div>
        ) : (
          <p className="muted-note">Henüz kitap yorumu yok.</p>
        )}
      </section>
    </div>
  );
}
