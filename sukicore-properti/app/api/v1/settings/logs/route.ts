import { supabaseAdmin } from '@/lib/supabase';
import { apiRequirePerm } from '@/lib/permissions';
import { err, ok, pageParams, paginate } from '@/lib/api';

const MENU = '/admin/pengaturan/log-aktivitas';

export async function GET(req: Request) {
  const auth = await apiRequirePerm(MENU, 'view');
  if (auth instanceof Response) return auth;
  const u = new URL(req.url);
  const { page, perPage, q } = pageParams(req.url);
  const dari = (u.searchParams.get('tanggal_dari') ?? '').trim();
  const sampai = (u.searchParams.get('tanggal_sampai') ?? '').trim();

  let query = supabaseAdmin()
    .from('activity_logs')
    .select('id, aksi, tabel_ref, record_id, created_at, users(username)', { count: 'exact' })
    .order('created_at', { ascending: false });
  if (dari) query = query.gte('created_at', `${dari}T00:00:00`);
  if (sampai) query = query.lte('created_at', `${sampai}T23:59:59`);
  if (q) {
    const { data: us } = await supabaseAdmin().from('users').select('id').ilike('username', `%${q}%`);
    const ids = ((us ?? []) as { id: number }[]).map((x) => x.id);
    const parts = [`aksi.ilike.%${q}%`, `tabel_ref.ilike.%${q}%`];
    if (ids.length > 0) parts.push(`user_id.in.(${ids.join(',')})`);
    query = query.or(parts.join(','));
  }

  try {
    const { data, meta } = await paginate(query, page, perPage);
    return ok(data, meta);
  } catch (e) {
    return err('DB_ERROR', e instanceof Error ? e.message : 'Query gagal.', 500);
  }
}
