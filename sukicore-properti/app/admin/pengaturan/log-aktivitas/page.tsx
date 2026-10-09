import { requirePerm } from '@/lib/permissions';
import { supabaseAdmin } from '@/lib/supabase';
import { parseSearchParams } from '@/lib/api';
import { PageHeader, Card, Input, Button } from '@/components/ui';
import { DataTable, type Column } from '@/components/DataTable';
import { tglJamWita } from '@/lib/format';

const MENU = '/admin/pengaturan/log-aktivitas';
const PER_PAGE = 30;

interface Row {
  id: number;
  aksi: string;
  tabel_ref: string | null;
  record_id: number | null;
  created_at: string;
  users: { username: string } | { username: string }[] | null;
}

function usernameOf(r: Row): string {
  if (Array.isArray(r.users)) return r.users[0]?.username ?? '-';
  return r.users?.username ?? '-';
}

export default async function LogAktivitasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePerm(MENU, 'view');
  const sp = await searchParams;
  const { page, perPage, q } = parseSearchParams(sp, PER_PAGE);
  const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';
  const dari = str(sp.tanggal_dari).trim();
  const sampai = str(sp.tanggal_sampai).trim();

  let query = supabaseAdmin()
    .from('activity_logs')
    .select('id, aksi, tabel_ref, record_id, created_at, users(username)', { count: 'exact' })
    .order('created_at', { ascending: false });
  if (dari) query = query.gte('created_at', `${dari}T00:00:00`);
  if (sampai) query = query.lte('created_at', `${sampai}T23:59:59`);
  if (q) {
    const { data: us } = await supabaseAdmin().from('users').select('id').ilike('username', `%${q}%`);
    const ids = ((us ?? []) as { id: number }[]).map((u) => u.id);
    const parts = [`aksi.ilike.%${q}%`, `tabel_ref.ilike.%${q}%`];
    if (ids.length > 0) parts.push(`user_id.in.(${ids.join(',')})`);
    query = query.or(parts.join(','));
  }
  const { data, count } = await query.range((page - 1) * perPage, page * perPage - 1);
  const rows = (data ?? []) as unknown as Row[];

  const hasFilter = Boolean(dari || sampai || q);

  const columns: Column<Row>[] = [
    { header: 'Waktu', render: (r) => <span className="whitespace-nowrap">{tglJamWita(r.created_at)}</span> },
    { header: 'User', render: (r) => <span className="font-medium">{usernameOf(r)}</span> },
    { header: 'Aksi', render: (r) => r.aksi },
    { header: 'Tabel', render: (r) => r.tabel_ref ?? '-' },
    { header: 'Record ID', render: (r) => (r.record_id !== null ? String(r.record_id) : '-') },
  ];

  return (
    <div>
      <PageHeader title="Log Aktivitas" subtitle="Jejak login & perubahan data (read-only)" />
      <Card className="mb-4">
        <form method="get" className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Tanggal Dari</label>
            <Input type="date" name="tanggal_dari" defaultValue={dari} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Tanggal Sampai</label>
            <Input type="date" name="tanggal_sampai" defaultValue={sampai} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Kata Kunci</label>
            <Input name="q" defaultValue={q} placeholder="aksi / username / tabel…" />
          </div>
          <Button type="submit" variant="secondary">
            Filter
          </Button>
          {hasFilter && (
            <a
              href="/admin/pengaturan/log-aktivitas"
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Reset
            </a>
          )}
        </form>
      </Card>
      <Card>
        <DataTable columns={columns} rows={rows} total={count ?? 0} perPage={perPage} emptyHint="Belum ada aktivitas tercatat." />
      </Card>
    </div>
  );
}
