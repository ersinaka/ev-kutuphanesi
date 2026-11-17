type BookCoverProps = {
  title: string;
  coverUrl?: string | null;
  className?: string;
};

export function BookCover({ title, coverUrl, className = "" }: BookCoverProps) {
  if (coverUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={coverUrl}
        alt={`${title} kapağı`}
        className={className}
        loading="lazy"
      />
    );
  }

  return (
    <div className={`book-cover-fallback ${className}`.trim()}>
      <span>{title}</span>
    </div>
  );
}
