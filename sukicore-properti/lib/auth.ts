import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { compare, hash } from 'bcryptjs';
import { supabaseAdmin } from './supabase';
import { logActivity } from './activity';

export interface SessionUser {
  id: number;
  username: string;
  nama_lengkap: string;
  role: string;
  role_id: number;
  must_change_password: boolean;
}

interface SessionData {
  user?: SessionUser;
}

function sessionOptions() {
  const password = process.env.SESSION_SECRET;
  if (!password || password.length < 32) {
    throw new Error('SESSION_SECRET belum diisi (minimal 32 karakter) di .env.local');
  }
  return {
    password,
    cookieName: 'sukicore_session',
    cookieOptions: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'lax' as const,
      maxAge: 8 * 3600, // 8 jam
      path: '/',
    },
  };
}

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions());
}

export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const session = await getSession();
    return session.user ?? null;
  } catch {
    return null;
  }
}

export async function hashPassword(plain: string): Promise<string> {
  return hash(plain, 12);
}

export async function verifyPassword(plain: string, hashed: string): Promise<boolean> {
  return compare(plain, hashed);
}

// Rate limit login sederhana (in-memory, per instance)
const attempts = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const rec = attempts.get(key);
  if (!rec || now > rec.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  rec.count += 1;
  return rec.count <= 5;
}

export async function loginUser(
  username: string,
  password: string,
  ip: string
): Promise<{ ok: boolean; error?: string; mustChangePassword?: boolean }> {
  if (!checkRateLimit(`login:${ip}`)) {
    return { ok: false, error: 'Terlalu banyak percobaan. Coba lagi 1 menit lagi.' };
  }
  const uname = username.trim();
  if (!uname || !password) return { ok: false, error: 'Username dan password wajib diisi.' };

  const db = supabaseAdmin();
  const { data: user, error } = await db
    .from('users')
    .select('id, username, password_hash, nama_lengkap, role_id, is_active, must_change_password, roles(nama)')
    .eq('username', uname)
    .maybeSingle();

  // Pesan generik — jangan bocorkan apakah username ada
  if (error || !user || !user.is_active) {
    return { ok: false, error: 'Username atau password salah.' };
  }
  const valid = await verifyPassword(password, user.password_hash as string);
  if (!valid) return { ok: false, error: 'Username atau password salah.' };

  const roleName = Array.isArray(user.roles)
    ? (user.roles[0] as { nama: string })?.nama
    : (user.roles as unknown as { nama: string })?.nama;

  const sessionUser: SessionUser = {
    id: user.id as number,
    username: user.username as string,
    nama_lengkap: user.nama_lengkap as string,
    role: roleName ?? '-',
    role_id: user.role_id as number,
    must_change_password: Boolean(user.must_change_password),
  };
  const session = await getSession();
  session.user = sessionUser;
  await session.save();

  await db.from('users').update({ last_login_at: new Date().toISOString() }).eq('id', user.id);
  await logActivity(sessionUser.id, `login (${sessionUser.username})`, 'users', user.id as number);

  return { ok: true, mustChangePassword: sessionUser.must_change_password };
}

export async function logoutUser(): Promise<void> {
  const session = await getSession();
  const uid = session.user?.id;
  const uname = session.user?.username;
  session.destroy();
  if (uid) await logActivity(uid, `logout (${uname})`, 'users', uid);
}

export async function changePassword(
  userId: number,
  oldPassword: string,
  newPassword: string
): Promise<{ ok: boolean; error?: string }> {
  if (!newPassword || newPassword.length < 8) {
    return { ok: false, error: 'Password baru minimal 8 karakter.' };
  }
  const db = supabaseAdmin();
  const { data: user } = await db.from('users').select('password_hash').eq('id', userId).maybeSingle();
  if (!user) return { ok: false, error: 'User tidak ditemukan.' };
  const valid = await verifyPassword(oldPassword, user.password_hash as string);
  if (!valid) return { ok: false, error: 'Password lama salah.' };
  await db
    .from('users')
    .update({ password_hash: await hashPassword(newPassword), must_change_password: false })
    .eq('id', userId);
  // refresh session flag
  const session = await getSession();
  if (session.user) {
    session.user.must_change_password = false;
    await session.save();
  }
  await logActivity(userId, 'ganti password', 'users', userId);
  return { ok: true };
}
