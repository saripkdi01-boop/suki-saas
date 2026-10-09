# SUKI SaaS

Monorepo produk SaaS unggulan **SUKI Web Studio** (sukiapps.web.id).

## Produk

| Direktori | Produk | Deskripsi |
|---|---|---|
| `sukicore-properti/` | **SUKICORE Properti** | Aplikasi SaaS ERP untuk developer perumahan — denah kavling interaktif, pipeline KPR (booking fee → wawancara → ACC bank → SP3K → akad → serah terima), keuangan, gudang, legalitas, operasional proyek. |

## Konvensi

- Satu direktori = satu produk SaaS, masing-masing dengan `README.md`, `package.json`, dan riwayat deploy sendiri.
- Setiap produk punya database terisolasi per tenant (satu project Supabase per pelanggan).
- Jangan menaruh kredensial di repo ini (gunakan environment variable).
