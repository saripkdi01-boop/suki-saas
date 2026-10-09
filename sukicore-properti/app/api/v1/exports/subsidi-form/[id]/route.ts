import PDFDocument from 'pdfkit';
import { supabaseAdmin } from '@/lib/supabase';
import { apiRequirePerm } from '@/lib/permissions';
import { err } from '@/lib/api';
import { rp, tglJamWita } from '@/lib/format';

const MENU = '/admin/customer/customer';

interface Row {
  nama_lengkap: string;
  nik: string | null;
  no_hp: string | null;
  alamat_ktp: string | null;
  units: { kode_kavling: string; harga_jual: number | string | null; luas_tanah: number | null; luas_bangunan: number | null; locations: { nama: string } | null } | null;
  unit_statuses: { nama: string } | null;
  marketing: { nama: string } | null;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiRequirePerm(MENU, 'view');
  if (auth instanceof Response) return auth;
  const { id } = await params;

  const { data, error } = await supabaseAdmin()
    .from('customers')
    .select(
      'nama_lengkap, nik, no_hp, alamat_ktp, ' +
        'units(kode_kavling, harga_jual, luas_tanah, luas_bangunan, locations(nama)), ' +
        'unit_statuses(nama), marketing(nama)'
    )
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();
  if (error) return err('DB_ERROR', error.message, 500);
  if (!data) return err('NOT_FOUND', 'Customer tidak ditemukan.', 404);

  const c = data as unknown as Row;
  const unit = c.units;

  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const chunks: Buffer[] = [];
  const finished = new Promise<Buffer>((res, rej) => {
    doc.on('data', (ch) => chunks.push(ch as Buffer));
    doc.on('end', () => res(Buffer.concat(chunks)));
    doc.on('error', rej);
  });

  doc.fontSize(16).font('Helvetica-Bold').text('FORM PENGAJUAN SUBSIDI', { align: 'center' });
  doc.moveDown();

  const item = (label: string, value: string | null | undefined) => {
    doc.fontSize(11).font('Helvetica-Bold').text(label + ': ', { continued: true });
    doc.font('Helvetica').text(value && value.trim() !== '' ? value : '-');
    doc.moveDown(0.5);
  };

  item('Nama Lengkap', c.nama_lengkap);
  item('NIK', c.nik);
  item('No HP', c.no_hp);
  item('Alamat KTP', c.alamat_ktp);
  item('Unit/Kavling', unit?.kode_kavling);
  item('Lokasi', unit?.locations?.nama);
  item('Harga Jual', rp(unit?.harga_jual));
  item(
    'Luas Tanah / Bangunan',
    `${unit?.luas_tanah ?? '-'} m² / ${unit?.luas_bangunan ?? '-'} m²`
  );
  item('Status', c.unit_statuses?.nama);
  item('Marketing', c.marketing?.nama);
  item('Tanggal Cetak', tglJamWita(new Date().toISOString()) + ' WITA');

  doc.end();
  const pdf = await finished;
  return new Response(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="form-subsidi-${id}.pdf"`,
    },
  });
}
