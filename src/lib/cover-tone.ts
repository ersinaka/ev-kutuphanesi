const TONES = [
  { bg: "#2f6f6a", fg: "#f2fffc" },
  { bg: "#d4553a", fg: "#fff5f1" },
  { bg: "#3d6eb5", fg: "#f0f6ff" },
  { bg: "#c49a1a", fg: "#fff9e8" },
  { bg: "#5a8f4a", fg: "#f3fff0" },
  { bg: "#8b4f8f", fg: "#fdf5ff" },
] as const;

export function coverTone(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return TONES[hash % TONES.length];
}
