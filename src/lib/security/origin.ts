const LOCAL_ORIGIN = "http://localhost:3000";

function normalizeOrigin(candidate: string | undefined | null): string | null {
  if (!candidate) return null;

  const withProtocol = candidate.startsWith("http://") || candidate.startsWith("https://")
    ? candidate
    : `https://${candidate}`;

  try {
    const url = new URL(withProtocol);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function getCanonicalAppOrigin(): string {
  return (
    normalizeOrigin(process.env.APP_ORIGIN) ||
    normalizeOrigin(process.env.NEXT_PUBLIC_SITE_URL) ||
    normalizeOrigin(process.env.VERCEL_URL) ||
    LOCAL_ORIGIN
  );
}

export function getBrowserAppOrigin(): string {
  if (typeof window !== "undefined") {
    return normalizeOrigin(window.location.origin) || LOCAL_ORIGIN;
  }

  return getCanonicalAppOrigin();
}

export function safeRedirectPath(candidate: string | null | undefined, fallback = "/dashboard"): string {
  if (!candidate) return fallback;
  if (!candidate.startsWith("/") || candidate.startsWith("//") || candidate.includes("\\")) {
    return fallback;
  }

  try {
    const url = new URL(candidate, LOCAL_ORIGIN);
    if (url.origin !== LOCAL_ORIGIN) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

export function buildAuthCallbackUrl(origin: string, next = "/dashboard"): string {
  const callback = new URL("/auth/confirm", origin);
  callback.searchParams.set("next", safeRedirectPath(next));
  return callback.toString();
}

export function getServerAuthCallbackUrl(next = "/dashboard"): string {
  return buildAuthCallbackUrl(getCanonicalAppOrigin(), next);
}

export function getBrowserAuthCallbackUrl(next = "/dashboard"): string {
  return buildAuthCallbackUrl(getBrowserAppOrigin(), next);
}
