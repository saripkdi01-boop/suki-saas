import { requirePerm } from '@/lib/permissions';
import { PageHeader, Card } from '@/components/ui';

const MENU = '/admin/panduan-aplikasi';

interface Panduan {
  judul: string;
  langkah: string[];
}

interface GrupPanduan {
  peran: string;
  daftar: Panduan[];
}

const PANDUAN: GrupPanduan[] = [
  {
    peran: 'Admin',
    daftar: [
      {
        judul: 'Membaca Dashboard',
        langkah: [
          'Buka menu Dashboard (/admin/dashboard) untuk melihat kartu Total Unit, Booking, Wawancara, dan Akad.',
          'Periksa tabel Statistik Penjualan per Lokasi — kolom READY, HOLD, BF (booking fee), dan KPR per lokasi.',
          'Klik Detail pada baris lokasi untuk membuka tabel unit lokasi tersebut (/admin/dashboard/lokasi-penjualan/{id}).',
          'Pantau grafik Statistik Unit Ready, Status Progres, dan Penggunaan Bank untuk gambaran menyeluruh.',
          'Lihat tabel Statistik Penjualan Marketing dan Admin Pemberkasan untuk kinerja tim.',
        ],
      },
      {
        judul: 'Mengelola Pengguna',
        langkah: [
          'Buka Pengaturan Pengguna (/admin/pengaturan/pengaturan-pengguna).',
          'Klik Tambah Pengguna: isi username unik (huruf kecil), nama lengkap, pilih role, dan password minimal 8 karakter.',
          'Untuk mengubah data, klik Edit: nama, role, dan status aktif dapat diubah (password tidak).',
          'Klik Reset Password bila pengguna lupa password — pengguna wajib mengganti password saat login berikutnya.',
          'Tombol Hapus tidak tampil untuk akun sendiri dan akun master (dilarang menghapus keduanya).',
        ],
      },
      {
        judul: 'Mengatur Hak Akses',
        langkah: [
          'Buat role baru dulu di Role User (/admin/pengaturan/role-user) bila belum ada.',
          'Buka Hak Akses (/admin/pengaturan/hak-akses) lalu pilih role dari dropdown.',
          'Centang izin Lihat, Tambah, Edit, Hapus untuk setiap menu yang dikelompokkan per grup.',
          'Klik Simpan Hak Akses. Perubahan langsung berlaku saat pengguna login berikutnya.',
          'Role SUPERADMIN memiliki akses penuh dan matriksnya tidak dapat diubah.',
        ],
      },
      {
        judul: 'Melihat Log Aktivitas',
        langkah: [
          'Buka Log Aktivitas (/admin/pengaturan/log-aktivitas) — halaman ini read-only.',
          'Gunakan filter Tanggal Dari / Tanggal Sampai dan kata kunci (aksi, username, atau nama tabel).',
          'Setiap login, logout, dan mutasi data penting tercatat otomatis dengan waktu WITA.',
          'Klik Reset untuk menghapus filter.',
        ],
      },
      {
        judul: 'Mengelola List Penjualan (Status & Warna)',
        langkah: [
          'Buka List Penjualan (/admin/pengaturan/list-penjualan).',
          'Tambah atau edit status: nama, warna hex (cth #ffff80), urutan, dan keterangan.',
          'Warna yang diatur di sini dipakai oleh siteplan dan badge status di seluruh aplikasi.',
          'Kolom urutan menentukan alur pipeline penjualan unit.',
          'Status yang masih dipakai unit tidak boleh dihapus — pindahkan dulu unitnya.',
        ],
      },
    ],
  },
  {
    peran: 'Marketing',
    daftar: [
      {
        judul: 'Mengelola Prospek',
        langkah: [
          'Buka Prospek (/admin/customer/prospek) untuk mencatat calon pembeli.',
          'Klik Tambah: isi nama, kontak, sumber prospek, dan catatan pendekatan.',
          'Follow-up prospek secara berkala dan perbarui catatannya.',
          'Bila prospek deal, daftarkan sebagai customer di Data Customer.',
        ],
      },
      {
        judul: 'Mendaftarkan Customer',
        langkah: [
          'Buka Data Customer (/admin/customer/customer) lalu klik Tambah Customer.',
          'Isi data lengkap: nama, NIK, no HP/WA, tempat & tanggal lahir, alamat KTP, alamat domisili, dan NPWP.',
          'Pilih marketing penanggung jawab, admin pemberkasan, dan unit (hanya unit berstatus Ready).',
          'Pilih jenis pembelian: KPR atau Cash.',
          'Setelah tersimpan, cetak Form Subsidi bila diperlukan dan unggah berkas di Upload File (/admin/customer/upload-file).',
        ],
      },
    ],
  },
  {
    peran: 'Proyek',
    daftar: [
      {
        judul: 'Membaca Siteplan',
        langkah: [
          'Buka Siteplan Penjualan (/admin/siteplan/penjualan) lalu pilih tab lokasi perumahan.',
          'Ganti overlay lewat pilihan jenis: penjualan, proyek, unit-ready, listrik, air, bphtb-ssp, balik-nama.',
          'Perhatikan legenda warna — warna mengikuti status di List Penjualan.',
          'Klik sebuah kavling untuk membuka modal 5 tab: Data Unit Rumah, Data Customer, Tagihan & Pembayaran, Foto Unit, Listrik & Air.',
          'Gunakan Cetak Denah PDF atau Download Denah JPG untuk arsip; Reset Siteplan mengembalikan tampilan awal.',
        ],
      },
      {
        judul: 'Mengelola Progres Proyek (OP)',
        langkah: [
          'Buka Proyek Bangunan (/admin/op-bangunan/proyek-bangunan), Proyek Jalan (/admin/op-jalan/proyek-jalan), atau Proyek Saluran (/admin/op-saluran/proyek-saluran).',
          'Klik Tambah Proyek: pilih lokasi, isi nama, tanggal mulai, dan target selesai.',
          'Di Jenis Pekerjaan (cth /admin/op-bangunan/jenis-pekerjaan-bangunan), tambah daftar pekerjaan beserta bobot persennya.',
          'Perbarui progress proyek secara berkala — pantau visualnya di overlay siteplan proyek.',
        ],
      },
    ],
  },
  {
    peran: 'Gudang',
    daftar: [
      {
        judul: 'Membuat PO Pembelian',
        langkah: [
          'Pastikan data master sudah ada: Barang (/admin/master/barang), Supplier (/admin/master/supplier), Satuan (/admin/master/satuan).',
          'Buka Input PO (/admin/pembelian/input-po) lalu klik Tambah PO.',
          'Pilih supplier, lalu tambah baris item: pilih barang, isi qty, satuan, dan harga — total dihitung otomatis.',
          'Simpan PO. Status PO dapat dipantau di tabel.',
        ],
      },
      {
        judul: 'Barang Masuk & Barang Keluar',
        langkah: [
          'Buka Barang Masuk (/admin/pembelian/barang-masuk) untuk menerima PO — stok barang bertambah otomatis.',
          'Buka Barang Keluar (/admin/barang-keluar) untuk mencatat pemakaian: pilih barang dan qty.',
          'Sistem menolak pengeluaran bila stok tidak mencukupi.',
          'Pantau sisa stok di master Barang (/admin/master/barang).',
        ],
      },
    ],
  },
  {
    peran: 'Keuangan',
    daftar: [
      {
        judul: 'Mencatat Pemasukan & Pengeluaran',
        langkah: [
          'Siapkan Kategori Transaksi (/admin/keuangan/kategori-transaksi) dan rekening di Bank Transaksi (/admin/master/bank-transaksi).',
          'Buka Pemasukan (/admin/keuangan/pemasukan) atau Pengeluaran (/admin/keuangan/pengeluaran), klik Tambah.',
          'Isi tanggal, kategori, rekening, jumlah, dan keterangan; lampirkan bukti bila ada.',
          'Setiap pemasukan/pengeluaran otomatis tercatat di Mutasi Saldo (/admin/keuangan/mutasi-saldo).',
          'Kelola Hutang (/admin/keuangan/hutang) dan Piutang (/admin/keuangan/piutang) — pantau kolom sisa dan status lunas.',
        ],
      },
      {
        judul: 'Laporan Arus Kas',
        langkah: [
          'Buka Laporan Arus Kas (/admin/keuangan/laporan-arus-kas).',
          'Pilih filter tahun, bulan, dan rekening untuk melihat ringkasan kas.',
          'Periksa grafik dan rincian mutasi per kategori.',
          'Klik Ekspor PDF atau Ekspor Excel untuk arsip/bahan laporan.',
        ],
      },
    ],
  },
  {
    peran: 'Legal',
    daftar: [
      {
        judul: 'Checklist Berkas Legal',
        langkah: [
          'Buka Pengajuan Berkas (/admin/legal/pengajuan-berkas).',
          'Pilih customer, lalu centang dokumen yang sudah lengkap: IPH, SHGB, SSP, BPHTB, Sikumbang, dan seterusnya (✓/✗).',
          'Tambahkan catatan untuk dokumen yang masih kurang.',
          'Pantau status listrik & air per unit di Listrik & Air (/admin/legal/listrik-air) termasuk no rekening dan foto.',
        ],
      },
      {
        judul: 'BPHTB/SSP & Balik Nama',
        langkah: [
          'Catat proses BPHTB/SSP di menu BPHTB / SSP (/admin/legal/bphtb-ssp): status, tanggal, dan nominal.',
          'Catat proses balik nama di Balik Nama (/admin/legal/balik-nama) beserta notarisnya (master di /admin/master/notaris).',
          'Pantau progresnya secara visual di overlay siteplan bphtb-ssp dan balik-nama.',
        ],
      },
    ],
  },
  {
    peran: 'KPR',
    daftar: [
      {
        judul: 'Penjadwalan Wawancara',
        langkah: [
          'Pastikan bank KPR terdaftar di Bank KPR (/admin/master/bank-kpr).',
          'Buka Wawancara (/admin/transaksi/wawancara) lalu klik Tambah Data.',
          'Pilih customer — NIK, alamat, lokasi rumah, tipe, luas, dan marketing terisi otomatis.',
          'Isi tanggal wawancara (hari terisi otomatis) dan pilih bank KPR.',
          'Tulis catatan wawancara lalu simpan.',
        ],
      },
      {
        judul: 'ACC Bank',
        langkah: [
          'Buka ACC Bank (/admin/transaksi/acc-bank) lalu catat hasil persetujuan bank per customer.',
          'Isi plafon ACC, tanggal SP3K, dan tanggal expired.',
          'Pantau kolom Sisa Hari — berwarna merah bila kurang dari 30 hari.',
          'Setelah ACC, status unit menjadi On Proses Bank.',
        ],
      },
      {
        judul: 'Jadwal Akad',
        langkah: [
          'Buka Akad (/admin/transaksi/akad) — modul ini mengelola jadwal akad secara batch.',
          'Klik Tambah Jadwal: isi tanggal dan keterangan.',
          'Daftarkan customer peserta ke dalam jadwal yang sesuai.',
          'Setelah akad terlaksana, lakukan Serah Terima Kunci (/admin/customer/serah-terima-kunci) agar status menjadi Serah Terima.',
        ],
      },
    ],
  },
  {
    peran: 'Penjualan',
    daftar: [
      {
        judul: 'Mengikuti Pipeline Status Unit',
        langkah: [
          'Alur normal: Ready → Booking Fee → On Proses Bank → SP3K → Akad → Serah Terima.',
          'Status diubah otomatis oleh modul transaksi (wawancara, ACC bank, akad, serah terima).',
          'Jalur pembelian cash dicatat lewat PPJB (/admin/transaksi/ppjb) dengan status Pembelian Cash.',
          'Pembatalan dicatat di Pembelian Cancel (/admin/transaksi/pembelian-cancel) — tombol Batalkan nonaktif bila kavling sudah milik orang lain.',
          'Transisi mundur hanya boleh dilakukan SUPERADMIN dengan alasan tertulis yang tercatat di log.',
          'Pantau warna status di siteplan dan daftar List Penjualan (/admin/pengaturan/list-penjualan).',
        ],
      },
      {
        judul: 'Pembayaran Customer',
        langkah: [
          'Buka Pembayaran (/admin/pembayaran) untuk tabel tagihan per customer.',
          'Rincian tagihan: Harga Rumah, Biaya Surat, Biaya Peningkatan Mutu, dan Booking Fee.',
          'Perhatikan kolom Tagihan, Sudah Bayar, dan Sisa Bayar.',
          'Klik Tambah Pembayaran: pilih customer, jenis tagihan, jumlah, metode, rekening, dan unggah bukti bayar.',
          'Buka Rekap Pembayaran untuk ringkasan keseluruhan.',
        ],
      },
      {
        judul: 'Pindah Unit & Ganti Nama',
        langkah: [
          'Untuk Pindah Unit (/admin/transaksi/pindah-unit): pilih customer (unit lama terisi otomatis), pilih unit baru yang berstatus Ready.',
          'Isi Biaya Administrasi, pilih rekening dan metode pembayaran, lalu unggah bukti bayar.',
          'Eksekusi memindahkan customer dan memperbarui status kedua unit dalam satu transaksi database.',
          'Untuk Ganti Nama (/admin/transaksi/ganti-nama): isi lengkap data customer baru, biaya ganti nama, dan bukti bayar.',
          'Customer lama diarsipkan otomatis dan booking dialihkan ke customer baru.',
        ],
      },
    ],
  },
];

export default async function PanduanAplikasiPage() {
  await requirePerm(MENU, 'view');

  return (
    <div>
      <PageHeader
        title="Panduan Aplikasi"
        subtitle="21 panduan penggunaan per peran — klik untuk membuka langkah-langkahnya"
      />
      <div className="space-y-5">
        {PANDUAN.map((g) => (
          <Card key={g.peran}>
            <h2 className="mb-3 text-base font-bold text-slate-900 dark:text-white">
              Peran: {g.peran}
              <span className="ml-2 text-xs font-normal text-slate-500">({g.daftar.length} panduan)</span>
            </h2>
            <div className="space-y-2">
              {g.daftar.map((p) => (
                <details
                  key={p.judul}
                  className="group rounded-lg border border-slate-200 dark:border-slate-700"
                >
                  <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-slate-800 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800/50">
                    {p.judul}
                  </summary>
                  <ol className="list-decimal space-y-1.5 border-t border-slate-100 px-4 py-3 pl-10 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">
                    {p.langkah.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ol>
                </details>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
