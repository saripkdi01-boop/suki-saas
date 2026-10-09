import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { supabaseAdmin } from '@/lib/supabase';
import { apiRequirePerm } from '@/lib/permissions';
import { err } from '@/lib/api';

const MENU = '/admin/keuangan/laporan-arus-kas';

interface Row {
  tanggal: string;
  keterangan: string | null;
  kategori: string | null;
  masuk: number;
  keluar: number;
}

function periodRange(tahun: number, bulan: number | null): { from: string; to: string; label: string } {
  if (bulan) {
    const nm = bulan === 12 ? 1 : bulan + 1;
    const ny = bulan === 12 ? tahun + 1 : tahun;
    return {
      from: `${tahun}-${String(bulan).padStart(2, '0')}-01`,
      to: `${ny}-${String(nm).padStart(2, '0')}-01`,
      label: `${String(bulan).padStart(2, '0')}/${tahun}`,
    };
  }
  return { from: `${tahun}-01-01`, to: `${tahun + 1}-01-01`, label: String(tahun) };
}

function fmtRp(n: number): string {
  return 'Rp' + Math.round(n).toLocaleString('id-ID');
}

function fmtTgl(iso: string): string {
  const d = new Date(iso.length === 10 ? iso + 'T00:00:00' : iso);
  return new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Makassar', day: '2-digit', month: 'short', year: 'numeric' }).format(d);
}

async function loadData(tahun: number, bulan: number | null, rekeningId: number | null) {
  const db = supabaseAdmin();
  const { from, to, label } = periodRange(tahun, bulan);
  let iq = db.from('incomes').select('tanggal, jumlah, keterangan, finance_categories(nama)').gte('tanggal', from).lt('tanggal', to);
  let eq = db.from('expenses').select('tanggal, jumlah, keterangan, finance_categories(nama)').gte('tanggal', from).lt('tanggal', to);
  if (rekeningId) {
    iq = iq.eq('rekening_id', rekeningId);
    eq = eq.eq('rekening_id', rekeningId);
  }
  const [{ data: ins }, { data: exps }] = await Promise.all([iq, eq]);
  const rincian: Row[] = [];
  let totalMasuk = 0;
  let totalKeluar = 0;
  type R = { tanggal: string; jumlah: number | string; keterangan: string | null; finance_categories: { nama: string } | { nama: string }[] | null };
  const one = <T>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null);
  for (const r of ((ins ?? []) as R[])) {
    const j = Number(r.jumlah);
    totalMasuk += j;
    rincian.push({ tanggal: r.tanggal, keterangan: r.keterangan, kategori: one(r.finance_categories)?.nama ?? '-', masuk: j, keluar: 0 });
  }
  for (const r of ((exps ?? []) as R[])) {
    const j = Number(r.jumlah);
    totalKeluar += j;
    rincian.push({ tanggal: r.tanggal, keterangan: r.keterangan, kategori: one(r.finance_categories)?.nama ?? '-', masuk: 0, keluar: j });
  }
  rincian.sort((a, b) => (a.tanggal < b.tanggal ? 1 : a.tanggal > b.tanggal ? -1 : 0));
  return { rincian, totalMasuk, totalKeluar, label };
}

/** GET /api/v1/exports/aruskas?tahun=2026&bulan=10&rekening_id=1&format=excel|pdf */
export async function GET(req: Request) {
  const auth = await apiRequirePerm(MENU, 'view');
  if (auth instanceof Response) return auth;
  const u = new URL(req.url);
  const tahun = Number(u.searchParams.get('tahun')) || new Date().getFullYear();
  const bulanRaw = u.searchParams.get('bulan');
  const bulan = bulanRaw && /^[1-9]$|^1[0-2]$/.test(bulanRaw) ? Number(bulanRaw) : null;
  const rekRaw = u.searchParams.get('rekening_id');
  const rekeningId = rekRaw ? Number(rekRaw) : null;
  const format = u.searchParams.get('format') === 'pdf' ? 'pdf' : 'excel';

  let data;
  try {
    data = await loadData(tahun, bulan, rekeningId);
  } catch (e) {
    return err('DB_ERROR', e instanceof Error ? e.message : 'Query gagal.', 500);
  }
  const { rincian, totalMasuk, totalKeluar, label } = data;
  const fname = `arus-kas-${label.replace('/', '-')}`;

  if (format === 'excel') {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Arus Kas');
    ws.columns = [
      { header: 'Tanggal', key: 'tanggal', width: 14 },
      { header: 'Keterangan', key: 'keterangan', width: 42 },
      { header: 'Kategori', key: 'kategori', width: 24 },
      { header: 'Masuk (Rp)', key: 'masuk', width: 18 },
      { header: 'Keluar (Rp)', key: 'keluar', width: 18 },
    ];
    for (const r of rincian) {
      ws.addRow({ tanggal: fmtTgl(r.tanggal), keterangan: r.keterangan ?? '-', kategori: r.kategori ?? '-', masuk: r.masuk || null, keluar: r.keluar || null });
    }
    const totalRow = ws.addRow({ tanggal: '', keterangan: 'TOTAL', kategori: '', masuk: totalMasuk, keluar: totalKeluar });
    totalRow.font = { bold: true };
    const buf = await wb.xlsx.writeBuffer();
    return new Response(buf as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fname}.xlsx"`,
      },
    });
  }

  // PDF
  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  const chunks: Uint8Array[] = [];
  doc.on('data', (c: Uint8Array) => chunks.push(c));
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
  doc.fontSize(16).text('Laporan Arus Kas', { align: 'center' });
  doc.fontSize(11).text(`Periode: ${label}`, { align: 'center' });
  doc.moveDown();
  doc.fontSize(11).text(`Total Pemasukan : ${fmtRp(totalMasuk)}`);
  doc.text(`Total Pengeluaran: ${fmtRp(totalKeluar)}`);
  doc.text(`Saldo           : ${fmtRp(totalMasuk - totalKeluar)}`);
  doc.moveDown();
  doc.fontSize(10);
  for (const r of rincian) {
    const ket = (r.keterangan ?? '-').slice(0, 38);
    const nominal = r.masuk > 0 ? `+${fmtRp(r.masuk)}` : `-${fmtRp(r.keluar)}`;
    doc.text(`${fmtTgl(r.tanggal)}  ${ket.padEnd(40, ' ')}  ${nominal}`);
  }
  doc.moveDown();
  doc.fontSize(10).text(`Jumlah baris: ${rincian.length}`, { align: 'right' });
  doc.end();
  const pdf = await done;
  return new Response(pdf as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${fname}.pdf"`,
    },
  });
}
