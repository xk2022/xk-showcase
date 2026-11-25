# Carpentry static snapshot publication

The owner authorized merging the Carpentry source PR, publishing its website output through `xk2022/xk-website-showcase`, and updating the source README on 2026-11-25. The source repository remains private; only reviewed browser-facing static output is published.

## Approved source and export

- Source repository: `xk2022/xk-lp-carpentry`.
- Source PR: https://github.com/xk2022/xk-lp-carpentry/pull/1 (merged).
- Exact merged source: `91ade724579ed659287a27f8d77e5e1e0ed0292e`.
- Successful source main CI: https://github.com/xk2022/xk-lp-carpentry/actions/runs/45566603604, including lint, typecheck, build, export and browser checks.
- Build settings: `NEXT_PUBLIC_BASE_PATH=/carpentry`, `NEXT_PUBLIC_SITE_URL=https://showcase.xplorekaleidoscope.com`.
- Preparation: clean checkout of that merged source, locked installed dependencies, local production rebuild, source `verify:export`, and actual Hub `validateExport` all passed. Downloading the source Actions artifact was unavailable, so these bytes are explicitly a local rebuild, not claimed identical to the CI artifact.
- ZIP: `carpentry-static.zip`, 1,112,323 bytes, 38 files at the ZIP root, containing only deployable `out/` contents.
- ZIP SHA-256: `9ba114fced8fa350340fc47446d1fbdd40fd1e53f3a75b36ca0b9aa05c6250b1`.

The preparation inspected every archive entry: no source TS/TSX, source maps, `.git`, `.env`, `.next/server`, node_modules, symlinks or non-export workspace files. The eight space/detail photos are AI-generated illustrations; they do not establish real construction work. LINE remains unconfirmed and disabled. The local-only inquiry summary has no receiving endpoint or storage.

## Isolated upload

Direct upload to `uploads.github.com` returned HTTP 401. The empty draft created by that attempt was inspected and removed without overwriting assets. The reviewed ZIP was staged as unreferenced Hub Git blob `c2f09e602c51d2c6abc6c7ecaf5e2355e09d83a8`; it was not added to a tree, commit or ref.

The existing isolated publisher now has a fixed two-project selector. `static_artifact_project=carpentry` selects the reviewed Carpentry source repository, slug and asset name. The default remains Shengfengyang. Unknown selectors fail before network access; callers cannot provide arbitrary repositories or paths. The job retains only Hub-local `contents: write`, validates Git blob identity, SHA-256, bounded extraction and static export, uploads draft assets, then publishes. It receives no private source token, runs no source build/lifecycle scripts, never overwrites existing assets and does not claim to query private CI.

Dispatch the reviewed feature/main revision with these inputs:

```text
static_artifact_project=carpentry
static_artifact_blob=c2f09e602c51d2c6abc6c7ecaf5e2355e09d83a8
static_artifact_sha256=9ba114fced8fa350340fc47446d1fbdd40fd1e53f3a75b36ca0b9aa05c6250b1
static_artifact_source=91ade724579ed659287a27f8d77e5e1e0ed0292e
```

Expected immutable public input:

```text
https://github.com/xk2022/xk-website-showcase/releases/download/carpentry-91ade72-v1/carpentry-static.zip
```

After successful upload, download anonymously and compare the digest and Release manifest. A successful upload does not establish live Pages publication.

## Registry and guarded publication

The Carpentry registration pins `ref` and `staticArtifact.sourceSha` to the exact source above, along with the public URL and digest. It uses the default listed/indexable policy, a sitemap, and canonical `/carpentry/` URLs. This is a self-initiated demonstration, not a client-delivery claim.

Before merge run the complete Hub test/build workflow for all 18 registrations, including the exact transport source browser suite. Normal main deployment keeps source-resolution gates, credential-free builds, the freshness guard, isolated Pages/OIDC permissions, and public manifest/routes/assets verification. Upload, PR CI, main build, Pages deployment and actual live verification are separate evidence stages and must be reported separately in the PR.

Subsequent source README-only commits do not relabel this static ZIP as a different source revision. A new runtime snapshot needs a new exact source pin, ZIP digest and reviewed release.
