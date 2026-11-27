# Rotaract RK-DEMO-03 governance publication

This record covers the synthetic annual-governance update at [`/rotaract/`](https://showcase.xplorekaleidoscope.com/rotaract/). Preparation, source CI, reviewed static delivery, Hub CI, Pages publication and public operation acceptance are separate gates. Exact source and Hub head/merge SHAs, workflow runs, ZIP digest and actual operation results are recorded in this work package's final PR delivery record. An uploaded Release or a reachable older website does not establish that this update is live.

## Source and scope

The source is private `xk2022/xk-app-rotaract`; the public deployment repository is `xk2022/xk-website-showcase`, the canonical destination of the user-provided `xk2022/xk-showcase` name. Source visibility remains unchanged. The source starts at RK-006-07 main `8a75e8e3e69f44275b67c2743a7400be29c76d51`. Hub preparation starts at main `8f8a446a446219da2510b79741743cd13ad76df6` with 22 registrations.

RK-DEMO-03 preserves RK-DEMO-02 authentication, membership, privacy, audit, persona/workspace/year selection, synthetic mailbox and reset journeys, and adds completed RK-006 governance screens through an independent in-memory Mock API. Demonstrations include club/district structure and appointments, acting/end-of-office, annual handover, historical officer directories and personal service history. Office facts do not mint RBAC grants or inherit cross-organization rights. Future planned years do not automatically activate or copy predecessor permissions.

Only Rotaract's approved registry tuple and presentation description may change. All 21 other registration objects and runtime source/artifact identities must match the pre-publication baseline; compare the complete candidate and public manifests as well. Do not change their build, preview, route, domain or credential policies. No production backend, database, real SMTP or personal data is published.

## Reviewed static artifact and rollback

The replacement contains only the exact merged-source `VITE_SHOWCASE_DEMO=true` frontend `dist/`, with `/rotaract/` asset paths and `index.html` at the ZIP root. Record full source SHA, ZIP byte count and SHA-256 after the source's exact merged-main CI succeeds. Inspect for source files, Git history, environment files, source maps, dependencies, server output and credentials before upload. Keep no ZIP, generated screenshot or `dist/` in Git.

Use the existing fixed public Hub Release URL:

`https://github.com/xk2022/xk-website-showcase/releases/download/rotaract-<sourceSha first seven characters>-v1/rotaract-static.zip`

Promote `ref`, `staticArtifact.sourceSha`, `staticArtifact.url` and `staticArtifact.sha256` together. Both source fields must contain the full identical 40-character merged-source SHA. Preserve `framework: interactive`, `indexable: false` and `env.VITE_SHOWCASE_DEMO: true`. Export validation requires local Vite assets, exact canonical URL, noindex, no sitemap and `connect-src 'none'`; unsupported APIs fail closed in the source adapter.

The RK-DEMO-02 rollback tuple remains available unchanged:

| Field | Value |
| --- | --- |
| Source SHA / ref | `57be84dc1858db3146918afa53eff388782c7133` |
| ZIP URL | `https://github.com/xk2022/xk-website-showcase/releases/download/rotaract-57be84d-v1/rotaract-static.zip` |
| ZIP SHA-256 | `57a8600d3f242ef70ec16612c5e1294982022c7ca29e70f7cf40bdd6f636f441` |

The existing isolated uploader already supports the fixed `rotaract` selector. If the known managed direct-upload limitation persists, stage only the reviewed ZIP as a Hub Git blob, then dispatch existing main `deploy.yml` with `static_artifact_project=rotaract`, `static_artifact_blob`, `static_artifact_sha256` and `static_artifact_source`. This uses the existing Hub-only short-lived token; normal resolution/build/Pages jobs are skipped. No workflow permission expansion or source execution is required. Independently redownload the public ZIP and manifest, compare digest/source identity and validate safe extraction before registry promotion. An isolated upload is not Pages deployment.

## Browser and thumbnail gates

The full Hub build materializes all frozen inputs without API credentials, validates every export and captures Rotaract's actual initial homepage at 1440×810. The generated `_showcase-preview.jpg` is used by its existing gallery card; no placeholder or unrelated project image is substituted. The screenshot is captured before workbench operations.

The existing Rotaract smoke retains private roster/history/mailbox checks with backend/external requests blocked. Observing `data-showcase="RK-DEMO-03"` adds checks of the rendered governance dashboard, nonempty structure, current appointments, handover list, owner service statistics/timeline and current/historical officer directory. The old RK-DEMO-02 and original preserved rollback outputs keep their earlier smoke. The source build verifier and source/public browser suite independently require the new release marker, so a missing marker cannot qualify as this new release.

These Hub checks are readonly publication smoke. Source-owned Chromium journeys perform mutations, successful and denied operations, reset and actual desktop/tablet/mobile interaction; rerun the same suite with `SHOWCASE_BASE_URL` against the public URL after deployment, without route mocks. Confirm zero backend/external requests, zero uncaught browser errors and document overflow assertions. The simulated date and in-memory authority are demonstration state; they do not prove a formal midnight rollover, official governance process or production PostgreSQL security.

## Delivery gates and actual evidence

| Gate | Required evidence |
| --- | --- |
| Source exact-head and merged-main CI | frontend/backend/showcase/real-backend E2E completed successfully; record actual counts and workflow URLs |
| Reviewed static delivery | inspected ZIP bytes, digest, full source SHA, public Release and independently verified redownload |
| Hub candidate verification | complete unit suite, frozen resolution, complete 22-project build, new Rotaract smoke/thumbnail and existing transport verification |
| Hub merge and guarded Pages | candidate checks successful before merge; exact merged-main workflow, freshness guard, Pages and complete public verifier successful |
| Public operations and isolation | same source-owned three-size suite against public URL, exact published manifest tuple/thumbnail and unchanged 21 other manifest entries |

Actual results belong to the final PR delivery record; unexecuted gates must not be marked successful. Artifacts retain the actual source/browser evidence separately from historical reused transport-suite evidence. Restore the complete RK-DEMO-02 tuple for rollback through a new full Hub release and public verification; do not weaken validation or overwrite released bytes.

## Verified preparation evidence

| Evidence | Actual result |
| --- | --- |
| Source PR / final head / merged SHA | [PR #27](https://github.com/xk2022/xk-app-rotaract/pull/27), `ed51a70a7d8fbe0e3309ecd780f9089fde194a68`, merged `4a7712436a7217f6065560e3ff695c39510896ee`; merge and tested head have the same Git tree |
| Exact source head CI | [push 45920447865](https://github.com/xk2022/xk-app-rotaract/actions/runs/45920447865) and [PR 45920452897](https://github.com/xk2022/xk-app-rotaract/actions/runs/45920452897), frontend/backend/showcase/e2e all successful |
| Exact merged-source main CI | [45921580877](https://github.com/xk2022/xk-app-rotaract/actions/runs/45921580877), all four jobs successful; actual logs confirm 179 frontend, 376 backend (zero failures/errors/skips), 45 offline Showcase and 26 real-backend E2E tests |
| Final local source acceptance | 179 unit tests; lint/typecheck, ordinary/Showcase build isolation and proxy-log protection passed. Complete 45/45 desktop/tablet/mobile journeys, JUnit 0 failures/errors/skips, 45 zero-network/zero-error files and 75 screenshots; representative phone/tablet/desktop screens manually inspected |
| Reviewed merged-source ZIP | 160,311 bytes, seven deployed HTML/CSS/JavaScript files, source SHA `4a7712436a7217f6065560e3ff695c39510896ee`; no source/maps/environment/server files. SHA-256 `23a443d96e657593ebd2278092689079a49e3181f7a0b1eae4492a713be5c08e` |
| Safe archive and actual-preview validation | Hub bounded extraction, static export route/assets/CSP validation, actual governance smoke and initial 1440×810 thumbnail passed against the packaged bytes. The gallery title was adjusted after inspecting the actual screenshot, then the final source was reverified |
| Isolated public delivery | [Release rotaract-4a77124-v1](https://github.com/xk2022/xk-website-showcase/releases/tag/rotaract-4a77124-v1); [upload run 45922852063](https://github.com/xk2022/xk-website-showcase/actions/runs/45922852063) at reviewed Hub main `8f8a446a446219da2510b79741743cd13ad76df6` succeeded; only the publisher ran, normal build/Pages jobs were skipped. Public credential-free redownload of ZIP and manifest matched every byte, digest, source SHA and publishing run |
| Hub unit suite | 154/154, zero failures/skips, rerun against the promoted registry (16.027 seconds), using no GH_TOKEN/GITHUB_TOKEN in the test process; new marker-aware readonly smoke keeps legacy rollback behavior |
| Complete final local Hub build | Frozen resolution and token-free build of all 22 registrations passed, including packaged Rotaract governance smoke and actual initial-homepage thumbnail (101,563 bytes), manually inspected. Every generated candidate manifest row except Rotaract exactly matches the saved 22-entry public baseline |
| Preserved transport verification | Exact preserved runtime `3506dbd7b66233168523e40d6ca387f8a961f237` and fresh Hub browser smoke passed; original source suite from run `45564113822` is reused, NOT rerun |
| Other registrations | All 21 non-Rotaract registry objects and complete candidate-manifest objects exactly match the saved main/public baselines; live publication comparison remains separate final PR evidence |

The ZIP was transferred through reviewed Git blob `96810e50b3a00b6f01557a045f8f7ba51c2ea89a`, never added to a Git tree or source commit. No workflow, permissions, secret, domain or uploader change was required. The final PR records the complete candidate Hub build, exact head/merge CI, guarded Pages run and live 45-case public acceptance; the preparation checks above do not substitute for publication.
