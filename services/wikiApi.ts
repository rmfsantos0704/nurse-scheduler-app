const WIKI_USER_AGENT = "SnowEd/1.0 (Mobile Nursing Scheduler App; contact@snowedapp.com)";

export async function wikiFetch(url: string, retries = 2): Promise<any> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": WIKI_USER_AGENT,
      "Api-User-Agent": WIKI_USER_AGENT,
      "Accept": "application/json",
    },
  });

  // If rate-limited, check Retry-After header and wait before retrying
  if (response.status === 429 && retries > 0) {
    const retryAfterHeader = response.headers.get("Retry-After");
    const retryAfterSeconds = retryAfterHeader ? Number(retryAfterHeader) : NaN;
    const retryAfterDate = retryAfterHeader ? Date.parse(retryAfterHeader) : NaN;
    const waitMilliseconds = Number.isFinite(retryAfterSeconds)
      ? Math.max(0, retryAfterSeconds * 1000)
      : Number.isFinite(retryAfterDate)
        ? Math.max(0, retryAfterDate - Date.now())
        : 2000;

    await new Promise((resolve) => setTimeout(resolve, waitMilliseconds));
    return wikiFetch(url, retries - 1);
  }

  if (!response.ok) {
    throw new Error(`Wikipedia API error: HTTP status ${response.status}`);
  }

  return response.json();
}