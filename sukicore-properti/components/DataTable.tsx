'use client';

import React from 'react';
import { EmptyState, Pagination } from './ui';
import { cx } from '@/lib/format';

export interface Column<T> {
  header: string;
  render: (row: T) => React.ReactNode;
  className?: string;
}

/**
 * Tabel generik: header sticky, zebra, pagination via URL.
 * Data diambil di Server Component, komponen ini murni presentasi.
 */
export function DataTable<T extends { id: number | string }>({
  columns,
  rows,
  total,
  perPage = 20,
  emptyTitle,
  emptyHint,
}: {
  columns: Column<T>[];
  rows: T[];
  total: number;
  perPage?: number;
  emptyTitle?: string;
  emptyHint?: string;
}) {
  if (rows.length === 0) return <EmptyState title={emptyTitle} hint={emptyHint} />;
  return (
    <div>
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800">
            <tr>
              {columns.map((c, i) => (
                <th
                  key={i}
                  className={cx(
                    'whitespace-nowrap px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-200',
                    c.className
                  )}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows.map((row) => (
              <tr key={row.id} className="bg-white odd:bg-slate-50/60 hover:bg-emerald-50/50 dark:bg-slate-900 dark:odd:bg-slate-900/60 dark:hover:bg-slate-800">
                {columns.map((c, i) => (
                  <td key={i} className={cx('px-4 py-2.5 text-slate-800 dark:text-slate-200', c.className)}>
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination total={total} perPage={perPage} />
    </div>
  );
}
