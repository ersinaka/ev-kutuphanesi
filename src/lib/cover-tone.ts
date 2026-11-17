const TONES = [
  { bg: "#1f4d3a", fg: "#e8f2ec" },
  { bg: "#243447", fg: "#e6eef7" },
  { bg: "#4a3428", fg: "#f3ebe3" },
  { bg: "#3a2f4a", fg: "#efe8f7" },
  { bg: "#5a2f2f", fg: "#f7eaea" },
  { bg: "#2f4550", fg: "#e6f0f4" },
] as const;

export function coverTone(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return TONES[hash % TONES.length];
}
