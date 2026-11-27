# XK SYSTEM Showcase Hub

Central static publishing for independently maintained showcase repositories.

**Public Showcase:** [https://showcase.xplorekaleidoscope.com/](https://showcase.xplorekaleidoscope.com/) · **Source registry:** [config/showcases.json](config/showcases.json)

Current publication is managed here; source repositories retain CI and do not need independent Pages for portfolio display. The registry currently contains 22 projects: 20 reviewed, hash-pinned static snapshots and two pinned public-source screenshot previews. Private sources remain private. The initial migration preserved sixteen existing outputs from the last successful Pages artifact. Private-source HEAD updates are not followed automatically; a reviewed replacement snapshot is required for promotion. Git-built public-source input remains supported as a separate mode. See [private-source preservation](doc/private-source-preservation.md) for the completed migration and its evidence. Do not claim a new release until resolution, build and live verification pass.

The reviewed Esan replacement exports the reorganized private source `1793516c765aebdf0430f9944e0d739b262866a6` at `/esan-interior/`, preserving its existing case content, illustration notice and consultation destinations. Its fixed publisher, exact source CI, ZIP identity, isolated upload and rollback evidence are recorded in [Esan publication](doc/esan-interior-publication.md). A source-folder change alone does not update the public snapshot; registration and the complete guarded Hub publication remain separate steps.

The gallery captures each listed site's real built homepage using Chromium during CI. APP entries default to offline screenshot-only previews. Rotaract is a narrowly scoped exception: its reviewed synthetic interactive preview disables backend connections using CSP. Its original Git-built path retains the exact source CI gate; reviewed artifact updates require a fixed Rotaract Release identity, digest and fresh browser smoke against the actual Hub output. Preparation records source CI separately; artifact builds do not query private CI. See [Rotaract publication](doc/rotaract-publication.md) for the current preparation and publication evidence. No backend or production data is published. Empty repositories are tracked as pending, not displayed as finished work.

RK-DEMO-03 extends Rotaract's offline preview with annual governance, structure, appointments, handover and personal service history while preserving the existing membership journeys. The new marker adds readonly governance smoke to the actual export; existing rollback snapshots retain their earlier checks. The [governance publication record](doc/rotaract-governance-publication.md) separates source validation, reviewed ZIP delivery, full Hub CI, guarded Pages publication and public three-size operations. The registry and final PR evidence identify the actual published version.

To build locally, run `npm ci` and `npx playwright install chromium` before the existing build command.

The hub supports Next.js static exports and explicitly configured Vite exports. Trusted projects can either be built from a publicly readable source repository or supply a reviewed, SHA-256-pinned static archive from a public Hub Release asset. The archive route lets a source repository remain private without adding cross-repository credentials or exposing its source. Concept proposals can be excluded from showcase cards and search indexing while retaining their proposal notices; publication does not establish a client relationship or an official company website.

- [宏能興業](https://showcase.xplorekaleidoscope.com/honest/)
- [三月手工湯包](https://showcase.xplorekaleidoscope.com/march-tangbao/)
- [宏家燕窩](https://showcase.xplorekaleidoscope.com/hongjia-birdnest/)
- [御品園港式燒臘](https://showcase.xplorekaleidoscope.com/yupinyuan-bento/)
- [宏家燕窩 Brand](https://showcase.xplorekaleidoscope.com/hongjia-brand/)
- [元廣科技｜非官方概念提案](https://showcase.xplorekaleidoscope.com/yuan-guang-pcb/)
- [澄策企業顧問工作室](https://showcase.xplorekaleidoscope.com/consulting-chengce/)
- [千剛實業有限公司](https://showcase.xplorekaleidoscope.com/qiangang-windows/)
- [序程運輸](https://showcase.xplorekaleidoscope.com/truck-transport/)
- [職人接案 LP Template｜六產業切換](https://showcase.xplorekaleidoscope.com/carpentry/)
- [蕋咖啡 Rui Café｜非官方品牌網站提案](https://showcase.xplorekaleidoscope.com/rui-cafe/)

## Six-industry LP template

The `carpentry` entry now registers the six-industry export from private source `xk2022/xk-template-lp` and is first in the LP group. It retains `/carpentry/`, with five additional industry pages under that path. The template repository is explicitly classified as LP; this adds no new website category. The other 21 project identities and relative gallery order are preserved. The update is live following [Pages run 45956818639](https://github.com/xk2022/xk-website-showcase/actions/runs/45956818639), whose public verification passed for 22 sites, 74 pages and 287 assets. Independent HTTPS checks passed for all six routes and 31 assets; managed Chrome confirmed desktop switching and the local summary. Exact-source CI covers mobile responsiveness. See [publication evidence](doc/template-lp-publication.md) and [the verification report](doc/template-lp-live-verification.json) for the separate scopes and exact runtime/artifact identities.

## Build

Install Node.js 24, Git and Python 3 (for safe static-archive extraction), then resolve the release inputs before building:

```sh
node scripts/resolve-sources.mjs /tmp/resolved-sites.json
node scripts/build-showcases.mjs /tmp/resolved-sites.json
```

The resolution command may use a read-only `GH_TOKEN` for GitHub metadata requests. Remove `GITHUB_TOKEN` and `GH_TOKEN` from the build command's environment; the builder refuses to run with these tokens. In proxy-based environments, Node.js 24's `NODE_USE_ENV_PROXY=1` may be needed for the verification command. The generated `dist/` contains the hub and all registered static exports; `manifest.json` records the exact source commit, applicable source CI approval, and any pinned `staticArtifact` identity. Git-built registrations retain their source release gates. Artifact registrations download and hash-check the public release bytes, extract without running source Git/npm commands, and pass the same export validation. The build aborts before replacing local output if any input fails.

Run `node --test --test-isolation=none tests/*.test.mjs` for registration, export validation, publication checks, source gates, transport synchronization and preview-server tests. GitHub Actions runs these checks before the complete build. The explicit isolation mode also exposes individual assertions in managed environments.

## Deploy

In Settings → Pages choose GitHub Actions and set the custom domain to `showcase.xplorekaleidoscope.com`. Create DNS CNAME `showcase` → `xk2022.github.io`, verify domain ownership and enable HTTPS. Only the hub may own this domain. Keep existing independent sites until the hub has been verified, then move or redirect old URLs separately.

Register a site in `config/showcases.json`. Each source build or approved static archive must provide the `out/` contents, including `index.html`, with its unique case path already applied. Hub main changes and manual Showcase Hub runs deploy. Private-source updates require a newly reviewed snapshot and registry promotion; rerunning the workflow does not follow private source HEAD. Transport synchronization is a read-only no-op for its current artifact input; the scheduled Git-built source update path remains available only for public-source mode. See [deployment notes](doc/deployment.md).

The Yuan-Guang PCB entry is a **concept proposal**, with `framework: "vite"`, `status: "proposal"`, `indexable: false`, and `listed: true`. Its homepage card explicitly labels it an unofficial concept proposal, states that it does not represent a client commission, and uses “查看概念提案” instead of the ordinary case action. It remains excluded from sitemap references and blocked in robots.txt; the source website retains its proposal notices and noindex metadata. This is a public preview configuration, not access control. The listing release and its CI/public verification outcome are tracked in [PR #18](https://github.com/xk2022/xk-website-showcase/pull/18); archive review alone does not establish a live card.

Yuan-Guang reuses its existing reviewed [preserved snapshot](doc/yuan-guang-publication.md), with no source `releaseGate` in artifact mode. Source CI run `45419126636`, attempt 1, is historical preparation evidence for application `2028ee7`; the Hub verifies the approved public ZIP and digest without querying private CI. The original exact workflow/job gate remains available for Git-built public-source mode. This change prepares only the proposal listing, not another sixteen-site migration; the listing requires its own complete CI, guarded deployment and public verification, recorded in PR #18.

## Private-source static snapshots

[蕋咖啡 Rui Café is live at `/rui-cafe/`](https://showcase.xplorekaleidoscope.com/rui-cafe/) as a listed, non-indexable brand proposal, pinned to merged source `e32cc6d7bf330c1a487e9dbf2983443cffebdb70` and reviewed ZIP SHA-256 `638ae61cea47df4c5b920e0f3fd17d9c462a6b0d48767375ff8faecffcb3fe39`. [PR #25](https://github.com/xk2022/xk-website-showcase/pull/25) merged as `406357a9f3f3f30b83ddd7e89630f7e1ec06a6d6`; normal [Pages run 45729426575](https://github.com/xk2022/xk-website-showcase/actions/runs/45729426575) passed the complete build, guarded deployment and public HTTPS verification. The proposal retains visible AI illustration and unofficial-site notices. Local checks passed 138 tests and verified 22 sites, 69 pages and 273 assets across 367 requests; all seven Rui routes require their own canonical URLs and H1s. Source CI, PR CI, isolated upload and publication evidence are recorded in [Rui Café preparation and publication](doc/rui-cafe-publication.md). Existing source and runtime pins remain unchanged.

The initial eighteen-entry migration used `staticArtifact: { url, sha256, sourceSha }` rather than source `releaseGate` fields; the registry now records additional reviewed snapshots and the separate public-source screenshot inputs. Shengfengyang and Carpentry retain their individually reviewed exports; the other sixteen retain the exact prior public runtime output through the preservation Release. The Hub consumes only the reviewed public ZIP of deployable files; source files, Git history, environment files, server output and source maps are excluded. This does not grant permission to change repository visibility.

Shengfengyang's first approved snapshot used source `7d18d00faffb5aa95d9b55e823333353fd54cf70`, archive SHA-256 `88ccc628cb520b794c871ba4ecd62b1f58885489a581280b1dc66a4d51b78bdd`. Source CI [run 45556469301](https://github.com/xk2022/xk-brand-shengfengyang/actions/runs/45556469301) was checked as successful during preparation; its evidence is recorded in [PR #12](https://github.com/xk2022/xk-website-showcase/pull/12) and [the preparation record](doc/static-artifact.md#archive-contents-and-preparation-evidence). The generated Release manifest/body records delivery checksum, source SHA, static validation and publishing workflow identity; it does not claim to reverify private CI. The preservation Release separately retains original source-gate evidence as history, not newly queried approval. Its current arrow update uses source `baacd349c86c195f77d3b5c17ec29e7f6041b3d5` and ZIP digest `985e9b84c9bb6ba53c20830108cc4d317a868ddeff4368c3893361d84c7931dd`; see [the approved update record](doc/shengfengyang-arrow-publication.md). The registry is authoritative for the current tuple.

If direct Release upload is unavailable, the existing `deploy.yml` supports an isolated bootstrap dispatch: `static_artifact_blob`, `static_artifact_sha256` and `static_artifact_source` select only `publish-static-artifact`. That job validates the ZIP and 20 routes, then uploads the Release asset and manifest using its own short-lived Hub `GITHUB_TOKEN` with `contents: write`. Normal resolve/build/Pages jobs are skipped in that dispatch. It adds no secret and does not execute website JavaScript or source npm scripts. See the [bootstrap procedure](doc/static-artifact.md#isolated-release-upload-bootstrap).

The existing eighteen-entry static release passed [Pages run45569747028](https://github.com/xk2022/xk-website-showcase/actions/runs/45569747028), including guarded deployment and public verification. A new registry or listing change still needs its own complete release; an existing ZIP alone does not establish that the change is live. See [static snapshot contract](doc/static-artifact.md) for the schema, archive limits, trust model and update process.

## Transport showcase

`truck-transport` currently uses the exact preserved public snapshot described below. Its original Git-backed delivery policy builds an exact pinned SHA from `xk2022/xk-corp-truck-transport`. Its release gate requires the entire source push workflow `.github/workflows/deploy-pages.yml` and its stable `Validate Hub build` job to succeed for that exact SHA. The hub provides `GITHUB_PAGES=true`, `NEXT_PUBLIC_BASE_PATH=/truck-transport` and `NEXT_PUBLIC_SITE_URL=https://showcase.xplorekaleidoscope.com` to export the five-page site with the correct assets, canonical URLs and sitemap. The inquiry preview remains in browser memory and has no submission endpoint or storage.

The original [independent deployment](https://xk2022.github.io/xk-corp-truck-transport/) remains available. The hub alone owns the showcase custom domain; generated exports are not committed. Deployment status and the exact built source SHA are available from the Actions run and published `manifest.json`.

## Reproducible releases

The workflow freezes every registration before building. Git-built sources can use a branch, release tag or full commit SHA; resolution checks the public metadata and builds fetch those exact SHAs detached. A `staticArtifact` registration instead requires `ref` to equal its full `sourceSha` and freezes a public Hub Release URL plus SHA-256; it does not read private source metadata or execute a source checkout. The resolved plan is retained as the `resolved-sources` artifact, and the public manifest records the exact source SHA and input identity. Use immutable pins for controlled releases.

In Git-built public-source mode, Hongjia Brand requires successful `Verify root static export` and `Verify subpath static export` checks on its resolved SHA. Artifact mode retains a reviewed source identity and digest without requerying private CI. The [Hongjia Brand publication record](doc/hongjia-brand-publication.md) tracks the prepared replacement from source `edc4022`, its exact source CI, compiled-output review, isolated upload and subsequent Pages verification; preparation alone does not update the public site. Git-built gates remain enforced when that mode is selected. API credentials are available only while resolving/checking a release and in the deployment guard; source installation and build run in a separate job without API tokens.

Publish runs serialize the whole pipeline. Immediately before deployment, the workflow rejects an obsolete Hub main revision or a release superseded by a newer main run. After Pages deployment it retries public checks with no-cache requests and compares the complete public manifest against the resolved plan. The checks cover homepage visibility, indexing rules, sitemaps, published pages and referenced assets, including fonts in CSS. Hongjia Brand's four required routes and one H1 per page are checked explicitly. A verification failure marks the workflow failed; it does not silently roll back a deployment already accepted by Pages.

For local verification:

```sh
node --test tests/*.test.mjs
node scripts/resolve-sources.mjs .release/resolved-sites.json
node scripts/build-showcases.mjs .release/resolved-sites.json
node scripts/verify-publication.mjs .release/resolved-sites.json
```

The final command verifies the current public site, so it only passes after that exact plan has been deployed. Do not commit `.release/` or generated `dist/`. See [release and recovery notes](doc/deployment.md#release-snapshots-and-verification).


## Transport release validation and synchronization

Every Hub build validates transport against the **actual complete Hub `dist/`**, served at `/truck-transport/`. For Git-backed input the runner checks out the resolved immutable source SHA and executes its locked source suite (Chromium, Firefox, WebKit, mobile viewports and axe), without rebuilding source `main`. For the reviewed preserved static input it verifies the public ZIP hash, compares runtime bytes, and runs fresh Hub-owned Chromium checks; its historical exact-source suite is explicitly marked `REUSED_NOT_RERUN`. Reports are retained as `transport-browser-report` for 14 days.

```sh
# First resolve the exact approved sources and build the complete Hub.
node scripts/resolve-sources.mjs
# Run this and the browser test command WITHOUT GH_TOKEN/GITHUB_TOKEN.
node scripts/build-showcases.mjs .release/resolved-sites.json
node scripts/test-transport.mjs .release/resolved-sites.json --install-browsers
```

The [Synchronize verified transport](.github/workflows/sync-transport.yml) workflow runs every 30 minutes (subject to GitHub schedule delays) and supports manual dispatch. With the current reviewed static input, it stops as a read-only no-op before private source API reads, pin changes or deployment dispatch. A private-source update requires a reviewed replacement snapshot. In Git-built public-source mode only, it selects the latest **successful main push workflow**, not necessarily source HEAD; pending, failed, pull-request and fork runs cannot qualify, and the exact SHA is rechecked against the full workflow and `Validate Hub build` job.

The Git-built synchronization path has three isolated jobs:

1. Read-only inspection freezes a candidate registry and complete resolved source snapshot. No change is made when the newest eligible source SHA is already pinned or has no passing gate.
2. A job with no API credentials builds every registered showcase and runs the exact source browser suite against the candidate Hub artifact. Failure prevents pinning.
3. Only after those checks does a separate `contents: write` / `actions: write` job recheck Hub main, the expected registry blob, and the latest successful source release. It changes only the transport pin, then explicitly dispatches `deploy.yml` on main. This dispatch is required because commits created by `GITHUB_TOKEN` do not trigger push workflows.

No cross-repository write token or new secret is required. Hub-scoped public API reads may fall back to anonymous reads; source install/build/test processes receive only runtime settings and public configuration. Synchronization has its own serialized queue so a scheduled inspection cannot replace its pending deployment dispatch. The deployment workflow keeps its existing complete-publication concurrency queue, freshness guard and post-deployment verification.

If the conditional pin commit succeeds but dispatch fails, rerun the **publish job** of that same synchronization run. It recognizes its exact prior commit, parent and registry content, skips a duplicate commit and retries dispatch. If Hub main changed or branch protection rejects direct bot commits, it stops for review instead of bypassing protection. The normal Showcase Hub workflow can be dispatched manually after review.

For an artifact rollback, restore a previously reviewed URL/digest/source-SHA tuple and run the normal release process. Static-mode synchronization cannot promote a newer source. In Git-built transport mode, **disable synchronization first** to prevent the next scheduled run from undoing an intentional rollback. Failed public verification reports the problem but does not automatically restore a previous Pages deployment. See [deployment operations](doc/deployment.md).

Transport quality work, validation commands and release evidence are recorded in [transport-quality.md](doc/transport-quality.md).

Transport quality release (2026-11-25, Asia/Taipei): [PR #10](https://github.com/xk2022/xk-showcase/pull/10) is merged. Source `3506dbd7b66233168523e40d6ca387f8a961f237` is published by [main run 45450135876](https://github.com/xk2022/xk-showcase/actions/runs/45450135876): 130 browser tests passed against the actual Hub output, followed by public verification of 9 sites, 16 pages and 134 assets. [Manual synchronization](https://github.com/xk2022/xk-showcase/actions/runs/45450414543) also passed as an expected no-op. Documentation-only `[skip ci]` updates do not replace this verified release.

## Carpentry showcase

[木作職人 is live at `/carpentry/`](https://showcase.xplorekaleidoscope.com/carpentry/). This self-initiated woodworker demonstration uses AI space illustrations and a local-only inquiry summary; LINE remains unconfirmed and disabled. Its private source is delivered as a reviewed static snapshot pinned to `91ade724579ed659287a27f8d77e5e1e0ed0292e`, without changing source visibility. [Integration PR #17](https://github.com/xk2022/xk-website-showcase/pull/17) is merged, and [Pages run45569747028](https://github.com/xk2022/xk-website-showcase/actions/runs/45569747028) passed the guarded eighteen-entry build, deployment and public verification. Independent live checks passed for 18 sites, 44 pages and 252 assets, plus Carpentry desktop/mobile interactions and metadata. See [preparation evidence](doc/carpentry-publication.md).

The isolated artifact upload dispatch accepts only the fixed `shengfengyang` (default) or `carpentry` project selector; it retains the existing Hub-local permissions and does not execute source code. All normal Showcase builds continue through the complete source-resolution and Pages publication pipeline.

## Preserving private-source showcases

The existing Git-built sources are now private. Their last successfully published runtime output is preserved as checksum-pinned public static snapshots, retaining each exact old source SHA; this does not deploy newer private source code. The fixed previous Pages artifact, original gate evidence, bounded one-time publisher and fresh compiled-output transport checks are documented in [private-source preservation](doc/private-source-preservation.md). Private-source updates now require reviewed snapshot promotion; automatic transport source synchronization is a read-only no-op in artifact mode.

The one-time preservation [run45569035046](https://github.com/xk2022/xk-website-showcase/actions/runs/45569035046) succeeded. Its [public Release](https://github.com/xk2022/xk-website-showcase/releases/tag/preserved-showcase-45564113822-v1) retains all sixteen approved prior outputs and original source-gate evidence. Current eighteen-entry registration uses public hash-pinned static inputs; newer private source commits require a separately reviewed snapshot.

## XK Logistics 離線互動展示準備

既有 `/logistics/` 將以獨立合成 persona、記憶體工作流程、明確離線提醒及 network-denying CSP，更新為可操作的物流 Demo。精確 source pin 只在來源 PR／main 四項 CI 成功後更新；其他21個展示來源保留。使用既有 GitHub Pages，不建立 Render 等新資源或正式物流服務。完整22站建置、雙Repo CI及公開manifest／桌面手機驗收完成後才算新版已發布；目前準備與最終收據見[物流發布說明](doc/logistics-publication.md)。
