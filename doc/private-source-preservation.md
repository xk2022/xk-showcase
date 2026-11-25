# Preserve the already-published Showcase after sources become private

On 2026-11-25 the Carpentry deployment found that all sixteen existing Git-built source repositories had become private. Hub PR17 first passed its unit tests but source resolution failed with HTTP403 for an existing source. New source credentials, repository-visibility changes, skipping sites and substituting unverified source HEADs are excluded from this delivery.

The recovery keeps each existing public website at its last successfully published runtime revision and adds the approved Carpentry snapshot. It changes the Hub input mode to reviewed static artifacts; it does not change the sixteen source repositories or claim their latest private code has been deployed.

## Fixed prior publication

`config/preserved-publication.json` fixes the entire trust decision:

- Hub successful main push run `45564113822`, attempt1, commit `d7addf5c4f617e531abb2aa74b19c1416f33aa22`.
- Successful deployment/public-verification job `139037693158`.
- Unexpired Pages artifact `14998919879`, 13,863,019 bytes.
- Artifact SHA-256 `dcc8b5f3e6ef8d7e5d86b4ec5c70b24a234f456a2b6e54c561f66b27f0401b2c`.
- Exact seventeen-entry public baseline manifest, and the sixteen allowlisted slug/repository/source tuples being preserved. Shengfengyang keeps its existing reviewed artifact; Carpentry is the new eighteenth entry.

Independent review checked the run, deployment step, artifact identity and original public manifest. Original source release-gate evidence is retained in the preservation manifest as historical evidence, not newly queried private CI.

## Bounded one-time workflow

A reviewed `deploy.yml` revision can be manually dispatched with `preserve_publication=true`. Only `preserve-published-snapshots` runs; static upload and normal resolve/build/deploy jobs are excluded. Its permissions are Hub-local `actions: read` and `contents: write`; it has no Pages/OIDC/source token. It does not execute source code, install dependencies or change registry/main automatically.

The script rechecks fixed run/job/artifact metadata, downloads the archive with a bounded anonymous storage redirect, verifies its digest, then safely reads the single `artifact.tar`. It rejects traversal, duplicates, links, private workspace/source files, source maps and oversized entries. Only the sixteen reviewed case directories are repacked into deterministic ZIP roots. Each original export passes the normal Hub validator before upload.

All sixteen ZIPs and a preservation manifest are uploaded to a draft Release `preserved-showcase-45564113822-v1` before it is published. Different, incomplete or draft existing Releases are never overwritten. The final registry change must be reviewed against the public ZIP digests; normal full Hub validation must pass before main merge/deployment. Outputs and archive bytes are not committed to Git.

## Transport and interactive preview evidence

The exact Rotaract synthetic preview can use its preserved artifact only for its existing source SHA `fd8374eca0d840d64790552a6562e05c1a8bc76b` and fixed preservation Release URL. The original repository, demo flag, noindex setting and pinned source checks remain required for Git-built inputs. Other interactive sources are still rejected.

Transport's source `3506dbd7b66233168523e40d6ca387f8a961f237` was already tested in the pinned successful baseline. Its static path verifies the public ZIP digest and all five exported routes, then compares every runtime byte with the assembled output (only the regenerated gallery screenshot is excluded). Fresh Hub-owned Chromium checks cover five rendered routes at 375/1440px, images, resources, links, canonical metadata and runtime errors. Reports explicitly distinguish that new smoke from the historical exact-source suite, marked `REUSED_NOT_RERUN`. No private test source is fetched or exposed.

Automatic transport source synchronization becomes an explicit read-only no-op for reviewed static input; malformed or forged candidates still fail and cannot publish. Future private-source updates require a newly reviewed static snapshot. Git-built source CI gates and synchronization behavior remain available for public source registrations.

## Delivery evidence

The integration PR records the actual preservation run, verified public Release assets, complete eighteen-entry build, fresh transport smoke, main Pages run and public verification separately. Publishing snapshots alone is not proof that the new combined website is live. The original failed source-resolution run is retained in PR history; checks are not relabeled as successful.
