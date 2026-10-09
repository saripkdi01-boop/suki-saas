import PDFDocument from 'pdfkit';
import { supabaseAdmin } from '@/lib/supabase';
import { apiRequirePerm } from '@/lib/permissions';
import { err } from '@/lib/api';

const MENU = '/admin/siteplan/penjualan';

function rupiah(n: number | string | null | undefined): string {
  if (n === null || n === undefined || n === '') return '-';
  const num = typeof n === 'string' ? parseFloat(n) : n;
  if (Number.isNaN(num)) return '-';
  return 'Rp' + Math.round(num).toLocaleString('id-ID');
}

function section(doc: PDFKit.PDFDocument, title: string) {
  doc.moveDown(0.8).fontSize(12).font('Helvetica-Bold').text(title);
  doc.moveDown(0.3);
}

function kv(doc: PDFKit.PDFDocument, label: string, value: string) {
  doc.fontSize(10).font('Helvetica').text(label, { continued: true }).font('Helvetica-Bold').text(`: ${value}`);
}

/** GET /api/v1/siteplan/unit/:id/cetak — dokumen PDF "DATA KAVLING". */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiRequirePerm(MENU, 'view');
  if (auth instanceof Response) return auth;
  const { id } = await params;
  const unitId = Number(id);
  if (!Number.isInteger(unitId)) return err('VALIDATION', 'ID unit harus angka.', 422);

  const db = supabaseAdmin();
  const { data: unit, error } = await db
    .from('units')
    .select(
      'kode_kavling, pjg_kanan, pjg_kiri, lbr_depan, lbr_belakang, luas_tanah, luas_bangunan, harga_jual, daya_listrik, no_sertifikat, keterangan, progres_bangunan, is_ready, locations(nama), unit_statuses(nama)'
    )
    .eq('id', unitId)
    .is('deleted_at', null)
    .single();
  if (error || !unit) return err('NOT_FOUND', 'Unit tidak ditemukan.', 404);

  const u = unit as unknown as {
    kode_kavling: string;
    pjg_kanan: number | null;
    pjg_kiri: number | null;
    lbr_depan: number | null;
    lbr_belakang: number | null;
    luas_tanah: number | null;
    luas_bangunan: number | null;
    harga_jual: number | null;
    daya_listrik: string | null;
    no_sertifikat: string | null;
    keterangan: string | null;
    progres_bangunan: number;
    locations: { nama: string } | null;
    unit_statuses: { nama: string } | null;
  };

  const { data: customer } = await db
    .from('customers')
    .select('id, nama_lengkap, nik, no_hp, alamat_ktp, jenis_pembelian')
    .eq('unit_id', unitId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const customerId = (customer as { id?: number } | null)?.id;
  const { data: payments } = await db
    .from('payments')
    .select('jenis_tagihan, tagihan, sudah_bayar')
    .eq(customerId ? 'customer_id' : 'unit_id', customerId ?? unitId)
    .order('tanggal');

  const doc = new PDFDocument({ size: 'A4', margin: 48 });
  const chunks: Buffer[] = [];
  doc.on('data', (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  doc.fontSize(16).font('Helvetica-Bold').text('DATA KAVLING', { align: 'center' });
  doc.moveDown(0.2);
  doc.fontSize(10).font('Helvetica').text(`Dicetak: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' })} WITA`, { align: 'center' });
  doc.moveDown(0.5);

  section(doc, 'Data Unit Rumah');
  kv(doc, 'Perumahan', u.locations?.nama ?? '-');
  kv(doc, 'Kode Kavling', u.kode_kavling);
  kv(doc, 'Dimensi', `${u.pjg_kanan ?? '-'} / ${u.pjg_kiri ?? '-'} m (panjang) × ${u.lbr_depan ?? '-'} / ${u.lbr_belakang ?? '-'} m (lebar)`);
  kv(doc, 'Luas Tanah / Bangunan', `${u.luas_tanah ?? '-'} m² / ${u.luas_bangunan ?? '-'} m²`);
  kv(doc, 'Harga Jual', rupiah(u.harga_jual));
  kv(doc, 'Daya Listrik', u.daya_listrik ?? '-');
  kv(doc, 'No. Sertifikat', u.no_sertifikat ?? '-');
  kv(doc, 'Progres Bangunan', `${u.progres_bangunan}%`);
  kv(doc, 'Status', u.unit_statuses?.nama ?? '-');
  kv(doc, 'Keterangan', u.keterangan ?? '-');

  section(doc, 'Data Customer');
  const c = customer as { nama_lengkap: string; nik: string | null; no_hp: string | null; alamat_ktp: string | null; jenis_pembelian: string } | null;
  if (c) {
    kv(doc, 'Nama', c.nama_lengkap);
    kv(doc, 'NIK', c.nik ?? '-');
    kv(doc, 'No. HP', c.no_hp ?? '-');
    kv(doc, 'Alamat KTP', c.alamat_ktp ?? '-');
    kv(doc, 'Jenis Pembelian', c.jenis_pembelian);
  } else {
    doc.fontSize(10).font('Helvetica').text('Belum ada customer.');
  }

  section(doc, 'Ringkasan Pembayaran');
  const rows = (payments ?? []) as { jenis_tagihan: string; tagihan: number; sudah_bayar: number }[];
  if (rows.length === 0) {
    doc.fontSize(10).font('Helvetica').text('Belum ada data pembayaran.');
  } else {
    let totTagihan = 0;
    let totBayar = 0;
    for (const p of rows) {
      const t = Number(p.tagihan) || 0;
      const b = Number(p.sudah_bayar) || 0;
      totTagihan += t;
      totBayar += b;
      doc.fontSize(10).font('Helvetica').text(`${p.jenis_tagihan}: ${rupiah(t)} — sudah bayar ${rupiah(b)} (sisa ${rupiah(t - b)})`);
    }
    doc.moveDown(0.3).font('Helvetica-Bold').text(`Total tagihan: ${rupiah(totTagihan)} | Total bayar: ${rupiah(totBayar)} | Sisa: ${rupiah(totTagihan - totBayar)}`);
  }

  doc.end();
  const pdf = await done;

  const safe = u.kode_kavling.replace(/[^a-zA-Z0-9-_]/g, '_');
  // Buffer is a Uint8Array; Response accepts BodyInit — wrap to satisfy TS lib dom types
  const body = new Uint8Array(pdf);
  return new Response(body, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="kavling-${safe}.pdf"`,
    },
  });
}
