'use client';

import { Button } from '@/components/ui';
import { cx } from '@/lib/format';

interface SiteplanToolbarProps {
  pdfUrl: string;
  jpgUrl: string;
  onReset: () => void;
}

const linkBase =
  'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition';

/** Toolbar siteplan: ekspor PDF/JPG + reset tampilan peta. */
export default function SiteplanToolbar({ pdfUrl, jpgUrl, onReset }: SiteplanToolbarProps) {
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      <a
        href={pdfUrl}
        target="_blank"
        rel="noreferrer"
        className={cx(linkBase, 'bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600')}
      >
        Cetak Denah PDF
      </a>
      <a
        href={jpgUrl}
        target="_blank"
        rel="noreferrer"
        className={cx(
          linkBase,
          'bg-slate-200 text-slate-800 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600'
        )}
      >
        Download Denah JPG
      </a>
      <Button variant="secondary" onClick={onReset}>
        Reset Siteplan
      </Button>
    </div>
  );
}
