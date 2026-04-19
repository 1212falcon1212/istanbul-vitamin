import type { APIResponse, PaginatedResponse } from "@/types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";

type RequestOptions = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  cache?: RequestCache;
  next?: NextFetchRequestConfig;
};

function getAuthToken(endpoint: string): string | null {
  if (typeof window === "undefined") return null;
  // Admin endpoint'leri admin token'ını kullanır, diğerleri user token'ını —
  // iki oturum aynı tarayıcıda eş zamanlı açık olabilir.
  if (endpoint.startsWith("/admin")) {
    return localStorage.getItem("admin_token");
  }
  return localStorage.getItem("auth_token");
}

async function request<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = "GET", body, headers = {}, cache, next } = options;

  const token = getAuthToken(endpoint);
  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...headers,
  };

  if (token) {
    requestHeaders["Authorization"] = `Bearer ${token}`;
  }

  const url = endpoint.startsWith("http")
    ? endpoint
    : `${API_BASE_URL}${endpoint}`;

  const res = await fetch(url, {
    method,
    headers: requestHeaders,
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include", // HttpOnly auth_token cookie'yi gönder
    cache,
    next,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new APIError(
      data.error || "Bir hata oluştu",
      res.status,
      data
    );
  }

  // Backend bazen `{data: {orders: [...], pagination: {...}}}` şeklinde sarmalı döndürür.
  // Çağıran `T[]` beklediyse iç array'i otomatik çıkar.
  if (data && typeof data === "object" && "data" in data) {
    const inner = (data as { data: unknown }).data;
    if (
      inner &&
      typeof inner === "object" &&
      !Array.isArray(inner) &&
      !hasObjectShape(inner)
    ) {
      const arr = firstArrayValue(inner);
      if (arr !== null) {
        (data as { data: unknown }).data = arr;
      }
    }
  }

  return data as T;
}

function hasObjectShape(v: unknown): boolean {
  // İç nesne "model" gibi görünüyorsa (id/slug/email vs) dokunma — sadece list sarmalını çöz
  if (!v || typeof v !== "object") return false;
  const keys = Object.keys(v as Record<string, unknown>);
  const modelKeys = ["id", "slug", "email", "name", "title"];
  return keys.some((k) => modelKeys.includes(k));
}

function firstArrayValue(v: unknown): unknown[] | null {
  if (!v || typeof v !== "object") return null;
  for (const val of Object.values(v as Record<string, unknown>)) {
    if (Array.isArray(val)) return val;
  }
  return null;
}

export class APIError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = "APIError";
    this.status = status;
    this.data = data;
  }
}

// Convenience methods
export const api = {
  get<T>(endpoint: string, options?: Omit<RequestOptions, "method" | "body">) {
    return request<APIResponse<T>>(endpoint, { ...options, method: "GET" });
  },

  getList<T>(
    endpoint: string,
    options?: Omit<RequestOptions, "method" | "body">
  ) {
    return request<PaginatedResponse<T>>(endpoint, {
      ...options,
      method: "GET",
    });
  },

  post<T>(endpoint: string, body?: unknown, options?: RequestOptions) {
    return request<APIResponse<T>>(endpoint, {
      ...options,
      method: "POST",
      body,
    });
  },

  put<T>(endpoint: string, body?: unknown, options?: RequestOptions) {
    return request<APIResponse<T>>(endpoint, {
      ...options,
      method: "PUT",
      body,
    });
  },

  patch<T>(endpoint: string, body?: unknown, options?: RequestOptions) {
    return request<APIResponse<T>>(endpoint, {
      ...options,
      method: "PATCH",
      body,
    });
  },

  delete<T>(endpoint: string, options?: RequestOptions) {
    return request<APIResponse<T>>(endpoint, { ...options, method: "DELETE" });
  },
};
