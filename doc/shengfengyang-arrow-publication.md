# 昇豐陽透明箭頭更新

2026-11-25，僅更新昇豐陽靜態展示快照，將原文字箭頭替換為共用 SVG 圖示；其餘案例登記、發布 Helper、Workflow 與原始碼庫可見性均保留。

| 證據 | 本次版本 |
| --- | --- |
| 來源提交 | `baacd349c86c195f77d3b5c17ec29e7f6041b3d5` |
| 來源 PR | [品牌站 PR #5](https://github.com/xk2022/xk-brand-shengfengyang/pull/5) |
| 來源 CI | [45570117540](https://github.com/xk2022/xk-brand-shengfengyang/actions/runs/45570117540)，root／subpath 均成功；準備階段核對 exact head |
| 公開 ZIP | [shengfengyang-baacd34-v1](https://github.com/xk2022/xk-website-showcase/releases/download/shengfengyang-baacd34-v1/shengfengyang-static.zip) |
| SHA-256 | `985e9b84c9bb6ba53c20830108cc4d317a868ddeff4368c3893361d84c7931dd` |
| 封存邊界 | 155 個部署檔案，2,681,315 bytes；無來源、環境檔、source maps 或依賴目錄 |
| Release bootstrap | [45570607751](https://github.com/xk2022/xk-website-showcase/actions/runs/45570607751)，Hub `50d8ed67dd8b3c8dc4cd6323859e0c95a905a623`，成功 |

準備建置使用 `NEXT_PUBLIC_BASE_PATH=/shengfengyang`、`SITE_URL=https://showcase.xplorekaleidoscope.com`、`SHOWCASE_PROPOSAL=1`。來源 Lint、Type Check、Build、匯出檢查通過（23 HTML、20 內容路由、844 連結／資產引用）。保留 noindex、nofollow、無 Sitemap 與不列入展示首頁的提案設定。

發布前另以 Hub 實際材料化模組下載公開 ZIP、核對雜湊、安全解壓並驗證全部 20 路由。來源 Repo 保持 private；來源 CI 是準備任務檢查的證據，Hub Release 工作不查私有 CI、不執行來源安裝或建置。暫存 Git blob 未加入 tree、commit 或 ref；後續網站建置僅使用公開 Release 資產。

Hub 本機及 PR 檢查須涵蓋當前完整 18 站。Transport 依最新平台規範比對保留快照的 runtime bytes，執行 Hub-owned Chromium 五路由、兩尺寸 smoke；原 130 項私有來源套件僅保留歷史成功證據，不能稱為本次重跑。實際 Hub 提交、PR、CI、Pages 與公開驗證結果以本次發布 PR 紀錄為準。

本機 Hub 驗證：126 項單元測試通過，完整 18 站建置通過；Transport 的靜態 runtime 比對及 10 項新 smoke（五路由、375／1440px）通過。建置與 smoke 均移除 `GH_TOKEN`／`GITHUB_TOKEN`，未執行來源安裝或建置。
