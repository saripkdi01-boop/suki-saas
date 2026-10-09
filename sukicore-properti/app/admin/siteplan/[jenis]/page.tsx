import { notFound } from 'next/navigation';
import Link from 'next/link';
import { requirePerm } from '@/lib/permissions';
import { supabaseAdmin } from '@/lib/supabase';
import { PageHeader, Card, EmptyState } from '@/components/ui';
import SiteplanClient from '@/components/siteplan/SiteplanClient';
import { cx } from '@/lib/format';
import type { FeatureCollection } from 'geojson';


const JENIS: Record<string, { judul: string; menu: string }> = {
  penjualan: { judul: 'Penjualan', menu: '/admin/siteplan/penjualan' },
  proyek: { judul: 'Proyek', menu: '/admin/siteplan/proyek' },
  'unit-ready': { judul: 'Unit Ready', menu: '/admin/siteplan/unit-ready' },
  listrik: { judul: 'Listrik', menu: '/admin/siteplan/listrik' },
  air: { judul: 'Air', menu: '/admin/siteplan/air' },
  'bphtb-ssp': { judul: 'BPHTB/SSP', menu: '/admin/siteplan/bphtb-ssp' },
  'balik-nama': { judul: 'Balik Nama', menu: '/admin/siteplan/balik-nama' },
};

interface LocationRow {
  id: number;
  nama: string;
}

interface UnitRow {
  id: number;
  kode_kavling: string;
  progres_bangunan: number;
  is_ready: boolean;
  listrik_terpasang: boolean;
  air_terpasang: boolean;
  unit_statuses: { nama: string; warna_hex: string } | null;
}

interface StatusRow {
  nama: string;
  warna_hex: string;
  urutan: number;
}

/** Aturan warna polygon per jenis overlay. */
function warnaUnit(
  jenis: string,
  u: UnitRow,
  extra: { bphtb?: string; balikNama?: string }
): string {
  switch (jenis) {
    case 'penjualan':
      return u.unit_statuses?.warna_hex ?? '#ffffff';
    case 'proyek':
      if (u.progres_bangunan >= 100) return '#00c853';
      if (u.progres_bangunan > 0) return '#eab308';
      return '#9ca3af';
    case 'unit-ready':
      return u.is_ready ? '#00c853' : '#ef4444';
    case 'listrik':
      return u.listrik_terpasang ? '#00c853' : '#ef4444';
    case 'air':
      return u.air_terpasang ? '#00c853' : '#ef4444';
    case 'bphtb-ssp':
      if (extra.bphtb === 'selesai') return '#00c853';
      if (extra.bphtb === 'proses') return '#eab308';
      return '#ef4444';
    case 'balik-nama':
      if (extra.balikNama === 'selesai') return '#00c853';
      if (extra.balikNama === 'proses') return '#eab308';
      return '#ef4444';
    default:
      return '#cccccc';
  }
}

/** Legenda warna per jenis overlay. */
function legendaJenis(jenis: string, statuses: StatusRow[]): { nama: string; warna: string }[] {
  switch (jenis) {
    case 'penjualan':
      return statuses.map((s) => ({ nama: s.nama, warna: s.warna_hex }));
    case 'proyek':
      return [
        { nama: 'Belum Mulai', warna: '#9ca3af' },
        { nama: 'Progres < 100%', warna: '#eab308' },
        { nama: 'Selesai (100%)', warna: '#00c853' },
      ];
    case 'unit-ready':
      return [
        { nama: 'Ready', warna: '#00c853' },
        { nama: 'Belum Ready', warna: '#ef4444' },
      ];
    case 'listrik':
      return [
        { nama: 'Terpasang', warna: '#00c853' },
        { nama: 'Belum Terpasang', warna: '#ef4444' },
      ];
    case 'air':
      return [
        { nama: 'Terpasang', warna: '#00c853' },
        { nama: 'Belum Terpasang', warna: '#ef4444' },
      ];
    case 'bphtb-ssp':
    case 'balik-nama':
      return [
        { nama: 'Selesai', warna: '#00c853' },
        { nama: 'Proses', warna: '#eab308' },
        { nama: 'Belum', warna: '#ef4444' },
      ];
    default:
      return [];
  }
}

const EMPTY_GEOJSON: FeatureCollection = { type: 'FeatureCollection', features: [] };

export default async function SiteplanPage({
  params,
  searchParams,
}: {
  params: Promise<{ jenis: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { jenis } = await params;
  const meta = JENIS[jenis];
  if (!meta) notFound();
  await requirePerm(meta.menu, 'view');

  const sp = await searchParams;
  const locParam = Array.isArray(sp.loc) ? sp.loc[0] : sp.loc;
  const db = supabaseAdmin();

  const { data: locData } = await db.from('locations').select('id, nama').order('nama');
  const locations = (locData ?? []) as LocationRow[];
  if (locations.length === 0) {
    return (
      <div>
        <PageHeader title={`Siteplan ${meta.judul}`} subtitle="Peta interaktif kavling per lokasi." />
        <EmptyState title="Belum ada lokasi" hint="Tambahkan lokasi perumahan di Master Data → Lokasi Kavling." />
      </div>
    );
  }
  const activeLoc = locations.find((l) => String(l.id) === locParam) ?? locations[0];

  // Overlay: pakai jenis yang diminta; bila belum ada, fallback ke geometri 'penjualan'
  const { data: overlay } = await db
    .from('siteplan_overlays')
    .select('geojson')
    .eq('location_id', activeLoc.id)
    .eq('jenis', jenis)
    .maybeSingle();
  let geojson = (overlay?.geojson ?? null) as FeatureCollection | null;
  if (!geojson) {
    const { data: fb } = await db
      .from('siteplan_overlays')
      .select('geojson')
      .eq('location_id', activeLoc.id)
      .eq('jenis', 'penjualan')
      .maybeSingle();
    geojson = (fb?.geojson ?? null) as FeatureCollection | null;
  }

  const { data: unitData } = await db
    .from('units')
    .select('id, kode_kavling, progres_bangunan, is_ready, listrik_terpasang, air_terpasang, unit_statuses(nama, warna_hex)')
    .eq('location_id', activeLoc.id)
    .is('deleted_at', null);
  // Catatan: client supabase tanpa tipe generik menginfer join sebagai array;
  // relasi many-to-one di runtime berupa objek tunggal.
  const units = (unitData ?? []) as unknown as UnitRow[];
  const unitIds = units.map((u) => u.id);

  // Status terbaru BPHTB/SSP & Balik Nama per unit (untuk overlay terkait)
  const latestByUnit = async (table: 'bphtb_ssp' | 'balik_nama') => {
    const map = new Map<number, string>();
    if (unitIds.length === 0) return map;
    const { data } = await db
      .from(table)
      .select('unit_id, status, created_at')
      .in('unit_id', unitIds)
      .order('created_at', { ascending: false });
    for (const r of (data ?? []) as { unit_id: number | null; status: string }[]) {
      if (r.unit_id !== null && !map.has(r.unit_id)) map.set(r.unit_id, r.status);
    }
    return map;
  };
  const bphtbMap = jenis === 'bphtb-ssp' ? await latestByUnit('bphtb_ssp') : new Map<number, string>();
  const bnMap = jenis === 'balik-nama' ? await latestByUnit('balik_nama') : new Map<number, string>();

  const colors: Record<string, string> = {};
  const labels: Record<string, string> = {};
  for (const u of units) {
    colors[String(u.id)] = warnaUnit(jenis, u, {
      bphtb: bphtbMap.get(u.id),
      balikNama: bnMap.get(u.id),
    });
    labels[String(u.id)] = u.kode_kavling;
  }

  const { data: statusData } = await db.from('unit_statuses').select('nama, warna_hex, urutan').order('urutan');
  const legend = legendaJenis(jenis, (statusData ?? []) as StatusRow[]);

  const exportBase = `/api/v1/siteplan/export?jenis=${encodeURIComponent(jenis)}&location_id=${activeLoc.id}`;

  return (
    <div>
      <PageHeader
        title={`Siteplan ${meta.judul}`}
        subtitle={`Peta interaktif kavling — ${activeLoc.nama}. Klik kavling untuk melihat detail.`}
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {locations.map((l) => {
          const active = l.id === activeLoc.id;
          return (
            <Link
              key={l.id}
              href={`/admin/siteplan/${jenis}?loc=${l.id}`}
              className={cx(
                'rounded-full px-4 py-1.5 text-sm font-medium transition',
                active
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
              )}
            >
              {l.nama}
            </Link>
          );
        })}
      </div>

      {geojson && Array.isArray(geojson.features) && geojson.features.length > 0 ? (
        <Card className="mb-4">
          <SiteplanClient
            geojson={geojson}
            colors={colors}
            labels={labels}
            pdfUrl={`${exportBase}&format=pdf`}
            jpgUrl={`${exportBase}&format=jpg`}
          />
        </Card>
      ) : (
        <EmptyState
          title="Belum ada denah"
          hint={`Belum ada data denah (GeoJSON) untuk ${activeLoc.nama}. Tambahkan via tabel siteplan_overlays.`}
        />
      )}

      {legend.length > 0 && (
        <Card>
          <h3 className="mb-3 text-sm font-bold text-slate-800 dark:text-slate-100">Legenda</h3>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {legend.map((l) => (
              <span key={l.nama} className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                <span
                  className="inline-block h-4 w-4 rounded border border-slate-400"
                  style={{ backgroundColor: l.warna }}
                />
                {l.nama}
              </span>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
