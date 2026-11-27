# 萬花筒運輸｜新品牌靜態快照準備與發布紀錄

日期：2026-11-27（UTC）。**靜態 ZIP 已完成隔離上傳及獨立下載驗證；Pages 與新版網站尚未發布。** 本次依追加部署授權，將既有 `/truck-transport/` 的舊「序程運輸」快照替換為「萬花筒運輸」（Kaleidoscope Transport）候選。來源 `xk2022/xk-corp-truck-transport` 維持 Private，公開交付僅限已審查的靜態執行成品；不改 slug、網域、其他專案來源或私有權限。

本案仍是 `portfolio`、虛構品牌與 XK 自主規劃展示作品。保留「探索萬象科技（Xplore Kaleidoscope，簡稱 XK）」及 **Self-Initiated Demonstration Project｜自主規劃展示作品**、示意圖片標籤與 `noindex,nofollow`。公司 `f117310` 新增的正式客戶網站 footer 規則不改變本案分類，不把它補成受委託實績或正式運輸服務。

## 來源準備與 CI 證據

來源 pin 為 `90a33add7d4ab6e71a28c47eb8183fe8c12cf907`；其靜態 ZIP 的上傳與下載驗證已完成，正式 Pages 發布另記於後節。此版本相對已通過 main CI 的來源只有文件補記；其執行程式及測試與下列受測版本相同：

| 證據 | 實際識別或狀態 |
| --- | --- |
| 初始執行／測試版本 | `38a9be4cc6f5ae3c2227b9de42c320edc7851820` |
| 已核對來源 main CI | [45983443767](https://github.com/xk2022/xk-corp-truck-transport/actions/runs/45983443767)，兩種路徑各 130、共 260／260 通過，零 skip／retry |
| `38a9be4` 與 `90a33ad` 的 `frontend/` tree | 同為 `3011c7cc5ab46261bf3ad77ae9739c67564adaff` |
| `38a9be4` 與 `90a33ad` 的 `tests/` tree | 同為 `db1232d800dc065b808fef02f847d3911483bc5d` |
| 兩者差異 | 僅 README、docs/content.md、docs/verification.md；不虛稱文件 head 自己有新的執行 CI |
| 初始本機建置限制 | fresh Next.js build 回覆 EPERM；default、additional permissions 與 escalated 嘗試均曾失敗 |
| 最後 fresh 建置 | 將失敗的本機 `.next` 安全移至暫存位置後重跑成功，exit 0，完整五頁 static log 已核對；不推定 cache 是唯一根因 |
| 成品交付決策 | 從此次新建置、經審查的 `frontend/out/` 準備 ZIP，不採用舊工作區成品；不新增來源 workflow 上傳步驟 |
| 候選來源／CI 關係 | 使用 `90a33ad`；來源 CI 是上述 `38a9be4` 的成功結果，frontend／tests 同樹關係明列，不虛稱 CI 跑在文件 head |

候選 ZIP 已由此次成功 fresh build 的公開靜態成品包裝，完成 Hub `validateExport`；52 個 regular files，ZIP 為 863,340 bytes、展開合計 1,571,066 bytes，SHA-256 如下表。其後已獨立以正常 TLS 下載公開 ZIP 與 manifest，核對 bytes、digest、檔案清單與發布識別均一致；此結果只代表成品交付，不代表網站已發布。來源品質、source-to-export 關係、ZIP 資料邊界、隔離上傳與正式發布是分開的證據，不互相代替。

## 靜態成品邊界

來源維護在 `frontend/src/`，單一 npm package 位於 `frontend/`；公開 ZIP 根目錄應為 `frontend/out/` 的內容，而不是包住 `frontend/` 或 `out/`。Hub 掛載位置沿用 `/truck-transport/`，建置設定為：

```text
NEXT_PUBLIC_BASE_PATH=/truck-transport
NEXT_PUBLIC_SITE_URL=https://showcase.xplorekaleidoscope.com
```

允許公開的內容為五頁 HTML、sitemap、Next.js browser JavaScript／CSS／RSC payloads、WebP、JPEG 與 SVG。候選須檢查沒有私有來源檔、Git 歷史、環境檔、憑證、套件／依賴目錄、source maps、`.next/server` 或其他非靜態輸出。

五頁須保留各自 canonical、單一非空 H1、正確子路徑資源、頁尾 XK 署名與返回 Hub 的入口。品牌、favicon 標籤及社群圖應為「萬花筒運輸」。固定配送與單次示例仍只代表示範；一個必填自由描述欄位可逐字預覽、帶入復原、返回修改與刷新清空，不要求聯絡資料、不對外傳送、不持久化，不新增承運判定或報價。

## 固定隔離上傳與候選 tuple

本次使用固定 `truck-transport` publisher selector，只映射此來源 repo、`/truck-transport/` 與 `truck-transport-static.zip`。Release tag 為 `truck-transport-<最終來源 SHA 前七碼>-v1`。Release `truck-transport-90a33ad-v1` 已完成下列隔離上傳與公開下載核對；正常完整 Hub 建置與 Pages 發布仍待完成。

| 交付項目 | 目前狀態 |
| --- | --- |
| 候選 source SHA／準備時核對的 CI | `90a33add7d4ab6e71a28c47eb8183fe8c12cf907`；同 runtime／test tree 的 main CI `45983443767` |
| fresh-build ZIP | `truck-transport-static.zip`；863,340 bytes，52 個 regular files，展開 1,571,066 bytes |
| Hub `validateExport` | 候選成品通過；正式發布仍另行驗證 |
| ZIP SHA-256 | `94971f455523bf85c10d5d0768f09471c69392688a73eb271ea0f2316f3eca1d` |
| 公開 Release ZIP | [truck-transport-static.zip](https://github.com/xk2022/xk-website-showcase/releases/download/truck-transport-90a33ad-v1/truck-transport-static.zip)，已獨立下載 HTTP 200 |
| 暫存 transfer blob | `d9bfc92f609250cad3926fa6bf5f9d12e800a656`；blob SHA 不等於 ZIP SHA-256 或來源 commit |
| 隔離 upload workflow commit／run | helper `f3f2a7cfcc568cc144fdb1070204d2082bc3a90d`；[run 46040766421](https://github.com/xk2022/xk-website-showcase/actions/runs/46040766421) 成功 |
| 公開 Release manifest | [release-manifest.json](https://github.com/xk2022/xk-website-showcase/releases/download/truck-transport-90a33ad-v1/release-manifest.json)，HTTP 200；source、digest、helper commit 與 run 完全匹配 |
| 登錄 promotion PR／Hub commit | 待完整 Hub 驗證及 review 後補記 |

沿用現有 bounded ZIP 檢查、draft asset、no-overwrite 與 Hub-local 短期 token 權限。上傳 job 不執行來源 npm／JavaScript、不查私有 CI、不取得 Pages／OIDC 權限，不接受任意 repo、slug、資產名稱或新 secret。Release manifest 只記錄編譯成品驗證、來源 SHA、ZIP checksum 與上傳 workflow 識別；上方來源 CI 由準備工作獨立核對。

隔離上傳 run 僅執行 `publish-static-artifact` 並成功；正常 resolve、build、deploy 及 preservation jobs 均略過，沒有在該 run 發布 Pages。獨立下載時間為 2026-11-27 17:20:28 UTC，TLS 驗證未停用，ZIP 的 863,340 bytes 與審查本機成品逐位元組相同，52 檔清單及內容完全匹配。原始核對紀錄：`/tmp/xk-transport-publication-20261127/public-release-verification.json`。

來源 tuple 須將 `ref` 與 `staticArtifact.url`、`sha256`、`sourceSha` 整組同步更新。此次公開驗證也檢查完整 `staticArtifact` tuple，避免只比來源 SHA 而接受錯誤 URL／digest；這是快照一致性檢查，不是新增私有 CI 存取。

## 來源完整套件與 Hub smoke 的區別

來源 CI 的 130 項／前綴涵蓋 Chromium、Firefox、WebKit、手機模擬、axe、重排、metadata、導航及詢價資料邊界。它是該執行版本的來源驗證。

Hub 的 artifact 路徑不取得私有原始碼或其 Playwright 套件。Hub 先核對已審查的公開 ZIP URL／digest／source SHA，安全解壓並驗證 Next.js 成品，再對**實際完整 Hub `dist/truck-transport/`**執行 fresh Hub-owned compiled-output Chromium smoke。目前 Hub-owned smoke 的範圍是五頁於 375／1440px 兩個寬度的品牌、H1、圖片、無橫向溢位、路徑與 metadata，以及兩寬度詢價示例／原文／空白回焦／返回／刷新、網路與儲存邊界。完整跨頁導覽、鍵盤流程、axe 與跨引擎範圍由來源套件驗證；不把這些來源結果歸入 Hub smoke，也不稱 Hub 重新執行私有來源完整 130 項。已完成的 smoke 與額外準備時來源套件結果記錄於下節；公開 Pages 與跨瀏覽器來源 CI 仍分開判讀。

舊 preserved snapshot 的歷史來源套件保留 `REUSED_NOT_RERUN` 標示。新 reviewed replacement 有自己的來源準備證據與 fresh Hub smoke；任何不在已審查清單的 source／URL／digest 或成品差異都必須拒絕，不以放寬 gate、重新命名歷史證據或略過測試處理。

## 已完成的本機完整整合驗證

以本輪 Hub 基準 `28837f6` 的候選計畫進行完整 **22 站建置，exit 0**。執行時移除 GitHub API tokens，保留公開網路代理設定與系統 Chromium 路徑：

```sh
env -u GH_TOKEN -u GITHUB_TOKEN NODE_USE_ENV_PROXY=1 SHOWCASE_CHROMIUM_PATH=/usr/bin/chromium npm_config_cache=/tmp/xk-hub-npm-cache node scripts/build-showcases.mjs .release/transport-resolved-sites.json
```

其後 `testTransport` 對實際完整 Hub 的 `dist/truck-transport/` 使用新 reviewed-static 模式並通過：

- **52 個 runtime 檔案逐位元組一致**；只排除 Hub 自己產生的 gallery image，不重包或重建網站來替換被測產物。
- 五頁 × 375／1440px 的 **10 組 route／width 檢查通過**，包含新品牌、H1、metadata、圖片、正確路徑與無橫向溢位。
- **兩個寬度的詢價 journeys 通過**：固定配送示例、單次出貨示例、只填「兩板貨」、逐字空白／換行、純空白提示與回焦、返回保留、刷新清空、詢價原文不進入請求，並確認無 localStorage、sessionStorage 或 cookies。
- 已目視本機實際輸出的新桌面 gallery image 與手機全頁，品牌及首頁圖片裁切正確；此為本機成品觀察，不宣稱公開網址已更新。

Hub-owned 報告位於 `/tmp/xk-transport-publication-20261127/hub-transport-report`。

準備階段另以已授權來源套件，對**同一份實際 combined Hub 輸出**執行 Chromium 與 WebKit，合計 **104／104 通過，零 fail、skip、retry**，不是改測來源自己的 `out/`：

| 額外準備驗收 | 實際結果 |
| --- | --- |
| Chromium 156.0.8078.79 | desktop 1440×1000、mobile 390×844；52／52 通過，42.8 秒；報告 `/tmp/xk-transport-publication-20261127/qa-chromium` |
| WebKit 27.2 | desktop 1440×1000、iPhone 13 模擬 viewport 390×664／screen 390×844；52／52 通過，55.1 秒；報告 `/tmp/xk-transport-publication-20261127/qa-webkit` |

完整識別、實際命令與產物 manifest hash 記錄於 `/tmp/xk-transport-publication-20261127/qa-result.json`。套件未修改，sandbox 與 TLS 驗證未停用；WebKit 沿用既有 `/tmp` 函式庫與 host 預檢設定。Firefox 沒有在本機重跑，其證據仍是相同 runtime／tests 的來源 CI `45983443767`，不宣稱本機 Firefox 或實體 Safari／iPhone／VoiceOver 已驗收。

這項額外準備時驗收不改變一般 Hub artifact 流程：Hub job 本身仍不下載私有來源或假稱重跑其完整跨引擎套件。

完整 Hub Node suite 亦已執行 `env -u GH_TOKEN -u GITHUB_TOKEN node --test --test-isolation=none tests/*.test.mjs`，**260／260 通過（18.34 秒）**，零 fail、skip、cancel 或 todo。Hub 是 Node.js 腳本專案，未配置獨立 lint／TypeScript 指令，沒有虛構執行結果；來源 CI `38a9be4` 已包含 lint／typecheck，且 `frontend/` 與 `tests/` 均與候選 `90a33ad` 同樹。

## 完整發布與線上證據

候選 ZIP 上傳、來源 CI 或本機 smoke 成功均不等於已發布。須完成以下實際結果後再將本文件與 README 改為新版已上線：

| 階段 | 實際結果 |
| --- | --- |
| 公開 ZIP 獨立下載、hash／manifest／審查 ZIP bytes 比對 | 通過；正常 TLS，ZIP／manifest 皆 HTTP 200，bytes、digest、52 檔 inventory 與 manifest 識別均匹配 |
| 固定 publisher focused tests | 61 項通過；包含 selector 及其相關負向情境 |
| publication focused tests | 28 項通過；完整 Hub suite 另列如下 |
| 22 站完整 Hub 建置 | 通過，exit 0；本輪基準 `28837f6`，移除 GitHub API tokens 執行 |
| 實際 combined-output transport smoke | 通過；52 檔 runtime byte 比對、10 組 route／width 與兩寬度詢價 journeys |
| 來源完整套件對 actual combined 輸出 | Chromium 52／52（42.8 秒）、WebKit 52／52（55.1 秒），共 104／104，零失敗、skip、retry；Chromium 156.0.8078.79：1440×1000／390×844；WebKit 27.2：1440×1000／iPhone viewport 390×664 |
| 完整 Hub Node suite | `env -u GH_TOKEN -u GITHUB_TOKEN node --test --test-isolation=none tests/*.test.mjs`：260／260 通過，18.34 秒，零 fail／skip／cancel／todo |
| Hub PR CI | 待補記 |
| Hub main freshness guard、Pages deployment 與公開驗證 | 待補記 |
| 公開 manifest 的完整 transport source／tuple | 待補記 |
| 公開五頁、favicon、社群圖、其他資源 HTTP 與實際互動 | 待補記 |

Hub 未配置獨立 lint 或 TypeScript 指令；Node 單元套件涵蓋此次 MJS 修改。來源 CI 的 lint、型別檢查與正式建置已通過，與候選來源的 frontend／tests 同樹。完整瀏覽器命令與結果留在 `/tmp/xk-transport-publication-20261127/qa-result.json`，報告在同目錄 `qa-chromium/`、`qa-webkit/`；source suite 未變動。

發布網址仍為 <https://showcase.xplorekaleidoscope.com/truck-transport/>；在上述結果成功之前，不聲稱此網址已顯示萬花筒運輸，也不改變其他 21 個登錄的來源、相對 gallery 順序或網域歸屬。

## 保留的舊快照與回復

以下原「序程運輸」preserved tuple 保留為可審查的 rollback，不刪除舊 Release 或重新賦予新來源識別：

- source SHA／ref：`3506dbd7b66233168523e40d6ca387f8a961f237`。
- URL：`https://github.com/xk2022/xk-website-showcase/releases/download/preserved-showcase-45564113822-v1/truck-transport-static.zip`。
- ZIP SHA-256：`2869602b507f62a4ce7c5da56d8162282d4d48cebff6fc2b1c8ca3dffd829411`。

若需 rollback，經 review 恢復完整 URL／digest／source tuple 與對應品牌登錄，再走正常完整建置、版本新舊檢查、部署與公開驗證。artifact 模式的 transport 同步維持唯讀 no-op，不會追蹤私有來源 HEAD；不能只改 source SHA、挪用不同 ZIP 或假造 CI 來通過發布。
