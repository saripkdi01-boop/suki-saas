import { requirePerm, can } from '@/lib/permissions';
import { getSessionUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { parseSearchParams } from '@/lib/api';
import { PageHeader, Card, Badge } from '@/components/ui';
import { DataTable, type Column } from '@/components/DataTable';
import { tglWita } from '@/lib/format';
import { ParamSelect, ChecklistDeleteButton } from './Buttons';
import { LegalChecklistForm, type ChecklistInitial } from './LegalChecklistForm';

const MENU = '/admin/legal/pengajuan-berkas';
const PER_PAGE = 20;

const DOC_KEYS = ['iph', 'shgb', 'ssp', 'bphtb', 'sikumbang', 'daftar_sikasep', 'foto_sikasep', 'trilogi'] as const;

interface Row extends ChecklistInitial {
  updated_at: string;
  units: { kode_kavling: string } | null;
}

function countDocs(r: ChecklistInitial): number {
  return DOC_KEYS.reduce((n, k) => n + (r[k] ? 1 : 0), 0);
}

export default async function PengajuanBerkasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requirePerm(MENU, 'view');
  const me = await getSessionUser();
  const sp = await searchParams;
  const { page, perPage } = parseSearchParams(sp, PER_PAGE);
  const rawCid = sp.customer_id;
  const customerId = (Array.isArray(rawCid) ? rawCid[0] : rawCid) ?? '';

  const { data: custList } = await supabaseAdmin().from('customers').select('id, nama_lengkap').order('nama_lengkap').limit(2000);
  const customerOptions = ((custList ?? []) as { id: number; nama_lengkap: string }[]).map((c) => ({
    value: String(c.id),
    label: c.nama_lengkap,
  }));
  const activeCustomer = customerOptions.find((o) => o.value === customerId);

  let rows: Row[] = [];
  let total = 0;
  let unitOptions: { value: string; label: string }[] = [];

  if (customerId) {
    let query = supabaseAdmin()
      .from('legal_checklists')
      .select('*, units(kode_kavling)', { count: 'exact' })
      .eq('customer_id', Number(customerId))
      .order('updated_at', { ascending: false });
    const { data, count } = await query.range((page - 1) * perPage, page * perPage - 1);
    rows = (data ?? []) as unknown as Row[];
    total = count ?? 0;

    // Unit milik customer: unit aktif customer + unit yang sudah punya checklist
    const unitIds = new Set<number>();
    for (const r of rows) if (r.unit_id) unitIds.add(r.unit_id);
    const { data: cust } = await supabaseAdmin().from('customers').select('unit_id').eq('id', Number(customerId)).single();
    const custUnitId = (cust as { unit_id: number | null } | null)?.unit_id;
    if (custUnitId) unitIds.add(custUnitId);
    if (unitIds.size > 0) {
      const { data: units } = await supabaseAdmin()
        .from('units')
        .select('id, kode_kavling, locations(nama)')
        .in('id', [...unitIds]);
      unitOptions = ((units ?? []) as unknown as { id: number; kode_kavling: string; locations: { nama: string } | null }[]).map(
        (u) => ({ value: String(u.id), label: `${u.kode_kavling} — ${u.locations?.nama ?? '-'}` })
      );
    }
  }

  const canCreate = me ? await can(me, MENU, 'create') : false;
  const canEdit = me ? await can(me, MENU, 'edit') : false;
  const canDelete = me ? await can(me, MENU, 'delete') : false;

  const columns: Column<Row>[] = [
    { header: 'Unit', render: (r) => <span className="font-medium">{r.units?.kode_kavling ?? '-'}</span> },
    {
      header: 'Kelengkapan',
      render: (r) => {
        const n = countDocs(r);
        return <span className="font-medium">{n}/8 dokumen</span>;
      },
    },
    {
      header: 'Status',
      render: (r) =>
        countDocs(r) === 8 ? <Badge color="#059669">Lengkap</Badge> : <Badge color="#d97706">Kurang</Badge>,
    },
    { header: 'Diperbarui', render: (r) => tglWita(r.updated_at) },
    {
      header: 'Aksi',
      className: 'text-right',
      render: (r) => (
        <div className="flex justify-end gap-2">
          {canEdit && <LegalChecklistForm customerId={customerId} units={unitOptions} initial={r} />}
          {canDelete && <ChecklistDeleteButton id={r.id} />}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Pengajuan Berkas"
        subtitle={activeCustomer ? `Customer: ${activeCustomer.label}` : 'Pilih customer untuk melihat checklist berkasnya'}
        actions={
          canCreate && customerId ? (
            <LegalChecklistForm customerId={customerId} units={unitOptions} />
          ) : undefined
        }
      />
      <Card>
        <div className="mb-4">
          <ParamSelect param="customer_id" options={customerOptions} placeholder="— Pilih Customer —" />
        </div>
        <DataTable
          columns={columns}
          rows={rows}
          total={total}
          perPage={perPage}
          emptyTitle={customerId ? 'Belum ada data' : 'Pilih customer terlebih dahulu'}
          emptyHint={
            customerId
              ? 'Belum ada checklist berkas untuk customer ini. Tambahkan via tombol di atas.'
              : 'Gunakan pilihan customer di atas untuk menampilkan data.'
          }
        />
      </Card>
    </div>
  );
}
