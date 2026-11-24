# XK SYSTEM Showcase Hub

Central static publishing for independently maintained showcase repositories.

- [宏能興業](https://showcase.xplorekaleidoscope.com/honest/)
- [三月手工湯包](https://showcase.xplorekaleidoscope.com/march-tangbao/)
- [宏家燕窩](https://showcase.xplorekaleidoscope.com/hongjia-birdnest/)
- [御品園港式燒臘](https://showcase.xplorekaleidoscope.com/yupinyuan-bento/)
- [宏家燕窩 Brand](https://showcase.xplorekaleidoscope.com/hongjia-brand/)
- [澄策企業顧問工作室](https://showcase.xplorekaleidoscope.com/consulting-chengce/)
- [千剛實業有限公司](https://showcase.xplorekaleidoscope.com/qiangang-windows/)

## Build

Install Node.js 24 and Git, then run `node scripts/build-showcases.mjs` from the repository root. The generated `dist/` contains the hub and all registered static exports; `manifest.json` records the exact source commit of each build. The build aborts before replacing the local output if a source fails.

## Deploy

In Settings → Pages choose GitHub Actions and set the custom domain to `showcase.xplorekaleidoscope.com`. Create DNS CNAME `showcase` → `xk2022.github.io`, verify domain ownership and enable HTTPS. Only the hub may own this domain. Keep existing independent sites until the hub has been verified, then move or redirect old URLs separately.

Register a site in `config/showcases.json`. Each repository must export `out/index.html` and support its unique path at build time. Run the Showcase Hub workflow manually after source changes; hub main changes also deploy. Refs may be changed to immutable release tags for controlled releases. See [deployment notes](doc/deployment.md).
