# Reviewed static artifact inputs

A trusted XK project can keep its source repository private while publishing its approved browser-facing export through the public Showcase Hub. The Hub consumes a reviewed ZIP from a Hub Release asset, verifies a pinned SHA-256, safely extracts it, and applies the same export and publication checks used for source-built sites. It does not fetch the private repository, inspect private Actions metadata, or execute the archive as a source project.

This is a separate input mode, not a change to the existing public-source release gates or permission model. A website deployment request does not authorize changing its source repository's visibility.

## Registration contract

A registration selects exactly one input path: source build, optionally with `releaseGate`, or `staticArtifact`. A static-artifact entry keeps `repository` as the real source repository name for provenance; that field does not grant or require Hub access to its source.

```json
{
  "slug": "shengfengyang",
  "name": "昇豐陽食品｜品牌官網提案",
  "category": "品牌形象概念提案",
  "repository": "xk2022/xk-brand-shengfengyang",
  "ref": "7d18d00faffb5aa95d9b55e823333353fd54cf70",
  "staticArtifact": {
    "url": "https://github.com/xk2022/xk-website-showcase/releases/download/shengfengyang-7d18d00-v1/shengfengyang-static.zip",
    "sha256": "88ccc628cb520b794c871ba4ecd62b1f58885489a581280b1dc66a4d51b78bdd",
    "sourceSha": "7d18d00faffb5aa95d9b55e823333353fd54cf70"
  },
  "indexable": false,
  "listed": false,
  "env": {
    "NEXT_PUBLIC_BASE_PATH": "/shengfengyang",
    "SITE_URL": "https://showcase.xplorekaleidoscope.com",
    "SHOWCASE_PROPOSAL": "1"
  }
}
```

- `staticArtifact` contains exactly `url`, `sha256`, and `sourceSha`.
- `sourceSha` is a full 40-character lowercase source commit SHA; `ref` must equal it. Branch names and tags are not accepted for this input mode.
- `sha256` pins the downloaded ZIP bytes, rather than the extracted directory or a release tag.
- The initial URL must be an HTTPS `.zip` asset under `github.com/xk2022/xk-website-showcase/releases/download/<tag>/<asset>.zip`, without credentials, port, query or fragment. It cannot point to arbitrary storage or another repository.
- `staticArtifact` and `releaseGate` cannot coexist. Git-built entries retain their existing gates, including exact workflow, job, run attempt and SHA checks.
- `env` describes the settings used when preparing the static export; the Hub does not rebuild the archive or run these settings through source npm scripts.

The resolver copies this reviewed identity into the frozen resolved plan and sets the resolved source SHA to `sourceSha`. It makes no commit or CI requests to the private source API. The builder checks that the plan still matches the reviewed registration before consuming it. The published manifest records the source SHA and the static-artifact identity.

The URL and hash above are the first approved Shengfengyang snapshot, retained here as a schema/history example. The current registry includes the later [arrow update](shengfengyang-arrow-publication.md); always use its reviewed current tuple for publication. It is included in the eighteen-entry publication verified by [Pages run45569747028](https://github.com/xk2022/xk-website-showcase/actions/runs/45569747028). The other sixteen former Git inputs now use the existing [preservation Release](private-source-preservation.md); Carpentry retains its separately reviewed export. This does not make an unverified later registry/listing change live.

## Archive contents and preparation evidence

The ZIP root contains the deployable contents of `out/`, including `index.html`, deep-route directory indexes, 404 pages and public runtime assets. It must not add an enclosing `out/` directory. Browser JavaScript, CSS, images, fonts and Next.js RSC `.txt` payloads are intentionally public website output.

The preparation task must inspect the archive and exclude source files, `.git`, `.env` files, source maps, `.next/server`, server bundles, dependency directories and other non-export workspace data. The generated ZIP and extracted build outputs are not committed to Git. Publish the ZIP as a public Hub Release asset; this makes the website output public while leaving the original source repository private.

For Shengfengyang, the authorized preparation task checked successful source CI [run 45556469301](https://github.com/xk2022/xk-brand-shengfengyang/actions/runs/45556469301) for source `7d18d00faffb5aa95d9b55e823333353fd54cf70`, including the subpath static-export job. That exact source SHA was checked against the successful source run by the agent during the authorized preparation task; this is preparation-time evidence, not a Hub job querying private CI. [Preparation PR #12](https://github.com/xk2022/xk-website-showcase/pull/12) and this document retain the source CI link and source-to-export preparation record. The generated `release-manifest.json` and Release body record only the source SHA, ZIP checksum, compiled-static validation and Hub publishing workflow identity; they do not contain or assert a newly verified private-CI result.

The runtime trust boundary is the reviewed public Hub registration plus the approved Release bytes and digest. SHA-256 proves that the downloaded bytes match the reviewed ZIP; it does not independently prove that those bytes were built from the stated source commit or that private CI passed. That source-to-export relationship is part of the preparation review and recorded evidence. A later edit to a Release asset cannot silently change the accepted ZIP: different bytes fail the pinned hash.

## Download and extraction policy

`scripts/static-artifact.mjs` uses HTTPS downloads and Python 3's standard-library `zipfile` implementation for bounded extraction. No archive-supplied Git/npm commands, lifecycle hooks or executables are run.

| Check | Limit or required behavior |
| --- | --- |
| Download size | At most 30 MiB, checked using Content-Length when present and actual streamed bytes |
| Request duration | 30-second timeout per request |
| Redirects | At most three; only the fixed Hub release path or allowed GitHub release-asset hosts |
| Integrity | SHA-256 must match before extraction |
| Archive entries | Nonempty, at most 10,000 files/directories |
| Expanded content | At most 200 MiB in total |
| Individual file | At most 50 MiB |
| Extraction duration | 60-second Python subprocess timeout |
| Entry types | Regular files and directories only; no symlinks, devices or other nonregular entries |
| Paths | No absolute paths, traversal, empty segments, backslashes, NUL, percent escapes or colon paths |
| Uniqueness | Reject duplicate normalized paths and file/directory conflicts |
| Encoding and compression | Reject encrypted entries; accept stored or deflated ZIP entries only |
| Actual output sizes | Enforce streamed extraction limits and compare actual sizes with ZIP metadata |

Only `release-assets.githubusercontent.com` and `objects.githubusercontent.com` are allowed as non-GitHub redirect hosts. The downloader does not add authorization headers for private source access.

Extraction occurs in a fresh staging directory with non-executable file permissions. It does not overwrite an existing target. Temporary archives and failed staging output are removed; the materialized directory is passed to the normal static-export validator before it can enter the final Hub output. An integrity, ZIP or export failure stops the release rather than skipping this site.

## Isolated Release-upload bootstrap

When the local Release-upload endpoint cannot accept the current session's upload credentials, the Hub can perform the upload with its own short-lived repository token. For this snapshot, the managed `uploads.github.com` path returned HTTP 401. The approved website ZIP was therefore staged through `api.github.com` as Hub Git blob `b80aed468e5270ee6061e90790bd92ea8ca9715c` for transfer only.

That blob has not been added to a tree, commit or ref. It is not a tracked build-output file and can eventually be garbage-collected; it is not the durable website artifact. The versioned Release asset is the stable stored input, and later website builds do not depend on the transfer blob. Only reviewed, already approved public website output belongs in this transfer mechanism, never private source code or credentials.

The existing `deploy.yml` provides these optional `workflow_dispatch` inputs:

| Dispatch input | Helper environment | Meaning for this snapshot |
| --- | --- | --- |
| `static_artifact_blob` | `INPUT_BLOB_SHA` | `b80aed468e5270ee6061e90790bd92ea8ca9715c`, the temporary Hub Git blob identity |
| `static_artifact_sha256` | `INPUT_SHA256` | `88ccc628cb520b794c871ba4ecd62b1f58885489a581280b1dc66a4d51b78bdd`, the expected ZIP-byte digest |
| `static_artifact_source` | `INPUT_SOURCE_SHA` | `7d18d00faffb5aa95d9b55e823333353fd54cf70`, the source provenance pin |

The Git blob SHA is a transfer-object identity, not the archive SHA-256 and not the source commit. Supply all three reviewed values together. A nonempty `static_artifact_blob` selects only the `publish-static-artifact` job; the normal `resolve`, `build` and `deploy` pipeline is skipped in that run.

The bootstrap job checks out the reviewed Hub branch without persisted Git credentials and runs `node scripts/publish-static-artifact.mjs`. It passes only the Hub run's short-lived `GITHUB_TOKEN` as `GH_TOKEN` for Hub-local Git/Release API operations, with job-level `contents: write`. No private-source token or new secret is stored in the Hub. The helper verifies the ZIP hash, uses the safe extraction policy and `validateExport` to check all 20 proposal routes, then uploads the versioned ZIP and release manifest. It does not execute the website's JavaScript, npm lifecycle hooks or source build scripts.

The helper also validates the GitHub-provided `GITHUB_REPOSITORY` against the fixed Hub repository, plus `GITHUB_SHA` and `GITHUB_RUN_ID`. Its JSON result contains `tag`, `url`, `sha256`, `sourceSha` and `reused`. The tag is `shengfengyang-<sourceSha first seven characters>-v1`; assets are `shengfengyang-static.zip` and `release-manifest.json`. The generated manifest records `schemaVersion`, `sourceRepository`, `sourceSha`, `sha256`, `staticOnly`, `publication` (Hub repository, commit, workflow and run identity), and a statement that the job validates compiled output without querying private CI.

Both assets are uploaded to a draft release before the release is made public. The helper never overwrites an existing asset: an existing public release can be reused only when its source SHA, digest and expected assets match, and its public ZIP passes integrity and export validation again. A mismatched release, incomplete public release or duplicate asset fails closed for inspection. Existing selectors retain their draft rejection; the narrowly scoped [Rotaract recovery](#rotaract-publisher-and-upload-recovery) below can complete only a matching helper-generated draft after verifying every existing asset.

A dispatch may target the feature branch because this workflow file already exists on Hub main, but only after the authorized task has reviewed that branch's exact SHA, workflow permissions and helper implementation. The branch checkout determines the code holding the short-lived write token; never dispatch arbitrary unreviewed branch code. The bootstrap retains the existing serialized publication queue and does not receive Pages/OIDC permissions.

After upload, independently check that the public Release URL downloads the expected SHA-256 and that its manifest/Release body matches the delivery checksum, source SHA and publishing run. Keep preparation-time source CI evidence in the applicable reviewed preparation record; it is not a newly generated private-CI result. This bootstrap does not query private CI. Then run the normal workflow with the bootstrap inputs empty. It must resolve all eighteen current registrations, validate/materialize the complete Hub, run transport validation appropriate to its input mode, enforce the freshness guard, deploy through the isolated Pages job, and verify the public manifest, routes and assets. Yuan-Guang already has a preserved archive and needs no new upload dispatch for its listing.

A successful upload is not a live website result. Record bootstrap upload evidence separately from the subsequent Pages workflow and live verification. If validation or upload fails, retain the source pin and digest, inspect the failure and retry only the reviewed bootstrap; do not add a long-lived source token or weaken the normal deployment guard.

## Validation and publication

Artifact mode changes input acquisition only. For Shengfengyang, `validateExport` checks the same 20 required routes: five top-level content pages and 15 product details. Each retains the `/shengfengyang/` path, a page-specific canonical URL, one nonempty H1, `noindex,nofollow`, and valid local CSS, JavaScript, image and font resources. The proposal has no Sitemap, is absent from homepage cards, and receives the root robots Disallow entry. These flags are indexing and gallery controls, not authentication.

The complete release includes eighteen registrations, currently all reviewed static inputs. Sixteen preserve their exact prior public output and original source-gate evidence as history; they do not claim that newer private commits or private CI were checked. Git-built public-source gates remain supported for that separate mode. Current transport validation checks preserved ZIP/runtime-byte identity and runs fresh Hub-owned Chromium smoke against the combined output; the historical exact-source suite is marked `REUSED_NOT_RERUN`. Transport synchronization is a read-only no-op in artifact mode. Pages/OIDC permissions remain isolated, and freshness, serialization and public verification remain required.

For local validation after installing the documented dependencies:

```sh
node --test --test-isolation=none tests/*.test.mjs
node scripts/resolve-sources.mjs .release/resolved-sites.json
# Build and source browser processes receive no GitHub API tokens.
env -u GITHUB_TOKEN -u GH_TOKEN node scripts/build-showcases.mjs .release/resolved-sites.json
env -u GITHUB_TOKEN -u GH_TOKEN node scripts/test-transport.mjs .release/resolved-sites.json --install-browsers
```

Only after that exact plan has been deployed:

```sh
node scripts/verify-publication.mjs .release/resolved-sites.json
```

Do not label a candidate live based solely on a local build, a ZIP upload or a successful source CI run. Record the actual Hub commit, deployment workflow, published manifest and public verification results. A failure after Pages accepts an artifact is reported as a failed verification; it does not automatically restore the previous deployment.

## Updates and recovery

### Rotaract publisher and upload recovery

The fixed `rotaract` selector maps only to private source `xk2022/xk-app-rotaract`, `/rotaract/`, `rotaract-<sourceSha first seven characters>-v1` and `rotaract-static.zip` on this public Hub. It requires the synthetic interactive export, local Vite assets, exact canonical URL, noindex without a sitemap and `connect-src 'none'`. It uses the existing bounded extraction and Hub-local job; no repository/slug/asset override, private-source API read, source execution, extra secret or permission is added. Both Release creation and publication explicitly set the GitHub API `make_latest` field to `"false"`; other project publication behavior is unchanged.

During RK-DEMO-02 preparation, the direct managed `uploads.github.com` upload returned HTTP 401 for the manifest asset. Subsequent reads of the attempted Release tag and ID returned 404; this does not establish a published artifact. The approved 127,433-byte ZIP was instead staged as Hub Git blob `a09ec7d633e50e2853034e123686a2b656b52187`, without a tree, commit or ref. Its ZIP SHA-256 is `57a8600d3f242ef70ec16612c5e1294982022c7ca29e70f7cf40bdd6f636f441`, and source SHA is `57be84dc1858db3146918afa53eff388782c7133`. Preparation-time source CI is recorded in [Rotaract publication](rotaract-publication.md), separately from this compiled-output publisher's evidence.

After the exact fallback branch code and permissions are reviewed and pushed, the isolated dispatch uses only these bounded inputs:

```sh
gh workflow run deploy.yml --repo xk2022/xk-website-showcase \
  --ref feat/RK-DEMO-02-rotaract-showcase \
  -f static_artifact_project=rotaract \
  -f static_artifact_blob=a09ec7d633e50e2853034e123686a2b656b52187 \
  -f static_artifact_sha256=57a8600d3f242ef70ec16612c5e1294982022c7ca29e70f7cf40bdd6f636f441 \
  -f static_artifact_source=57be84dc1858db3146918afa53eff388782c7133
```

This selects only `publish-static-artifact`, with normal resolve/build/Pages jobs skipped. The expected URL is `https://github.com/xk2022/xk-website-showcase/releases/download/rotaract-57be84d-v1/rotaract-static.zip`. Independently redownload it and compare the actual ZIP hash and generated manifest before promoting the registry. Source CI, bootstrap success and the subsequent complete Pages run remain distinct evidence. Do not claim the command above has run until its actual workflow result is recorded.

If a prior helper upload stopped after draft creation, only Rotaract can resume it. Because GitHub's by-tag endpoint can omit drafts, a 404 triggers a Hub-only Release inventory with at most three pages of 100 entries. The inventory must be complete, have at most one exact-tag candidate, and refresh that candidate by its numeric ID; ambiguity, pagination exhaustion and changed identity stop before writes. Its tag, source repository/SHA, ZIP digest, canonical helper-generated manifest, fixed publication workflow/repository and target commit must all match. Every already uploaded asset must have the expected name, a unique identity, `uploaded` state, exact size and GitHub-generated SHA-256 digest matching the reviewed ZIP or original manifest bytes. The helper validates the entire existing asset list before any write, then uploads only missing assets and publishes without changing Latest. The original manifest retains its first preparation-run identity; the successful retry returns `resumed: true` and its run is recorded separately.

Unknown/direct-upload draft bodies, missing digests, unexpected or duplicate assets, changed bytes and mismatched provenance fail closed before writes. The helper never deletes or replaces an asset, and it does not convert an unknown draft. Inspect such a draft through authorized repository access before choosing a separately reviewed recovery. Other projects retain their existing draft rejection.

### Rui Café publisher selection

The reviewed `rui-cafe` selector maps only to `xk2022/xk-brand-rui-cafe`, `/rui-cafe/`, and `rui-cafe-static.zip`. It uses the existing Hub-local isolated publisher, bounded extraction, digest pinning and draft-asset publication. It adds no arbitrary destination, secret or private-source API access. The proposal is listed with an unofficial label and remains non-indexable without a sitemap. Validation requires seven physical pages with individual canonical URLs and one nonempty H1, followed by independent public checks for the same seven routes. See [Rui Café publication evidence](rui-cafe-publication.md).

For a new private-source website snapshot:

1. Check the intended source commit and its required source quality checks using the authorized source access available to the preparation task.
2. Build the approved export with its final base path, origin and proposal settings; inspect the output boundary and run its source checks.
3. Create a new ZIP containing only the export contents. Record source CI evidence and preparation details in the reviewed preparation PR/document. The generated Release manifest/body records the ZIP checksum, source SHA, compiled-static validation and publishing workflow identity, without claiming a private-CI check.
4. Upload the ZIP as a new versioned Hub Release asset, directly or through the reviewed isolated bootstrap above. Then review a registry change updating `ref` and all `staticArtifact` fields together. Do not add private-source tokens or change repository visibility.
5. Run the complete Hub checks and normal guarded deployment, then verify the public site against that resolved plan.

Retain the approved asset bytes and digest for reproducibility. If a Release asset is missing or its bytes differ, the build fails; do not bypass integrity verification. For rollback, restore a reviewed URL/digest/source-SHA tuple and run a new complete release. Artifact-mode transport synchronization is already a read-only no-op; disable synchronization first only for an intentional Git-built transport rollback. Do not reuse an archive with different source provenance or fabricate private CI evidence to make a release pass.

## Esan publisher selection

The fixed `esan-interior` selector is also available for `xk2022/xk-lp-esan-interior`, `/esan-interior/` and `esan-interior-static.zip`. It retains the current Next.js canonical, local-resource and sitemap contract, with the source's preview noindex markup. It does not alter registration indexing/listing flags or add private-source access. See [Esan preparation](esan-interior-publication.md) for the exact source CI, export digest and replacement/rollback identities.

## Carpentry publisher selection

The isolated upload workflow also supports the reviewed `carpentry` project via `static_artifact_project=carpentry` (`INPUT_PROJECT=carpentry`). The default remains `shengfengyang` for existing dispatches. The selector maps to fixed repository/slug/asset identities; it does not accept arbitrary source or destination values. Carpentry retains its indexable `/carpentry/` export and sitemap, while Shengfengyang retains its non-indexable, unlisted 20-route policy. Both use the same bounded extraction, integrity, draft publication, no-overwrite and isolated-permission checks. See [Carpentry preparation](carpentry-publication.md) for the exact approved bytes, source CI evidence and dispatch inputs.
