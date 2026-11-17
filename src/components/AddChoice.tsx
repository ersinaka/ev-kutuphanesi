import Link from "next/link";
import type { ContentType } from "@/lib/types";

const choices: {
  type: ContentType;
  label: string;
  hint: string;
  icon: string;
  className: string;
}[] = [
  {
    type: "book",
    label: "Kitap",
    hint: "ISBN ile veya kitap adıyla ara",
    icon: "📖",
    className: "choice-card choice-book",
  },
  {
    type: "movie",
    label: "Film",
    hint: "TMDB'den film ara",
    icon: "🎬",
    className: "choice-card choice-movie",
  },
  {
    type: "tv",
    label: "Dizi",
    hint: "TMDB'den dizi ara",
    icon: "📺",
    className: "choice-card choice-tv",
  },
];

export function AddChoice({ active }: { active?: ContentType }) {
  return (
    <section className="stack-lg">
      <div className="page-copy">
        <p className="eyebrow">Yeni kayıt</p>
        <h1 className="page-title">Ne eklemek istiyorsun?</h1>
      </div>

      <div className="choice-grid">
        {choices.map((choice) => (
          <Link
            key={choice.type}
            href={`/ekle?type=${choice.type}`}
            className={`${choice.className}${active === choice.type ? " is-active" : ""}`}
          >
            <span className="choice-icon" aria-hidden>
              {choice.icon}
            </span>
            <strong className="choice-label">{choice.label}</strong>
            <span className="choice-hint">{choice.hint}</span>
            <span className="choice-arrow" aria-hidden>
              →
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
