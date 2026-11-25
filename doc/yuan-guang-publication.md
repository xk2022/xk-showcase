# Yuan-Guang concept proposal listing

## Scope and selected delivery (2026-11-25)

The user requested deployment into `xk-website-showcase`. This is the renamed
`xk-showcase` repository (GitHub repository ID `1469796623`), not a new host.
Yuan-Guang is already registered at `/yuan-guang-pcb/`. This change prepares its
homepage card with an explicit unofficial concept-proposal notice and action.
It retains `indexable: false`, the exact application pin and visible website
notice. The card uses `status: "proposal"`, an unofficial concept-proposal label,
a non-commission statement and the action “查看概念提案”. It does not establish a
client commission or an official company website.

The user selected reviewed `staticArtifact` delivery. That migration has already
been completed for the sixteen former Git-built inputs in
[private-source preservation](private-source-preservation.md). The eighteen-entry
release, including Carpentry, passed [Pages run45569747028](https://github.com/xk2022/xk-website-showcase/actions/runs/45569747028).
This listing reuses those approved inputs rather than rebuilding or republishing
another set of sixteen snapshots. Source repositories stay private; no new
source credentials or visibility changes are required.

Earlier [run45567613884](https://github.com/xk2022/xk-website-showcase/actions/runs/45567613884)
failed source resolution with HTTP403. The listing's earlier
[run45569296640](https://github.com/xk2022/xk-website-showcase/actions/runs/45569296640)
passed 102 tests but failed resolution with HTTP404 for the then-private Rotaract
source. These remain historical failures; the completed preservation migration
replaced that acquisition path. They are not relabeled as successful runs.

Before this proposal-card release, the published Yuan-Guang site was unlisted.
The card must pass its own complete CI, guarded deployment and public verification;
its final outcome is recorded in [PR #18](https://github.com/xk2022/xk-website-showcase/pull/18).
The earlier migration release alone does not establish the new card. A listed
proposal also requires the build-generated
`yuan-guang-pcb/_showcase-preview.jpg`.

## Existing reviewed snapshot

- Application source: `2028ee7058142fdfd546d24023c1b9f296a5b0da`.
- Public ZIP: [yuan-guang-pcb-static.zip](https://github.com/xk2022/xk-website-showcase/releases/download/preserved-showcase-45564113822-v1/yuan-guang-pcb-static.zip).
- Archive size: 465,983 bytes; 35 exported files.
- SHA-256: `abd4c705644b8a1e6130b66ab4e4cbfdb035db0bb3c06c6712e560e7cd18d7ce`.
- Provenance: last successful baseline run `45564113822`, Pages artifact
  `14998919879`; preservation run `45569035046`.
- Historical source CI: [run45419126636](https://github.com/xk2022/xk-brand-yuan-guang-pcb/actions/runs/45419126636),
  attempt 1, including the original 216 browser tests. This is preserved source
  evidence, not a new Hub query of private CI.

The current registry already uses this public URL, digest and matching
`ref`/`staticArtifact.sourceSha`, with no `releaseGate`. No new Yuan-Guang upload
selector, local candidate archive or private checkout is needed for the listing.
The earlier locally rebuilt candidate is not the selected delivery input.

## Independent artifact review

The [machine-readable review](yuan-guang-artifact-verification.json) was checked
for publication-sensitive data before inclusion. It records an independent
download, safe extraction, correct digest and passing Hub Vite export validation.
All 35 runtime files match the locally built exact application output byte for
byte and by hash, excluding build-only `.vite/**` and `.nojekyll`. This comparison
is against that local exact-source build, not an assertion that a source CI
artifact was downloaded.

All 16 HTML entries (seven pages in each language and two error pages) passed
static language, title, description, canonical, OG/locale, proposal notice and
navigation checks. The archive contains the browser output and runtime assets;
it does not contain private source files, dependencies, Git history, environment
files or source maps. No private CI or browser suite was rerun in this artifact
review. SHA-256 proves the reviewed bytes, while the preserved baseline and
preparation evidence establish the recorded source-to-output relationship.

All 129 local Hub tests passed with API tokens removed from the test environment.
This preparation review does not itself establish the listing's full CI or
public deployment result; those outcomes are recorded in PR #18. Release checks cover the proposal card, regenerated preview, all 16 Yuan-Guang
HTML routes, metadata, noindex, local assets and the full eighteen-entry manifest.
Transport's fresh compiled-output smoke remains distinct from its historical
exact-source suite (`REUSED_NOT_RERUN`); artifact-mode synchronization is a
read-only no-op. See the [shared artifact contract](static-artifact.md).
