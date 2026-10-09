'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

export interface StatusDatum {
  nama: string;
  jumlah: number;
  warna: string | null;
}

export interface ReadyDatum {
  nama: string;
  jumlah: number;
}

function barFill(warna: string | null): string {
  if (!warna) return '#10b981';
  return warna.toLowerCase() === '#ffffff' ? '#e2e8f0' : warna;
}

/** Grafik dashboard: bar per status + pie ready vs belum. Props harus serializable. */
export function DashboardCharts({
  statusData,
  readyData,
}: {
  statusData: StatusDatum[];
  readyData: ReadyDatum[];
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <h3 className="mb-3 font-semibold text-slate-800 dark:text-slate-100">Unit per Status</h3>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={statusData} margin={{ bottom: 20 }}>
            <XAxis dataKey="nama" tick={{ fontSize: 11 }} interval={0} angle={-25} textAnchor="end" height={70} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="jumlah" name="Unit">
              {statusData.map((s, i) => (
                <Cell key={i} fill={barFill(s.warna)} stroke="#64748b" strokeWidth={0.5} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div>
        <h3 className="mb-3 font-semibold text-slate-800 dark:text-slate-100">Unit Ready vs Belum Ready</h3>
        <ResponsiveContainer width="100%" height={320}>
          <PieChart>
            <Pie data={readyData} dataKey="jumlah" nameKey="nama" outerRadius={110} label>
              {readyData.map((_, i) => (
                <Cell key={i} fill={i === 0 ? '#10b981' : '#f43f5e'} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
