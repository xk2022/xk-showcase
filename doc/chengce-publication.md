# Chengce client website publication

This release updates only `/consulting-chengce/` from the prior reviewed snapshot to the modernized client website. The user confirmed the client relationship and authorized pushing, merging and deploying this revision. The source repository remains private; the released ZIP contains public browser runtime files only.

## Reviewed source and artifact

- Source: `xk2022/xk-lp-consulting-chengce` at `dfe50a754e4f5c8317278e59d0c6cf89375e647d`.
- Source [CI](https://github.com/xk2022/xk-lp-consulting-chengce/actions/runs/45974417106) and [artifact workflow](https://github.com/xk2022/xk-lp-consulting-chengce/actions/runs/45974417321) succeeded for that exact commit.
- The downloaded Actions artifact was inspected: 42 exported files, ZIP-root `index.html`, local Next assets, photos, OG card, robots and sitemap; no private source, environment files, dependencies or source maps.
- ZIP SHA-256: `a1d318f6b5e4c85bf597209b46cffee899766762a0cf84c0eef8d5993359d571`.
- The archive passes the Hub's bounded extraction and existing Next export validator. Preview HTML keeps `noindex,nofollow`; the existing registered sitemap contract is preserved.
- Visible content describes the confirmed business and its three service areas, omitting unsupported qualifications and prior trial labels. The inquiry tool prepares a copyable brief; it does not claim receipt or a completed booking.

## Public artifact bootstrap

The existing isolated publisher was extended with the fixed `consulting-chengce` selector. It maps only to the source repository above, the existing subpath and `consulting-chengce-static.zip`; there is no arbitrary repository/slug override or additional credential.

The approved ZIP was staged as unreferenced Hub Git blob `2292ecefe59d6b174be8adc91ee08c2bcba01f59` for transfer, without a tree, commit or ref. [Bootstrap run 45975707495](https://github.com/xk2022/xk-website-showcase/actions/runs/45975707495) succeeded from reviewed Hub commit `c01214857f4427871b0809961faf40dceeebb376`.

- Release: `consulting-chengce-dfe50a7-v1`.
- [Public ZIP](https://github.com/xk2022/xk-website-showcase/releases/download/consulting-chengce-dfe50a7-v1/consulting-chengce-static.zip).
- [Release manifest](https://github.com/xk2022/xk-website-showcase/releases/download/consulting-chengce-dfe50a7-v1/release-manifest.json).

The public ZIP was independently downloaded and revalidated against the reviewed digest. The Release manifest records compiled-output validation and Hub publishing identity; source CI evidence above was checked during preparation and is not fabricated by the upload job.

## Promotion and verification

The registry promotion changes only Chengce's `ref`, archive URL, SHA-256 and `sourceSha`. It preserves all other registrations, existing indexing/listing controls and domain settings. The prior tuple remains available for rollback:

- Source `17b7624f63da0a6474510ee4536684530b1d4b7c`.
- ZIP `https://github.com/xk2022/xk-website-showcase/releases/download/preserved-showcase-45564113822-v1/consulting-chengce-static.zip`.
- SHA-256 `362ff5300e75015ad0980eae6a45740216c2a779b4b71a77214edcf963776599`.

A Release upload is preparation, not a live deployment. The full Hub build, source-specific browser checks, transport validation, guarded main deployment and live manifest/resource verification must pass before this candidate is called published. Results are recorded after execution.

## Executed pre-merge checks

- Complete Hub unit suite: 227 passing tests.
- All 22 current registrations resolved and the complete combined Hub built successfully. The concurrent Honest and window-site publications are preserved unchanged.
- Chengce Chromium checks on the actual combined `dist/`: 29 checks passed at 375/768/1024/1440px. The report independently reads and checks Chengce source `dfe50a754e4f5c8317278e59d0c6cf89375e647d` from the combined manifest.
- No missing resources, horizontal overflow, runtime errors or form submissions were observed. Navigation, native FAQ, required/invalid/valid input, summary/edit/reset/refresh and copy feedback/fallback were exercised.
- Clipboard success/failure use explicitly documented browser stubs; this does not claim operating-system clipboard integration.
- Preserved transport runtime-byte equality and fresh Hub-owned browser smoke passed; its historical source suite is retained as `REUSED_NOT_RERUN`.

The normal workflow now runs the Chengce suite before Pages artifact upload and retains its JSON report/screenshots separately. These compiled-output checks run without source API credentials or external form delivery.
