'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import type { Feature, FeatureCollection } from 'geojson';

interface SiteplanMapProps {
  geojson: FeatureCollection;
  colors: Record<string, string>;
  labels: Record<string, string>;
  selectedUnit: number | null;
  onSelect: (unitId: number) => void;
}

interface KavlingProps {
  unit_id?: number | string;
  kode?: string;
}

/**
 * Peta siteplan Leaflet (CRS.Simple — koordinat kartesius dari GeoJSON seed).
 * Render via canvas agar tetap ringan untuk ratusan/ribuan polygon.
 */
export default function SiteplanMap({ geojson, colors, labels, onSelect }: SiteplanMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.GeoJSON | null>(null);
  const cbRef = useRef({ colors, labels, onSelect });
  cbRef.current = { colors, labels, onSelect };

  // Inisialisasi peta sekali saat mount
  useEffect(() => {
    const el = document.getElementById('siteplan-map');
    if (!el) return;
    const map = L.map(el, {
      crs: L.CRS.Simple,
      renderer: L.canvas(),
      zoomControl: true,
      attributionControl: false,
    });
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  // Render ulang layer setiap geojson berubah
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (layerRef.current) {
      layerRef.current.remove();
      layerRef.current = null;
    }
    const features = Array.isArray(geojson?.features) ? geojson.features : [];
    // renderer canvas sudah di-set sebagai default di opsi L.map di atas
    const layer = L.geoJSON(geojson, {
      style: (feature?: Feature) => {
        const p = (feature?.properties ?? {}) as KavlingProps;
        const key = String(p.unit_id ?? '');
        return {
          fillColor: cbRef.current.colors[key] ?? '#cccccc',
          weight: 1,
          color: '#333333',
          fillOpacity: 0.85,
        };
      },
      onEachFeature: (feature: Feature, lyr: L.Layer) => {
        const p = (feature.properties ?? {}) as KavlingProps;
        const key = String(p.unit_id ?? '');
        const label = cbRef.current.labels[key] ?? p.kode ?? key;
        lyr.bindTooltip(String(label), { sticky: true, direction: 'top' });
        lyr.on('click', () => {
          const n = Number(p.unit_id);
          if (!Number.isNaN(n)) cbRef.current.onSelect(n);
        });
      },
    });
    layer.addTo(map);
    layerRef.current = layer;
    if (features.length > 0) {
      const bounds = layer.getBounds();
      if (bounds.isValid()) map.fitBounds(bounds.pad(0.05));
    }
  }, [geojson]);

  return (
    <div
      id="siteplan-map"
      className="z-0 h-[70vh] w-full rounded-xl border border-slate-200 dark:border-slate-700"
    />
  );
}
