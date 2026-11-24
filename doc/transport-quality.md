# 序程運輸發布品質改善

日期：2026-11-25（Asia/Taipei）。來源專案維持獨立；本輪未更動其他八個登錄、自訂網域或展示內容。

## 發布規則

`truck-transport` 固定至來源完整 SHA，並要求 `.github/workflows/deploy-pages.yml` 的精確版本整個 push workflow 與 `Validate Hub build` job 成功。一般發布與同步候選都先建置九個站點，再從相同來源 SHA 取得鎖定的 Playwright 套件與測試，對實際 Hub `dist/truck-transport/` 執行 130 項測試。

新增五頁與完整 sitemap 契約、所有 Next HTML 的本地資源檢查，以及逐頁 H1、noindex、canonical、社群圖與圖示驗證。發布後另以 HTTP 核對公開 manifest、深層路由及素材 MIME。

自動同步每 30 分鐘檢查來源 main 最新成功的 push workflow；文件 `[skip ci]` HEAD 不取代已驗證程式版本。inspect、無憑證的候選 build/test、具 Hub 寫入權限的 publish 分開執行。只在所有驗證成功後更新序程的 pin，並明確 dispatch 正式發布。同步與部署使用不同佇列；既有部署版本新舊檢查與全流程串行保留。回滾前須先停用同步，恢復方式見 [deployment.md](deployment.md#verified-transport-automation)。

## 實際驗證

- `node --test --test-isolation=none tests/*.test.mjs`：63 項通過，包含真實本機 HTTP server、無變更、來源 CI 不合格、Hub／來源競態、憑證隔離、條件更新、dispatch 恢復與發布失敗案例。初次在無網路權限的執行沙箱中，HTTP listen 被 EPERM 阻擋；開啟本機網路執行權限後 63 項全過，沒有修改測試來排除此案例。
- 所有 `scripts/*.mjs` 語法、兩份 workflow YAML 與 `git diff --check` 通過。 Hub 是純 Node.js 腳本專案，沒有 `package.json`、TypeScript 或 ESLint 設定，因此未虛構 Hub 的 lint／typecheck 命令；來源網站自己的格式、lint、型別檢查均已在 source main CI 通過。
- 實際 API 負向檢查：來源 `d4d31545e0171d6ac57d9604481b268aad0c2fa8` 的 main workflow 尚為 `in_progress/pending` 時，`resolve-sources.mjs` 拒絕產生可發布快照，未跳過 gate。
- 完整本機建置成功，九站 manifest 均已產生；序程 pin／manifest 為 `3506dbd7b66233168523e40d6ca387f8a961f237`，來源 gate run `45447887894` 全部成功。`.release/quality-build.log` 保存建置日誌。
- 實際 Hub `dist/` 以臨時 HTTP server 提供，來源 `3506dbd` 的 Chromium desktop／mobile 完整 52 項通過（50.9 秒），五頁與五項素材／sitemap 共十項 HTTP 200。報告 `/tmp/xk-hub-dist-chromium/`，臨時 server 已停止；未重建來源來代替 Hub 產物。
- [PR #10 CI run 45448801015](https://github.com/xk2022/xk-showcase/actions/runs/45448801015) 的 resolve、九站 build 與實際 dist 的 130 項 Chromium／Firefox／WebKit 測試全部成功（1.9 分鐘）；PR 部署按規則略過。PR 已合併為 main `2c9bef00c022869217bd7908a45146778f8cd733`。
- [main run 45450135876](https://github.com/xk2022/xk-showcase/actions/runs/45450135876) 全部成功：resolve、九站 build、130 項實際產物測試（1.4 分鐘）、freshness guard、Pages 部署及公開驗證。日誌為 `Verified publication: 9 sites, 16 pages, 134 assets`；發布 Hub SHA 為 `2c9bef00c022869217bd7908a45146778f8cd733`，公開 manifest 的序程來源仍為 `3506dbd`。
- [手動同步 run 45450414543](https://github.com/xk2022/xk-showcase/actions/runs/45450414543) 成功，63 項 unit assertions 通過。inspect 回報 `Latest successful transport main push is already pinned`（`changed=false`），候選 build／publish 正確略過；main 未改變，沒有額外部署 dispatch。這是真實 no-op 驗證，寫入與恢復路徑由 unit fixtures 覆蓋。
- Cloud Browser Chrome 1197×799 公開 smoke 成功：首頁 CTA、單次示例、逐字預覽、返回、純空白提示／回焦，以及返回 Hub → 序程卡片 → 運輸首頁。首頁沒有橫向溢位。此 smoke 與完整跨引擎 CI 套件分開記錄。
- 最後僅更新文件的 `[skip ci]` commit 不改變已驗證程式與來源 pin；不為文件更新再次發布相同產物。

本機實際建置命令（API 權杖只用於唯讀來源解析，不輸出其值）：

```sh
NODE_USE_ENV_PROXY=1 GH_TOKEN="$(gh auth token)" node scripts/resolve-sources.mjs .release/quality-resolved-sites.json
env -u GH_TOKEN -u GITHUB_TOKEN -u NPM_TOKEN -u NODE_AUTH_TOKEN NODE_USE_ENV_PROXY=1 npm_config_cache=/tmp/xk-npm-cache node scripts/build-showcases.mjs .release/quality-resolved-sites.json
```

來源完整驗收與公開站 smoke 見 [source quality record](https://github.com/xk2022/xk-corp-truck-transport/blob/main/docs/QUALITY-IMPROVEMENTS.md)。
