# XK SYSTEM Showcase Hub

Central static publishing for independently maintained showcase repositories.

The gallery captures each listed site's real built homepage using Chromium during CI. APP entries default to offline screenshot-only previews. Rotaract is a narrowly scoped exception: its pinned, CI-gated interactive build uses synthetic data only, disables backend connections using CSP, and is browser-verified with network requests blocked. No backend or production data is published. Empty repositories are tracked as pending, not displayed as finished work.

To build locally, run `npm ci` and `npx playwright install chromium` before the existing build command.

The hub supports Next.js static exports and explicitly configured Vite exports. Concept proposals can be excluded from the showcase cards and search indexing while retaining their proposal notices; publication does not establish a client relationship or an official company website.

- [宏能興業](https://showcase.xplorekaleidoscope.com/honest/)
- [三月手工湯包](https://showcase.xplorekaleidoscope.com/march-tangbao/)
- [宏家燕窩](https://showcase.xplorekaleidoscope.com/hongjia-birdnest/)
- [御品園港式燒臘](https://showcase.xplorekaleidoscope.com/yupinyuan-bento/)
- [宏家燕窩 Brand](https://showcase.xplorekaleidoscope.com/hongjia-brand/)
- [澄策企業顧問工作室](https://showcase.xplorekaleidoscope.com/consulting-chengce/)
- [千剛實業有限公司](https://showcase.xplorekaleidoscope.com/qiangang-windows/)
- [序程運輸](https://showcase.xplorekaleidoscope.com/truck-transport/)

## Build

Install Node.js 24 and Git, then verify gated source releases before building:

```sh
node scripts/resolve-sources.mjs /tmp/resolved-sites.json
node scripts/build-showcases.mjs /tmp/resolved-sites.json
```

The resolution command may use a read-only `GH_TOKEN` for GitHub metadata requests. Remove `GITHUB_TOKEN` and `GH_TOKEN` from the build command's environment; the builder refuses to run with these tokens. In proxy-based environments, Node.js 24's `NODE_USE_ENV_PROXY=1` may be needed for the verification command. The generated `dist/` contains the hub and all registered static exports; `manifest.json` records the exact source commit and any source CI approval used for that build. The build aborts before replacing the local output if a source fails.

Run `node --test --test-isolation=none tests/*.test.mjs` for registration, export validation, publication checks, source gates, transport synchronization and preview-server tests. GitHub Actions runs these checks before the complete build. The explicit isolation mode also exposes individual assertions in managed environments.

## Deploy

In Settings → Pages choose GitHub Actions and set the custom domain to `showcase.xplorekaleidoscope.com`. Create DNS CNAME `showcase` → `xk2022.github.io`, verify domain ownership and enable HTTPS. Only the hub may own this domain. Keep existing independent sites until the hub has been verified, then move or redirect old URLs separately.

Register a site in `config/showcases.json`. Each repository must export `out/index.html` and support its unique path at build time. Hub main changes and manual Showcase Hub runs deploy. Transport updates are additionally checked every 30 minutes by the synchronization workflow; the other sources still require a Hub run after source changes. Refs may be changed to immutable release tags or exact SHAs for controlled releases. See [deployment notes](doc/deployment.md).

The Yuan-Guang PCB entry is a **concept proposal**, with `framework: "vite"`, `indexable: false`, and `listed: false`. It is not included in the homepage's client-case cards or sitemap references. This is a public preview configuration, not access control.

Its release gate requires the exact source commit's `.github/workflows/ci.yml` push run and `verify` job to succeed. Workflow metadata is checked in the separate resolution job; source installation and builds run without that job's token and fetch only the approved SHA. See [release verification](doc/deployment.md#source-release-verification) for the configuration and failure behavior.

## Transport showcase

`truck-transport` builds an exact pinned SHA from `xk2022/xk-corp-truck-transport`. Its release gate requires the entire source push workflow `.github/workflows/deploy-pages.yml` and its stable `Validate Hub build` job to succeed for that exact SHA. The hub provides `GITHUB_PAGES=true`, `NEXT_PUBLIC_BASE_PATH=/truck-transport` and `NEXT_PUBLIC_SITE_URL=https://showcase.xplorekaleidoscope.com` to export the five-page site with the correct assets, canonical URLs and sitemap. The inquiry preview remains in browser memory and has no submission endpoint or storage.

The original [independent deployment](https://xk2022.github.io/xk-corp-truck-transport/) remains available. The hub alone owns the showcase custom domain; generated exports are not committed. Deployment status and the exact built source SHA are available from the Actions run and published `manifest.json`.

## Reproducible releases

The workflow resolves every registration's `ref` to an exact commit before any source build starts. A source can use a branch, release tag or full commit SHA. The resolved plan is retained as the `resolved-sources` artifact; builds fetch and check out those SHAs detached, and the public manifest records the exact built commits. To keep a registration fixed across later releases, use a release tag or SHA instead of a moving branch.

The Hongjia Brand source additionally requires successful `Verify root static export` and `Verify subpath static export` GitHub Actions checks on its resolved SHA. Other registrations retain their existing build policy. API credentials are available only while resolving/checking a release and in the deployment guard; source installation and build run in a separate job without API tokens.

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

Every Hub build now runs the transport browser suite against the **actual complete Hub `dist/`**, served at `/truck-transport/`. The test runner checks out the resolved immutable source SHA, installs that source's locked dependencies and runs its `npm test`; it does not rebuild or test source `main` in place of the Hub artifact. The current source suite includes Chromium, Firefox, WebKit, mobile viewports and axe accessibility checks. CI installs the browsers with the exact source Playwright version. Reports are retained as `transport-browser-report` for 14 days.

```sh
# First resolve the exact approved sources and build the complete Hub.
node scripts/resolve-sources.mjs
# Run this and the browser test command WITHOUT GH_TOKEN/GITHUB_TOKEN.
node scripts/build-showcases.mjs .release/resolved-sites.json
node scripts/test-transport.mjs .release/resolved-sites.json --install-browsers
```

The [Synchronize verified transport](.github/workflows/sync-transport.yml) workflow runs every 30 minutes (subject to GitHub schedule delays) and supports manual dispatch. It selects the latest **successful main push workflow**, not necessarily source HEAD: a later documentation-only `[skip ci]` commit does not block a previously verified code release. Pending, failed, pull-request and fork runs cannot qualify. The exact selected SHA is checked again against the complete source workflow and `Validate Hub build` job.

Synchronization has three isolated jobs:

1. Read-only inspection freezes a candidate registry and complete resolved source snapshot. No change is made when the newest eligible source SHA is already pinned or has no passing gate.
2. A job with no API credentials builds all nine showcases and runs the exact source browser suite against the candidate Hub artifact. Failure prevents pinning.
3. Only after those checks does a separate `contents: write` / `actions: write` job recheck Hub main, the expected registry blob, and the latest successful source release. It changes only the transport pin, then explicitly dispatches `deploy.yml` on main. This dispatch is required because commits created by `GITHUB_TOKEN` do not trigger push workflows.

No cross-repository write token or new secret is required. Hub-scoped public API reads may fall back to anonymous reads; source install/build/test processes receive only runtime settings and public configuration. Synchronization has its own serialized queue so a scheduled inspection cannot replace its pending deployment dispatch. The deployment workflow keeps its existing complete-publication concurrency queue, freshness guard and post-deployment verification.

If the conditional pin commit succeeds but dispatch fails, rerun the **publish job** of that same synchronization run. It recognizes its exact prior commit, parent and registry content, skips a duplicate commit and retries dispatch. If Hub main changed or branch protection rejects direct bot commits, it stops for review instead of bypassing protection. The normal Showcase Hub workflow can be dispatched manually after review.

For a deliberate rollback, **disable the synchronization workflow first**, then select a known-good immutable source ref and run the normal release process; otherwise the next automatic synchronization would promote the newest eligible source again. Keep synchronization disabled until the forward fix is approved. Failed public verification reports the problem but does not automatically restore a previous Pages deployment. See [deployment operations](doc/deployment.md).

Transport quality work, validation commands and release evidence are recorded in [transport-quality.md](doc/transport-quality.md).

Transport quality release (2026-11-25, Asia/Taipei): [PR #10](https://github.com/xk2022/xk-showcase/pull/10) is merged. Source `3506dbd7b66233168523e40d6ca387f8a961f237` is published by [main run 45450135876](https://github.com/xk2022/xk-showcase/actions/runs/45450135876): 130 browser tests passed against the actual Hub output, followed by public verification of 9 sites, 16 pages and 134 assets. [Manual synchronization](https://github.com/xk2022/xk-showcase/actions/runs/45450414543) also passed as an expected no-op. Documentation-only `[skip ci]` updates do not replace this verified release.
