# Rotaract RK-DEMO-02 publication

This record prepares the synthetic interactive workbench at `/rotaract/`. It does not establish a live release until the source merge, exact source CI, reviewed ZIP, complete Hub CI, guarded Pages deployment and public verification below have actual evidence.

## Source and delivery boundary

On 2026-11-26, authenticated GitHub repository metadata identified `xk2022/xk-app-rotaract` (repository ID `1471099115`) as **private**, and the canonical Hub `xk2022/xk-website-showcase` (ID `1469796623`) as **public**. The user-provided `xk2022/xk-showcase` name redirects to this Hub. This delivery publishes only the reviewed compiled website output; source visibility is unchanged.

The source work is `feat/RK-DEMO-02-interactive-showcase`, based on source main `27cdae4`. Its Showcase build uses `VITE_SHOWCASE_DEMO=true` with `/rotaract/` assets. The normal application and production API are separate from this synthetic build. Demonstration identities, organisations, members, email and dates are synthetic; mutations remain in browser memory, refresh/reset restores the seed, and the demo never connects to a backend.

Preparation must verify successful `.github/workflows/ci.yml` for the exact merged source SHA, including frontend, backend, isolated Showcase and real-backend E2E jobs. The frontend job includes lint, typecheck, unit tests, ordinary build and offline Showcase build. The original Git-built source gate remains supported; this private-source artifact registration has no `releaseGate` and Hub jobs do not query private source CI. The preparation evidence below records that source-to-export relationship; the ZIP digest verifies the reviewed delivered bytes.

## Reviewed replacement contract

The Hub baseline is `d83a100df5c80b9b12786329386cf83ec296476f`, confirmed against remote main during preparation. Its registry contains 22 entries. Only Rotaract's registration is eligible for this update, with `ref` and `staticArtifact` identity promoted together; all 21 other registrations must remain identical to this baseline.

The previous approved rollback tuple is:

| Field | Preserved value |
| --- | --- |
| Source SHA / ref | `fd8374eca0d840d64790552a6562e05c1a8bc76b` |
| ZIP URL | `https://github.com/xk2022/xk-website-showcase/releases/download/preserved-showcase-45564113822-v1/rotaract-static.zip` |
| ZIP SHA-256 | `b62460598757a26b1f5305a0043f36a7951bb75fb10dd3fc4d78a9befe9bad37` |

A replacement must use the fixed Hub URL `https://github.com/xk2022/xk-website-showcase/releases/download/rotaract-<sourceSha first seven characters>-v1/rotaract-static.zip`. Both `ref` and `staticArtifact.sourceSha` are the same full lowercase 40-character source commit, and `staticArtifact.sha256` pins the actual ZIP bytes. This allows an explicitly reviewed Rotaract snapshot while retaining the exact preserved rollback tuple. It does not enable arbitrary interactive repositories, slugs or archive destinations.

The registration retains `repository: xk2022/xk-app-rotaract`, `framework: interactive`, `indexable: false` and `env.VITE_SHOWCASE_DEMO: true`. The compiled entry requires its exact canonical URL, local module JavaScript/CSS under `/rotaract/assets/`, `connect-src 'none'`, noindex on every HTML file and no sitemap. Existing archive integrity, bounded safe extraction and token-free materialization apply unchanged.

The ZIP contains only the contents of the final frontend `dist/`, with `index.html` at its root. Inspect the archive to exclude source files, Git history, environment files, source maps, server output, dependency directories and credentials. No generated ZIP, screenshot or `dist/` is committed. The normal Hub build generates `_showcase-preview.jpg` from the new artifact's actual initial homepage, then exercises the new demonstration identity, explicit workspace selection, private synthetic member roster and historical read-only scope with backend/external requests blocked. Contacts start private and remain hidden in this smoke; the source E2E suite checks masking after explicit privacy consent. Other projects retain their existing export and browser policies; transport still validates its exact preserved runtime bytes with fresh Hub smoke.

## Upload and publication sequence

Use a versioned public Hub Release asset after the source commit and ZIP are reviewed. Independently redownload the published ZIP and verify its SHA-256 and source provenance before changing the registry. Direct Release creation/upload is preferred for this task when authorized local GitHub access supports it.

Direct CLI asset upload returned HTTP 401 from `uploads.github.com` after the source main CI passed. The failed attempt was not treated as a published archive or promoted into the registry. A narrowly scoped `rotaract` selector was therefore added to the existing isolated uploader and workflow choice, with no permission expansion. The reviewed ZIP was staged as the untracked Hub Git blob `a09ec7d633e50e2853034e123686a2b656b52187`; it is not added to a source tree or commit. The branch dispatch uses only the fixed project/blob/SHA-256/source inputs, retains the existing Hub-local `contents: write`, and skips normal build/Pages/private CI. Rotaract creation and publication explicitly preserve `make_latest: false`; unknown drafts or different bytes are rejected rather than overwritten. Actual isolated-upload and redownload evidence is recorded below and in PR #29.

After the registry promotion, normal Hub CI must run the full unit suite, frozen resolution, complete token-free build, fresh Rotaract smoke and preserved transport validation. Merge only the passing reviewed change. Main publication retains the serialized queue, main freshness guard, isolated Pages/OIDC job and public verification of the complete manifest, homepage cards, indexing rules, routes and assets. A ZIP upload or source CI success alone is not website publication. A failed post-deploy verification is reported as failed and does not imply automatic rollback.

## Preparation and release evidence

| Evidence | Result |
| --- | --- |
| Source PR and merged full SHA | [PR #19](https://github.com/xk2022/xk-app-rotaract/pull/19), `57be84dc1858db3146918afa53eff388782c7133`; final feature `736e92c8460400b5b7114a75be72a26a70c57e32` |
| Exact merged-source CI run / attempt | [45753099434](https://github.com/xk2022/xk-app-rotaract/actions/runs/45753099434), attempt 1, four jobs success: 98 frontend / 225 backend / 30 Showcase / 18 real-backend E2E; normal/showcase isolation and proxy protection passed |
| Offline build, browser acceptance and archive inspection | Exact merged-source export and its ZIP passed safe extraction, static validation and fresh Chromium workbench/private-roster/history/mailbox smoke. Main Showcase artifact 15086438629 independently downloaded: JUnit 30/0/0/0, 30 screenshots, 30 zero-network/zero-error files, HTML and ZIP integrity; actual initial-homepage thumbnail inspected. |
| Final ZIP bytes / SHA-256 | 127,433 bytes, 5 deployed HTML/CSS/JavaScript files; `57a8600d3f242ef70ec16612c5e1294982022c7ca29e70f7cf40bdd6f636f441`; no source/maps/environment/server files |
| Public Release URL and redownload verification | Pending actual upload |
| Non-Rotaract registry comparison | 21/21 rows match baseline during preparation; repeat after final promotion |
| Hub unit tests | `env -u GH_TOKEN -u GITHUB_TOKEN node --test --test-isolation=none tests/*.test.mjs`: 140/140 passed during initial preparation; uploader-focused 30/30 and complete 146/146 passed after the scoped fallback |
| Complete Hub build and browser smoke | Preparation PR #29 [run 45752313750](https://github.com/xk2022/xk-website-showcase/actions/runs/45752313750), head `1e7edb5711b1fbe13c49b6d48b85637d9ec87b32`, passed full baseline build and preserved transport runtime checks; this used the old registry, so final promoted-tuple validation is still required |
| Hub PR / merged SHA | Pending reviewed Hub change |
| Main Pages run / deployment | Pending actual guarded publication |
| Public manifest / thumbnail / interaction checks | Pending actual live verification |

Update each row from real command or workflow results. Keep source preparation, compiled-archive validation and actual public publication distinct. For rollback, restore the complete reviewed prior tuple and run a new normal release; do not weaken the interactive validator or substitute unreviewed bytes.
