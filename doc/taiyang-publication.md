# Taiyang logistics snapshot publication

Preparation date: 2026-11-27 (UTC). This task publishes the already merged source layout and documentation update through the existing central Showcase, keeping the source private and the `/taiyang-logistics/` registration intact.

## Source and export evidence

| Item | Reviewed value |
| --- | --- |
| Source repository | `xk2022/xk-lp-taiyang-logistics` (private) |
| Source PR | [PR #6](https://github.com/xk2022/xk-lp-taiyang-logistics/pull/6) |
| Exact source SHA | `43f3ec138d2c4ad1123bfc7ca7944a8fd28810a6` |
| Source main CI | [45976350279](https://github.com/xk2022/xk-lp-taiyang-logistics/actions/runs/45976350279), successful push run for that exact SHA; 42 browser tests and all export-path jobs passed |
| Preparation directory | Source `frontend/`, with the existing lockfile and Node.js 24 |
| Build settings | `PAGES_EXPORT=1`, `NEXT_PUBLIC_SITE_URL=https://showcase.xplorekaleidoscope.com`, `NEXT_PUBLIC_BASE_PATH=/taiyang-logistics` |
| Compiled-export validation | Source HTTP export check and Hub `materializeStaticArtifact`/`validateExport` passed |
| Source subpath browser suite | Chromium 33 passed, 1 intentionally skipped root-only regression, 43.8 seconds; import/export, copy, drafts, keyboard and enlarged text retained |
| ZIP | `taiyang-logistics-static.zip`, 296,731 bytes, 31 files |
| ZIP SHA-256 | `fe520e0ebe6255ee58c91a524d5e8cfe7c55131b7dfeb40a9bb752e8966a2a97` |

The ZIP root contains the deployable contents of `frontend/out/`, not an enclosing directory. It includes `release.json` with the exact source SHA and publication URL. Independent review compared every entry byte-for-byte to the prepared output, checked its file boundary and applied the existing bounded extraction and Next export validator. The legacy independent-domain `CNAME` is the only omitted output file. No source files, environment files, Git data, dependency directories, source maps or server bundles are included. The ZIP itself is not committed.

The company-aligned source move changes where npm runs; it preserves website behavior. The existing registration's name, slug, brand, purpose, environment and indexing policy are retained. This publication does not change contact details or business rules, submit inquiries, change repository visibility or bind a new domain.

## Isolated upload

The managed direct upload returned HTTP 401 from `uploads.github.com`. Its newly created empty draft `460416238` was read back, checked against the preparation manifest and deleted without touching any other Release or tag. The reviewed ZIP was staged as unreferenced Hub Git blob `7e57600064e5372ccde26174f1e20b760655e49c`; it is not part of a tree, commit or ref.

The fixed `taiyang-logistics` publisher selector maps only to this source repository, slug and ZIP filename with the existing Next/sitemap policy. It uses the existing isolated Hub-local upload job and short-lived token, without private-source API reads, arbitrary destinations or additional permissions. Other project selectors, default selection and draft rejection remain unchanged.

The intended upload identity is `taiyang-logistics-43f3ec1-v1/taiyang-logistics-static.zip`. A bootstrap success is only a Release upload; normal resolution, complete build, transport/Chengce checks, guarded Pages deployment and public verification are separate steps. Their actual evidence is recorded below and in the associated PR/Actions, rather than inferred from source CI.

## Publication status

Preparation and archive review are complete. At this revision, the candidate has not been declared live; the prior reviewed tuple remains available for rollback. Promotion updates `ref` and all three `staticArtifact` values together only after the uploaded public ZIP and manifest are independently verified.

The previous source SHA is `694968b030adb6755d2e869a4b5181f45b3e79b5`, ZIP digest `60641ab86c49aa1c301062e50cb0c8e8d1cdfe5ccca2fef4cebf3dad24cd8c91`, at `preserved-showcase-45564113822-v1/taiyang-logistics-static.zip`. Restore that reviewed tuple through a new checked release if rollback is needed; source Git rollback alone does not change the fixed snapshot.
