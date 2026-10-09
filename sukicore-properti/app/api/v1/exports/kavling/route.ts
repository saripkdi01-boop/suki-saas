import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { supabaseAdmin } from '@/lib/supabase';
import { apiRequirePerm } from '@/lib/permissions';

const MENU = '/admin/master/kavling';

interface Row {
  kode_kavling: string;
  luas_tanah: number | null;
  luas_bangunan: number | null;
  harga_jual: number | null;
  is_ready: boolean;
  locations: { nama: string };
  unit_statuses: { nama: string } | null;
}

function stampWita(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Makassar',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(new Date())
    .replace(/-/g, '');
}

function tglWitaPanjang(): string {
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Makassar',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date());
}

function fmtRp(n: number | null): string {
  if (n === null || n === undefined) return '-';
  return 'Rp' + Math.round(Number(n)).toLocaleString('id-ID');
}

/** Konversi view biner menjadi ArrayBuffer murni untuk Response body. */
function toArrayBuffer(view: Uint8Array): ArrayBuffer {
  const sliced = view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength);
  return sliced as ArrayBuffer;
}

export async function GET(req: Request) {
  const auth = await apiRequirePerm(MENU, 'view');
  if (auth instanceof Response) return auth;

  const u = new URL(req.url);
  const locationId = u.searchParams.get('location_id')?.trim() || null;
  const format = u.searchParams.get('format') === 'pdf' ? 'pdf' : 'excel';

  let query = supabaseAdmin()
    .from('units')
    .select('kode_kavling, luas_tanah, luas_bangunan, harga_jual, is_ready, locations!inner(nama), unit_statuses(nama)')
    .is('deleted_at', null)
    .order('kode_kavling');
  if (locationId) query = query.eq('location_id', locationId);
  const { data, error } = await query;
  if (error) {
    return Response.json({ error: { code: 'DB_ERROR', message: error.message } }, { status: 500 });
  }
  const rows = (data ?? []) as unknown as Row[];
  const stamp = stampWita();

  if (format === 'excel') {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Kavling');
    ws.columns = [
      { header: 'Kode', key: 'kode', width: 16 },
      { header: 'Lokasi', key: 'lokasi', width: 30 },
      { header: 'Luas Tanah (m²)', key: 'lt', width: 16 },
      { header: 'Luas Bangunan (m²)', key: 'lb', width: 18 },
      { header: 'Harga (Rp)', key: 'harga', width: 20 },
      { header: 'Status', key: 'status', width: 20 },
      { header: 'Ready', key: 'ready', width: 10 },
    ];
    for (const r of rows) {
      ws.addRow({
        kode: r.kode_kavling,
        lokasi: r.locations.nama,
        lt: r.luas_tanah ?? '-',
        lb: r.luas_bangunan ?? '-',
        harga: r.harga_jual !== null ? Math.round(Number(r.harga_jual)) : '-',
        status: r.unit_statuses?.nama ?? '-',
        ready: r.is_ready ? 'Ya' : 'Tidak',
      });
    }
    ws.getRow(1).font = { bold: true };
    const buf = (await wb.xlsx.writeBuffer()) as unknown as Uint8Array;
    return new Response(toArrayBuffer(buf), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="kavling-${stamp}.xlsx"`,
      },
    });
  }

  // PDF — tabel teks sederhana per baris
  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  const chunks: Buffer[] = [];
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
  doc.fontSize(16).text('Data Kavling', { align: 'center' });
  doc.fontSize(10).fillColor('#666').text(`Diekspor: ${tglWitaPanjang()} WITA — ${rows.length} unit`, { align: 'center' });
  doc.moveDown();
  doc.fillColor('#000').fontSize(9);
  for (const r of rows) {
    const line =
      `${r.kode_kavling} | ${r.locations.nama} | ` +
      `LT ${r.luas_tanah ?? '-'} / LB ${r.luas_bangunan ?? '-'} | ` +
      `${fmtRp(r.harga_jual)} | ${r.unit_statuses?.nama ?? '-'} | ${r.is_ready ? 'Ready' : 'Belum'}`;
    doc.text(line);
  }
  doc.end();
  const pdf = await done;
  return new Response(toArrayBuffer(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="kavling-${stamp}.pdf"`,
    },
  });
}
