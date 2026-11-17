"use client";

import { useState } from "react";
import { tmdbImageUrl } from "@/lib/media";

type MediaPosterProps = {
  title: string;
  path?: string | null;
  size?: "w342" | "w500" | "w780";
  className?: string;
};

export function MediaPoster({
  title,
  path,
  size = "w500",
  className = "",
}: MediaPosterProps) {
  const [failed, setFailed] = useState(false);
  const url = tmdbImageUrl(path, size);

  if (!url || failed) {
    return (
      <div className={`media-poster-fallback ${className}`.trim()} aria-label={title}>
        <span aria-hidden>◫</span>
        <span className="media-poster-fallback-title">{title}</span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={`${title} posteri`}
      className={className}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
