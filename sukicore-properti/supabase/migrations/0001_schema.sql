-- =============================================================
-- SUKICORE Properti — Skema database lengkap
-- Postgres (Supabase). Zona waktu aplikasi: Asia/Makassar (WITA).
-- Waktu disimpan timestamptz (UTC); konversi ke WITA di application layer.
-- =============================================================

create extension if not exists "pgcrypto";

-- ==================== 1. MASTER & UNIT ====================

create table companies (
  id          bigint generated always as identity primary key,
  nama        text not null,
  alamat      text,
  telepon     text,
  email       text,
  logo_url    text,
  created_at  timestamptz not null default now()
);

create table locations (
  id          bigint generated always as identity primary key,
  company_id  bigint references companies(id) on delete set null,
  kode        text not null unique,
  nama        text not null,
  alamat      text,
  created_at  timestamptz not null default now()
);
create index idx_locations_company on locations(company_id);

-- Status progres penjualan unit (dibaca siteplan & badge UI dari tabel ini)
create table unit_statuses (
  id          bigint generated always as identity primary key,
  nama        text not null unique,
  warna_hex   text not null default '#ffffff',
  urutan      int  not null default 0,
  keterangan  text,
  created_at  timestamptz not null default now()
);

create table units (
  id                bigint generated always as identity primary key,
  location_id       bigint not null references locations(id) on delete restrict,
  kode_kavling      text not null,
  pjg_kanan         numeric(8,2),
  pjg_kiri          numeric(8,2),
  lbr_depan         numeric(8,2),
  lbr_belakang      numeric(8,2),
  luas_tanah        numeric(10,2),
  luas_bangunan     numeric(10,2),
  harga_jual        numeric(15,2),
  daya_listrik      text,
  no_sertifikat     text,
  keterangan        text,
  status_id         bigint references unit_statuses(id) on delete set null,
  progres_bangunan  int not null default 0 check (progres_bangunan between 0 and 100),
  is_ready          boolean not null default false,
  listrik_terpasang boolean not null default false,
  air_terpasang     boolean not null default false,
  foto_urls         text[] not null default '{}',
  deleted_at        timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique(location_id, kode_kavling)
);
create index idx_units_location on units(location_id);
create index idx_units_status   on units(status_id);
create index idx_units_kode     on units(kode_kavling);

-- ==================== 2. AUTH / ROLE / MENU ====================

create table roles (
  id         bigint generated always as identity primary key,
  nama       text not null unique,
  created_at timestamptz not null default now()
);

create table users (
  id             bigint generated always as identity primary key,
  username       text not null unique,
  password_hash  text not null,
  nama_lengkap   text not null,
  role_id        bigint not null references roles(id) on delete restrict,
  is_active      boolean not null default true,
  must_change_password boolean not null default false,
  last_login_at  timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index idx_users_role on users(role_id);

create table menus (
  id         bigint generated always as identity primary key,
  grup       text not null,
  nama       text not null,
  path       text not null unique,
  urutan     int not null default 0,
  icon       text,
  created_at timestamptz not null default now()
);

create table permissions (
  id         bigint generated always as identity primary key,
  role_id    bigint not null references roles(id) on delete cascade,
  menu_id    bigint not null references menus(id) on delete cascade,
  can_view   boolean not null default false,
  can_create boolean not null default false,
  can_edit   boolean not null default false,
  can_delete boolean not null default false,
  unique(role_id, menu_id)
);
create index idx_permissions_role on permissions(role_id);

-- ==================== 3. PENGATURAN & AUDIT ====================

create table app_settings (
  id         bigint generated always as identity primary key,
  key        text not null unique,
  value      text,
  updated_at timestamptz not null default now()
);

create table media_assets (
  id         bigint generated always as identity primary key,
  key        text not null unique, -- logo | favicon | background
  file_url   text,
  updated_at timestamptz not null default now()
);

create table cms_contents (
  id         bigint generated always as identity primary key,
  key        text not null unique,
  judul      text not null,
  isi_html   text,
  posisi     text, -- navbar | slider | produk | siteplan | kontak | ...
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table activity_logs (
  id         bigint generated always as identity primary key,
  user_id    bigint references users(id) on delete set null,
  aksi       text not null,
  tabel_ref  text,
  record_id  bigint,
  detail     jsonb,
  created_at timestamptz not null default now()
);
create index idx_activity_logs_user on activity_logs(user_id);
create index idx_activity_logs_created on activity_logs(created_at desc);
create index idx_activity_logs_tabel on activity_logs(tabel_ref, record_id);
