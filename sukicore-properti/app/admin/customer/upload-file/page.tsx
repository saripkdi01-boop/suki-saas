import { requirePerm, can } from '@/lib/permissions';
import { getSessionUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { parseSearchParams } from '@/lib/api';
import { PageHeader, Card } from '@/components/ui';
import { DataTable, type Column } from '@/components/DataTable';
import { tglJamWita } from '@/lib/format';
import { CustomerPicker, UploadForm, FileDeleteButton } from './UploadForm';

const MENU = '/admin/customer/upload-file';
const PER_PAGE = 20;

interface CustOpt {
  id: number;
  nama_lengkap: string;
}

interface FileRow {
  id: number;
  nama_file: string;
  keterangan: string | null;
  file_url: string;
  created_at: string;
}

export default async function UploadFilePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requirePerm(MENU, 'view');
  const me = await getSessionUser();
  const sp = await searchParams;
  const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const customerId = Number(str(sp.customer_id) ?? '') || 0;
  const { page, perPage } = parseSearchParams(sp, PER_PAGE);
  const db = supabaseAdmin();

  const { data: customers } = await db
    .from('customers')
    .select('id, nama_lengkap')
    .eq('is_archived', false)
    .is('deleted_at', null)
    .order('nama_lengkap');
  const custOpts = ((customers ?? []) as unknown as CustOpt[]).map((c) => ({
    id: c.id,
    nama_lengkap: c.nama_lengkap,
  }));

  let files: FileRow[] = [];
  let total = 0;
  let customerName = '';
  if (customerId > 0) {
    const { data: cust } = await db
      .from('customers')
      .select('id, nama_lengkap')
      .eq('id', customerId)
      .maybeSingle();
    customerName = (cust?.nama_lengkap as string) ?? '';
    const { data, count } = await db
      .from('customer_files')
      .select('id, nama_file, keterangan, file_url, created_at', { count: 'exact' })
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .range((page - 1) * perPage, page * perPage - 1);
    files = (data ?? []) as unknown as FileRow[];
    total = count ?? 0;
  }

  const canCreate = me ? await can(me, MENU, 'create') : false;
  const canDelete = me ? await can(me, MENU, 'delete') : false;

  const columns: Column<FileRow>[] = [
    { header: 'Nama File', render: (r) => <span className="font-medium">{r.nama_file}</span> },
    { header: 'Keterangan', render: (r) => r.keterangan ?? '-' },
    { header: 'Tanggal', render: (r) => tglJamWita(r.created_at) },
    {
      header: 'File',
      render: (r) => (
        <a href={r.file_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">
          Buka
        </a>
      ),
    },
    {
      header: 'Aksi',
      className: 'text-right',
      render: (r) => (
        <div className="flex justify-end gap-2">
          {canDelete && <FileDeleteButton id={r.id} />}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="File Customer" subtitle="Kelola berkas pendukung customer" />
      <Card>
        <CustomerPicker customers={custOpts} initialId={customerId > 0 ? String(customerId) : ''} />
      </Card>
      {customerId > 0 && (
        <>
          {canCreate && (
            <Card className="mt-4">
              <UploadForm customerId={customerId} customerName={customerName} />
            </Card>
          )}
          <Card className="mt-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
              Daftar File{customerName ? ` — ${customerName}` : ''}
            </h3>
            <DataTable columns={columns} rows={files} total={total} perPage={perPage} emptyHint="Belum ada file untuk customer ini." />
          </Card>
        </>
      )}
    </div>
  );
}
