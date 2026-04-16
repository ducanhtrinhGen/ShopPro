export class ApiRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
  }
}

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};

type UnauthorizedHandler = () => void;

let unauthorizedHandler: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  unauthorizedHandler = handler;
}

function readApiBaseUrl(): string {
  const raw = (import.meta.env.VITE_API_URL ?? "").trim();
  if (!raw) {
    return "";
  }
  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
}

const API_BASE_URL = readApiBaseUrl();

export function withApiBaseUrl(path: string): string {
  if (!path) {
    return path;
  }

  // Don't touch absolute URLs (e.g. Cloudinary links, external resources).
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  // Normalize mistaken relative API paths like "api/products" -> "/api/products".
  if (!path.startsWith("/") && path.startsWith("api/")) {
    path = `/${path}`;
  }

  if (!API_BASE_URL) {
    // Local dev: rely on Vite proxy / same-origin.
    return path;
  }

  if (!path.startsWith("/")) {
    return `${API_BASE_URL}/${path}`;
  }

  return `${API_BASE_URL}${path}`;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const hasBody = options.body !== undefined;
  const headers = new Headers(options.headers ?? {});

  if (hasBody && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(withApiBaseUrl(path), {
    method: options.method ?? "GET",
    credentials: "include",
    headers,
    body: hasBody ? JSON.stringify(options.body) : undefined
  });

  const rawBody = await response.text();

  if (!response.ok) {
    if (response.status === 401) {
      unauthorizedHandler?.();
    }

    const jsonBody = parseJsonSafely<{ message?: string }>(rawBody);
    let message = jsonBody?.message ?? `Yêu cầu thất bại với mã ${response.status}`;

    if (response.status >= 500) {
      const bodyLower = rawBody.toLowerCase();
      if (bodyLower.includes("econnrefused") || bodyLower.includes("proxy error")) {
        message = "Không thể kết nối backend. Hãy bật backend rồi thử lại.";
      }
    }

    throw new ApiRequestError(message, response.status);
  }

  if (response.status === 204 || !rawBody) {
    return undefined as T;
  }

  const data = parseJsonSafely<T>(rawBody);
  if (data === undefined) {
    throw new ApiRequestError("Định dạng phản hồi từ máy chủ không hợp lệ.", 500);
  }

  return data;
}

function parseJsonSafely<T>(rawText: string): T | undefined {
  if (!rawText) {
    return undefined;
  }

  try {
    return JSON.parse(rawText) as T;
  } catch {
    return undefined;
  }
}
