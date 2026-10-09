-- =============================================================
-- SUKICORE Properti — SEED DATA DEMO
-- Semua data fiktif untuk keperluan demo/pengembangan.
-- NIK & telepon memakai pola fiktif yang jelas (999xxx).
-- Ganti password bawaan setelah instalasi!
-- =============================================================

-- ---------- Perusahaan & Lokasi ----------
insert into companies (nama, alamat, telepon, email) values
('PT SUKICORE Properti (Demo)', 'Jl. Contoh No. 1, Kendari, Sulawesi Tenggara', '081300000001', 'info@sukicore-demo.local');

insert into locations (company_id, kode, nama, alamat) values
(1, 'BSK',  'BUMI SAMARKAND',       'Kendari'),
(1, 'MCS5', 'MADINAH CITY SQUARE V','Kendari'),
(1, 'VML',  'VILLA MADINAH LAND',   'Kendari'),
(1, 'BRG',  'BARUGA REGENCY',       'Kendari');

-- ---------- 8 Status progres + Booking ----------
insert into unit_statuses (nama, warna_hex, urutan, keterangan) values
('Ready',           '#ffffff', 1, 'unit tersedia'),
('Booking',         '#00c853', 0, 'booking awal (legenda siteplan)'),
('Booking Fee',     '#ffff80', 2, 'customer membayar booking fee'),
('On Proses Bank',  '#ff7300', 3, 'pengajuan KPR diproses bank'),
('SP3K',            '#6ab5ff', 4, 'pencairan kredit bank'),
('Akad',            '#fb00ff', 5, 'akad kredit'),
('Serah Terima',    '#800040', 6, 'serah terima kunci'),
('User Cancel',     '#ffffff', 7, 'pembelian dibatalkan'),
('Pembelian Cash',  '#00ffd5', 8, 'pembelian cash / cash keras via PPJB');

-- ---------- Role & User ----------
insert into roles (nama) values
('SUPERADMIN'),('Admin'),('Keuangan'),('Gudang'),('Legal'),('KPR'),('Proyek');

-- password_hash diganti saat build: $2b$10$VDXAqP6O4klZU7un1VTMwuT4Icc8b1hd8yj4PsJ.LadP8/9k01IJm = bcrypt('admin'), $2b$10$f4gPnWek7XGW68bUsFVi5e2axktMeEk4ZqR25I9B8NhQGwRIaaiOC = bcrypt('demo1234')
insert into users (username, password_hash, nama_lengkap, role_id, must_change_password) values
('master', '$2b$10$VDXAqP6O4klZU7un1VTMwuT4Icc8b1hd8yj4PsJ.LadP8/9k01IJm', 'Master Administrator', 1, true),
('admin_keuangan', '$2b$10$f4gPnWek7XGW68bUsFVi5e2axktMeEk4ZqR25I9B8NhQGwRIaaiOC', 'Demo Keuangan', 3, false),
('admin_gudang',   '$2b$10$f4gPnWek7XGW68bUsFVi5e2axktMeEk4ZqR25I9B8NhQGwRIaaiOC', 'Demo Gudang',   4, false),
('admin_legal',    '$2b$10$f4gPnWek7XGW68bUsFVi5e2axktMeEk4ZqR25I9B8NhQGwRIaaiOC', 'Demo Legal',    5, false),
('admin_kpr',      '$2b$10$f4gPnWek7XGW68bUsFVi5e2axktMeEk4ZqR25I9B8NhQGwRIaaiOC', 'Demo KPR',      6, false),
('admin_proyek',   '$2b$10$f4gPnWek7XGW68bUsFVi5e2axktMeEk4ZqR25I9B8NhQGwRIaaiOC', 'Demo Proyek',   7, false);

-- ---------- Menu (17 grup navigasi) ----------
insert into menus (grup, nama, path, urutan, icon) values
-- Beranda & Dashboard
('Beranda', 'Beranda', '/admin/beranda', 10, 'home'),
('Beranda', 'Dashboard', '/admin/dashboard', 20, 'layout-dashboard'),
-- Siteplan
('Siteplan', 'Siteplan Penjualan', '/admin/siteplan/penjualan', 30, 'map'),
('Siteplan', 'Siteplan Proyek', '/admin/siteplan/proyek', 31, 'map'),
('Siteplan', 'Siteplan Unit Ready', '/admin/siteplan/unit-ready', 32, 'map'),
('Siteplan', 'Siteplan Listrik', '/admin/siteplan/listrik', 33, 'zap'),
('Siteplan', 'Siteplan Air', '/admin/siteplan/air', 34, 'droplet'),
('Siteplan', 'Siteplan BPHTB/SSP', '/admin/siteplan/bphtb-ssp', 35, 'map'),
('Siteplan', 'Siteplan Balik Nama', '/admin/siteplan/balik-nama', 36, 'map'),
-- Unit & Pengajuan & Pembayaran
('Unit', 'Unit Ready', '/admin/unit-ready', 40, 'building'),
('Pengajuan', 'Pengajuan Hold', '/admin/pengajuan-hold', 50, 'pause'),
('Pembayaran', 'Pembayaran', '/admin/pembayaran', 60, 'wallet'),
-- Transaksi
('Transaksi', 'Wawancara', '/admin/transaksi/wawancara', 70, 'messages-square'),
('Transaksi', 'ACC Bank', '/admin/transaksi/acc-bank', 71, 'landmark'),
('Transaksi', 'Akad', '/admin/transaksi/akad', 72, 'pen-line'),
('Transaksi', 'Pindah Unit', '/admin/transaksi/pindah-unit', 73, 'repeat'),
('Transaksi', 'Pembelian Cancel', '/admin/transaksi/pembelian-cancel', 74, 'x-circle'),
('Transaksi', 'Ganti Nama', '/admin/transaksi/ganti-nama', 75, 'user-pen'),
('Transaksi', 'PPJB', '/admin/transaksi/ppjb', 76, 'file-text'),
-- Customer
('Customer', 'Data Customer', '/admin/customer/customer', 80, 'users'),
('Customer', 'Prospek', '/admin/customer/prospek', 81, 'user-plus'),
('Customer', 'Upload File', '/admin/customer/upload-file', 82, 'upload'),
('Customer', 'Arsip Customer', '/admin/customer/arsip-customer', 83, 'archive'),
('Customer', 'Aduan Customer', '/admin/customer/aduan-customer', 84, 'message-circle-warning'),
('Customer', 'Serah Terima Kunci', '/admin/customer/serah-terima-kunci', 85, 'key'),
-- Marketing
('Marketing', 'Marketing', '/admin/marketing/marketing', 90, 'megaphone'),
('Marketing', 'Admin Pemberkasan', '/admin/marketing/admin-pemberkasan', 91, 'clipboard-list'),
-- Operasional Proyek
('OP Bangunan', 'Proyek Bangunan', '/admin/op-bangunan/proyek-bangunan', 100, 'hammer'),
('OP Bangunan', 'Jenis Pekerjaan Bangunan', '/admin/op-bangunan/jenis-pekerjaan-bangunan', 101, 'list-checks'),
('OP Jalan', 'Proyek Jalan', '/admin/op-jalan/proyek-jalan', 110, 'route'),
('OP Jalan', 'Jalan', '/admin/op-jalan/jalan', 111, 'milestone'),
('OP Jalan', 'Jenis Pekerjaan Jalan', '/admin/op-jalan/jenis-pekerjaan-jalan', 112, 'list-checks'),
('OP Saluran', 'Proyek Saluran', '/admin/op-saluran/proyek-saluran', 120, 'waves'),
('OP Saluran', 'Saluran', '/admin/op-saluran/saluran', 121, 'spline'),
('OP Saluran', 'Jenis Pekerjaan Saluran', '/admin/op-saluran/jenis-pekerjaan-saluran', 122, 'list-checks'),
-- Legal
('Legal', 'Listrik & Air', '/admin/legal/listrik-air', 130, 'plug-zap'),
('Legal', 'Pengajuan Berkas', '/admin/legal/pengajuan-berkas', 131, 'folder-check'),
('Legal', 'BPHTB / SSP', '/admin/legal/bphtb-ssp', 132, 'receipt'),
('Legal', 'Balik Nama', '/admin/legal/balik-nama', 133, 'file-signature'),
-- Keuangan
('Keuangan', 'Pemasukan', '/admin/keuangan/pemasukan', 140, 'trending-up'),
('Keuangan', 'Pengeluaran', '/admin/keuangan/pengeluaran', 141, 'trending-down'),
('Keuangan', 'Hutang', '/admin/keuangan/hutang', 142, 'hand-coins'),
('Keuangan', 'Piutang', '/admin/keuangan/piutang', 143, 'badge-dollar-sign'),
('Keuangan', 'Kategori Transaksi', '/admin/keuangan/kategori-transaksi', 144, 'tags'),
('Keuangan', 'Mutasi Saldo', '/admin/keuangan/mutasi-saldo', 145, 'arrow-left-right'),
('Keuangan', 'Laporan Arus Kas', '/admin/keuangan/laporan-arus-kas', 146, 'chart-column'),
-- Pembelian & Barang
('Pembelian', 'Input PO', '/admin/pembelian/input-po', 150, 'shopping-cart'),
('Pembelian', 'Barang Masuk', '/admin/pembelian/barang-masuk', 151, 'package-plus'),
('Pembelian', 'Barang Keluar', '/admin/barang-keluar', 152, 'package-minus'),
-- Master Data
('Master Data', 'Perusahaan', '/admin/master/perusahaan', 160, 'factory'),
('Master Data', 'Lokasi Kavling', '/admin/master/lokasi-kavling', 161, 'map-pin'),
('Master Data', 'Kavling', '/admin/master/kavling', 162, 'layout-grid'),
('Master Data', 'Barang', '/admin/master/barang', 163, 'package'),
('Master Data', 'Supplier', '/admin/master/supplier', 164, 'truck'),
('Master Data', 'Satuan', '/admin/master/satuan', 165, 'ruler'),
('Master Data', 'Bank Transaksi', '/admin/master/bank-transaksi', 166, 'banknote'),
('Master Data', 'Bank KPR', '/admin/master/bank-kpr', 167, 'landmark'),
('Master Data', 'Notaris', '/admin/master/notaris', 168, 'stamp'),
-- Pengaturan
('Pengaturan', 'Pengaturan Profil', '/admin/pengaturan/pengaturan-profil', 170, 'settings'),
('Pengaturan', 'Pengaturan Media', '/admin/pengaturan/pengaturan-media', 171, 'image'),
('Pengaturan', 'Pengaturan Pengguna', '/admin/pengaturan/pengaturan-pengguna', 172, 'user-cog'),
('Pengaturan', 'Hak Akses', '/admin/pengaturan/hak-akses', 173, 'shield-check'),
('Pengaturan', 'Role User', '/admin/pengaturan/role-user', 174, 'key-round'),
('Pengaturan', 'Konten', '/admin/pengaturan/konten', 175, 'newspaper'),
('Pengaturan', 'List Penjualan', '/admin/pengaturan/list-penjualan', 176, 'palette'),
('Pengaturan', 'Log Aktivitas', '/admin/pengaturan/log-aktivitas', 177, 'history'),
-- Panduan
('Panduan', 'Panduan Aplikasi', '/admin/panduan-aplikasi', 180, 'book-open');

-- ---------- Permissions ----------
-- Semua role non-SUPERADMIN: lihat semua menu
insert into permissions (role_id, menu_id, can_view, can_create, can_edit, can_delete)
select r.id, m.id, true, false, false, false
from roles r cross join menus m where r.nama <> 'SUPERADMIN';
-- SUPERADMIN: akses penuh
insert into permissions (role_id, menu_id, can_view, can_create, can_edit, can_delete)
select r.id, m.id, true, true, true, true
from roles r cross join menus m where r.nama = 'SUPERADMIN';
-- Admin: kelola semua kecuali pengaturan pengguna/hak akses/role
update permissions p set can_create=true, can_edit=true, can_delete=true
from roles r, menus m
where p.role_id=r.id and p.menu_id=m.id and r.nama='Admin'
  and m.path not in ('/admin/pengaturan/pengaturan-pengguna','/admin/pengaturan/hak-akses','/admin/pengaturan/role-user');
-- Keuangan: keuangan + pembayaran + bank
update permissions p set can_create=true, can_edit=true, can_delete=true
from roles r, menus m
where p.role_id=r.id and p.menu_id=m.id and r.nama='Keuangan'
  and (m.path like '/admin/keuangan/%' or m.path in ('/admin/pembayaran','/admin/master/bank-transaksi'));
-- Gudang: pembelian & barang
update permissions p set can_create=true, can_edit=true, can_delete=true
from roles r, menus m
where p.role_id=r.id and p.menu_id=m.id and r.nama='Gudang'
  and (m.path like '/admin/pembelian/%' or m.path in ('/admin/barang-keluar','/admin/master/barang','/admin/master/supplier','/admin/master/satuan'));
-- Legal: legal + customer
update permissions p set can_create=true, can_edit=true, can_delete=true
from roles r, menus m
where p.role_id=r.id and p.menu_id=m.id and r.nama='Legal'
  and (m.path like '/admin/legal/%' or m.path like '/admin/customer/%');
-- KPR: transaksi KPR + customer + pembayaran
update permissions p set can_create=true, can_edit=true, can_delete=true
from roles r, menus m
where p.role_id=r.id and p.menu_id=m.id and r.nama='KPR'
  and (m.path in ('/admin/transaksi/wawancara','/admin/transaksi/acc-bank','/admin/transaksi/akad',
                  '/admin/pembayaran','/admin/pengajuan-hold')
       or m.path like '/admin/customer/%');
-- Proyek: operasional + siteplan proyek + unit ready + kavling
update permissions p set can_create=true, can_edit=true, can_delete=true
from roles r, menus m
where p.role_id=r.id and p.menu_id=m.id and r.nama='Proyek'
  and (m.path like '/admin/op-bangunan/%' or m.path like '/admin/op-jalan/%' or m.path like '/admin/op-saluran/%'
       or m.path in ('/admin/siteplan/proyek','/admin/unit-ready','/admin/master/kavling','/admin/master/lokasi-kavling'));

-- ---------- Unit demo: 48 unit (12 per lokasi) ----------
insert into units (location_id, kode_kavling, luas_tanah, luas_bangunan, harga_jual, status_id, progres_bangunan, is_ready, listrik_terpasang, air_terpasang)
select l.id,
       l.kode || '-' || chr(64+g) || '-' || s,
       90 + ((g*7+s*13) % 60),                       -- luas tanah 90-149
       36 + ((g*5+s*11) % 30),                       -- luas bangunan 36-65
       (150 + ((g*37+s*53) % 600)) * 1000000,        -- harga 150jt-749jt
       (select id from unit_statuses order by urutan limit 1 offset ((g+s) % 8)),
       ((g*23+s*41) % 101),
       ((g+s) % 3 = 0),
       ((g+s) % 2 = 0),
       ((g+s) % 4 = 0)
from locations l
cross join generate_series(1,3) g
cross join generate_series(1,4) s;

-- ---------- Marketing, Admin, Bank, Notaris ----------
insert into marketing (kode, nama, alamat, no_rekening, is_active) values
('MKT-001','Budi Santoso (Demo)','Jl. Demo No. 1','999000111',true),
('MKT-002','Siti Aminah (Demo)','Jl. Demo No. 2','999000222',true),
('MKT-003','Agus Wijaya (Demo)','Jl. Demo No. 3','999000333',true);

insert into admin_staff (kode, nama, is_active) values
('ADM-001','Rina Wulandari (Demo)',true),
('ADM-002','Dedi Kurniawan (Demo)',true);

insert into bank_kpr (nama) values ('Bank Demo Syariah'),('Bank Demo Nasional'),('Bank Demo Daerah');
insert into bank_transaksi (nama_bank, no_rekening, atas_nama) values
('Bank Demo Nasional','999888777','PT SUKICORE Properti (Demo)'),
('Bank Demo Syariah','999888666','PT SUKICORE Properti (Demo)');
insert into notaries (nama, alamat, telepon) values ('Notaris Demo, S.H.','Jl. Demo No. 9','081399900009');

-- ---------- Customer & prospek demo ----------
insert into customers (nama_lengkap, nik, no_hp, tempat_lahir, tgl_lahir, jenis_kelamin, alamat_ktp, jenis_pembelian, marketing_id, admin_id, unit_id, status_id)
select
  'Customer Demo ' || s,
  '999000' || lpad(s::text, 10, '0'),
  '0813999000' || lpad(s::text, 2, '0'),
  'Kendari', current_date - (30*365 + s*100),
  case when s % 2 = 0 then 'L' else 'P' end,
  'Jl. Demo No. ' || s || ', Kendari',
  case when s % 2 = 0 then 'KPR' else 'Cash' end,
  1 + (s % 3), 1 + (s % 2),
  u.id,
  (select id from unit_statuses where nama in ('Booking Fee','On Proses Bank','SP3K','Akad','Serah Terima') order by urutan limit 1 offset ((s-1) % 5))
from generate_series(1,5) s
join lateral (select id from units order by id limit 1 offset (s*3)) u on true;

insert into prospects (nama_lengkap, no_hp, sumber, marketing_id, status) values
('Prospek Demo Satu','081399911111','Pameran',1,'baru'),
('Prospek Demo Dua','081399922222','Referensi',2,'follow_up');

-- ---------- Kategori & keuangan demo ----------
insert into finance_categories (nama, tipe) values
('Booking Fee','pemasukan'),('Uang Muka','pemasukan'),('Cicilan KPR','pemasukan'),
('Pelunasan Cash','pemasukan'),('Biaya Admin','pemasukan'),('Lain-lain Masuk','pemasukan'),
('Gaji Karyawan','pengeluaran'),('Operasional Kantor','pengeluaran'),('Biaya Proyek','pengeluaran'),
('Biaya Marketing','pengeluaran'),('Pajak','pengeluaran'),('Biaya Legal','pengeluaran'),
('Pemeliharaan','pengeluaran'),('Lain-lain Keluar','pengeluaran');

insert into units_of_measure (nama) values ('UNIT'),('SET'),('PCS');
insert into suppliers (nama, alamat, telepon) values ('Supplier Demo Makmur','Jl. Demo No. 5','081399955555');

-- ---------- Siteplan demo: grid 3x4 kavling per lokasi ----------
insert into siteplan_overlays (location_id, jenis, nama, geojson)
select l.id, 'penjualan', 'Siteplan Penjualan - ' || l.nama,
  jsonb_build_object(
    'type', 'FeatureCollection',
    'features', (
      select jsonb_agg(
        jsonb_build_object(
          'type', 'Feature',
          'properties', jsonb_build_object('unit_id', u.id, 'kode', u.kode_kavling),
          'geometry', jsonb_build_object(
            'type', 'Polygon',
            'coordinates', jsonb_build_array(jsonb_build_array(
              jsonb_build_array(x, y), jsonb_build_array(x+8, y),
              jsonb_build_array(x+8, y+6), jsonb_build_array(x, y+6),
              jsonb_build_array(x, y)
            ))
          )
        ) order by u.id
      )
      from (
        select u2.*, ((row_number() over (order by u2.id)) - 1) as rn
        from units u2 where u2.location_id = l.id
      ) u
      cross join lateral (select ((u.rn % 4) * 10)::float8 as x, ((u.rn / 4) * 8)::float8 as y) pos
    )
  )
from locations l;

-- ---------- Pengaturan ----------
insert into app_settings (key, value) values
('company_nama', 'PT SUKICORE Properti (Demo)'),
('company_alamat', 'Jl. Contoh No. 1, Kendari, Sulawesi Tenggara'),
('company_telepon', '081300000001'),
('company_email', 'info@sukicore-demo.local');

insert into media_assets (key, file_url) values
('logo', null), ('favicon', null), ('background', null);

insert into cms_contents (key, judul, isi_html, posisi) values
('navbar-demo', 'Navigasi Demo', '<p>Konten demo — sambungkan ke landing page publik bila tersedia.</p>', 'navbar');
