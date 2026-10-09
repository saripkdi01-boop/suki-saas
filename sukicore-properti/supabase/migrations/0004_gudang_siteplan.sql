-- ==================== 8. PEMBELIAN & GUDANG ====================

create table units_of_measure (
  id         bigint generated always as identity primary key,
  nama       text not null unique
);

create table suppliers (
  id         bigint generated always as identity primary key,
  nama       text not null,
  alamat     text,
  telepon    text,
  created_at timestamptz not null default now()
);

create table items (
  id          bigint generated always as identity primary key,
  kode        text not null unique,
  nama        text not null,
  satuan_id   bigint references units_of_measure(id) on delete set null,
  stok        int not null default 0,
  harga_beli  numeric(15,2),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table purchase_orders (
  id          bigint generated always as identity primary key,
  no_po       text not null unique,
  tanggal     date not null default current_date,
  supplier_id bigint references suppliers(id) on delete set null,
  items       jsonb not null default '[]',
  -- items: [{barang_id, kode, nama, qty, satuan, harga}]
  total       numeric(15,2) not null default 0,
  status      text not null default 'draft' check (status in ('draft','dipesan','diterima','batal')),
  keterangan  text,
  created_at  timestamptz not null default now()
);

create table goods_receipts (
  id          bigint generated always as identity primary key,
  tanggal     date not null default current_date,
  po_id       bigint references purchase_orders(id) on delete set null,
  items       jsonb not null default '[]',
  keterangan  text,
  created_at  timestamptz not null default now()
);

create table goods_issues (
  id          bigint generated always as identity primary key,
  tanggal     date not null default current_date,
  tujuan      text not null,
  items       jsonb not null default '[]',
  keterangan  text,
  created_at  timestamptz not null default now()
);

-- ==================== 9. SITEPLAN ====================

-- GeoJSON per lokasi per jenis overlay. 1 feature = 1 kavling.
-- properties wajib: { unit_id, kode }
create table siteplan_overlays (
  id          bigint generated always as identity primary key,
  location_id bigint not null references locations(id) on delete cascade,
  jenis       text not null check (jenis in ('penjualan','proyek','unit-ready','listrik','air','bphtb-ssp','balik-nama')),
  nama        text not null,
  geojson     jsonb not null,
  updated_at  timestamptz not null default now(),
  unique(location_id, jenis)
);
create index idx_siteplan_location on siteplan_overlays(location_id);

-- ==================== 10. RLS ====================
-- Otorisasi utama di application layer (matriks permissions).
-- RLS aktif; service_role bypass RLS. Anon key tidak dipakai untuk baca data.

alter table companies enable row level security;
alter table locations enable row level security;
alter table unit_statuses enable row level security;
alter table units enable row level security;
alter table roles enable row level security;
alter table users enable row level security;
alter table menus enable row level security;
alter table permissions enable row level security;
alter table app_settings enable row level security;
alter table media_assets enable row level security;
alter table cms_contents enable row level security;
alter table activity_logs enable row level security;
alter table marketing enable row level security;
alter table admin_staff enable row level security;
alter table bank_kpr enable row level security;
alter table bank_transaksi enable row level security;
alter table notaries enable row level security;
alter table customers enable row level security;
alter table prospects enable row level security;
alter table hold_requests enable row level security;
alter table interviews enable row level security;
alter table bank_approvals enable row level security;
alter table sp3k_records enable row level security;
alter table akad_schedules enable row level security;
alter table akad_participants enable row level security;
alter table handovers enable row level security;
alter table ppjb enable row level security;
alter table cancellations enable row level security;
alter table unit_transfers enable row level security;
alter table name_changes enable row level security;
alter table payments enable row level security;
alter table customer_files enable row level security;
alter table customer_complaints enable row level security;
alter table building_projects enable row level security;
alter table building_work_types enable row level security;
alter table road_projects enable row level security;
alter table roads enable row level security;
alter table road_work_types enable row level security;
alter table channel_projects enable row level security;
alter table channels enable row level security;
alter table channel_work_types enable row level security;
alter table utility_status enable row level security;
alter table legal_checklists enable row level security;
alter table bphtb_ssp enable row level security;
alter table balik_nama enable row level security;
alter table finance_categories enable row level security;
alter table incomes enable row level security;
alter table expenses enable row level security;
alter table debts enable row level security;
alter table receivables enable row level security;
alter table balance_mutations enable row level security;
alter table units_of_measure enable row level security;
alter table suppliers enable row level security;
alter table items enable row level security;
alter table purchase_orders enable row level security;
alter table goods_receipts enable row level security;
alter table goods_issues enable row level security;
alter table siteplan_overlays enable row level security;

-- Trigger: updated_at otomatis
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array[
    'units','users','customers','prospects','hold_requests','bank_approvals',
    'customer_complaints','building_projects','road_projects','channel_projects',
    'utility_status','legal_checklists','app_settings','media_assets','cms_contents',
    'items','permissions','menus'
  ]
  loop
    execute format('drop trigger if exists trg_updated_at on %I', t);
    execute format('create trigger trg_updated_at before update on %I
                    for each row execute function set_updated_at()', t);
  end loop;
end $$;
