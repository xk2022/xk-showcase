# Esan reviewed static release

Preparation date: 2026-11-27. Scope: replace only the `esan-interior` compiled snapshot with an export from the reorganized private source. Other registrations, source visibility, gallery policy, domain ownership and deployment permissions remain unchanged.

## Source and export evidence

- Private source: `xk2022/xk-lp-esan-interior`.
- Source main: `1793516c765aebdf0430f9944e0d739b262866a6`, merged by [source PR #5](https://github.com/xk2022/xk-lp-esan-interior/pull/5).
- Source quality: [run 45976258073](https://github.com/xk2022/xk-lp-esan-interior/actions/runs/45976258073), attempt 1, completed successfully for that exact SHA. Both root and Showcase export jobs passed. This was checked during preparation through authorized source access; the Hub publisher does not query private CI.
- Node.js 24.22.3 / npm 11.19.1 / Next.js 16.4.6. The source working tree was clean. Build commands ran in `frontend/` with `GITHUB_PAGES=true`, `NEXT_PUBLIC_SHOWCASE=1`, `NEXT_PUBLIC_BASE_PATH=/esan-interior`, and `SITE_URL=https://showcase.xplorekaleidoscope.com/esan-interior/`.
- `npm run build` and `npm run check:export` passed. The source's existing locked dependencies were verified before rebuilding. The managed sandbox's child-process stdout issue was resolved by running the same build with the approved execution permission, without code/configuration changes.

The archive contains only the contents of `frontend/out/`: 38 regular files, 1,157,313 expanded bytes. ZIP integrity, paths, symlinks and the source/map/env/Git/dependency/server-output boundary were reviewed. There is no enclosing frontend/out directory. The root HTML has one H1, `zh-Hant`, noindex/nofollow, the case canonical URL, three native disclosures and two identical official consultation links. Local assets, sitemap and the 1200×630 OG PNG passed the source checks and the Hub extraction/export validator.

This release changes source provenance/build output after project organization; it does not add authorized photos, change consultation destinations or assert a formal client relationship.

## Reviewed delivery tuple

| Field | Value |
| --- | --- |
| Source/ref | `1793516c765aebdf0430f9944e0d739b262866a6` |
| Tag | `esan-interior-1793516-v1` |
| Asset | `esan-interior-static.zip` |
| ZIP bytes | `363523` |
| ZIP SHA-256 | `f9e02c95ba80e49524c8a9d9f560f2a8258c3e9bebeb77e365643174c2565804` |
| Versioned destination | `https://github.com/xk2022/xk-website-showcase/releases/download/esan-interior-1793516-v1/esan-interior-static.zip` |
| Temporary transfer blob | `fa154ea1559fad69792dc0a549d607998a745c37` |

The transfer blob contains only the reviewed public export. It is not added to a tree/commit/ref and is not the durable website input. The Release asset and its pinned digest are the durable identity after upload and independent redownload verification.

The first isolated request [45977950985](https://github.com/xk2022/xk-website-showcase/actions/runs/45977950985) was cancelled in the shared pending queue before any job ran. After the existing publication completed, the reviewed publisher branch included Hub main updates without changing their registrations. Bootstrap [45978468492](https://github.com/xk2022/xk-website-showcase/actions/runs/45978468492) succeeded at exact Hub commit `9f3cb10598a9d42f09b99f2fc6927fe8e1a469b6`; normal website resolve/build/deploy jobs were skipped.

An independent public redownload of both assets confirmed the exact 363,523-byte ZIP and SHA-256 above. The generated manifest matches the source repository/SHA, digest and bootstrap run/commit, with `staticOnly: true`. Registry promotion replaces only this case's `ref` and complete `staticArtifact` tuple; it does not change the other 21 registrations.

Local candidate checks passed before review: the complete Hub test suite (without API tokens), resolution and complete 22-site build, preserved transport byte-identity/fresh smoke checks, and Chengce Chromium checks at 375/768/1024/1440 px. The complete output manifest identifies Esan source `1793516c765aebdf0430f9944e0d739b262866a6` with the reviewed digest. The transport source suite is historical reuse, not a newly executed private-source suite. The managed environment used Node's existing proxy support and system Chromium for the Hub-owned checks.

## Isolated publisher and promotion

The fixed `esan-interior` selector maps only to `xk2022/xk-lp-esan-interior`, `/esan-interior/`, `esan-interior-static.zip` and the versioned tag above. It retains the existing Next.js canonical/resource/sitemap contract and existing preview noindex markup. This is not a change to registry indexing/listing policy. No arbitrary repository, slug or asset override, private-source credential or new permission is accepted.

The bootstrap uses the existing Hub-only `contents: write` job after the exact branch's helper/workflow code is reviewed and tested. Website resolve/build/Pages jobs are skipped during that dispatch. Its manifest records compiled-output validation, source SHA, digest and publishing run; it does not claim a fresh private CI check.

After upload, verify the public ZIP bytes and release manifest independently. Then promote `ref` and all `staticArtifact` fields together for only this registration. The complete Hub tests/build, transport and Chengce checks, guarded main deployment and public manifest/route/asset verification remain mandatory. An upload or source CI success alone is not a live-publication claim. Final run and public verification evidence must be recorded separately from preparation.

Rollback preserves the original reviewed tuple: source `4bcae5151fac6d1c9442c1475cbed53f9c768116`, ZIP SHA-256 `5c7dfe693aba8d19ddcd0d3818dbe099f21bad2df6c20efdb638e515644099df`, asset `preserved-showcase-45564113822-v1/esan-interior-static.zip`. Do not overwrite either Release's bytes.
