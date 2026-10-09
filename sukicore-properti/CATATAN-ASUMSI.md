# Catatan Asumsi — SUKICORE Properti

Asumsi yang diambil selama pembangunan (di luar spesifikasi eksplisit):

1. **Halaman login di `/login`** (bukan `/admin/login`) — agar tidak terbungkus layout admin yang mewajibkan session (akan loop redirect). `/admin/login` di-redirect ke `/login` demi kompatibilitas.
2. **Next.js 16**: `middleware.ts` deprecated → memakai `proxy.ts`. `cacheComponents` dimatikan di `next.config.ts` karena seluruh halaman admin bersifat session-gated dan data-driven (prerender statis tidak memberi nilai).
3. **Siteplan memakai `L.CRS.Simple`** (koordinat kartesius) karena GeoJSON seed berupa grid demo, bukan koordinat geografis. Untuk denah nyata, ganti CRS + GeoJSON per lokasi via tabel `siteplan_overlays`.
4. **Akun demo per role** (`admin_keuangan` dkk, password `demo1234`) — untuk uji; hapus di produksi.
5. **Data seed fiktif** (NIK `999000…`, telepon `0813999…`) — jelas bukan data asli.
6. **Pindah unit**: unit lama → Ready diimplementasikan sebagai *transisi operasional* bernama (`operation: 'pindah-unit'`, alasan wajib, tercatat di log) — bukan override superadmin.
7. **Upload file** (bukti, lampiran, foto) memakai URL publik Supabase Storage — bucket dibuat public via `/api/v1/setup/storage`.
8. **Rate limit login** in-memory per instance (5x/menit/IP) — cukup untuk single-instance; gunakan Redis bila multi-instance.
9. **Laporan arus kas & mutasi** dihitung dari `incomes`/`expenses`/`balance_mutations`; tidak ada jurnal akuntansi double-entry penuh.
10. **SP3K** dikelola di dalam halaman ACC Bank (tidak ada menu sendiri) — sesuai skema (tidak ada route khusus di sistem acuan).
11. **Ekspor PDF** memakai tabel teks sederhana (pdfkit), bukan replika piksel-perfect denah.
12. **CMS konten** hanya CRUD — belum dirender ke situs publik (tidak ada landing page, sesuai acuan).
