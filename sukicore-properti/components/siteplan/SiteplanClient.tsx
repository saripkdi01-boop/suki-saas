'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import type { FeatureCollection } from 'geojson';
import SiteplanToolbar from './SiteplanToolbar';
import UnitModal from './UnitModal';

const SiteplanMap = dynamic(() => import('./SiteplanMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[70vh] w-full items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700">
      <p className="text-sm text-slate-500">Memuat peta…</p>
    </div>
  ),
});

interface SiteplanClientProps {
  geojson: FeatureCollection;
  colors: Record<string, string>;
  labels: Record<string, string>;
  pdfUrl: string;
  jpgUrl: string;
}

/**
 * Pembungkus client untuk halaman siteplan:
 * mengelola unit terpilih (modal) + me-remount peta saat Reset diklik.
 */
export default function SiteplanClient({ geojson, colors, labels, pdfUrl, jpgUrl }: SiteplanClientProps) {
  const [selectedUnit, setSelectedUnit] = useState<number | null>(null);
  const [mapKey, setMapKey] = useState(0);

  return (
    <div>
      <SiteplanToolbar pdfUrl={pdfUrl} jpgUrl={jpgUrl} onReset={() => setMapKey((k) => k + 1)} />
      <SiteplanMap
        key={mapKey}
        geojson={geojson}
        colors={colors}
        labels={labels}
        selectedUnit={selectedUnit}
        onSelect={setSelectedUnit}
      />
      <UnitModal unitId={selectedUnit} onClose={() => setSelectedUnit(null)} />
    </div>
  );
}
