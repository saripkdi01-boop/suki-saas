# SUKICORE Properti

ERP/backoffice internal untuk developer perumahan — dibangun ulang dari nol (clean-room) dengan Next.js + TypeScript + Tailwind CSS + Supabase Postgres.

Bahasa UI: **Bahasa Indonesia**. Zona waktu: **Asia/Makassar (WITA)**.

## Fitur

- **Auth**: login username + password (bcrypt), session cookie httpOnly 8 jam, rate-limit login, wajib ganti password bawaan
- **Otorisasi**: 7 role (SUPERADMIN, Admin, Keuangan, Gudang, Legal, KPR, Proyek) + matriks izin per menu (Lihat/Tambah/Edit/Hapus) — ditegakkan di UI **dan** API
- **Dashboard**: statistik unit, penjualan per lokasi, grafik status, penjualan marketing/admin, penggunaan bank KPR
- **Siteplan interaktif**: peta Leaflet + GeoJSON, 7 overlay (penjualan, proyek, unit ready, listrik, air, BPHTB/SSP, balik nama), klik kavling → modal 5 tab, cetak PDF & unduh JPG server-side
- **Pipeline transaksi KPR**: Booking Fee → Wawancara → ACC Bank → SP3K → Akad (jadwal batch) → Serah Terima, plus jalur Cash/PPJB, pembatalan, pindah unit, ganti nama — dengan **state machine** yang ditegakkan di server
- **Customer**: data nasabah, prospek, upload berkas, arsip, aduan, serah terima kunci
- **Keuangan**: pemasukan/pengeluaran (otomatis mutasi saldo), hutang/piutang + pembayaran cicilan, laporan arus kas + ekspor Excel/PDF
- **Pembelian & gudang**: PO, barang masuk (stok otomatis), barang keluar (validasi stok)
- **Operasional proyek**: bangunan, jalan, saluran (proyek + jenis pekerjaan + progress)
- **Legal**: listrik & air per unit, checklist 8 dokumen berkas, BPHTB/SSP, balik nama
- **Master data**: perusahaan, lokasi, kavling, barang, supplier, satuan, bank, notaris
- **Pengaturan**: profil perusahaan, media (logo/favicon/background), pengguna, hak akses, role, konten CMS, list status penjualan (warna), log aktivitas
- **Audit trail**: setiap login/logout & mutasi penting tercatat di `activity_logs`
- **Panduan aplikasi**: 21 panduan per peran di dalam aplikasi

## Cara menjalankan

### 1. Persiapan database (satu kali)

1. Buat project baru di [Supabase](https://supabase.com) (gratis).
2. Di **SQL Editor**, jalankan berurutan:
   - `supabase/migrations/0001_schema.sql`
   - `supabase/migrations/0002_transaksi.sql`
   - `supabase/migrations/0003_operasional.sql`
   - `supabase/migrations/0004_gudang_siteplan.sql`
   - `supabase/seed.sql` (data demo — hapus/ubah untuk produksi)
3. Buat storage bucket (atau via aplikasi setelah login sebagai SUPERADMIN):
   - Buka `POST /api/v1/setup/storage` sekali (login dulu sebagai `master`), atau buat manual di dashboard Supabase: `app-media`, `unit-foto`, `bukti-bayar`, `lampiran` (public).

### 2. Konfigurasi aplikasi

```bash
cp .env.example .env.local
# isi:
#   NEXT_PUBLIC_SUPABASE_URL=...
#   SUPABASE_SERVICE_ROLE_KEY=...   (Settings → API → service_role, RAHASIA)
#   SESSION_SECRET=...              (string acak ≥32 karakter; mis. openssl rand -base64 48)
```

### 3. Jalankan

```bash
npm install
npm run dev      # development di http://localhost:3000
npm run build && npm start   # production
```

### 4. Login pertama

- Username: `master` — Password: `admin` (role SUPERADMIN)
- Aplikasi menampilkan banner peringatan sampai password diganti via menu **Ganti Password** (ikon kunci di topbar).
- Akun demo per role (password `demo1234`): `admin_keuangan`, `admin_gudang`, `admin_legal`, `admin_kpr`, `admin_proyek`.

> ⚠️ **Keamanan**: `master`/`admin` adalah kredensial bawaan yang lemah. Wajib diganti sebelum dipakai produksi. Jangan pernah commit `.env.local`.

## Struktur

```
app/
  (auth)/login/            # halaman login
  admin/                   # 17 grup modul (±60 halaman)
    beranda/ dashboard/ siteplan/[jenis]/ unit-ready/ pengajuan-hold/
    pembayaran/ transaksi/ customer/ marketing/
    op-bangunan/ op-jalan/ op-saluran/ legal/ keuangan/
    pembelian/ barang-keluar/ master/ pengaturan/ panduan-aplikasi/
    ganti-password/
  api/v1/                  # REST API (auth, masters, customers, transaksi,
                           #  siteplan, finance, purchasing, legal, settings, exports)
components/                # ui, DataTable, AutoForm, Sidebar, Topbar, siteplan, dashboard
lib/                       # supabase, auth, permissions, status (state machine),
                           #  format (WITA), api, activity, upload, client-api
supabase/                  # migrasi SQL + seed
```

## API

Dokumentasi endpoint: [`API.md`](./API.md).

## Catatan

- Semua waktu disimpan UTC di database, ditampilkan **WITA** di UI.
- Perubahan status unit melewati state machine (`lib/status.ts`); transisi ilegal ditolak API (422), override hanya oleh SUPERADMIN dengan alasan tertulis.
- Soft delete untuk data transaksi & master penting (`deleted_at`).
- Lihat [`LAPORAN-SELESAI.md`](./LAPORAN-SELESAI.md) untuk hasil verifikasi build dan hal yang belum 100%.
