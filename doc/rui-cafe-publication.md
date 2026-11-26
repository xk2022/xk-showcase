# 蕋咖啡 Rui Café｜品牌提案發布

使用者於 2026-11-26 明確授權合併來源 PR 並加入 `xk-website-showcase` 部署。這是非官方自主品牌網站提案的公開展示，不代表品牌正式委託或官方營運網站。

## 來源與準備

- 來源：`xk2022/xk-brand-rui-cafe`，私有儲存庫，維持原有可見性。
- 來源 [PR #1](https://github.com/xk2022/xk-brand-rui-cafe/pull/1) 已合併。
- 合併後 SHA：`e32cc6d7bf330c1a487e9dbf2983443cffebdb70`。
- 已於準備工作中核對 exact main push [CI run 45728318965](https://github.com/xk2022/xk-brand-rui-cafe/actions/runs/45728318965) 成功；這是準備階段證據，Hub 不重新查詢私有來源 CI。
- 使用 Node.js 24、`NEXT_PUBLIC_BASE_PATH=/rui-cafe`、`NEXT_PUBLIC_SITE_URL=https://showcase.xplorekaleidoscope.com` 建置，通過 Lint、Type Check、正式 Build、postbuild、靜態檢查、31 項 Chromium 測試與 Hub `validateExport`。
- 七條路徑：首頁、`about/`、`menu/`、`cakes/`、`space/`、`news/`、`visit/`。提案使用 `noindex,nofollow`，無 sitemap，照片均標示 AI 示意。

## 靜態快照

| 欄位 | 值 |
| --- | --- |
| ZIP | `rui-cafe-static.zip` |
| 大小／檔案 | 786,957 bytes / 61 files |
| SHA-256 | `638ae61cea47df4c5b920e0f3fd17d9c462a6b0d48767375ff8faecffcb3fe39` |
| 來源 SHA | `e32cc6d7bf330c1a487e9dbf2983443cffebdb70` |
| Release tag | `rui-cafe-e32cc6d-v1` |
| 候選 URL | `https://github.com/xk2022/xk-website-showcase/releases/download/rui-cafe-e32cc6d-v1/rui-cafe-static.zip` |

ZIP 以排序檔名、固定 1980 時戳及 0644 權限封裝，根目錄直接包含 `index.html` 等匯出內容。稽核結果為 10 HTML、33 Next RSC TXT、12 JS、1 CSS、2 SVG、2 WebP、1 JPEG；不含來源碼、source maps、Git、環境檔、伺服器輸出、依賴、隱藏檔或憑證標記。ZIP 與建置輸出不加入 Git tree。

本次直接 `uploads.github.com` 上傳回 HTTP 401，未接受執行環境憑證；本次建立的空草稿已刪除。改採既有隔離上傳流程新增固定 `rui-cafe` 選項：相同的 Hub-only 權限、雜湊／安全解壓、七路徑檢查、草稿資產完成後才公開、不覆寫既有資產。不接受任意來源、slug 或資產名，不增加 secret 或私有來源 token。

`publish-static-artifact` 與正常 Pages resolve/build/deploy 分離；僅在覆核推送分支的 workflow 與 helper 後執行。公開 Release 會保留產物校驗碼、來源 SHA 與上傳工作流程身分；不宣稱上傳工作重新查核私有 CI。

隔離上傳 [run 45728926680](https://github.com/xk2022/xk-website-showcase/actions/runs/45728926680) 已成功，執行經覆核的 Hub 分支提交 `41efb19708458ef75a1d3f12bf08c3f820805053`；僅 `publish-static-artifact` 執行，resolve/build/deploy 均略過。傳輸 blob 為 `d2d602b245ace82b87e75bf123ac815f553faed7`，沒有加入 tree／commit；它不是公開產物的長期來源。

已從公開 Release URL 重新下載 ZIP，SHA-256 與上述值相同；`release-manifest.json` 的來源 SHA、校驗碼、Hub 提交與 run 身分均一致。這只證明靜態快照已儲存，完整 Pages 發布仍另行執行。

## 登記與驗證政策

登記使用 `slug:rui-cafe`、`framework:next`、`status:proposal`、`listed:true`、`indexable:false`，首頁卡片標示非官方提案並使用「查看概念提案」入口。根 robots 加入 `Disallow: /rui-cafe/`，不加入 sitemap。

Hub 本機驗證與公開驗證都逐一要求七個頁面的獨立 canonical 與單一非空 H1；所有匯出 HTML 保留 noindex,nofollow，資產位於自己的 `/rui-cafe/` 子路徑。既有註冊、Release、來源 pin 與展示內容不因本案改動。

## 發布證據

靜態上傳、完整整站建置、Hub PR、Pages 工作流程及公開 HTTPS 驗證結果，於完成後補記。只有 Release 成功或本機測試通過，不能將此提案標為已部署。
