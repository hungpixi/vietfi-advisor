const DEFAULT_ORIGIN = "https://vietfi-advisor.vercel.app";

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

function isLocalOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    return url.hostname === "localhost" || url.hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

function isVercelDeploymentOrigin(origin: string, canonicalOrigin: string): boolean {
  try {
    const candidateUrl = new URL(origin);
    const canonicalUrl = new URL(canonicalOrigin);

    if (candidateUrl.origin === canonicalUrl.origin) return false;
    if (!candidateUrl.hostname.endsWith(".vercel.app") || !canonicalUrl.hostname.endsWith(".vercel.app")) {
      return false;
    }

    const candidateLabel = candidateUrl.hostname.replace(/\.vercel\.app$/, "");
    const canonicalLabel = canonicalUrl.hostname.replace(/\.vercel\.app$/, "");
    return candidateLabel.startsWith(`${canonicalLabel}-`);
  } catch {
    return false;
  }
}

export function resolvePreferredAppOrigin(candidate: string | null): string | null {
  const normalizedCandidate = normalizeOrigin(candidate);
  if (!normalizedCandidate) return null;
  if (isLocalOrigin(normalizedCandidate)) return normalizedCandidate;

  const canonicalOrigin = getCanonicalAppOrigin();
  if (isVercelDeploymentOrigin(normalizedCandidate, canonicalOrigin)) {
    return canonicalOrigin;
  }

  return normalizedCandidate;
}

export function getCanonicalAppOrigin(): string {
  return (
    normalizeOrigin(process.env.APP_ORIGIN) ||
    normalizeOrigin(process.env.NEXT_PUBLIC_SITE_URL) ||
    DEFAULT_ORIGIN
  );
}

export function getOriginFromHeaders(headerStore: Pick<Headers, "get">): string | null {
  const forwardedHost = headerStore.get("x-forwarded-host");
  const host = forwardedHost || headerStore.get("host");

  if (!host) return null;

  const forwardedProto = headerStore.get("x-forwarded-proto");
  const protocol = forwardedProto === "http" || forwardedProto === "https"
    ? forwardedProto
    : host.includes("localhost") || host.startsWith("127.0.0.1")
      ? "http"
      : "https";

  return resolvePreferredAppOrigin(`${protocol}://${host}`);
}

export function getBrowserAppOrigin(): string {
  if (typeof window !== "undefined") {
    return resolvePreferredAppOrigin(window.location.origin) || getCanonicalAppOrigin();
  }

  return getCanonicalAppOrigin();
}

export function safeRedirectPath(candidate: string | null | undefined, fallback = "/dashboard"): string {
  if (!candidate) return fallback;
  if (!candidate.startsWith("/") || candidate.startsWith("//") || candidate.includes("\\")) {
    return fallback;
  }

  try {
    const url = new URL(candidate, DEFAULT_ORIGIN);
    if (url.origin !== DEFAULT_ORIGIN) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

export function buildAuthCallbackUrl(origin: string, next = "/dashboard"): string {
  const callback = new URL("/auth/callback", origin);
  callback.searchParams.set("next", safeRedirectPath(next));
  return callback.toString();
}

export function getServerAuthCallbackUrl(next = "/dashboard"): string {
  return buildAuthCallbackUrl(getCanonicalAppOrigin(), next);
}

export function getBrowserAuthCallbackUrl(next = "/dashboard"): string {
  return buildAuthCallbackUrl(getBrowserAppOrigin(), next);
}
