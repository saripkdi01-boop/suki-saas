import { requirePerm, can } from '@/lib/permissions';
import { getSessionUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { PageHeader, Card } from '@/components/ui';
import { MediaForm } from './MediaForm';

const MENU = '/admin/pengaturan/pengaturan-media';

const ASSETS = [
  { key: 'logo', title: 'Logo', hint: 'Logo perusahaan (PNG/JPG, maks 5 MB)' },
  { key: 'favicon', title: 'Favicon', hint: 'Ikon tab browser (PNG/ICO, maks 5 MB)' },
  { key: 'background', title: 'Background', hint: 'Gambar latar halaman login (JPG/PNG, maks 5 MB)' },
] as const;

export default async function PengaturanMediaPage() {
  await requirePerm(MENU, 'view');
  const me = await getSessionUser();
  const canEdit = me ? await can(me, MENU, 'edit') : false;

  const { data } = await supabaseAdmin().from('media_assets').select('key, file_url');
  const urls = new Map((data ?? []).map((r) => [r.key as string, r.file_url as string | null]));

  return (
    <div>
      <PageHeader title="Pengaturan Media" subtitle="Logo, favicon, dan background aplikasi" />
      <div className="grid gap-5 md:grid-cols-3">
        {ASSETS.map((a) => (
          <Card key={a.key}>
            <h2 className="font-semibold text-slate-900 dark:text-white">{a.title}</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{a.hint}</p>
            <MediaForm assetKey={a.key} currentUrl={urls.get(a.key) ?? null} canEdit={canEdit} />
          </Card>
        ))}
      </div>
    </div>
  );
}
