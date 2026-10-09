# API SUKICORE Properti — ` /api/v1/*`

Basis: `https://<host>/api/v1`. Semua endpoint (kecuali login/logout) butuh session cookie login.

## Konvensi

- **Auth**: cookie `sukicore_session`. Tanpa session → `401 {error:{code:'UNAUTHORIZED'}}`.
- **Otorisasi**: izin dicek per menu + aksi (view/create/edit/delete) dari matriks role. Tanpa izin → `403 {error:{code:'FORBIDDEN'}}`.
- **List**: `GET ?q=&page=1&per_page=20` → `{data:[...], meta:{page, per_page, total}}`.
- **Body**: JSON, divalidasi Zod → gagal validasi = `422 {error:{code:'VALIDATION', message}}`.
- **Error umum**: `{error:{code, message}}`. Kode: `BAD_JSON`, `VALIDATION`, `DB_ERROR`, `NOT_FOUND`, `DUPLICATE` (409), `UNAUTHORIZED` (401), `FORBIDDEN` (403).
- **Sukses**: `{data}` (+ `meta` untuk list). Create → 201.

## Auth

| Method | Path | Keterangan |
|---|---|---|
| POST | `/api/v1/auth/logout` | Keluar (hapus session) |
| GET | `/api/v1/auth/me` | User aktif |
| POST | `/api/v1/auth/change-password` | `{oldPassword, newPassword(min 8)}` |

> Login dilakukan via Server Action di `/admin/login` (bukan API), dengan rate-limit 5x/menit/IP.

## Master Data (`/api/v1/masters/*`)

CRUD standar (`GET` list, `POST`, `GET/PUT/DELETE /[id]`):

`satuan`, `perusahaan`, `lokasi-kavling`, `kavling` (filter `?location_id=&status_id=`), `barang`, `supplier`, `bank-transaksi`, `bank-kpr`, `notaris`

`PUT /api/v1/units/[id]/toggle-ready` — balik status ready unit.

## Customer (`/api/v1/customers`, `/prospects`, `/complaints`)

- `customers` — CRUD; `DELETE` = soft delete; `GET /[id]` detail ber-JOIN (untuk auto-fill form)
- `PUT /api/v1/customers/[id]/restore` — kembalikan dari arsip
- `customers/files` — `POST` FormData (`customer_id`, `file`, `keterangan`) → bucket `lampiran`; `DELETE /[id]` hapus row + file
- `prospects`, `complaints` — CRUD standar

## Transaksi

| Method | Path | Efek status unit |
|---|---|---|
| GET/POST | `/api/v1/holds`, `PUT/DELETE /[id]` | — |
| POST | `/api/v1/holds/[id]/verify` `{approve:true/false}` | approve → `Booking` |
| GET/POST | `/api/v1/interviews` (+`/[id]`) | — |
| GET/POST | `/api/v1/bank-approvals` (+`/[id]`) | — |
| GET/POST | `/api/v1/sp3k` (+`/[id]`) | `SP3K` |
| GET/POST | `/api/v1/akad-schedules` (+`/[id]`) | — |
| GET/POST/DELETE | `/api/v1/akad-schedules/[id]/participants` (`?customer_id=`) | tambah → `Akad` |
| GET/POST | `/api/v1/handovers` (+`/[id]`) | `Serah Terima` |
| GET/POST | `/api/v1/ppjb` (+`/[id]`) | `Pembelian Cash` |
| GET/POST | `/api/v1/cancellations` (+`/[id]`) | `User Cancel` (validasi "kavling milik orang lain" → 422) |
| GET/POST | `/api/v1/transaksi/pindah-unit` | lama → `Ready`, baru → `Booking Fee` (atomis per langkah + log) |
| GET/POST | `/api/v1/transaksi/ganti-nama` | customer baru warisi unit/status; lama diarsip |
| GET/POST | `/api/v1/payments` (+`/[id]`) | otomatis `balance_mutations` bila bayar via rekening |
| GET | `/api/v1/payments/summary` | agregat tagihan/bayar/sisa per customer |

Transisi status ilegal → `422`. Override mundur hanya SUPERADMIN + alasan tertulis.

## Marketing & Operasional

- `marketing`, `admin-staff` — CRUD
- `op-bangunan/projects`, `op-bangunan/work-types` (`?project_id=`), `op-jalan/projects`, `op-jalan/roads`, `op-jalan/work-types`, `op-saluran/projects`, `op-saluran/channels`, `op-saluran/work-types` — CRUD

## Legal

- `legal/utility` — upsert per `unit_id`
- `legal/checklists` — upsert per (`customer_id`,`unit_id`), 8 dokumen boolean
- `legal/bphtb-ssp`, `legal/balik-nama` — CRUD

## Keuangan (`/api/v1/finance/*`)

- `incomes`, `expenses` — CRUD + sinkron `balance_mutations` otomatis (masuk/keluar, `ref_tabel`)
- `debts`, `receivables` — CRUD + `POST /[id]/pay` `{jumlah}` (cicilan; otomatis `lunas` bila sisa 0)
- `categories` — CRUD kategori
- `mutations` — `GET` read-only (`?rekening_id=&bulan=YYYY-MM`)
- `cashflow` — `GET ?tahun=&bulan=&rekening_id=` ringkasan + rincian

## Pembelian & Gudang

- `purchasing/po` — CRUD (PUT/DELETE hanya `draft`); total dihitung server
- `purchasing/receipts` — terima PO → stok += qty, PO → `diterima`
- `purchasing/issues` — validasi stok (422 bila kurang) → stok -= qty

## Siteplan

- `GET /api/v1/siteplan/[jenis]/[locationId]` — GeoJSON + `properties.color` + legenda
- `GET /api/v1/siteplan/unit/[id]` — detail unit + customer + payments + utility
- `GET /api/v1/siteplan/unit/[id]/cetak` — PDF data kavling
- `GET /api/v1/siteplan/export?jenis=&location_id=&format=pdf|jpg` — render denah server-side

## Pengaturan & Setup

- `settings/profil` (GET+PUT), `settings/media` (POST FormData), `settings/users` (+`/[id]`, `POST /[id]/reset-password`), `settings/roles` (+`/[id]`), `settings/permissions` (GET `?role_id=`, PUT bulk), `settings/cms` (+`/[id]`), `settings/statuses` (+`/[id]`), `settings/logs` (GET filter)
- `POST /api/v1/setup/storage` — SUPERADMIN saja; buat bucket storage

## Ekspor

- `GET /api/v1/exports/kavling?location_id=&format=excel|pdf`
- `GET /api/v1/exports/aruskas?tahun=&bulan=&rekening_id=&format=excel|pdf`
- `GET /api/v1/exports/subsidi-form/[id]` — PDF form subsidi per customer

Total ±123 route handler.
