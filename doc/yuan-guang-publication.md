# Yuan-Guang concept proposal listing

## Scope and current blocker (2026-11-25)

The user requested deployment into `xk-website-showcase`. This is the renamed
`xk-showcase` repository (GitHub repository ID `1469796623`), not a new host.
Yuan-Guang is already registered at `/yuan-guang-pcb/`. This change prepares its
homepage card with an explicit unofficial concept-proposal notice and action.
It retains `indexable: false`, the exact application pin, the visible website
notice, and the source release gate. It does not establish a client commission.

The complete publication is currently blocked: all 16 Git-built registrations
in main `b20c7248034efcd890d0482f9c900f15c78e2e40` now have private source
repositories. The existing Hub-scoped workflow token does not grant access to
those sources. [Run 45567613884](https://github.com/xk2022/xk-website-showcase/actions/runs/45567613884)
passed its tests but failed source resolution with HTTP 403. This listing's own [run 45569296640](https://github.com/xk2022/xk-website-showcase/actions/runs/45569296640) also passed all 102 tests, then failed resolution with HTTP 404 for the private Rotaract source; build and deployment were skipped. Changing only
Yuan-Guang's card or artifact cannot unblock the other sources. No visibility,
credential, source gate, or unrelated registration is changed here.

Publication must wait for either the reviewed static-artifact migration or a
verified read-only source access configuration. Do not merge this listing before
the complete build passes, and do not report the homepage entry live until the
guarded Pages deployment and public verification succeed. A listed proposal also
requires the build-generated `yuan-guang-pcb/_showcase-preview.jpg`.

## Prepared static export

A local candidate was rebuilt from exact application source
`2028ee7058142fdfd546d24023c1b9f296a5b0da` and its committed lockfile. Lint,
TypeScript, 12 Node tests, 54 DOM tests, Build, and export validation passed.
The exact source [CI run 45419126636](https://github.com/xk2022/xk-brand-yuan-guang-pcb/actions/runs/45419126636),
attempt 1, was rechecked as successful, including its 216 browser tests. The Hub
does not currently have access to query this private source CI itself.

- Candidate ZIP: `yuan-guang-pcb-static.zip`, 466380 bytes, 36 files.
- SHA-256: `84ec7c10a7722614981071d778a21b46d4fb69c1544f9c7ea5eb7212afb47ecc`.
- Contents: 14 bilingual page entries, two error pages, browser JS/CSS, WebP/SVG
  assets, robots.txt and `.nojekyll`.
- Excluded: source files, Git history, dependencies, environment files, source
  maps and the build-only `.vite` manifest.

The ZIP remains a local preparation artifact; it has not been uploaded or
registered as a public Release. It was not downloaded from the source CI, so no
byte-identity claim with that CI artifact is made. If artifact publication is
selected, first extend the existing reviewed upload allowlist for Yuan-Guang,
validate the archive through the safe extractor and Vite export checks, upload
and independently hash-check the public asset, then replace the source-build
registration with the pinned `staticArtifact` contract. That migration must not
disable validation for the other registrations or claim the Hub queried private
CI. See [the shared static-artifact contract](static-artifact.md).
