# Deployment

The hub builds registered public XK source repositories from their configured branches or tags, copies static exports into isolated subdirectories, generates an index, and publishes one artifact on GitHub Pages. Each artifact records source SHAs. Failed builds must not publish. Company rules remain in [xplore-kaleidoscope](https://github.com/xk2022/xplore-kaleidoscope); this document describes the hub's implementation.

## Export registration

Existing registrations default to Next.js validation: `/<slug>/_next/static/` assets, a case-specific canonical URL, valid local resources and `out/sitemap.xml`.

Vite registrations set `framework: "vite"`. They must provide actual `/<slug>/assets/` module JavaScript and stylesheet files, `out/index.html`, and `out/404.html`. The hub checks every exported HTML file's local resource references, including directory links and nested routes. Resources must stay within the case path and exist in the export. It rejects cross-case paths, traversal and protocol-relative resources.

Proposal controls are explicit per registration:

| Field | Default | Effect |
| --- | --- | --- |
| `framework` | `next` | Use `vite` for real Vite static assets; no fake `_next` directory is needed. |
| `indexable` | `true` | `false` requires `noindex,nofollow` in every HTML file, rejects `sitemap.xml`, adds a root robots Disallow rule, and omits its sitemap reference. |
| `listed` | `true` | `false` excludes the site from homepage showcase cards. |

`yuan-guang-pcb` uses `BASE_PATH=/yuan-guang-pcb/`, `framework: "vite"`, `indexable: false`, and `listed: false`. It is a corporate-website concept proposal, not the company's official website or a formally commissioned client case. Preserve its visible proposal notice and fictional-only, non-submitting form.

These controls do **not** restrict access. An unlisted URL, robots directives, a private source repository or lack of a sitemap cannot replace authentication. A proposal that requires restricted access must use a suitable authenticated hosting arrangement.

## Unknown paths

GitHub Pages uses the hub's root `404.html`. For registered Vite sites, that page matches a literal allowlist of case prefixes and replaces the unknown path with the corresponding `/<slug>/404.html`. It preserves only `?lang=en`, not other query data. Other unknown paths remain on the hub's generic 404 page. The subsite's 404 page provides its normal navigation and proposal notice; this is an explicit redirect, not a server rewrite or client-side recreation of the original URL.

## Migration and verification

1. Confirm Pages source is GitHub Actions and configure the custom domain and DNS.
2. Run the hub workflow and verify each registered site's routes load their CSS, scripts, photos and icons without 404s; confirm browser interactions and case-specific canonical URLs. Test a deep route reload and the root-404 handoff for Vite sites.
3. Verify root robots.txt references only indexable sites' sitemaps and disallows non-indexable proposal paths. Confirm proposals are absent from homepage cards where `listed: false`. Keep old independent deployments until the new URLs are confirmed.
4. Retire any duplicate showcase-domain binding only after inspecting existing site settings; do not remove unrelated domains. Redirect the legacy Honest hostname at the DNS/HTTP provider or keep the prior deployment until redirect is ready.

## Updates and rollback

Run the hub workflow whenever a source update is ready. For rollback, set the affected source's ref to a known-good release tag, review and deploy. Use the published manifest to identify the source commit to tag. A later phase can add authenticated cross-repository triggers.

## Transport showcase

Register `xk2022/xk-corp-truck-transport` under the unique `truck-transport` slug. The source repository owns the five-page content and inquiry interaction. The hub only supplies build-time `GITHUB_PAGES=true`, `NEXT_PUBLIC_BASE_PATH=/truck-transport` and `NEXT_PUBLIC_SITE_URL=https://showcase.xplorekaleidoscope.com`, then publishes the static export at `/truck-transport/`.

Before merging registration, run the complete hub build and check the exported page paths, root hub link, canonical URLs and `/truck-transport/sitemap.xml`. After deployment, verify the five pages directly and on refresh, both transport images, inquiry preview and the source SHA in `/manifest.json`. Keep the original independent Pages deployment and its domain settings intact.

Transport publication was verified on 2026-11-24 (Asia/Taipei): [PR #7](https://github.com/xk2022/xk-showcase/pull/7) merged as `8fb2df3`, and [main workflow](https://github.com/xk2022/xk-showcase/actions/runs/45410517633) completed successfully (build 2m26s, deploy 12s). The published manifest contains nine registrations and identifies transport source `525908bdf34a84c41582aacf8942b8fdeaf511bb`.

Validation passed: all nine sites built locally, all nine hub tests passed, and the transport suite passed 30 desktop/mobile checks against the complete hub `dist/` at `/truck-transport/`. Live HTTPS checks confirmed the hub card, five pages, their canonical URLs, sitemap, root robots reference and both images. Shared Chrome also confirmed the inquiry preview, return-to-edit preservation and refresh clearing. The original independent site remains available. See the source repository's [full verification record](https://github.com/xk2022/xk-corp-truck-transport/blob/main/docs/SHOWCASE.md).

## Release snapshots and verification

The workflow separates public source resolution, source building and privileged publication:

1. Resolve each configured branch, tag or full SHA once through GitHub's public commit API. The plan is stored as `.release/resolved-sites.json` and retained as the `resolved-sources` Actions artifact for 14 days. A branch may move later without changing the sources for that run. A checked-out source SHA must match the plan before any npm command executes.
2. For `xk2022/xk-brand-hongjia-birdnest`, require successful GitHub Actions checks named `Verify root static export` and `Verify subpath static export` on the resolved SHA. Pending, missing, failed or mismatched checks stop the release. No new CI requirements are imposed on unrelated registrations. When changing Brand CI job names, update this policy in `scripts/release.mjs` in the same release.
3. Build in a separate job with no `GH_TOKEN`/`GITHUB_TOKEN` environment supplied. Checkout actions do not retain credentials, and source npm lifecycle/build environments discard token, secret and credential variables. Only the resolver step and deployment guard receive a short-lived workflow token. Deployment permissions remain in the deploy job.
4. Serialize the complete main publication pipeline, including resolution and builds. Do not cancel an active Pages deployment. The guard immediately before deployment checks both current Hub main SHA and whether a newer main publication run was requested; a superseded run fails instead of publishing an old snapshot.
5. After Pages accepts the deployment, verify the full public manifest exactly matches the resolved slug/repository/SHA set. Fetch with `no-cache` headers and a per-attempt query key; retry up to 12 times with 15-second pauses, with a five-second timeout per request. The deployment job has a 15-minute overall limit. A stale CDN manifest cannot count as verified publication.

Public verification also checks registered card visibility, root robots sitemap/disallow entries, every indexable site's sitemap routes and canonical URLs, and local script/image/stylesheet/icon/font resources, including CSS imports. Non-indexable proposal controls remain enforced. Hongjia Brand must publish its homepage plus `brand/`, `gifting/` and `journal/` beneath `/hongjia-brand/`, each with exactly one H1. These are release smoke checks; they do not replace each source's interaction suite.

A post-deploy verification failure means the workflow failed after Pages may already have published. Inspect the workflow error and the public manifest. If necessary, restore a previously saved known-good source SHA, tag or branch through a reviewed registry change and run a new release. Raw SHAs are now supported directly; a recovery no longer needs to invent a new branch. Preserve the release-plan artifact and successful public manifest for reproducible rollback.

For an intentional retry, start a new workflow against the desired current Hub main. Re-running an older run is refused if its Hub commit or request has been superseded. Do not disable HTTPS verification to make smoke checks pass; on a managed computer use the configured trusted proxy CA and Node's supported proxy environment setting where needed.
