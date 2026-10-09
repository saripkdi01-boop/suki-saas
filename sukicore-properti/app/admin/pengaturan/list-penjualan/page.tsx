import { requirePerm, can } from '@/lib/permissions';
import { getSessionUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { PageHeader, Card } from '@/components/ui';
import { DataTable, type Column } from '@/components/DataTable';
import { StatusCreateButton, StatusEditButton, StatusDeleteButton } from './Buttons';

const MENU = '/admin/pengaturan/list-penjualan';

interface Row {
  id: number;
  nama: string;
  warna_hex: string;
  urutan: number;
  keterangan: string | null;
}

export default async function ListPenjualanPage() {
  await requirePerm(MENU, 'view');
  const me = await getSessionUser();
  const canCreate = me ? await can(me, MENU, 'create') : false;
  const canEdit = me ? await can(me, MENU, 'edit') : false;
  const canDelete = me ? await can(me, MENU, 'delete') : false;

  const { data } = await supabaseAdmin().from('unit_statuses').select('*').order('urutan').order('nama');
  const rows = (data ?? []) as Row[];

  const columns: Column<Row>[] = [
    {
      header: 'Status',
      render: (r) => (
        <span className="inline-flex items-center gap-2 font-medium">
          <span
            className="inline-block h-4 w-4 rounded border border-slate-300"
            style={{ backgroundColor: r.warna_hex }}
          />
          {r.nama}
        </span>
      ),
    },
    { header: 'Warna (Hex)', render: (r) => <code className="text-xs">{r.warna_hex}</code> },
    { header: 'Urutan', render: (r) => r.urutan },
    { header: 'Keterangan', render: (r) => r.keterangan ?? '-' },
    {
      header: 'Aksi',
      className: 'text-right',
      render: (r) => (
        <div className="flex justify-end gap-2">
          {canEdit && <StatusEditButton row={r} />}
          {canDelete && <StatusDeleteButton id={r.id} />}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="List Penjualan"
        subtitle="Daftar status progres unit beserta warnanya"
        actions={canCreate ? <StatusCreateButton /> : undefined}
      />
      <Card className="mb-4 border-sky-200 bg-sky-50 dark:border-sky-800 dark:bg-sky-900/20">
        <p className="text-sm text-sky-800 dark:text-sky-200">
          Warna di sini dipakai siteplan &amp; badge status di seluruh aplikasi.
        </p>
      </Card>
      <Card>
        <DataTable columns={columns} rows={rows} total={rows.length} perPage={50} emptyHint="Belum ada status. Tambahkan via tombol di atas." />
      </Card>
    </div>
  );
}
