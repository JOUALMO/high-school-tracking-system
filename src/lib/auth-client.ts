export type AuthRole = "admin" | "user";

export interface AuthUser {
  id: string;
  role: AuthRole;
  name?: string;
  username?: string;
  email?: string;
  phone?: string;
  selectedCurriculumId?: string | null;
}

export interface AuthApiResponse {
  token: string;
  user: AuthUser;
}

export interface StoredAuthSession extends AuthApiResponse {
  savedAt: string;
}

const AUTH_STORAGE_KEY = "studyflow.auth.session";
const AUTH_ROLE_COOKIE_KEY = "studyflow_role";
const AUTH_TOKEN_COOKIE_KEY = "studyflow_token";

export function getApiBaseUrl(): string {
  const configuredBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api";
  const normalizedBase = configuredBase.replace(/\/+$/, "");

  if (normalizedBase.startsWith("/")) {
    return normalizedBase;
  }

  if (typeof window === "undefined") {
    return normalizedBase;
  }

  try {
    const parsed = new URL(normalizedBase);
    const isConfiguredLocalHost =
      parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
    const currentHost = window.location.hostname;
    const isCurrentHostLocal =
      currentHost === "localhost" || currentHost === "127.0.0.1";

    if (isConfiguredLocalHost && !isCurrentHostLocal) {
      parsed.hostname = currentHost;
      return parsed.toString().replace(/\/+$/, "");
    }
  } catch {
    // Keep the configured value when parsing fails.
  }

  return normalizedBase;
}

export async function postAuth<TPayload extends Record<string, unknown>>(
  path: string,
  payload: TPayload,
): Promise<AuthApiResponse> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const parsed = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      parsed && typeof parsed === "object" && "message" in parsed
        ? String((parsed as { message: unknown }).message)
        : `Request failed with status ${response.status}`;

    throw new Error(message);
  }

  if (
    !parsed ||
    typeof parsed !== "object" ||
    !("token" in parsed) ||
    !("user" in parsed)
  ) {
    throw new Error("Invalid auth response from server.");
  }

  const data = parsed as { token: unknown; user: unknown };

  if (typeof data.token !== "string" || typeof data.user !== "object" || data.user === null) {
    throw new Error("Invalid auth response from server.");
  }

  return {
    token: data.token,
    user: data.user as AuthUser,
  };
}

export function saveAuthSession(session: AuthApiResponse): void {
  if (typeof window === "undefined") {
    return;
  }

  const payload: StoredAuthSession = {
    ...session,
    savedAt: new Date().toISOString(),
  };

  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(payload));
  writeCookie(AUTH_ROLE_COOKIE_KEY, session.user.role, 7);
  writeCookie(AUTH_TOKEN_COOKIE_KEY, session.token, 7);
}

export function readAuthSession(): StoredAuthSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<StoredAuthSession>;

    if (
      !parsed ||
      typeof parsed !== "object" ||
      typeof parsed.token !== "string" ||
      !parsed.user ||
      typeof parsed.user !== "object" ||
      typeof parsed.user.id !== "string" ||
      typeof parsed.user.role !== "string"
    ) {
      return null;
    }

    return parsed as StoredAuthSession;
  } catch {
    return null;
  }
}

export function clearAuthSession(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(AUTH_STORAGE_KEY);
  removeCookie(AUTH_ROLE_COOKIE_KEY);
  removeCookie(AUTH_TOKEN_COOKIE_KEY);
}

export function readAuthToken(): string | null {
  return readAuthSession()?.token ?? null;
}

export async function apiRequest<TResponse>(
  path: string,
  init: RequestInit = {},
): Promise<TResponse> {
  const token = readAuthToken();
  if (!token) {
    throw new Error("Please login first.");
  }

  const headers = new Headers(init.headers ?? {});
  if (!headers.has("content-type") && init.body) {
    headers.set("content-type", "application/json");
  }
  headers.set("authorization", `Bearer ${token}`);

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers,
  });

  const parsed = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      parsed && typeof parsed === "object" && "message" in parsed
        ? String((parsed as { message: unknown }).message)
        : `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return parsed as TResponse;
}

function writeCookie(name: string, value: string, days: number): void {
  if (typeof document === "undefined") {
    return;
  }

  const expiry = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(
    value,
  )}; expires=${expiry}; path=/; samesite=lax`;
}

function removeCookie(name: string): void {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; samesite=lax`;
}
