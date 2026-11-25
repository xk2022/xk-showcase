# Deployment

The hub builds trusted, publicly readable XK source repositories or consumes reviewed static snapshots from public Hub Release assets. It copies validated exports into isolated subdirectories, generates an index, and publishes one combined artifact on GitHub Pages. Static snapshots allow source repositories to remain private without giving Hub jobs private-source credentials. Each artifact records source SHAs and applicable input provenance. Failed inputs or builds must not publish. Company rules remain in [xplore-kaleidoscope](https://github.com/xk2022/xplore-kaleidoscope); this document describes the hub's implementation.

## Export registration

Existing registrations default to Next.js validation: `/<slug>/_next/static/` assets, a case-specific canonical URL, valid local resources and `out/sitemap.xml`. Inputs can be source builds or an explicit `staticArtifact` archive; the latter contains the already built `out/` contents at its archive root. It is not combined with `releaseGate`. The [static artifact contract](static-artifact.md) defines the schema, integrity checks and extraction rules.

Vite registrations set `framework: "vite"`. They must provide actual `/<slug>/assets/` module JavaScript and stylesheet files, `out/index.html`, `out/404.html`, and an English `out/en/404.html`. The hub checks every exported HTML file's local resource references, including directory links and nested routes. Resources must stay within the case path and exist in the export. It rejects cross-case paths, traversal and protocol-relative resources.

Proposal controls are explicit per registration:

| Field | Default | Effect |
| --- | --- | --- |
| `framework` | `next` | Use `vite` for real Vite static assets; `screen` builds an APP frontend locally and publishes only a screenshot page. |
| `indexable` | `true` | `false` requires `noindex,nofollow` in every HTML file, rejects `sitemap.xml`, adds a root robots Disallow rule, and omits its sitemap reference. |
| `listed` | `true` | `false` excludes the site from homepage showcase cards. |

`yuan-guang-pcb` uses `BASE_PATH=/yuan-guang-pcb/`, `framework: "vite"`, `indexable: false`, and `listed: false`. It is a corporate-website concept proposal, not the company's official website or a formally commissioned client case. Preserve its visible proposal notice and fictional-only, non-submitting form.

These controls do **not** restrict access. An unlisted URL, robots directives, a private source repository or lack of a sitemap cannot replace authentication. A proposal that requires restricted access must use a suitable authenticated hosting arrangement.

## Gallery previews

The homepage defaults to grouping by repository type (LP, BRAND, CORP, APP), with an accessible native radio switch for grouping by brand. Registry `brand` and `purpose` fields describe the shared brand and each project's intended business use. Both views omit `listed: false` entries, preserve existing URLs and screenshots, and label offline APP previews separately. The type view includes every listed work; the brand view only includes brands with at least two listed works. Purpose describes demonstrated capability, not a measured customer outcome.

Listed sites receive a real 1440×810 screenshot captured from their exact built release in Chromium. The gallery displays lazy-loaded thumbnails with project type badges. Screenshot-only APP captures are offline, use only public frontend code and block external requests; the deployed preview contains HTML and the screenshot only, never the frontend bundle, backend or database. Empty repositories remain pending. A private repository is not directly fetched by the Hub; it can be registered only through an explicit reviewed public static snapshot. Publishing that snapshot does not publish the source repository. The existing unlisted Yuan-Guang proposal stays unlisted.

## Source release verification

This section describes Git-built public-source registrations. Static-artifact entries use the reviewed release identity and integrity path in [static-artifact.md](static-artifact.md), without private API access or a source `releaseGate`.

The Yuan-Guang entry opts into `releaseGate: { "workflow": ".github/workflows/ci.yml", "job": "verify" }`. Other existing registrations keep their current build process unless they explicitly opt in. Prefer a full 40-character source commit SHA in `ref`; named branches and tags are supported, but are resolved to an exact SHA before verification and checkout.

The `resolve` job performs GitHub REST metadata reads before any source build runs. It checks the exact SHA's push workflow run, matches the configured workflow path and source repository, and requires the latest matching run to have completed successfully. It then checks the configured job for that exact run attempt and SHA, and rechecks the workflow to detect a rerun starting during verification. Missing checks, pending/failed runs, wrong workflows, wrong SHAs, incomplete API pages and API errors all stop publication. It does not substitute another commit's success or poll indefinitely.

For Git-built inputs, the resolver stores each source SHA and its optional `release` evidence (workflow, job, run ID, attempt and verification timestamp) in the existing `.release/resolved-sites.json` plan, retained as the single `resolved-sources` artifact. The separate `build` job downloads that same workflow run's artifact and checks its repository/ref/workflow/job pairing against the current configuration before executing any source code. It fetches the approved SHA into a detached checkout and confirms the fetched commit matches. Changes to a branch or tag after verification cannot change the code being built. The final manifest includes the release evidence alongside the exact source SHA.

During normal website publication, `GH_TOKEN` is passed to the metadata command in the resolution job with read-only contents/checks/actions permissions, and to the isolated deployment freshness guard. A separate, explicitly selected Release-upload bootstrap uses only the Hub's short-lived token in its own `contents: write` job, as described below. It is never written into an artifact, Git configuration, command argument or log. The source-build job has no such environment variable; the builder also refuses `GITHUB_TOKEN`/`GH_TOKEN` in its own environment. Git/npm child environments contain a small runtime allowlist plus explicit public configuration; inherited Actions credentials and token-like settings are excluded. Credential-bearing proxy URLs are not forwarded. This environment filtering is not a sandbox for untrusted code: source repositories must remain trusted XK projects. Deployment retains its isolated Pages/OIDC permissions.

For a complete local build, first run `node scripts/resolve-sources.mjs /tmp/resolved-sites.json`, then run `node scripts/build-showcases.mjs /tmp/resolved-sites.json` and no GitHub tokens in its environment. Public repository metadata can be read without a token subject to GitHub rate limits. Private source access is not added to these jobs: use the explicit `staticArtifact` snapshot route, which resolves from the reviewed public Hub configuration without reading private API metadata. In environments using HTTP proxies, prefix the metadata command with `NODE_USE_ENV_PROXY=1` on Node.js 24. Never commit the generated approval artifact or reuse an approval from a different release configuration.

## Isolated Release-upload bootstrap

The existing `deploy.yml` has optional `workflow_dispatch` inputs `static_artifact_blob`, `static_artifact_sha256` and `static_artifact_source`. A nonempty blob input selects only `publish-static-artifact`; normal source resolution, complete website build and Pages deployment are skipped for that dispatch. The bootstrap job has Hub-only `contents: write`, checks out reviewed Hub code without persisted credentials, and runs `scripts/publish-static-artifact.mjs` using the run's short-lived `GITHUB_TOKEN`. It does not need a private-source token, a stored long-lived token, a new secret or a repository visibility change.

The upload helper verifies the staged blob bytes against the reviewed ZIP hash, safely extracts the archive and validates Shengfengyang's 20 routes before creating/uploading the versioned Hub Release asset and manifest. It does not run website JavaScript, Git/npm source builds or archive executables. This is a Release-asset upload, not a Pages deployment; after it completes, run the normal 17-registration pipeline with no bootstrap inputs, including transport browser tests, freshness guard and live verification.

Because `deploy.yml` already exists on Hub main, bootstrap may be dispatched against a feature branch only after that branch's exact SHA, workflow and helper code have been reviewed for the authorized task. Do not treat dispatch capability as approval to run arbitrary branch code with write permissions. See the [static artifact bootstrap contract](static-artifact.md#isolated-release-upload-bootstrap) for transfer inputs and evidence.

## Unknown paths

GitHub Pages uses the hub's root `404.html`. For registered Vite sites, that page matches a literal allowlist of case prefixes and replaces the unknown path with `/<slug>/404.html`. Paths under the exact `/<slug>/en/` prefix, or legacy URLs with `?lang=en`, instead go to the physical English `/<slug>/en/404.html`. No query data is forwarded. Other unknown paths remain on the hub's generic 404 page. The subsite's 404 page provides its normal navigation and proposal notice; this is an explicit redirect, not a server rewrite or client-side recreation of the original URL.

## Migration and verification

1. Confirm Pages source is GitHub Actions and configure the custom domain and DNS.
2. Run the hub workflow and verify each registered site's routes load their CSS, scripts, photos and icons without 404s; confirm browser interactions and case-specific canonical URLs. Test a deep route reload and the root-404 handoff for Vite sites.
3. Verify root robots.txt references only indexable sites' sitemaps and disallows non-indexable proposal paths. Confirm proposals are absent from homepage cards where `listed: false`. Keep old independent deployments until the new URLs are confirmed.
4. Retire any duplicate showcase-domain binding only after inspecting existing site settings; do not remove unrelated domains. Redirect the legacy Honest hostname at the DNS/HTTP provider or keep the prior deployment until redirect is ready.

## Updates and rollback

Transport is synchronized from its latest passing main push release every 30 minutes; other sources still require a Hub workflow run when an update is ready. For rollback, disable transport synchronization first if transport is affected, then set the affected source ref to a known-good exact SHA or release tag, review and deploy. Use the published manifest and retained resolved-source artifact to identify the exact release. Re-running an old workflow must use its frozen resolved plan, rather than resolving current mutable refs. Re-enable synchronization only after the forward fix is approved.

## Transport showcase

Register `xk2022/xk-corp-truck-transport` under the unique `truck-transport` slug, pinned to a full source SHA with release gate `.github/workflows/deploy-pages.yml` / `Validate Hub build`. The source repository owns the five-page content and inquiry interaction. The hub only supplies build-time `GITHUB_PAGES=true`, `NEXT_PUBLIC_BASE_PATH=/truck-transport` and `NEXT_PUBLIC_SITE_URL=https://showcase.xplorekaleidoscope.com`, then publishes the static export at `/truck-transport/`.

Before merging registration, run the complete hub build and check the exported page paths, root hub link, canonical URLs and `/truck-transport/sitemap.xml`. After deployment, verify the five pages directly and on refresh, both transport images, inquiry preview and the source SHA in `/manifest.json`. Keep the original independent Pages deployment and its domain settings intact.

Transport publication was verified on 2026-11-24 (Asia/Taipei): [PR #7](https://github.com/xk2022/xk-showcase/pull/7) merged as `8fb2df3`, and [main workflow](https://github.com/xk2022/xk-showcase/actions/runs/45410517633) completed successfully (build 2m26s, deploy 12s). The published manifest contains nine registrations and identifies transport source `525908bdf34a84c41582aacf8942b8fdeaf511bb`.

Validation passed: all nine sites built locally, all nine hub tests passed, and the transport suite passed 30 desktop/mobile checks against the complete hub `dist/` at `/truck-transport/`. Live HTTPS checks confirmed the hub card, five pages, their canonical URLs, sitemap, root robots reference and both images. Shared Chrome also confirmed the inquiry preview, return-to-edit preservation and refresh clearing. The original independent site remains available. See the source repository's [full verification record](https://github.com/xk2022/xk-corp-truck-transport/blob/main/docs/SHOWCASE.md).

## Release snapshots and verification

The workflow separates release-input resolution, token-free build/materialization and privileged publication:

1. Resolve each Git-built branch, tag or full SHA once through GitHub's public commit API. Static-artifact entries instead freeze their reviewed URL, SHA-256 and full `sourceSha` without private API reads. The plan is stored as `.release/resolved-sites.json` and retained as the `resolved-sources` Actions artifact for 14 days. A branch may move later without changing sources for that run. A checked-out source SHA must match the plan before npm executes; an archive must match its digest before extraction and never enters source Git/npm execution.
2. For `xk2022/xk-brand-hongjia-birdnest`, require successful GitHub Actions checks named `Verify root static export` and `Verify subpath static export` on the resolved SHA. Yuan-Guang additionally opts into the exact workflow/job/attempt gate described above; its resolved plan and manifest include that evidence. Pending, missing, failed or mismatched checks stop the release. No new CI requirements are imposed on unrelated registrations. When changing Brand CI job names, update this policy in `scripts/release.mjs` in the same release.
3. Build or materialize static snapshots in a separate job with no `GH_TOKEN`/`GITHUB_TOKEN` environment supplied. Checkout actions do not retain credentials, and source npm lifecycle/build environments discard token, secret and credential variables. Static snapshots run no source install/build scripts and need no cross-repository secret. During normal website publication, only the resolver step and deployment guard receive a short-lived workflow token; the optional Release-upload bootstrap is a separate dispatch that skips this pipeline. Deployment permissions remain in the deploy job.
4. Serialize the complete main publication pipeline, including resolution and builds. Do not cancel an active Pages deployment. The guard immediately before deployment checks both current Hub main SHA and whether a newer main publication run was requested; a superseded run fails instead of publishing an old snapshot.
5. After Pages accepts the deployment, verify the full public manifest exactly matches the resolved slug/repository/SHA set. Fetch with `no-cache` headers and a per-attempt query key; retry up to 12 times with 15-second pauses, with a five-second timeout per request. The deployment job has a 15-minute overall limit. A stale CDN manifest cannot count as verified publication.

Public verification also checks registered card visibility, root robots sitemap/disallow entries, every indexable site's sitemap routes and canonical URLs, and local script/image/stylesheet/icon/font resources, including CSS imports. Non-indexable proposal controls remain enforced. Hongjia Brand must publish its homepage plus `brand/`, `gifting/` and `journal/` beneath `/hongjia-brand/`, each with exactly one H1. These are release smoke checks; they do not replace each source's interaction suite.

A post-deploy verification failure means the workflow failed after Pages may already have published. Inspect the workflow error and the public manifest. If necessary, restore a previously saved known-good source SHA, tag or branch through a reviewed registry change and run a new release. Raw SHAs are now supported directly; a recovery no longer needs to invent a new branch. Preserve the release-plan artifact and successful public manifest for reproducible rollback.

For an intentional retry, start a new workflow against the desired current Hub main. Re-running an older run is refused if its Hub commit or request has been superseded. Do not disable HTTPS verification to make smoke checks pass; on a managed computer use the configured trusted proxy CA and Node's supported proxy environment setting where needed.


## Verified transport automation

`deploy.yml` keeps the existing complete-workflow production concurrency queue, frozen SHA resolution, exact source CI gates, deploy freshness checks and public verification. Before Pages artifact upload, `scripts/test-transport.mjs` serves the complete Hub output and checks out the transport SHA recorded in the resolved plan and `dist/manifest.json`. That detached checkout supplies the browser suite and lockfile. Install, browser dependency installation and tests run without Hub API credentials; Chromium, Firefox and WebKit come from the source's Playwright package. Browser reports are uploaded on success or failure, with 14-day retention.

Transport export validation checks every HTML file's local resources. It requires five explicit pages, exact five-route sitemap contents, one nonempty H1 per page, `noindex,nofollow`, case-specific canonical and OG URLs, the 1200×630 social card and the favicon. Public verification independently fetches the five pages, sitemap, card and SVG favicon, including image MIME checks. A successful homepage or partial sitemap cannot hide a broken deep route. The source's browser suite additionally checks interaction and accessibility against the Hub artifact; public verification does not send inquiry data.

`sync-transport.yml` separates metadata inspection, candidate execution and conditional write publication. Its own serialized queue is distinct from the deployment queue: GitHub retains only one pending run per group, so sharing the group could replace the explicitly dispatched publication with a scheduled inspection. The deployment queue and its Hub-main freshness guard remain unchanged. Its read-only inspection selects the newest successful source main **push** run; it then verifies the exact workflow path, source repository, SHA, current run attempt, whole-workflow success and named stable job. It ignores newer documentation-only source HEAD commits, and cannot use a PR/fork run or a partially passing workflow as approval. A newly successful release supersedes an inspected candidate; pending/failed releases are not promoted.

A candidate artifact contains the original registry text/blob, expected Hub main SHA, candidate registry, selected transport SHA and the complete approved resolved plan. The token-free job builds all registered sources from that snapshot, then runs the source suite against the resulting Hub `dist/`. The write job downloads the **original inspection artifact**, not a plan emitted by executed source code. It rechecks current Hub/source metadata, updates `config/showcases.json` using its expected blob SHA, verifies the resulting commit parent and explicitly dispatches `deploy.yml`. It never changes another registration, custom domain, Pages permissions or repository secret.

The schedule is eventual synchronization, not an immediate cross-repository webhook. GitHub can delay scheduled jobs, and inactive repositories may have schedules disabled by GitHub. A manual dispatch uses the same validation and permission boundaries. Protected branches that reject direct GitHub Actions bot commits will fail closed; do not weaken branch rules to make synchronization pass.

Recovery paths:

- Candidate build/test fails: no registry pin or deployment dispatch occurs; inspect the retained browser report and fix source.
- Hub main or registry changed: the stale candidate stops; a later scheduled/manual synchronization uses the new Hub revision.
- Conditional commit succeeded but dispatch failed: rerun that run's publish job. It only resumes its exact own prior commit and never repeats the pin commit.
- An unrelated main change raced with the conditional update: automatic dispatch is withheld, even if the pin was written. Review the commit and dispatch the normal Hub workflow manually.
- Post-deployment public verification fails: the workflow fails visibly; it does not claim the old release was restored. Disable automatic transport synchronization before intentionally rolling back the pinned source.

This implementation is validated with deterministic unit fixtures for no-op synchronization, rejected source CI, source/Hub races, credential removal, conditional updates, dispatch recovery, exact artifact/source matching and export/public metadata failures. Git-built source builds and browser suites must use a publicly readable, approved source SHA. A static snapshot instead uses reviewed public release bytes and a pinned digest, with the preparation task's source evidence recorded separately. Neither mode may fabricate release evidence for an unpublished working tree.

## Shengfengyang proposal

The `shengfengyang` registration is a brand website concept proposal, excluded from the gallery (`listed: false`) and search indexing (`indexable: false`). Its source must build with `NEXT_PUBLIC_BASE_PATH=/shengfengyang`, `SITE_URL=https://showcase.xplorekaleidoscope.com`, and `SHOWCASE_PROPOSAL=1`. That explicit mode removes the source Sitemap; the Hub requires every exported HTML page to retain `noindex,nofollow` and adds a root robots Disallow rule.

The source repository `xk2022/xk-brand-shengfengyang` stays private. Its registration uses the public Hub Release ZIP described in [static-artifact.md](static-artifact.md), with `ref` and `staticArtifact.sourceSha` both pinned to `7d18d00faffb5aa95d9b55e823333353fd54cf70`. `staticArtifact.sha256` is `88ccc628cb520b794c871ba4ecd62b1f58885489a581280b1dc66a4d51b78bdd`; the entry has no `releaseGate`. No visibility change, private API access or cross-repository secret is required.

Source CI `.github/workflows/ci.yml`, including `Static export (subpath)`, passed in [run 45556469301](https://github.com/xk2022/xk-brand-shengfengyang/actions/runs/45556469301), as checked during this authorized preparation task. The source CI evidence is preserved in [preparation PR #12](https://github.com/xk2022/xk-website-showcase/pull/12) and [static-artifact.md](static-artifact.md#archive-contents-and-preparation-evidence). The generated Release manifest/body records only delivery checksum, source SHA, static validation and its Hub publishing run. Hub CI validates the public ZIP bytes against the reviewed digest; it does not claim to requery private CI or cryptographically prove that source-to-build relationship.

The builder downloads the archive, verifies SHA-256, extracts under the bounded safe-ZIP policy, then applies `validateExport` to all 20 routes (five top-level content pages and 15 product details). It checks page-specific canonical URLs, a single nonempty H1, noindex and referenced CSS, JavaScript, images and fonts. Origin-only preconnect and DNS hints are not file references; real links and resources stay under the case path. No Git fetch, npm installation or source build is executed for this artifact.

The proposal must pass the complete 17-registration Hub build, the existing transport browser suite against the combined output, Pages freshness checks and public manifest/route/asset verification. Creating a Release asset or registering its URL does not establish a live deployment; publication results must be recorded after that workflow and its public checks complete. Other 16 registrations retain their existing build and release policies.
