const USER_AGENT =
  "EvKutuphanesi/1.0 (https://github.com/ersinaka/ev-kutuphanesi)";

type FetchJsonOptions = {
  timeoutMs?: number;
  revalidate?: number | false;
};

export async function fetchJson<T>(
  url: string,
  options: FetchJsonOptions = {},
): Promise<T | null> {
  const { timeoutMs = 8000, revalidate = 0 } = options;

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": USER_AGENT,
      },
      signal: AbortSignal.timeout(timeoutMs),
      ...(revalidate === false
        ? { cache: "no-store" as const }
        : { next: { revalidate } }),
    });

    if (!response.ok) return null;

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("json")) return null;

    return (await response.json()) as T;
  } catch {
    return null;
  }
}
