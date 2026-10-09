import { requirePerm, can } from '@/lib/permissions';
import { getSessionUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { parseSearchParams } from '@/lib/api';
import { PageHeader, Card, SearchBox, Badge } from '@/components/ui';
import { DataTable, type Column } from '@/components/DataTable';
import { tglJamWita } from '@/lib/format';
import { UserCreateButton, UserEditButton, UserResetPasswordButton, UserDeleteButton } from './Buttons';

const MENU = '/admin/pengaturan/pengaturan-pengguna';
const PER_PAGE = 20;

interface Row {
  id: number;
  username: string;
  nama_lengkap: string;
  role_id: number;
  is_active: boolean;
  last_login_at: string | null;
  roles: { nama: string } | { nama: string }[] | null;
}

function roleName(r: Row): string {
  if (Array.isArray(r.roles)) return r.roles[0]?.nama ?? '-';
  return r.roles?.nama ?? '-';
}

export default async function PengaturanPenggunaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requirePerm(MENU, 'view');
  const me = await getSessionUser();
  const sp = await searchParams;
  const { page, perPage, q } = parseSearchParams(sp, PER_PAGE);

  let query = supabaseAdmin()
    .from('users')
    .select('id, username, nama_lengkap, role_id, is_active, last_login_at, roles(nama)', { count: 'exact' })
    .order('username');
  if (q) query = query.or(`username.ilike.%${q}%,nama_lengkap.ilike.%${q}%`);
  const { data, count } = await query.range((page - 1) * perPage, page * perPage - 1);
  const rows = (data ?? []) as unknown as Row[];

  const { data: rolesData } = await supabaseAdmin().from('roles').select('id, nama').order('nama');
  const roleOptions = ((rolesData ?? []) as { id: number; nama: string }[]).map((r) => ({
    value: String(r.id),
    label: r.nama,
  }));

  const canCreate = me ? await can(me, MENU, 'create') : false;
  const canEdit = me ? await can(me, MENU, 'edit') : false;
  const canDelete = me ? await can(me, MENU, 'delete') : false;

  const columns: Column<Row>[] = [
    { header: 'Username', render: (r) => <span className="font-medium">{r.username}</span> },
    { header: 'Nama Lengkap', render: (r) => r.nama_lengkap },
    { header: 'Role', render: (r) => <Badge>{roleName(r)}</Badge> },
    {
      header: 'Status',
      render: (r) =>
        r.is_active ? (
          <Badge color="#16a34a">Aktif</Badge>
        ) : (
          <Badge color="#dc2626">Nonaktif</Badge>
        ),
    },
    { header: 'Login Terakhir', render: (r) => tglJamWita(r.last_login_at) },
    {
      header: 'Aksi',
      className: 'text-right',
      render: (r) => {
        const isSelf = r.id === user.id;
        const isMaster = r.username === 'master';
        return (
          <div className="flex justify-end gap-2">
            {canEdit && <UserEditButton row={r} roleOptions={roleOptions} />}
            {canEdit && <UserResetPasswordButton id={r.id} username={r.username} />}
            {canDelete && !isSelf && !isMaster && <UserDeleteButton id={r.id} />}
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <PageHeader
        title="Pengaturan Pengguna"
        subtitle="Kelola akun pengguna aplikasi"
        actions={canCreate ? <UserCreateButton roleOptions={roleOptions} /> : undefined}
      />
      <Card>
        <div className="mb-4">
          <SearchBox placeholder="Cari username / nama…" />
        </div>
        <DataTable columns={columns} rows={rows} total={count ?? 0} perPage={perPage} emptyHint="Belum ada pengguna. Tambahkan via tombol di atas." />
      </Card>
    </div>
  );
}
