import { requirePerm, can } from '@/lib/permissions';
import { getSessionUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { PageHeader, Card } from '@/components/ui';
import { ProfilForm } from './ProfilForm';

const MENU = '/admin/pengaturan/pengaturan-profil';

const KEYS = ['company_nama', 'company_alamat', 'company_telepon', 'company_email'] as const;

export default async function PengaturanProfilPage() {
  await requirePerm(MENU, 'view');
  const me = await getSessionUser();
  const canEdit = me ? await can(me, MENU, 'edit') : false;

  const { data } = await supabaseAdmin().from('app_settings').select('key, value').in('key', [...KEYS]);
  const map = new Map((data ?? []).map((r) => [r.key as string, (r.value as string | null) ?? '']));
  const initial = {
    nama: map.get('company_nama') ?? '',
    alamat: map.get('company_alamat') ?? '',
    telepon: map.get('company_telepon') ?? '',
    email: map.get('company_email') ?? '',
  };

  return (
    <div>
      <PageHeader title="Pengaturan Profil" subtitle="Profil perusahaan yang dipakai di aplikasi" />
      <Card className="max-w-2xl">
        {canEdit ? (
          <ProfilForm initial={initial} />
        ) : (
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="font-medium text-slate-500">Nama Perusahaan</dt>
              <dd className="text-slate-900 dark:text-slate-100">{initial.nama || '-'}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Alamat</dt>
              <dd className="text-slate-900 dark:text-slate-100">{initial.alamat || '-'}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Telepon</dt>
              <dd className="text-slate-900 dark:text-slate-100">{initial.telepon || '-'}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Email</dt>
              <dd className="text-slate-900 dark:text-slate-100">{initial.email || '-'}</dd>
            </div>
          </dl>
        )}
      </Card>
    </div>
  );
}
