import { coverTone } from "@/lib/cover-tone";

type BookCoverProps = {
  title: string;
  coverUrl?: string | null;
  className?: string;
  variant?: "cover" | "spine";
};

export function BookCover({
  title,
  coverUrl,
  className = "",
  variant = "cover",
}: BookCoverProps) {
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

  const tone = coverTone(title);

  if (variant === "spine") {
    return (
      <div
        className={`book-spine-fallback ${className}`.trim()}
        style={{ background: tone.bg, color: tone.fg }}
      >
        <span>{title}</span>
      </div>
    );
  }

  return (
    <div
      className={`book-cover-fallback ${className}`.trim()}
      style={{ background: tone.bg, color: tone.fg }}
    >
      <span>{title}</span>
    </div>
  );
}
