import { supabaseAdmin } from '@/lib/supabase';
import { apiRequirePerm } from '@/lib/permissions';
import { err, ok } from '@/lib/api';
import type { FeatureCollection } from 'geojson';

const JENIS_MENU: Record<string, string> = {
  penjualan: '/admin/siteplan/penjualan',
  proyek: '/admin/siteplan/proyek',
  'unit-ready': '/admin/siteplan/unit-ready',
  listrik: '/admin/siteplan/listrik',
  air: '/admin/siteplan/air',
  'bphtb-ssp': '/admin/siteplan/bphtb-ssp',
  'balik-nama': '/admin/siteplan/balik-nama',
};

interface UnitRow {
  id: number;
  kode_kavling: string;
  progres_bangunan: number;
  is_ready: boolean;
  listrik_terpasang: boolean;
  air_terpasang: boolean;
  unit_statuses: { nama: string; warna_hex: string } | null;
}

function warnaUnit(jenis: string, u: UnitRow, extra: { bphtb?: string; balikNama?: string }): string {
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

function legendaJenis(jenis: string, statuses: { nama: string; warna_hex: string }[]): { nama: string; warna: string }[] {
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

/**
 * GET /api/v1/siteplan/:jenis/:locationId
 * GeoJSON denah + warna per kavling + legenda (untuk konsumen selain halaman utama).
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ jenis: string; locationId: string }> }
) {
  const { jenis, locationId } = await params;
  const menu = JENIS_MENU[jenis];
  if (!menu) return err('NOT_FOUND', `Jenis siteplan tidak dikenal: ${jenis}`, 404);
  const auth = await apiRequirePerm(menu, 'view');
  if (auth instanceof Response) return auth;

  const locId = Number(locationId);
  if (!Number.isInteger(locId)) return err('VALIDATION', 'locationId harus angka.', 422);

  const db = supabaseAdmin();

  const { data: overlay } = await db
    .from('siteplan_overlays')
    .select('geojson')
    .eq('location_id', locId)
    .eq('jenis', jenis)
    .maybeSingle();
  let geojson = (overlay?.geojson ?? null) as FeatureCollection | null;
  if (!geojson) {
    const { data: fb } = await db
      .from('siteplan_overlays')
      .select('geojson')
      .eq('location_id', locId)
      .eq('jenis', 'penjualan')
      .maybeSingle();
    geojson = (fb?.geojson ?? null) as FeatureCollection | null;
  }
  if (!geojson || !Array.isArray(geojson.features)) {
    return err('NOT_FOUND', 'Belum ada data denah untuk lokasi ini.', 404);
  }

  const { data: unitData } = await db
    .from('units')
    .select('id, kode_kavling, progres_bangunan, is_ready, listrik_terpasang, air_terpasang, unit_statuses(nama, warna_hex)')
    .eq('location_id', locId)
    .is('deleted_at', null);
  // Client supabase tanpa tipe generik menginfer join sebagai array; runtime many-to-one = objek.
  const units = (unitData ?? []) as unknown as UnitRow[];
  const unitIds = units.map((u) => u.id);

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

  const byId = new Map(units.map((u) => [u.id, u]));
  const enriched: FeatureCollection = {
    type: 'FeatureCollection',
    features: geojson.features.map((f) => {
      const props = { ...(f.properties ?? {}) } as Record<string, unknown>;
      const uid = Number(props.unit_id);
      const u = byId.get(uid);
      props.kode = u?.kode_kavling ?? props.kode ?? '';
      props.color = u
        ? warnaUnit(jenis, u, { bphtb: bphtbMap.get(uid), balikNama: bnMap.get(uid) })
        : '#cccccc';
      return { ...f, properties: props };
    }),
  };

  const { data: statusData } = await db.from('unit_statuses').select('nama, warna_hex').order('urutan');
  const legend = legendaJenis(jenis, (statusData ?? []) as { nama: string; warna_hex: string }[]);

  return ok({ geojson: enriched, legend });
}
