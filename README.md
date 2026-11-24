# XK SYSTEM Showcase Hub

Central static publishing for independently maintained showcase repositories.

The hub supports Next.js static exports and explicitly configured Vite exports. Concept proposals can be excluded from the showcase cards and search indexing while retaining their proposal notices; publication does not establish a client relationship or an official company website.

- [宏能興業](https://showcase.xplorekaleidoscope.com/honest/)
- [三月手工湯包](https://showcase.xplorekaleidoscope.com/march-tangbao/)
- [宏家燕窩](https://showcase.xplorekaleidoscope.com/hongjia-birdnest/)
- [御品園港式燒臘](https://showcase.xplorekaleidoscope.com/yupinyuan-bento/)
- [宏家燕窩 Brand](https://showcase.xplorekaleidoscope.com/hongjia-brand/)
- [澄策企業顧問工作室](https://showcase.xplorekaleidoscope.com/consulting-chengce/)
- [千剛實業有限公司](https://showcase.xplorekaleidoscope.com/qiangang-windows/)
- [序程運輸](https://showcase.xplorekaleidoscope.com/truck-transport/)

## Build

Install Node.js 24 and Git, then run `node scripts/build-showcases.mjs` from the repository root. The generated `dist/` contains the hub and all registered static exports; `manifest.json` records the exact source commit of each build. The build aborts before replacing the local output if a source fails.

Run `node --test tests/*.test.mjs` for registration, export validation, indexing and root-404 routing checks. GitHub Actions runs these checks before the complete build.

## Deploy

In Settings → Pages choose GitHub Actions and set the custom domain to `showcase.xplorekaleidoscope.com`. Create DNS CNAME `showcase` → `xk2022.github.io`, verify domain ownership and enable HTTPS. Only the hub may own this domain. Keep existing independent sites until the hub has been verified, then move or redirect old URLs separately.

Register a site in `config/showcases.json`. Each repository must export `out/index.html` and support its unique path at build time. Run the Showcase Hub workflow manually after source changes; hub main changes also deploy. Refs may be changed to immutable release tags for controlled releases. See [deployment notes](doc/deployment.md).

The Yuan-Guang PCB entry is a **concept proposal**, with `framework: "vite"`, `indexable: false`, and `listed: false`. It is not included in the homepage's client-case cards or sitemap references. This is a public preview configuration, not access control.

## Transport showcase

`truck-transport` builds `xk2022/xk-corp-truck-transport` independently from its `main` branch. The hub provides `GITHUB_PAGES=true`, `NEXT_PUBLIC_BASE_PATH=/truck-transport` and `NEXT_PUBLIC_SITE_URL=https://showcase.xplorekaleidoscope.com` to export the five-page site with the correct assets, canonical URLs and sitemap. The inquiry preview remains in browser memory and has no submission endpoint or storage.

The original [independent deployment](https://xk2022.github.io/xk-corp-truck-transport/) remains available. The hub alone owns the showcase custom domain; generated exports are not committed. Deployment status and the exact built source SHA are available from the Actions run and published `manifest.json`.

## Reproducible releases

The workflow resolves every registration's `ref` to an exact commit before any source build starts. A source can use a branch, release tag or full commit SHA. The resolved plan is retained as the `resolved-sources` artifact; builds fetch and check out those SHAs detached, and the public manifest records the exact built commits. To keep a registration fixed across later releases, use a release tag or SHA instead of a moving branch.

The Hongjia Brand source additionally requires successful `Verify root static export` and `Verify subpath static export` GitHub Actions checks on its resolved SHA. Other registrations retain their existing build policy. API credentials are available only while resolving/checking a release and in the deployment guard; source installation and build run in a separate job without API tokens.

Publish runs serialize the whole pipeline. Immediately before deployment, the workflow rejects an obsolete Hub main revision or a release superseded by a newer main run. After Pages deployment it retries public checks with no-cache requests and compares the complete public manifest against the resolved plan. The checks cover homepage visibility, indexing rules, sitemaps, published pages and referenced assets, including fonts in CSS. Hongjia Brand's four required routes and one H1 per page are checked explicitly. A verification failure marks the workflow failed; it does not silently roll back a deployment already accepted by Pages.

For local verification:

```sh
node --test tests/*.test.mjs
node scripts/resolve-sources.mjs .release/resolved-sites.json
node scripts/build-showcases.mjs .release/resolved-sites.json
node scripts/verify-publication.mjs .release/resolved-sites.json
```

The final command verifies the current public site, so it only passes after that exact plan has been deployed. Do not commit `.release/` or generated `dist/`. See [release and recovery notes](doc/deployment.md#release-snapshots-and-verification).
