'use client';

import { useEffect, useState } from 'react';
import { Modal, Button, StatusBadge, EmptyState, Badge } from '@/components/ui';
import { apiGet } from '@/lib/client-api';
import { rp, tglWita, cx } from '@/lib/format';

interface UnitModalProps {
  unitId: number | null;
  onClose: () => void;
}

interface UnitInfo {
  id: number;
  kode_kavling: string;
  pjg_kanan: number | null;
  pjg_kiri: number | null;
  lbr_depan: number | null;
  lbr_belakang: number | null;
  luas_tanah: number | null;
  luas_bangunan: number | null;
  harga_jual: number | null;
  daya_listrik: string | null;
  no_sertifikat: string | null;
  keterangan: string | null;
  progres_bangunan: number;
  is_ready: boolean;
  foto_urls: string[];
  locations: { nama: string } | null;
  unit_statuses: { nama: string; warna_hex: string } | null;
}

interface CustomerInfo {
  nama_lengkap: string;
  nik: string | null;
  no_hp: string | null;
  tempat_lahir: string | null;
  tgl_lahir: string | null;
  jenis_kelamin: string | null;
  alamat_ktp: string | null;
  alamat_domisili: string | null;
  npwp: string | null;
  jenis_pembelian: string;
  marketing: { nama: string } | null;
}

interface PaymentInfo {
  jenis_tagihan: string;
  tagihan: number;
  sudah_bayar: number;
  tanggal: string;
}

interface UtilityInfo {
  listrik_terpasang: boolean;
  air_terpasang: boolean;
  no_rekening_listrik: string | null;
  foto_url: string | null;
}

interface UnitDetail {
  unit: UnitInfo;
  customer: CustomerInfo | null;
  payments: PaymentInfo[];
  utility: UtilityInfo | null;
}

const JENIS_TAGIHAN: Record<string, string> = {
  harga_rumah: 'Harga Rumah',
  biaya_surat: 'Biaya Surat',
  peningkatan_mutu: 'Peningkatan Mutu',
  booking_fee: 'Booking Fee',
  lainnya: 'Lainnya',
};

type TabId = 'unit' | 'customer' | 'bayar' | 'foto' | 'utilitas';

const TABS: { id: TabId; label: string }[] = [
  { id: 'unit', label: 'Data Unit Rumah' },
  { id: 'customer', label: 'Data Customer' },
  { id: 'bayar', label: 'Tagihan & Pembayaran' },
  { id: 'foto', label: 'Foto Unit' },
  { id: 'utilitas', label: 'Listrik & Air' },
];

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-2 border-b border-slate-100 py-2 text-sm dark:border-slate-800">
      <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="col-span-2 font-medium text-slate-800 dark:text-slate-100">{children}</dd>
    </div>
  );
}

const dash = (v: string | number | null | undefined) =>
  v === null || v === undefined || v === '' ? '-' : String(v);

export default function UnitModal({ unitId, onClose }: UnitModalProps) {
  const [tab, setTab] = useState<TabId>('unit');
  const [data, setData] = useState<UnitDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (unitId === null) {
      setData(null);
      setError(null);
      setTab('unit');
      return;
    }
    let alive = true;
    setLoading(true);
    setError(null);
    apiGet<UnitDetail>(`/api/v1/siteplan/unit/${unitId}`).then((r) => {
      if (!alive) return;
      setLoading(false);
      if (r.ok && r.data) setData(r.data);
      else setError(r.error ?? 'Gagal memuat data.');
    });
    return () => {
      alive = false;
    };
  }, [unitId]);

  const u = data?.unit;

  return (
    <Modal open={unitId !== null} onClose={onClose} title={`Detail Data Kavling${u ? ` — ${u.kode_kavling}` : ''}`} wide>
      {loading && <p className="py-10 text-center text-sm text-slate-500">Memuat data…</p>}
      {error && !loading && <p className="py-10 text-center text-sm text-red-600">{error}</p>}
      {u && !loading && (
        <div>
          <div className="mb-4 flex flex-wrap gap-2 border-b border-slate-200 pb-2 dark:border-slate-700">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cx(
                  'rounded-lg px-3 py-1.5 text-sm font-medium transition',
                  tab === t.id
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'unit' && (
            <dl>
              <Row label="Perumahan">{dash(u.locations?.nama)}</Row>
              <Row label="Kode Kavling">{u.kode_kavling}</Row>
              <Row label="Dimensi (Pjg Kanan/Kiri)">
                {u.pjg_kanan ?? '-'} m / {u.pjg_kiri ?? '-'} m
              </Row>
              <Row label="Dimensi (Lbr Depan/Belakang)">
                {u.lbr_depan ?? '-'} m / {u.lbr_belakang ?? '-'} m
              </Row>
              <Row label="Luas Tanah">{u.luas_tanah !== null ? `${u.luas_tanah} m²` : '-'}</Row>
              <Row label="Luas Bangunan">{u.luas_bangunan !== null ? `${u.luas_bangunan} m²` : '-'}</Row>
              <Row label="Harga Jual">{rp(u.harga_jual)}</Row>
              <Row label="Daya Listrik">{dash(u.daya_listrik)}</Row>
              <Row label="No. Sertifikat">{dash(u.no_sertifikat)}</Row>
              <Row label="Progres Bangunan">{u.progres_bangunan}%</Row>
              <Row label="Status">
                <StatusBadge nama={u.unit_statuses?.nama ?? '-'} warna={u.unit_statuses?.warna_hex} />
              </Row>
              <Row label="Keterangan">{dash(u.keterangan)}</Row>
            </dl>
          )}

          {tab === 'customer' && (
            <div>
              {!data.customer ? (
                <EmptyState title="Belum ada customer" hint="Kavling ini belum terikat ke customer mana pun." />
              ) : (
                <dl>
                  <Row label="Nama Lengkap">{data.customer.nama_lengkap}</Row>
                  <Row label="NIK">{dash(data.customer.nik)}</Row>
                  <Row label="No. HP / WA">{dash(data.customer.no_hp)}</Row>
                  <Row label="Tempat, Tgl Lahir">
                    {dash(data.customer.tempat_lahir)}, {tglWita(data.customer.tgl_lahir)}
                  </Row>
                  <Row label="Jenis Kelamin">
                    {data.customer.jenis_kelamin === 'L' ? 'Laki-laki' : data.customer.jenis_kelamin === 'P' ? 'Perempuan' : '-'}
                  </Row>
                  <Row label="Alamat KTP">{dash(data.customer.alamat_ktp)}</Row>
                  <Row label="Alamat Domisili">{dash(data.customer.alamat_domisili)}</Row>
                  <Row label="NPWP">{dash(data.customer.npwp)}</Row>
                  <Row label="Jenis Pembelian">{data.customer.jenis_pembelian}</Row>
                  <Row label="Marketing">{dash(data.customer.marketing?.nama)}</Row>
                </dl>
              )}
            </div>
          )}

          {tab === 'bayar' && (
            <div>
              {data.payments.length === 0 ? (
                <EmptyState title="Belum ada tagihan" hint="Belum ada data tagihan/pembayaran untuk kavling ini." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-slate-500 dark:border-slate-700">
                        <th className="py-2 pr-3">Jenis Tagihan</th>
                        <th className="py-2 pr-3 text-right">Tagihan</th>
                        <th className="py-2 pr-3 text-right">Sudah Bayar</th>
                        <th className="py-2 text-right">Sisa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.payments.map((p, i) => {
                        const tagihan = Number(p.tagihan) || 0;
                        const bayar = Number(p.sudah_bayar) || 0;
                        return (
                          <tr key={i} className="border-b border-slate-100 dark:border-slate-800">
                            <td className="py-2 pr-3">{JENIS_TAGIHAN[p.jenis_tagihan] ?? p.jenis_tagihan}</td>
                            <td className="py-2 pr-3 text-right">{rp(tagihan)}</td>
                            <td className="py-2 pr-3 text-right">{rp(bayar)}</td>
                            <td className="py-2 text-right font-medium">{rp(tagihan - bayar)}</td>
                          </tr>
                        );
                      })}
                      <tr className="font-bold">
                        <td className="py-2 pr-3">Total</td>
                        <td className="py-2 pr-3 text-right">
                          {rp(data.payments.reduce((s, p) => s + (Number(p.tagihan) || 0), 0))}
                        </td>
                        <td className="py-2 pr-3 text-right">
                          {rp(data.payments.reduce((s, p) => s + (Number(p.sudah_bayar) || 0), 0))}
                        </td>
                        <td className="py-2 text-right">
                          {rp(data.payments.reduce((s, p) => s + (Number(p.tagihan) || 0) - (Number(p.sudah_bayar) || 0), 0))}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {tab === 'foto' && (
            <div>
              {u.foto_urls.length === 0 ? (
                <EmptyState title="Belum ada foto" hint="Belum ada foto unit yang diunggah." />
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {u.foto_urls.map((src, i) => (
                    <a key={i} href={src} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt={`Foto unit ${u.kode_kavling} ${i + 1}`} className="h-36 w-full object-cover" loading="lazy" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'utilitas' && (
            <dl>
              <Row label="Listrik Terpasang">
                <Badge color={data.utility?.listrik_terpasang ? '#00c853' : '#ef4444'}>
                  {data.utility?.listrik_terpasang ? 'Terpasang' : 'Belum Terpasang'}
                </Badge>
              </Row>
              <Row label="Air Terpasang">
                <Badge color={data.utility?.air_terpasang ? '#00c853' : '#ef4444'}>
                  {data.utility?.air_terpasang ? 'Terpasang' : 'Belum Terpasang'}
                </Badge>
              </Row>
              <Row label="No. Rekening Listrik">{dash(data.utility?.no_rekening_listrik)}</Row>
              <Row label="Foto">
                {data.utility?.foto_url ? (
                  <a href={data.utility.foto_url} target="_blank" rel="noreferrer" className="text-emerald-600 underline">
                    Lihat foto
                  </a>
                ) : (
                  '-'
                )}
              </Row>
            </dl>
          )}

          <div className="mt-6 flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-700">
            <Button
              variant="secondary"
              onClick={() => window.open(`/api/v1/siteplan/unit/${unitId}/cetak`, '_blank', 'noopener')}
            >
              Cetak Data
            </Button>
            <Button variant="ghost" onClick={onClose}>
              Tutup
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
