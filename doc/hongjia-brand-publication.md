# Hongjia Brand publication

Preparation date: 2026-11-27. **Published and independently verified.** This record separates source validation, reviewed static bytes, isolated Release upload, registry promotion and public Pages verification. Existing `/hongjia-brand/`, its four routes and its `portfolio` status are retained. The LP entry `/hongjia-birdnest/`, other registrations, DNS and brand production domains are outside this update.

## Source and preparation

| Evidence | Identity or result |
| --- | --- |
| Source repository | `xk2022/xk-brand-hongjia-birdnest` |
| Merged source | `edc4022ea5a6296c38e9c40e4fa8d3bcea1a7482`, [source PR #4](https://github.com/xk2022/xk-brand-hongjia-birdnest/pull/4) |
| Exact source push CI | [45973097619](https://github.com/xk2022/xk-brand-hongjia-birdnest/actions/runs/45973097619), root and subpath jobs successful |
| Source browser evidence | Each CI job passed 21 tests: 18 Chromium and 3 WebKit; source CI is preparation evidence, not a public-device test |
| Static build | Node.js 24, locked dependencies and `npm run build` in `frontend/`; collect `frontend/out/` |
| Build environment | `NEXT_PUBLIC_SITE_URL=https://showcase.xplorekaleidoscope.com`, `NEXT_PUBLIC_SHOWCASE_BASE_PATH=/hongjia-brand` |
| Reviewed ZIP | `hongjia-brand-static.zip`, 1,395,826 bytes; 54 regular files, 2,065,121 bytes expanded |
| ZIP SHA-256 | `b9487e5ca85ee8ce24435fd21c0633805b8811f5fbf39316ff9d61992ae1d039` |
| Published Release | `hongjia-brand-edc4022-v1`; compiled ZIP and manifest publicly available |
| Public ZIP | `https://github.com/xk2022/xk-website-showcase/releases/download/hongjia-brand-edc4022-v1/hongjia-brand-static.zip` |
| Fresh preparation checks | Production-path build, 18 Chromium checks, safe ZIP extraction and four-route metadata/resource validation passed |
| Publisher validation | Initial 26 focused publisher tests and final merged 231 Hub unit tests passed; independent fixed-scope code review completed |
| Isolated upload | [45976852488](https://github.com/xk2022/xk-website-showcase/actions/runs/45976852488), success; helper commit `8dc506e55941fea0533b241b6decf036868bb924`; normal resolve/build/Pages skipped |
| Independent delivery check | Public ZIP downloaded again: exact 1,395,826 bytes and SHA-256 match; public manifest confirms source, helper commit and run |
| Local complete integration | 22 sites built from candidate base `876dce4`; transport compared 51 runtime files and passed 10 fresh route/width checks; Hongjia passed 18 Chromium checks against actual combined output |
| Registry promotion | [PR #44](https://github.com/xk2022/xk-website-showcase/pull/44), merged as `8f97be8ea8bfbc8407856ffcf3af3b6aea1ffaa0` |
| Successful Pages / runtime | [45979478318](https://github.com/xk2022/xk-website-showcase/actions/runs/45979478318), runtime `e15adb7f03899819526b9d9d943bc190e167fbe4`; includes PR #44 and other accepted updates |
| Independent public check | 2026-11-27 10:11 UTC: 22 manifest identities matched that published registry, four routes HTTP 200, all 54 runtime file hashes matched, 56 HTTPS requests and 23 typed local references passed |

The source change aligns the Brand repository with the common website layout: frontend package, lockfile, configuration and assets in `frontend/`; shared browser tests and documentation remain at the repository root. It preserves the existing application and brand imagery. This publication prepares a new static export from that exact merged source rather than assuming a source merge changes the preserved public snapshot.

Preparation produced this deterministic ZIP from a clean exact-source checkout: `frontend/out/` contents start at the archive root, including `index.html`, without an enclosing output directory. The inventory found no symlinks, source files, source maps, server bundles, workspace paths or credential-pattern matches. Browser JS/CSS, images, fonts, Next.js RSC text payloads and public font license files are intentional runtime output. Fresh Chromium and Hub validator results are recorded in the preparation and local integration rows above; public Pages verification remains separate.

Company guidance was checked at `76252e621ecb5c508494b49d4cd1eabd340b7e81`: the [website README standard](https://github.com/xk2022/xplore-kaleidoscope/blob/76252e621ecb5c508494b49d4cd1eabd340b7e81/06_engineering/website-project-readme-template.md) requires the common root and separate source/central publication responsibilities; [development workflow](https://github.com/xk2022/xplore-kaleidoscope/blob/76252e621ecb5c508494b49d4cd1eabd340b7e81/06_engineering/development-workflow.md) and [testing and release](https://github.com/xk2022/xplore-kaleidoscope/blob/76252e621ecb5c508494b49d4cd1eabd340b7e81/06_engineering/testing-and-release.md) require exact-source checks and actual release evidence. Brand classification remains `xk-brand-`, R01 website service and P01 website development / Brand Website; this does not adopt the LP W01 code.

## Compiled-output delivery

The existing isolated publisher gains the fixed `hongjia-brand` selector, tied to this source repository, the retained slug and the fixed asset name `hongjia-brand-static.zip`. It accepts reviewed ZIP bytes through the existing Hub-local Git blob transfer mechanism, validates the Git blob and SHA-256, applies bounded safe extraction and checks the compiled export before Release writes. It does not add arbitrary repository/slug inputs, source execution or a private-source CI credential. No ZIP, `dist/` or source build output is committed.

The Hongjia-specific output check requires four route documents with their own correct canonical URLs, one nonempty H1 each, their existing indexable policy and an exact four-URL sitemap. The normal static-export validator also checks paths and referenced runtime assets. The complete Hub build and normal guarded Pages pipeline remain required after registry promotion.

The upload job verifies compiled public output only. It does not claim to rerun or query private source CI; the source CI run above was checked separately during preparation. Source SHA, archive checksum and publishing commit/run must be recorded together in the Release manifest. An isolated upload does not run resolution, build or Pages deployment, and an existing Release alone does not establish a live update.

## Promotion and verification

Before promotion, record the reviewed archive size/content scan, SHA-256, public Release URL and upload run. Update only the `hongjia-brand` `ref` / `staticArtifact.sourceSha` / URL / digest tuple; retain other registrations and their source/artifact identities. The old reviewed tuple remains the rollback input.

The retained rollback tuple uses source/ref `5ad9300098b11c3e1b5ca22b7d8f39afaa578a2a`, ZIP `https://github.com/xk2022/xk-website-showcase/releases/download/preserved-showcase-45564113822-v1/hongjia-brand-static.zip` and SHA-256 `2274bd50537dd278e116789690b52bc639572b06c032cd071e46c915a8cd2092`. That existing Release is not overwritten by this update.

After the complete Hub PR checks and guarded main publication succeed, record the actual Hub runtime SHA, Pages workflow and resolved manifest. Public verification must match the promoted source/artifact tuple and check all four routes, page metadata, images, fonts, scripts and styles. Browser evidence should separately identify desktop/mobile scope and the three journeys: home to personal gifting, home to corporate inquiry and copying, journal to its matching IG original. Visitors still send IG messages themselves; copying is not an order or a delivered inquiry.

The verified publication evidence below completes this promotion. A future failed post-deploy check reports failure; it does not silently restore a prior Pages deployment. Restore a previously reviewed tuple and use the normal guarded publication process for rollback.

The first upload request, [45975855109](https://github.com/xk2022/xk-website-showcase/actions/runs/45975855109), was cancelled while pending by the shared publication queue, before any job or Release write. The successful retry above is the delivery evidence. Local integration used the reviewed ZIP through the existing digest mirror before public upload; the temporary untracked mirror was removed. The later independent public download verifies delivery separately. Other accepted Hub updates are preserved when this branch is synchronized before promotion.

Before PR, the branch also incorporated accepted March and Chengce updates from main `1782237`; the merged 229-test suite passed. The local complete build above remains labeled with its earlier accepted input baseline, while final PR CI builds the current combined registry again.

Before merge, accepted main `26f7fc2` independently updated the LP. Its registration and tests are retained. Brand fixtures use explicit `hongjiaBrand*` names to avoid colliding with LP fixtures; the shared generic project mock remains intact. All 231 merged unit tests passed. The Brand selector is placed away from common append points to reduce concurrent selector conflicts, with its fixed identity and workflow permissions unchanged.

## Completed public publication

Final [PR CI 45978813539](https://github.com/xk2022/xk-website-showcase/actions/runs/45978813539) passed the current 231-unit suite, complete 22-site build and existing integration checks. The first post-merge main run [45979285281](https://github.com/xk2022/xk-website-showcase/actions/runs/45979285281) built successfully but its freshness guard stopped deployment after newer accepted main changes; it did not publish. The later successful Pages run above carried this exact Brand tuple and verified the public manifest, pages and referenced assets.

Independent anonymous HTTPS checks used system TLS validation and no-cache requests: all 54 browser-facing files matched the reviewed ZIP byte-for-byte, four page titles/descriptions/canonicals/H1s and social metadata were valid, the share PNG was 1200×630, and image srcsets, CSS fonts, JavaScript/RSC, MIME and robots/sitemap references passed. Other identity comparisons use that actual published registry, not the earlier stale public baseline. Later Hub releases can retain this same Brand tuple; this record identifies the verified Brand promotion rather than claiming the Hub never changes.

Public Chrome operations passed: home → personal gifting and editing its inquiry; home → corporate gifting and copying the actual inquiry, with clipboard readback equal to the displayed text; journal → the first original IG post, visibly showing hongjianest.tw's matching dry-versus-ready-to-eat article. The two-layer footer and XK production credit were present. Desktop public Chrome is distinct from the 375px and WebKit source/combined-output coverage; no physical-iPhone claim or IG message submission is made.

This receipt changes documentation only. It does not alter registrations, source pins, ZIP bytes or Pages settings, and it does not require rebuilding the verified runtime.
