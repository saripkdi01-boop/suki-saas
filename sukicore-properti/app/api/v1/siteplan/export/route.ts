import { z } from 'zod';
import sharp from 'sharp';
import PDFDocument from 'pdfkit';
import { supabaseAdmin } from '@/lib/supabase';
import { apiRequirePerm } from '@/lib/permissions';
import { err } from '@/lib/api';
import { logActivity } from '@/lib/activity';
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

const querySchema = z.object({
  jenis: z.string(),
  location_id: z.coerce.number().int().positive(),
  format: z.enum(['pdf', 'jpg']),
});

interface UnitRow {
  id: number;
  kode_kavling: string;
  progres_bangunan: number;
  is_ready: boolean;
  listrik_terpasang: boolean;
  air_terpasang: boolean;
  unit_statuses: { nama: string; warna_hex: string } | null;
}

/** Duplikasi aturan warna (sama seperti halaman siteplan) — disengaja, jangan import dari page. */
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

/** Render GeoJSON polygon menjadi string SVG (server-side, tanpa browser). */
function geojsonToSvg(
  geojson: FeatureCollection,
  colorOf: (unitId: number) => string,
  labelOf: (unitId: number) => string
): string {
  const W = 1200;
  const H = 800;
  const PAD = 50;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const f of geojson.features) {
    const geom = f.geometry as { type: string; coordinates: number[][][] } | null;
    if (!geom || geom.type !== 'Polygon') continue;
    for (const ring of geom.coordinates) {
      for (const [x, y] of ring) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (!Number.isFinite(minX)) {
    minX = 0; minY = 0; maxX = 10; maxY = 10;
  }
  const bw = maxX - minX || 1;
  const bh = maxY - minY || 1;
  const s = Math.min((W - PAD * 2) / bw, (H - PAD * 2) / bh);
  const ox = PAD + ((W - PAD * 2) - bw * s) / 2;
  const oy = PAD + ((H - PAD * 2) - bh * s) / 2;
  const X = (x: number) => ox + (x - minX) * s;
  const Y = (y: number) => oy + (maxY - y) * s; // balik sumbu Y (kartesius → SVG)

  const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  let inner = `<rect x="0" y="0" width="${W}" height="${H}" fill="#f8fafc"/>`;
  for (const f of geojson.features) {
    const geom = f.geometry as { type: string; coordinates: number[][][] } | null;
    if (!geom || geom.type !== 'Polygon') continue;
    const props = (f.properties ?? {}) as { unit_id?: number | string };
    const uid = Number(props.unit_id);
    const fill = Number.isNaN(uid) ? '#cccccc' : colorOf(uid);
    const label = Number.isNaN(uid) ? '' : labelOf(uid);
    for (const ring of geom.coordinates) {
      const pts = ring.map(([x, y]) => `${X(x).toFixed(1)},${Y(y).toFixed(1)}`).join(' ');
      inner += `<polygon points="${pts}" fill="${fill}" stroke="#333333" stroke-width="1"/>`;
    }
    // label di centroid ring pertama
    const ring0 = geom.coordinates[0];
    if (ring0 && ring0.length > 0 && label) {
      let cx = 0;
      let cy = 0;
      for (const [x, y] of ring0) { cx += X(x); cy += Y(y); }
      cx /= ring0.length;
      cy /= ring0.length;
      inner += `<text x="${cx.toFixed(1)}" y="${cy.toFixed(1)}" font-family="sans-serif" font-size="11" text-anchor="middle" dominant-baseline="middle" fill="#111111">${esc(label)}</text>`;
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${inner}</svg>`;
}

function pdfBuffer(doc: PDFKit.PDFDocument): Promise<Buffer> {
  const chunks: Buffer[] = [];
  doc.on('data', (c: Buffer) => chunks.push(c));
  return new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
}

/**
 * GET /api/v1/siteplan/export?jenis=&location_id=&format=pdf|jpg
 * Render denah server-side: GeoJSON → SVG → PNG (sharp) → JPG atau PDF.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) return err('VALIDATION', 'Parameter jenis, location_id, format=pdf|jpg wajib valid.', 422);
  const { jenis, location_id, format } = parsed.data;

  const menu = JENIS_MENU[jenis];
  if (!menu) return err('NOT_FOUND', `Jenis siteplan tidak dikenal: ${jenis}`, 404);
  const auth = await apiRequirePerm(menu, 'view');
  if (auth instanceof Response) return auth;

  const db = supabaseAdmin();
  const { data: loc } = await db.from('locations').select('nama').eq('id', location_id).maybeSingle();
  if (!loc) return err('NOT_FOUND', 'Lokasi tidak ditemukan.', 404);

  const { data: overlay } = await db
    .from('siteplan_overlays')
    .select('geojson')
    .eq('location_id', location_id)
    .eq('jenis', jenis)
    .maybeSingle();
  let geojson = (overlay?.geojson ?? null) as FeatureCollection | null;
  if (!geojson) {
    const { data: fb } = await db
      .from('siteplan_overlays')
      .select('geojson')
      .eq('location_id', location_id)
      .eq('jenis', 'penjualan')
      .maybeSingle();
    geojson = (fb?.geojson ?? null) as FeatureCollection | null;
  }
  if (!geojson || !Array.isArray(geojson.features) || geojson.features.length === 0) {
    return err('NOT_FOUND', 'Belum ada data denah untuk lokasi ini.', 404);
  }

  const { data: unitData } = await db
    .from('units')
    .select('id, kode_kavling, progres_bangunan, is_ready, listrik_terpasang, air_terpasang, unit_statuses(nama, warna_hex)')
    .eq('location_id', location_id)
    .is('deleted_at', null);
  // Client supabase tanpa tipe generik menginfer join sebagai array; runtime many-to-one = objek.
  const units = (unitData ?? []) as unknown as UnitRow[];
  const unitIds = units.map((u) => u.id);
  const byId = new Map(units.map((u) => [u.id, u]));

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

  const colorOf = (uid: number) => {
    const u = byId.get(uid);
    return u ? warnaUnit(jenis, u, { bphtb: bphtbMap.get(uid), balikNama: bnMap.get(uid) }) : '#cccccc';
  };
  const labelOf = (uid: number) => byId.get(uid)?.kode_kavling ?? '';

  const svg = geojsonToSvg(geojson, colorOf, labelOf);
  let png: Buffer;
  try {
    png = await sharp(Buffer.from(svg)).png().toBuffer();
  } catch (e) {
    return err('RENDER_ERROR', e instanceof Error ? e.message : 'Gagal me-render denah.', 500);
  }

  const filename = `denah-${jenis}-${location_id}`;
  await logActivity(auth.user.id, `ekspor denah ${format.toUpperCase()} (${jenis}) lokasi #${location_id}`, 'siteplan_overlays', location_id);

  if (format === 'jpg') {
    const jpg = await sharp(png).jpeg({ quality: 90 }).toBuffer();
    return new Response(new Uint8Array(jpg), {
      headers: {
        'Content-Type': 'image/jpeg',
        'Content-Disposition': `attachment; filename="${filename}.jpg"`,
      },
    });
  }

  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 36 });
  const done = pdfBuffer(doc);
  doc.fontSize(14).font('Helvetica-Bold').text(`DENAH SITEPLAN — ${(loc as { nama: string }).nama}`, { align: 'center' });
  doc.moveDown(0.2);
  doc.fontSize(10).font('Helvetica').text(`Jenis: ${jenis} | Dicetak: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' })} WITA`, { align: 'center' });
  doc.moveDown(0.5);
  doc.image(png, { fit: [770, 470], align: 'center', valign: 'center' });
  doc.end();
  const pdf = await done;
  return new Response(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}.pdf"`,
    },
  });
}
