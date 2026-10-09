import { requirePerm, can } from '@/lib/permissions';
import { getSessionUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { PageHeader, Card, Badge } from '@/components/ui';
import { DataTable, type Column } from '@/components/DataTable';
import { RoleCreateButton, RoleEditButton, RoleDeleteButton } from './Buttons';

const MENU = '/admin/pengaturan/role-user';

interface Row {
  id: number;
  nama: string;
  user_count: number;
}

export default async function RoleUserPage() {
  await requirePerm(MENU, 'view');
  const me = await getSessionUser();
  const canCreate = me ? await can(me, MENU, 'create') : false;
  const canEdit = me ? await can(me, MENU, 'edit') : false;
  const canDelete = me ? await can(me, MENU, 'delete') : false;

  const db = supabaseAdmin();
  const { data: rolesData } = await db.from('roles').select('id, nama').order('id');
  const { data: usersData } = await db.from('users').select('role_id');
  const counts = new Map<number, number>();
  for (const u of (usersData ?? []) as { role_id: number }[]) {
    counts.set(u.role_id, (counts.get(u.role_id) ?? 0) + 1);
  }
  const rows: Row[] = ((rolesData ?? []) as { id: number; nama: string }[]).map((r) => ({
    id: r.id,
    nama: r.nama,
    user_count: counts.get(r.id) ?? 0,
  }));

  const columns: Column<Row>[] = [
    {
      header: 'Role',
      render: (r) =>
        r.nama === 'SUPERADMIN' ? (
          <Badge color="#7c3aed">SUPERADMIN</Badge>
        ) : (
          <span className="font-medium">{r.nama}</span>
        ),
    },
    { header: 'Jumlah Pengguna', render: (r) => `${r.user_count} pengguna` },
    {
      header: 'Aksi',
      className: 'text-right',
      render: (r) => (
        <div className="flex justify-end gap-2">
          {canEdit && r.nama !== 'SUPERADMIN' && <RoleEditButton row={r} />}
          {canDelete && r.nama !== 'SUPERADMIN' && <RoleDeleteButton id={r.id} />}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Role User"
        subtitle="Daftar role pengguna. Matriks izin tiap role diatur di menu Hak Akses."
        actions={canCreate ? <RoleCreateButton /> : undefined}
      />
      <Card>
        <DataTable columns={columns} rows={rows} total={rows.length} perPage={50} emptyHint="Belum ada role." />
      </Card>
    </div>
  );
}
