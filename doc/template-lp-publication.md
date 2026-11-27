# Six-industry LP template publication

Preparation date: 2026-11-27. This update keeps the existing `/carpentry/` entry, promotes its approved six-industry version, and places its card first in the LP group. It does not create six Hub registrations or change source visibility.

**Current stage:** the new static Release is public and independently verified. The local complete 22-site build and transport smoke passed; final PR CI, Pages publication and live verification are still pending; the artifact upload alone is not a live-site result.

## Source and exact artifact

| Evidence | Actual identity |
| --- | --- |
| Private source | `xk2022/xk-template-lp` |
| Source delivery | [PR #5](https://github.com/xk2022/xk-template-lp/pull/5), merged |
| Merged source SHA | `bed3c363106b41f3d62c60e5b6bfc55f7bff0a5d` |
| Main push CI | [45955220939](https://github.com/xk2022/xk-template-lp/actions/runs/45955220939), all steps successful |
| Exact CI artifact | `15178676639`, `carpentry-static-export`, 1,970,841 bytes |
| CI artifact and public ZIP SHA-256 | `8cd35a8de5a474759ce73a94883722a2a02ec8fc164763fec46924c713c36cfb` |
| New public Release | [carpentry-bed3c36-v1](https://github.com/xk2022/xk-website-showcase/releases/tag/carpentry-bed3c36-v1) |
| Public ZIP | [carpentry-static.zip](https://github.com/xk2022/xk-website-showcase/releases/download/carpentry-bed3c36-v1/carpentry-static.zip) |
| Isolated publishing run | [45955710682](https://github.com/xk2022/xk-website-showcase/actions/runs/45955710682), success |
| Reviewed publishing code | `5f2f84516f0c7a0a2e086848611bdea01177ca4c` |

The main push run checked `npm ci`, lint, typecheck, build, export validation and Chromium tests before uploading this exact artifact. Its digest was checked against GitHub artifact metadata. The original CI ZIP bytes were retained, rather than rebuilding locally and claiming equivalent output. Both the public ZIP download and generated Release manifest were independently checked against the digest, source repository/SHA, publishing commit and run above.

The managed CLI could not download the Actions storage redirect; the connected GitHub artifact tool supplied the same artifact, whose digest was verified before use. The reviewed ZIP was staged as Hub Git blob `b25ff3a3de08af0defb01ba6105b07e808491dc1` for the existing isolated upload workflow. No tree, commit or ref contains that transfer blob as a file. The durable artifact is the public Release. Only the publishing job ran; resolve/build/Pages were skipped in that upload run.

The `carpentry` publisher now fixes new releases to the renamed source `xk2022/xk-template-lp`. Its selector, slug, asset name, digest checks, bounded extraction, Hub-only credentials and no-overwrite policy remain unchanged. Existing Releases retain their original identities; a prior source repository in an otherwise matching manifest is rejected without writes. No private-source credential, source execution, new workflow input or permission was added.

## Public output review

The actual CI ZIP contains 75 regular files and expands to 3,271,419 bytes. Its CRC, paths, safe extraction and current Hub `validateExport` passed. It contains six intended HTML routes, framework 404 pages, browser JavaScript/CSS, RSC text payloads, images, icons, two intended image-provenance JSON files and a six-URL sitemap. There are no source TS/TSX, source maps, `.env`, `.git`, server bundles, dependencies, credentials or private personal contacts.

All six routes have one H1, their own canonical and OG URL, description, imagery, AI/demo notices and a disabled unconfirmed LINE entry. New industries disclose that one AI scene illustrates six possible needs, rather than six completed projects. Contact remains an editable/copyable in-memory summary, not a receiving endpoint.

## Gallery and regression scope

Before this release, the public manifest contained 22 projects and the default gallery grouped LP12, BRAND4, CORP1, APP5 and an empty AI group. Carpentry was LP position 12; Honest was first. The registry now places Carpentry first and uses the name `職人接案 LP Template`, the six-industry description and its real renamed source. A narrow exact-repository mapping keeps `xk2022/xk-template-lp` in the existing LP category, without introducing a TEMPLATE category or general naming rule.

The remaining 21 repository/SHA/static-artifact identities and relative registry order were compared against the captured public manifest and retained. Existing historical `carpentry-91ade72-v1` Release bytes, source pin and preparation records are not rewritten.

Local targeted gallery/publisher tests passed 73 checks; the full Hub suite passed 222 checks after removing API credentials from the test process, as required by its existing guard. The first local source build stopped because the inherited npm cache was read-only; the retry uses a writable temporary npm cache. Neither environment correction changes the source or weakens the build guard.

The complete 22-input plan is frozen in `.release/template-lp-resolved-sites.json` locally. The complete local build passed and produced a 22-entry manifest with the template first. The preserved transport runtime bytes and fresh Hub-owned smoke passed. Final PR CI, guarded Pages and post-deployment publication verification must pass before this document is marked published. Transport uses fresh Hub-owned browser smoke for its preserved artifact; its historical private-source suite is `REUSED_NOT_RERUN`, not newly executed.

## Route scope

The template root remains `/carpentry/`. Its additional static routes are `xk-lp-plumbing-electrical/`, `xk-lp-painting/`, `xk-lp-waterproofing/`, `xk-lp-hvac/` and `xk-lp-masonry/` under that same prefix. The top selector changes the brand, services, proposals, FAQ, local summary and page metadata. Six-route public refresh, desktop/mobile navigation, first LP placement and unchanged other project identities must be checked against the deployed output.
