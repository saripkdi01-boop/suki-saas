import { requirePerm, can } from '@/lib/permissions';
import { getSessionUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { parseSearchParams } from '@/lib/api';
import { PageHeader, Card, SearchBox } from '@/components/ui';
import { DataTable, type Column } from '@/components/DataTable';
import { LokasiCreateButton, LokasiEditButton, LokasiDeleteButton } from './Buttons';

const MENU = '/admin/master/lokasi-kavling';
const PER_PAGE = 20;

interface Row {
  id: number;
  kode: string;
  nama: string;
  alamat: string | null;
  company_id: number | null;
  companies: { nama: string } | null;
}

export default async function LokasiKavlingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePerm(MENU, 'view');
  const me = await getSessionUser();
  const sp = await searchParams;
  const { page, perPage, q } = parseSearchParams(sp, PER_PAGE);
  const db = supabaseAdmin();

  let query = db.from('locations').select('id, kode, nama, alamat, company_id, companies(nama)', { count: 'exact' }).order('nama');
  if (q) query = query.or(`nama.ilike.%${q}%,kode.ilike.%${q}%`);
  const { data, count } = await query.range((page - 1) * perPage, page * perPage - 1);
  const rows = (data ?? []) as unknown as Row[];

  const { data: companies } = await db.from('companies').select('id, nama').order('nama');
  const companyOpts = ((companies ?? []) as { id: number; nama: string }[]).map((c) => ({
    value: String(c.id),
    label: c.nama,
  }));

  const canCreate = me ? await can(me, MENU, 'create') : false;
  const canEdit = me ? await can(me, MENU, 'edit') : false;
  const canDelete = me ? await can(me, MENU, 'delete') : false;

  const columns: Column<Row>[] = [
    { header: 'Kode', render: (r) => <span className="font-medium">{r.kode}</span> },
    { header: 'Nama Lokasi', render: (r) => r.nama },
    { header: 'Perusahaan', render: (r) => r.companies?.nama ?? '-' },
    { header: 'Alamat', render: (r) => r.alamat ?? '-' },
    {
      header: 'Aksi',
      className: 'text-right',
      render: (r) => (
        <div className="flex justify-end gap-2">
          {canEdit && <LokasiEditButton row={r} companyOpts={companyOpts} />}
          {canDelete && <LokasiDeleteButton id={r.id} />}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Lokasi Kavling"
        subtitle="Master lokasi perumahan"
        actions={canCreate ? <LokasiCreateButton companyOpts={companyOpts} /> : undefined}
      />
      <Card>
        <div className="mb-4">
          <SearchBox placeholder="Cari kode / nama lokasi…" />
        </div>
        <DataTable columns={columns} rows={rows} total={count ?? 0} perPage={perPage} emptyHint="Belum ada lokasi. Tambahkan via tombol di atas." />
      </Card>
    </div>
  );
}
