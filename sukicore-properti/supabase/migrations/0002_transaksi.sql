-- ==================== 4. CUSTOMER & PIPELINE TRANSAKSI ====================

create table marketing (
  id          bigint generated always as identity primary key,
  kode        text not null unique,
  nama        text not null,
  alamat      text,
  no_rekening text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create table admin_staff (
  id         bigint generated always as identity primary key,
  kode       text not null unique,
  nama       text not null,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

create table bank_kpr (
  id         bigint generated always as identity primary key,
  nama       text not null unique,
  created_at timestamptz not null default now()
);

create table bank_transaksi (
  id          bigint generated always as identity primary key,
  nama_bank   text not null,
  no_rekening text not null,
  atas_nama   text,
  created_at  timestamptz not null default now()
);

create table notaries (
  id         bigint generated always as identity primary key,
  nama       text not null,
  alamat     text,
  telepon    text,
  created_at timestamptz not null default now()
);

create table customers (
  id               bigint generated always as identity primary key,
  nama_lengkap     text not null,
  nik              text,
  no_hp            text,
  tempat_lahir     text,
  tgl_lahir        date,
  jenis_kelamin    text check (jenis_kelamin in ('L','P')),
  alamat_ktp       text,
  alamat_domisili  text,
  npwp             text,
  jenis_pembelian  text not null default 'KPR' check (jenis_pembelian in ('KPR','Cash')),
  marketing_id     bigint references marketing(id) on delete set null,
  admin_id         bigint references admin_staff(id) on delete set null,
  unit_id          bigint references units(id) on delete set null,
  status_id        bigint references unit_statuses(id) on delete set null,
  is_archived      boolean not null default false,
  deleted_at       timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index idx_customers_unit   on customers(unit_id);
create index idx_customers_status on customers(status_id);
create index idx_customers_nama   on customers(nama_lengkap);
create index idx_customers_marketing on customers(marketing_id);

create table prospects (
  id              bigint generated always as identity primary key,
  nama_lengkap    text not null,
  no_hp           text,
  alamat          text,
  sumber          text,
  catatan         text,
  location_id     bigint references locations(id) on delete set null,
  marketing_id    bigint references marketing(id) on delete set null,
  status          text not null default 'baru' check (status in ('baru','follow_up','deal','batal')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table hold_requests (
  id           bigint generated always as identity primary key,
  unit_id      bigint not null references units(id) on delete restrict,
  customer_id  bigint references customers(id) on delete set null,
  jumlah       numeric(15,2),
  status       text not null default 'pending' check (status in ('pending','approved','rejected')),
  lampiran_url text,
  catatan      text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index idx_hold_unit on hold_requests(unit_id);

create table interviews (
  id           bigint generated always as identity primary key,
  customer_id  bigint not null references customers(id) on delete restrict,
  unit_id      bigint references units(id) on delete set null,
  tanggal      date not null,
  bank_kpr_id  bigint references bank_kpr(id) on delete set null,
  catatan      text,
  created_at   timestamptz not null default now()
);
create index idx_interviews_customer on interviews(customer_id);

create table bank_approvals (
  id           bigint generated always as identity primary key,
  customer_id  bigint not null references customers(id) on delete restrict,
  plafon_acc   numeric(15,2),
  tgl_sp3k     date,
  tgl_expired  date,
  keterangan   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table sp3k_records (
  id               bigint generated always as identity primary key,
  customer_id      bigint not null references customers(id) on delete restrict,
  tanggal_pencairan date,
  nominal          numeric(15,2),
  bank_kpr_id      bigint references bank_kpr(id) on delete set null,
  keterangan       text,
  created_at       timestamptz not null default now()
);

-- Akad dikelola sebagai JADWAL BATCH
create table akad_schedules (
  id         bigint generated always as identity primary key,
  tanggal    date not null,
  keterangan text,
  created_at timestamptz not null default now()
);
create table akad_participants (
  id                bigint generated always as identity primary key,
  akad_schedule_id  bigint not null references akad_schedules(id) on delete cascade,
  customer_id       bigint not null references customers(id) on delete restrict,
  unique(akad_schedule_id, customer_id)
);

create table handovers (
  id          bigint generated always as identity primary key,
  customer_id bigint not null references customers(id) on delete restrict,
  unit_id     bigint references units(id) on delete set null,
  tanggal     date not null,
  catatan     text,
  bukti_url   text,
  created_at  timestamptz not null default now()
);

create table ppjb (
  id          bigint generated always as identity primary key,
  tanggal     date not null,
  no_ppjb     text not null unique,
  customer_id bigint not null references customers(id) on delete restrict,
  unit_id     bigint references units(id) on delete set null,
  nominal     numeric(15,2),
  keterangan  text,
  created_at  timestamptz not null default now()
);

create table cancellations (
  id          bigint generated always as identity primary key,
  customer_id bigint not null references customers(id) on delete restrict,
  unit_id     bigint references units(id) on delete set null,
  alasan      text,
  tanggal     date not null default current_date,
  created_at  timestamptz not null default now()
);

create table unit_transfers (
  id            bigint generated always as identity primary key,
  customer_id   bigint not null references customers(id) on delete restrict,
  unit_lama_id  bigint not null references units(id) on delete restrict,
  unit_baru_id  bigint not null references units(id) on delete restrict,
  biaya_admin   numeric(15,2) not null default 0,
  rekening_id   bigint references bank_transaksi(id) on delete set null,
  metode_bayar  text,
  bukti_url     text,
  tanggal       date not null default current_date,
  created_at    timestamptz not null default now()
);

create table name_changes (
  id               bigint generated always as identity primary key,
  customer_lama_id bigint not null references customers(id) on delete restrict,
  nama_baru        text not null,
  nik_baru         text,
  no_hp_baru       text,
  alamat_baru      text,
  biaya_ganti_nama numeric(15,2) not null default 0,
  bukti_url        text,
  tanggal          date not null default current_date,
  created_at       timestamptz not null default now()
);

create table payments (
  id            bigint generated always as identity primary key,
  customer_id   bigint not null references customers(id) on delete restrict,
  unit_id       bigint references units(id) on delete set null,
  jenis_tagihan text not null check (jenis_tagihan in ('harga_rumah','biaya_surat','peningkatan_mutu','booking_fee','lainnya')),
  tagihan       numeric(15,2) not null default 0,
  sudah_bayar   numeric(15,2) not null default 0,
  metode        text,
  rekening_id   bigint references bank_transaksi(id) on delete set null,
  tanggal       date not null default current_date,
  bukti_url     text,
  keterangan    text,
  created_at    timestamptz not null default now()
);
create index idx_payments_customer on payments(customer_id);
create index idx_payments_unit on payments(unit_id);

create table customer_files (
  id          bigint generated always as identity primary key,
  customer_id bigint not null references customers(id) on delete cascade,
  nama_file   text not null,
  file_url    text not null,
  keterangan  text,
  created_at  timestamptz not null default now()
);

create table customer_complaints (
  id          bigint generated always as identity primary key,
  customer_id bigint not null references customers(id) on delete restrict,
  judul       text not null,
  isi         text,
  status      text not null default 'terbuka' check (status in ('terbuka','diproses','selesai')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
