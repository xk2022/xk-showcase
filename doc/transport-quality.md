# 序程運輸發布品質改善

日期：2026-11-25（Asia/Taipei）。來源專案維持獨立；本輪未更動其他八個登錄、自訂網域或展示內容。

## 發布規則

`truck-transport` 固定至來源完整 SHA，並要求 `.github/workflows/deploy-pages.yml` 的精確版本整個 push workflow 與 `Validate Hub build` job 成功。一般發布與同步候選都先建置九個站點，再從相同來源 SHA 取得鎖定的 Playwright 套件與測試，對實際 Hub `dist/truck-transport/` 執行 130 項測試。

新增五頁與完整 sitemap 契約、所有 Next HTML 的本地資源檢查，以及逐頁 H1、noindex、canonical、社群圖與圖示驗證。發布後另以 HTTP 核對公開 manifest、深層路由及素材 MIME。

自動同步每 30 分鐘檢查來源 main 最新成功的 push workflow；文件 `[skip ci]` HEAD 不取代已驗證程式版本。inspect、無憑證的候選 build/test、具 Hub 寫入權限的 publish 分開執行。只在所有驗證成功後更新序程的 pin，並明確 dispatch 正式發布。同步與部署使用不同佇列；既有部署版本新舊檢查與全流程串行保留。回滾前須先停用同步，恢復方式見 [deployment.md](deployment.md#verified-transport-automation)。

## 實際驗證

- `node --test --test-isolation=none tests/*.test.mjs`：63 項通過，包含真實本機 HTTP server、無變更、來源 CI 不合格、Hub／來源競態、憑證隔離、條件更新、dispatch 恢復與發布失敗案例。初次在無網路權限的執行沙箱中，HTTP listen 被 EPERM 阻擋；開啟本機網路執行權限後 63 項全過，沒有修改測試來排除此案例。
- 所有 `scripts/*.mjs` 語法、兩份 workflow YAML 與 `git diff --check` 通過。
- 實際 API 負向檢查：來源 `d4d31545e0171d6ac57d9604481b268aad0c2fa8` 的 main workflow 尚為 `in_progress/pending` 時，`resolve-sources.mjs` 拒絕產生可發布快照，未跳過 gate。
- 完整建置、PR/main CI 與公開發布結果將於本輪發布後補記；目前不把單元測試或來源 PR 的成功當作 Hub 已部署。
