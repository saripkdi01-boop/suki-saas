-- ==================== 5. OPERASIONAL PROYEK ====================

create table building_projects (
  id             bigint generated always as identity primary key,
  location_id    bigint not null references locations(id) on delete restrict,
  nama           text not null,
  tanggal_mulai  date,
  tanggal_target date,
  progress       int not null default 0 check (progress between 0 and 100),
  status         text not null default 'berjalan' check (status in ('rencana','berjalan','selesai')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create table building_work_types (
  id         bigint generated always as identity primary key,
  project_id bigint not null references building_projects(id) on delete cascade,
  nama       text not null,
  bobot_persen numeric(5,2) not null default 0,
  progress   int not null default 0 check (progress between 0 and 100),
  created_at timestamptz not null default now()
);

create table road_projects (
  id             bigint generated always as identity primary key,
  location_id    bigint not null references locations(id) on delete restrict,
  nama           text not null,
  tanggal_mulai  date,
  tanggal_target date,
  progress       int not null default 0 check (progress between 0 and 100),
  status         text not null default 'berjalan' check (status in ('rencana','berjalan','selesai')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create table roads (
  id         bigint generated always as identity primary key,
  project_id bigint not null references road_projects(id) on delete cascade,
  nama       text not null,
  panjang_m  numeric(10,2),
  lebar_m    numeric(8,2),
  created_at timestamptz not null default now()
);
create table road_work_types (
  id         bigint generated always as identity primary key,
  project_id bigint not null references road_projects(id) on delete cascade,
  nama       text not null,
  bobot_persen numeric(5,2) not null default 0,
  progress   int not null default 0 check (progress between 0 and 100),
  created_at timestamptz not null default now()
);

create table channel_projects (
  id             bigint generated always as identity primary key,
  location_id    bigint not null references locations(id) on delete restrict,
  nama           text not null,
  tanggal_mulai  date,
  tanggal_target date,
  progress       int not null default 0 check (progress between 0 and 100),
  status         text not null default 'berjalan' check (status in ('rencana','berjalan','selesai')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create table channels (
  id         bigint generated always as identity primary key,
  project_id bigint not null references channel_projects(id) on delete cascade,
  nama       text not null,
  panjang_m  numeric(10,2),
  created_at timestamptz not null default now()
);
create table channel_work_types (
  id         bigint generated always as identity primary key,
  project_id bigint not null references channel_projects(id) on delete cascade,
  nama       text not null,
  bobot_persen numeric(5,2) not null default 0,
  progress   int not null default 0 check (progress between 0 and 100),
  created_at timestamptz not null default now()
);

-- ==================== 6. LEGAL ====================

create table utility_status (
  id                  bigint generated always as identity primary key,
  unit_id             bigint not null unique references units(id) on delete cascade,
  listrik_terpasang   boolean not null default false,
  air_terpasang       boolean not null default false,
  no_rekening_listrik text,
  foto_url            text,
  updated_at          timestamptz not null default now()
);

create table legal_checklists (
  id             bigint generated always as identity primary key,
  customer_id    bigint not null references customers(id) on delete restrict,
  unit_id        bigint references units(id) on delete set null,
  iph            boolean not null default false,
  shgb           boolean not null default false,
  ssp            boolean not null default false,
  bphtb          boolean not null default false,
  sikumbang      boolean not null default false,
  daftar_sikasep boolean not null default false,
  foto_sikasep   boolean not null default false,
  trilogi        boolean not null default false,
  catatan        text,
  updated_at     timestamptz not null default now(),
  unique(customer_id, unit_id)
);

create table bphtb_ssp (
  id          bigint generated always as identity primary key,
  customer_id bigint not null references customers(id) on delete restrict,
  unit_id     bigint references units(id) on delete set null,
  jenis       text not null default 'bphtb' check (jenis in ('bphtb','ssp')),
  status      text not null default 'belum' check (status in ('belum','proses','selesai')),
  tanggal     date,
  nominal     numeric(15,2),
  keterangan  text,
  created_at  timestamptz not null default now()
);

create table balik_nama (
  id          bigint generated always as identity primary key,
  customer_id bigint not null references customers(id) on delete restrict,
  unit_id     bigint references units(id) on delete set null,
  status      text not null default 'belum' check (status in ('belum','proses','selesai')),
  tanggal     date,
  nominal     numeric(15,2),
  notaris_id  bigint references notaries(id) on delete set null,
  keterangan  text,
  created_at  timestamptz not null default now()
);

-- ==================== 7. KEUANGAN ====================

create table finance_categories (
  id         bigint generated always as identity primary key,
  nama       text not null,
  tipe       text not null check (tipe in ('pemasukan','pengeluaran')),
  created_at timestamptz not null default now(),
  unique(nama, tipe)
);

create table incomes (
  id           bigint generated always as identity primary key,
  tanggal      date not null default current_date,
  kategori_id  bigint references finance_categories(id) on delete set null,
  rekening_id  bigint references bank_transaksi(id) on delete set null,
  customer_id  bigint references customers(id) on delete set null,
  jumlah       numeric(15,2) not null check (jumlah > 0),
  keterangan   text,
  bukti_url    text,
  created_at   timestamptz not null default now()
);
create index idx_incomes_tanggal on incomes(tanggal desc);

create table expenses (
  id           bigint generated always as identity primary key,
  tanggal      date not null default current_date,
  kategori_id  bigint references finance_categories(id) on delete set null,
  rekening_id  bigint references bank_transaksi(id) on delete set null,
  jumlah       numeric(15,2) not null check (jumlah > 0),
  keterangan   text,
  bukti_url    text,
  created_at   timestamptz not null default now()
);
create index idx_expenses_tanggal on expenses(tanggal desc);

create table debts (
  id           bigint generated always as identity primary key,
  tanggal      date not null default current_date,
  pihak        text not null,
  jumlah       numeric(15,2) not null check (jumlah > 0),
  sudah_bayar  numeric(15,2) not null default 0,
  status       text not null default 'belum_lunas' check (status in ('belum_lunas','lunas')),
  keterangan   text,
  created_at   timestamptz not null default now()
);

create table receivables (
  id           bigint generated always as identity primary key,
  tanggal      date not null default current_date,
  pihak        text not null,
  jumlah       numeric(15,2) not null check (jumlah > 0),
  sudah_bayar  numeric(15,2) not null default 0,
  status       text not null default 'belum_lunas' check (status in ('belum_lunas','lunas')),
  keterangan   text,
  created_at   timestamptz not null default now()
);

create table balance_mutations (
  id          bigint generated always as identity primary key,
  tanggal     date not null default current_date,
  rekening_id bigint references bank_transaksi(id) on delete set null,
  tipe        text not null check (tipe in ('masuk','keluar')),
  jumlah      numeric(15,2) not null check (jumlah > 0),
  keterangan  text,
  ref_tabel   text,
  ref_id      bigint,
  created_at  timestamptz not null default now()
);
create index idx_mutations_rekening on balance_mutations(rekening_id, tanggal desc);
