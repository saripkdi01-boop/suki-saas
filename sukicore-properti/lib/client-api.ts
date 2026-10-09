'use client';

/** Helper fetch untuk client components. */
export interface ApiResult<T = unknown> {
  ok: boolean;
  data?: T;
  meta?: { page: number; per_page: number; total: number };
  error?: string;
}

async function handle<T>(res: Response): Promise<ApiResult<T>> {
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, error: json?.error?.message ?? `HTTP ${res.status}` };
  }
  return { ok: true, data: json.data as T, meta: json.meta };
}

export async function apiGet<T>(path: string): Promise<ApiResult<T>> {
  const res = await fetch(path);
  return handle<T>(res);
}

export async function apiPost<T>(path: string, body: unknown): Promise<ApiResult<T>> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return handle<T>(res);
}

export async function apiPut<T>(path: string, body: unknown): Promise<ApiResult<T>> {
  const res = await fetch(path, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return handle<T>(res);
}

export async function apiDelete(path: string): Promise<ApiResult> {
  const res = await fetch(path, { method: 'DELETE' });
  return handle(res);
}
