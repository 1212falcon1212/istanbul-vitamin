/**
 * Server-side API fetch helper.
 * Does NOT use localStorage — safe for Server Components.
 */

const API_URL = process.env.API_URL || "http://localhost:8080/api/v1";

export async function fetchAPI<T>(
  endpoint: string,
  options?: { revalidate?: number }
): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${endpoint}`, {
      next: { revalidate: options?.revalidate ?? 60 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return unwrap(json) as T;
  } catch {
    return null;
  }
}

function unwrap(json: unknown): unknown {
  if (!json || typeof json !== "object") return json;
  const obj = json as Record<string, unknown>;
  const data = "data" in obj ? obj.data : obj;
  if (!data || typeof data !== "object" || Array.isArray(data)) return data;
  // Backend sık sık {category:{...}} / {product:{...}} / {orders:[...]} şeklinde sarar
  const keys = Object.keys(data as Record<string, unknown>);
  if (keys.length === 1) {
    return (data as Record<string, unknown>)[keys[0]];
  }
  return data;
}

export async function fetchPaginatedAPI<T>(
  endpoint: string,
  options?: { revalidate?: number }
): Promise<{ data: T[]; pagination: { page: number; per_page: number; total: number; total_pages: number } } | null> {
  try {
    const res = await fetch(`${API_URL}${endpoint}`, {
      next: { revalidate: options?.revalidate ?? 60 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return {
      data: json.data ?? [],
      pagination: json.pagination ?? { page: 1, per_page: 20, total: 0, total_pages: 0 },
    };
  } catch {
    return null;
  }
}
