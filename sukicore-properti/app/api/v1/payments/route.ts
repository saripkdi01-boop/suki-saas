import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { apiRequirePerm } from '@/lib/permissions';
import { err, ok, pageParams, paginate } from '@/lib/api';
import { logActivity } from '@/lib/activity';
import { uploadToBucket, safeFileName } from '@/lib/upload';
import { rp } from '@/lib/format';

const MENU = '/admin/pembayaran';
const BUCKET = 'bukti-bayar';

const emptyToUndef = (v: unknown) => (v === '' || v === null ? undefined : v);
const optId = z.preprocess(emptyToUndef, z.coerce.number().int().positive().optional());
const optText = z.preprocess((v) => (v === '' ? null : v), z.string().trim().nullable().optional());
const optDate = z.preprocess(emptyToUndef, z.string().nullable().optional());

const JENIS = ['harga_rumah', 'biaya_surat', 'peningkatan_mutu', 'booking_fee', 'lainnya'] as const;

const postSchema = z.object({
  customer_id: z.coerce.number().int().positive('Customer wajib dipilih.'),
  jenis_tagihan: z.enum(JENIS, { message: 'Jenis tagihan tidak valid.' }),
  tagihan: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? 0 : Number(v)),
    z.number().min(0, 'Tagihan tidak boleh negatif.')
  ),
  sudah_bayar: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? 0 : Number(v)),
    z.number().min(0, 'Sudah bayar tidak boleh negatif.')
  ),
  metode: optText,
  rekening_id: optId,
  tanggal: optDate,
  keterangan: optText,
});

export async function GET(req: Request) {
  const auth = await apiRequirePerm(MENU, 'view');
  if (auth instanceof Response) return auth;
  const { page, perPage, q } = pageParams(req.url);
  const db = supabaseAdmin();

  // q: cari di nama customer dulu, lalu filter payment milik customer yang cocok
  let customerIds: number[] | null = null;
  if (q) {
    const { data: cs } = await db.from('customers').select('id').ilike('nama_lengkap', `%${q}%`);
    customerIds = ((cs ?? []) as Array<{ id: number }>).map((c) => c.id);
    if (customerIds.length === 0) return ok([], { page, per_page: perPage, total: 0 });
  }

  let query = db
    .from('payments')
    .select('*, customers(nama_lengkap), units(kode_kavling)', { count: 'exact' })
    .order('tanggal', { ascending: false })
    .order('id', { ascending: false });
  if (customerIds) query = query.in('customer_id', customerIds);

  try {
    const { data, meta } = await paginate(query, page, perPage);
    return ok(data, meta);
  } catch (e) {
    return err('DB_ERROR', e instanceof Error ? e.message : 'Query gagal.', 500);
  }
}

export async function POST(req: Request) {
  const auth = await apiRequirePerm(MENU, 'create');
  if (auth instanceof Response) return auth;

  const form = await req.formData().catch(() => null);
  if (!form) return err('BAD_FORM', 'Form tidak valid.', 400);

  const parsed = postSchema.safeParse({
    customer_id: form.get('customer_id'),
    jenis_tagihan: form.get('jenis_tagihan'),
    tagihan: form.get('tagihan'),
    sudah_bayar: form.get('sudah_bayar'),
    metode: form.get('metode'),
    rekening_id: form.get('rekening_id'),
    tanggal: form.get('tanggal'),
    keterangan: form.get('keterangan'),
  });
  if (!parsed.success) return err('VALIDATION', parsed.error.issues[0]?.message ?? 'Validasi gagal.', 422);
  const d = parsed.data;

  const file = form.get('file');
  const hasFile = file instanceof File && file.size > 0;

  const db = supabaseAdmin();

  // Validasi customer; unit diambil dari customer
  const { data: cust } = await db
    .from('customers')
    .select('id, nama_lengkap, unit_id')
    .eq('id', d.customer_id)
    .maybeSingle();
  if (!cust) return err('NOT_FOUND', 'Customer tidak ditemukan.', 404);

  if (d.rekening_id) {
    const { data: rek } = await db.from('bank_transaksi').select('id').eq('id', d.rekening_id).maybeSingle();
    if (!rek) return err('VALIDATION', 'Rekening tidak ditemukan.', 422);
  }

  // Upload bukti (bila ada)
  let buktiUrl: string | null = null;
  if (hasFile) {
    try {
      const path = `pembayaran/${d.customer_id}/${Date.now()}-${safeFileName((file as File).name)}`;
      buktiUrl = await uploadToBucket(BUCKET, file as File, path);
    } catch (e) {
      return err('UPLOAD_ERROR', e instanceof Error ? e.message : 'Gagal mengunggah bukti.', 500);
    }
  }

  const tanggal = d.tanggal ?? new Date().toISOString().slice(0, 10);

  const { data: pay, error: payErr } = await db
    .from('payments')
    .insert({
      customer_id: d.customer_id,
      unit_id: cust.unit_id ?? null,
      jenis_tagihan: d.jenis_tagihan,
      tagihan: d.tagihan,
      sudah_bayar: d.sudah_bayar,
      metode: d.metode,
      rekening_id: d.rekening_id ?? null,
      tanggal,
      bukti_url: buktiUrl,
      keterangan: d.keterangan,
    })
    .select()
    .single();
  if (payErr) return err('DB_ERROR', payErr.message, 500);

  // Mutasi saldo masuk otomatis bila ada pembayaran lewat rekening
  if (d.sudah_bayar > 0 && d.rekening_id) {
    const { error: mErr } = await db.from('balance_mutations').insert({
      tanggal,
      rekening_id: d.rekening_id,
      tipe: 'masuk',
      jumlah: d.sudah_bayar,
      keterangan: `Pembayaran ${d.jenis_tagihan} — ${cust.nama_lengkap}`,
      ref_tabel: 'payments',
      ref_id: pay.id,
    });
    if (mErr) {
      // Pembayaran sudah tersimpan; laporkan kegagalan mutasi agar bisa ditindaklanjuti manual.
      return err('MUTATION_ERROR', `Pembayaran tersimpan (id ${pay.id}), tetapi mutasi saldo gagal: ${mErr.message}`, 500);
    }
  }

  await logActivity(
    auth.user.id,
    `tambah pembayaran ${d.jenis_tagihan} — ${cust.nama_lengkap} (${rp(d.tagihan)})`,
    'payments',
    pay.id
  );
  return ok(pay, undefined, 201);
}
