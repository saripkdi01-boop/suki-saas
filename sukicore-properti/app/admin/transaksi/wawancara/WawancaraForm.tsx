'use client';

import { useEffect, useState } from 'react';
import { Modal, Field, Input, Select, Textarea, Button, DeleteButton, toast } from '@/components/ui';
import { apiPost, apiPut, apiDelete, apiGet } from '@/lib/client-api';

type Opt = { value: string; label: string };

interface WawancaraInitial {
  customerId: number;
  tanggal: string; // YYYY-MM-DD
  bankKprId: number | null;
  catatan: string | null;
}

interface CustomerInfo {
  nik: string;
  alamat: string;
  unitKode: string;
  luasTanah: number | null;
  luasBangunan: number | null;
  marketing: string;
}

const str = (v: unknown): string => (v === null || v === undefined ? '' : String(v));
const num = (v: unknown): number | null => {
  const n = typeof v === 'string' ? parseFloat(v) : (v as number);
  return typeof n === 'number' && !Number.isNaN(n) ? n : null;
};
const one = (v: unknown): Record<string, unknown> | null => {
  if (!v) return null;
  if (Array.isArray(v)) return (v[0] as Record<string, unknown>) ?? null;
  return v as Record<string, unknown>;
};

function WawancaraModal({
  open,
  onClose,
  customers,
  banks,
  initial,
  editId,
}: {
  open: boolean;
  onClose: () => void;
  customers: Opt[];
  banks: Opt[];
  initial: WawancaraInitial | null;
  editId?: number;
}) {
  const [customerId, setCustomerId] = useState(initial ? String(initial.customerId) : '');
  const [tanggal, setTanggal] = useState(initial?.tanggal ?? '');
  const [bankId, setBankId] = useState(initial?.bankKprId ? String(initial.bankKprId) : '');
  const [catatan, setCatatan] = useState(initial?.catatan ?? '');
  const [info, setInfo] = useState<CustomerInfo | null>(null);
  const [infoLoading, setInfoLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const fetchInfo = async (cid: string) => {
    if (!cid) {
      setInfo(null);
      return;
    }
    setInfoLoading(true);
    const r = await apiGet<Record<string, unknown>>(`/api/v1/customers/${cid}`);
    setInfoLoading(false);
    if (!r.ok || !r.data) {
      setInfo(null);
      if (!r.ok) toast(r.error ?? 'Gagal memuat data customer.', 'err');
      return;
    }
    const c = r.data;
    const units = one(c.units);
    const marketing = one(c.marketing);
    setInfo({
      nik: str(c.nik),
      alamat: str(c.alamat_ktp),
      unitKode: units ? str(units.kode_kavling) : '',
      luasTanah: num(units?.luas_tanah),
      luasBangunan: num(units?.luas_bangunan),
      marketing: marketing ? str(marketing.nama) : '',
    });
  };

  // Reset form tiap modal dibuka; bila edit, auto-fill info customer saat mount
  useEffect(() => {
    if (!open) return;
    setCustomerId(initial ? String(initial.customerId) : '');
    setTanggal(initial?.tanggal ?? '');
    setBankId(initial?.bankKprId ? String(initial.bankKprId) : '');
    setCatatan(initial?.catatan ?? '');
    if (initial?.customerId) void fetchInfo(String(initial.customerId));
    else setInfo(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) {
      toast('Customer wajib dipilih.', 'err');
      return;
    }
    if (!tanggal) {
      toast('Tanggal wajib diisi.', 'err');
      return;
    }
    setBusy(true);
    const payload = {
      customer_id: Number(customerId),
      tanggal,
      bank_kpr_id: bankId ? Number(bankId) : null,
      catatan: catatan.trim() ? catatan.trim() : null,
    };
    const r = editId
      ? await apiPut(`/api/v1/interviews/${editId}`, payload)
      : await apiPost('/api/v1/interviews', payload);
    setBusy(false);
    if (!r.ok) {
      toast(r.error ?? 'Gagal menyimpan.', 'err');
      return;
    }
    toast('Wawancara tersimpan.');
    onClose();
    window.location.reload();
  };

  return (
    <Modal open={open} onClose={onClose} title={editId ? 'Edit Wawancara' : 'Jadwalkan Wawancara'} wide>
      <form onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Customer *" className="sm:col-span-2">
          <Select
            value={customerId}
            required
            onChange={(e) => {
              setCustomerId(e.target.value);
              void fetchInfo(e.target.value);
            }}
          >
            <option value="">— Pilih customer —</option>
            {customers.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-800 sm:col-span-2">
          {infoLoading ? (
            <p className="text-slate-500">Memuat data customer…</p>
          ) : info ? (
            <dl className="grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-slate-500">NIK</dt>
                <dd className="font-medium text-slate-800 dark:text-slate-200">{info.nik || '-'}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Marketing</dt>
                <dd className="font-medium text-slate-800 dark:text-slate-200">{info.marketing || '-'}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs text-slate-500">Alamat KTP</dt>
                <dd className="font-medium text-slate-800 dark:text-slate-200">{info.alamat || '-'}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Unit</dt>
                <dd className="font-medium text-slate-800 dark:text-slate-200">{info.unitKode || '-'}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Luas Tanah / Bangunan</dt>
                <dd className="font-medium text-slate-800 dark:text-slate-200">
                  {info.luasTanah !== null ? `${info.luasTanah} m²` : '-'} /{' '}
                  {info.luasBangunan !== null ? `${info.luasBangunan} m²` : '-'}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-slate-500">Pilih customer untuk melihat detail.</p>
          )}
        </div>

        <Field label="Tanggal *">
          <Input type="date" value={tanggal} required onChange={(e) => setTanggal(e.target.value)} />
        </Field>
        <Field label="Bank KPR">
          <Select value={bankId} onChange={(e) => setBankId(e.target.value)}>
            <option value="">— Pilih bank —</option>
            {banks.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Catatan" className="sm:col-span-2">
          <Textarea rows={3} value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="Catatan wawancara…" />
        </Field>

        <div className="flex justify-end gap-2 pt-2 sm:col-span-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? 'Menyimpan…' : 'Simpan'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function WawancaraCreateButton({ customers, banks }: { customers: Opt[]; banks: Opt[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Jadwalkan Wawancara</Button>
      <WawancaraModal open={open} onClose={() => setOpen(false)} customers={customers} banks={banks} initial={null} />
    </>
  );
}

export function WawancaraEditButton({
  customers,
  banks,
  initial,
  editId,
}: {
  customers: Opt[];
  banks: Opt[];
  initial: WawancaraInitial;
  editId: number;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <span onClick={() => setOpen(true)} className="inline-flex cursor-pointer">
        <Button variant="secondary">Edit</Button>
      </span>
      <WawancaraModal
        open={open}
        onClose={() => setOpen(false)}
        customers={customers}
        banks={banks}
        initial={initial}
        editId={editId}
      />
    </>
  );
}

export function WawancaraDeleteButton({ id }: { id: number }) {
  return <DeleteButton onDelete={() => apiDelete(`/api/v1/interviews/${id}`)} />;
}
