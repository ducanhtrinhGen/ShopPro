const GOOGLE_AUTH_ERROR_MESSAGES: Record<string, string> = {
  google_not_configured: "Google login is not configured on the backend.",
  google_auth_failed: "Google authentication failed. Please try again.",
  google_profile_incomplete: "Google account profile is incomplete for ShopPro login.",
  google_account_conflict: "This email is already linked to a different Google account.",
  oauth2_account_not_found: "Cannot load account information after Google login.",
  oauth2_account_inactive: "Your account is inactive or locked."
};

const BACKEND_ORIGIN = readBackendOrigin();

export function startGoogleAuth() {
  window.location.href = `${BACKEND_ORIGIN}/oauth2/authorization/google`;
}

export function readGoogleAuthErrorMessage(search: string): string | null {
  const errorCode = new URLSearchParams(search).get("oauthError");
  if (!errorCode) {
    return null;
  }

  return GOOGLE_AUTH_ERROR_MESSAGES[errorCode] ?? "Cannot continue with Google login. Please try again.";
}

export function readRequestedRedirectPath(search: string): string | undefined {
  const redirectPath = new URLSearchParams(search).get("from");
  return normalizeRedirectPath(redirectPath) ?? undefined;
}

export function readCurrentRelativePath() {
  return normalizeRedirectPath(`${window.location.pathname}${window.location.search}`) ?? undefined;
}

function readBackendOrigin(): string {
  const raw = ((import.meta.env.VITE_BACKEND_ORIGIN ?? import.meta.env.VITE_API_URL ?? "") as string).trim();
  if (raw) {
    return raw.endsWith("/") ? raw.slice(0, -1) : raw;
  }

  if (import.meta.env.PROD) {
    return "https://api.shoppro.id.vn";
  }
  return "http://localhost:8080";
}

function normalizeRedirectPath(path?: string | null) {
  if (!path) {
    return null;
  }

  const normalized = path.trim();
  if (!normalized || !normalized.startsWith("/") || normalized.startsWith("//")) {
    return null;
  }

  return normalized;
}
