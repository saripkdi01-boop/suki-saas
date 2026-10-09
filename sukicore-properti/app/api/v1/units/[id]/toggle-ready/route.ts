import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { apiRequirePerm } from '@/lib/permissions';
import { err, ok } from '@/lib/api';
import { logActivity } from '@/lib/activity';

const MENU = '/admin/unit-ready';

const emptyToUndef = (v: unknown) => (v === '' || v === null ? undefined : v);
const optId = z.preprocess(emptyToUndef, z.coerce.number().int().positive().optional());
const reqId = z.preprocess(emptyToUndef, z.coerce.number().int().positive('Wajib dipilih.'));
const optNum = z.preprocess(emptyToUndef, z.coerce.number().nullable().optional());
const optText = z.preprocess((v) => (v === '' ? null : v), z.string().trim().nullable().optional());
const optDate = z.preprocess(emptyToUndef, z.string().nullable().optional());

/** Toggle penanda is_ready pada unit. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiRequirePerm(MENU, 'edit');
  if (auth instanceof Response) return auth;
  const { id } = await params;

  const db = supabaseAdmin();
  const { data: unit, error: uErr } = await db
    .from('units')
    .select('id, kode_kavling, is_ready')
    .eq('id', Number(id))
    .maybeSingle();
  if (uErr) return err('DB_ERROR', uErr.message, 500);
  if (!unit) return err('NOT_FOUND', 'Unit tidak ditemukan.', 404);

  const next = !unit.is_ready;
  const { error } = await db.from('units').update({ is_ready: next }).eq('id', unit.id);
  if (error) return err('DB_ERROR', error.message, 500);

  await logActivity(
    auth.user.id,
    `ubah ready unit ${unit.kode_kavling}: ${unit.is_ready ? 'ya' : 'tidak'} → ${next ? 'ya' : 'tidak'}`,
    'units',
    unit.id
  );
  return ok({ is_ready: next });
}
