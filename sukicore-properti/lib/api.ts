/** Helper konsisten untuk Route Handlers. */

export function ok<T>(data: T, meta?: Record<string, unknown>, status = 200): Response {
  return Response.json({ data, ...(meta ? { meta } : {}) }, { status });
}

export function err(code: string, message: string, status = 400): Response {
  return Response.json({ error: { code, message } }, { status });
}

export interface PageParams {
  page: number;
  perPage: number;
  q: string;
}

/** Ambil parameter pagination + search dari URL. */
export function pageParams(url: string | URL, defaultPerPage = 20): PageParams {
  const u = typeof url === 'string' ? new URL(url) : url;
  const page = Math.max(1, parseInt(u.searchParams.get('page') ?? '1', 10) || 1);
  const perPage = Math.min(200, Math.max(1, parseInt(u.searchParams.get('per_page') ?? String(defaultPerPage), 10) || defaultPerPage));
  const q = (u.searchParams.get('q') ?? '').trim();
  return { page, perPage, q };
}

/** Parse searchParams (Server Component) menjadi PageParams. */
export function parseSearchParams(
  sp: Record<string, string | string[] | undefined>,
  defaultPerPage = 20
): PageParams {
  const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';
  const page = Math.max(1, parseInt(str(sp.page) || '1', 10) || 1);
  const perPage = Math.min(200, Math.max(1, parseInt(str(sp.per_page) || String(defaultPerPage), 10) || defaultPerPage));
  return { page, perPage, q: str(sp.q).trim() };
}

/** Terapkan pagination + hitung total ke query Supabase. */
export async function paginate<T>(
  query: { range: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown; count: number | null }> },
  page: number,
  perPage: number
): Promise<{ data: T[]; meta: { page: number; per_page: number; total: number } }> {
  const from = (page - 1) * perPage;
  const { data, error, count } = await query.range(from, from + perPage - 1);
  if (error) throw new Error(error instanceof Error ? error.message : 'Query gagal');
  return {
    data: (data ?? []) as T[],
    meta: { page, per_page: perPage, total: count ?? 0 },
  };
}

/** Parse & validasi body JSON dengan Zod schema. */
export async function parseBody<T>(
  req: Request,
  schema: { safeParse: (v: unknown) => { success: boolean; data?: T; error?: { message: string } } }
): Promise<{ data: T } | Response> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return err('BAD_JSON', 'Body harus JSON valid.', 400);
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success || parsed.data === undefined) {
    return err('VALIDATION', parsed.error?.message ?? 'Validasi gagal.', 422);
  }
  return { data: parsed.data };
}
