# 萬花筒運輸｜無背景箭頭更新

日期：2026-11-27（UTC）。本次僅將裝飾文字箭頭換成透明、單色 SVG，保留按鈕背景、品牌、文案、網址及模擬詢價行為。已由正常 Hub PR／main 流程部署，官方、獨立 HTTPS 及公開 Cloud Browser 箭頭檢查均通過。

| 準備證據 | 實際識別／結果 |
| --- | --- |
| Private 來源 | `xk2022/xk-corp-truck-transport`，來源 [PR #8](https://github.com/xk2022/xk-corp-truck-transport/pull/8) 已合併 |
| 固定來源 | `1460860660a1005646f3be7643ccbc3c54d0206f`；frontend／tests 與 PR head `cb63a2e4918c30e45d08a557402fa2b5d727a804` 同樹 |
| 來源 PR CI | [46047801284](https://github.com/xk2022/xk-corp-truck-transport/actions/runs/46047801284)，兩前綴共 260／260 通過 |
| 精確來源 main CI | [46048445128](https://github.com/xk2022/xk-corp-truck-transport/actions/runs/46048445128)，兩前綴共 260／260 通過 |
| 本機命令 | `cd frontend` 後執行 `npm run format:check`、`npm run lint`、`npm run typecheck`、`npm run build:pages`，均通過；最終 ZIP 另由合併來源 fresh build 產生 |
| 視覺／鍵盤驗收 | Chromium 156：375×844／1440×1000 五頁及 320×844 首頁通過；66 個 SVG 均背景透明、fill none、stroke 繼承文字色，不可聚焦且對輔助科技隱藏；綠 CTA、手機導覽、詢價預覽／返回保留原文 |
| 既有目標套件 | 22／22 通過，涵蓋導覽、鍵盤、五頁 axe 與兩示例；未新增 SVG 鏡像測試或更改既有測試 |
| ZIP | 867,291 bytes，52 regular files／1,607,440 expanded bytes；其中 0-byte `.nojekyll` 為部署 marker，其他 51 檔為公開 runtime |
| ZIP SHA-256 | `dfda90df6f03c1321508ca1a8f97be242dba9b7f601de1fa81ff64bfcbe9b320` |
| 固定 Release | [truck-transport-static.zip](https://github.com/xk2022/xk-website-showcase/releases/download/truck-transport-1460860-v1/truck-transport-static.zip)；[隔離上傳 46048893472](https://github.com/xk2022/xk-website-showcase/actions/runs/46048893472) 成功，helper `1e0733b441c0c0c67ef30cc52dbb3e4fe86ee59f`，獨立正常 TLS 下載 ZIP／manifest HTTP 200、bytes／52 檔 inventory／source／helper／run 全匹配 |
| 新舊 pin 門檻 | 三組固定 source／URL／digest 均保留嚴格比對，拒絕跨版本混搭；本版仍執行品牌／metadata／詢價 fresh Hub smoke |
| Hub 單元套件 | `env -u GH_TOKEN -u GITHUB_TOKEN node --test --test-isolation=none tests/*.test.mjs`：260／260，18.07 秒，零失敗／skip |

候選通過 bounded ZIP extraction、`validateExport` 與既有 publisher 的實際 ZIP preflight。無來源、source maps、環境檔、憑證、依賴或 server 產物；兩張 WebP、社群 JPEG 與 favicon 和 `90a33ad` 版本逐 byte 相同。來源保持 Private，Hub 不查私有 CI 或執行私有來源；準備工作獨立核對來源品質。Publisher、工作流程權限、slug、其他 21 站與同步模式皆不變。正式 22 站完整建置由本次 Hub PR／main CI 執行，本機不重複建置其他專案。

## 發布結果

[Hub PR #51](https://github.com/xk2022/xk-website-showcase/pull/51) 經 [PR CI 46049348777](https://github.com/xk2022/xk-website-showcase/actions/runs/46049348777) 全綠後合併為 `afb0a0cb7a042f9b25a68c3af3f9a9a3e763a276`。正式 [main run 46049728740](https://github.com/xk2022/xk-website-showcase/actions/runs/46049728740) 全綠：260 項、22 站完整 build、52 檔成品逐 byte 比較、375／1440px 五頁與兩輪詢價 smoke、Chengce 四寬度、Publication 137 freshness guard、Pages 及官方公開驗證（22 站／74 頁／287 素材）均通過。

獨立正常 TLS／no-cache 於 **18:32:36–39 UTC** 通過：22 個完整 manifest identities 與同次 deployed plan 相符，51 個公開 runtime bytes／hash／MIME 相同，五頁 metadata 與 33 個實際 DOM SVG（13／7／4／5／4）及透明 CSS 均正確。唯一 0-byte `.nojekyll` 是不公開的部署 marker，HTTP 404 正常；由該次 main 的已驗證 transport artifact（52 檔相同）加審查 ZIP 證明 marker，沒有把舊本機 Hub dist 當本次輸出。

Cloud Browser Chrome **1180×757** 實際走訪五頁：33 個 SVG computed background 透明、無底圖、fill none、stroke 繼承文字色；綠 CTA rgb(23,61,53) 與導覽不變，無 overflow。首頁 CTA、鍵盤 Tab／Return 預覽「兩板貨」、返回保留及刷新清空通過。首次串接的返回動作未切換畫面，重新觀察 DOM 後點擊可見按鈕即正常；未改產品或放寬斷言。公網桌面操作與本機手機／axe 範圍分開記錄，沒有繞過 TLS 或宣稱真機驗收。

[精簡收據](transport-arrow-live-verification.json) 保留識別與範圍；完整本機證據在 `/tmp/xk-transport-arrows-20261127/`。後續文件提交只補記結果，不改已發布 runtime 或 ZIP。

## 可回復快照

保留上一版萬花筒快照 `90a33ad`／`94971f455523bf85c10d5d0768f09471c69392688a73eb271ea0f2316f3eca1d`，以及最早 `3506dbd` preserved tuple；不覆寫或刪除既有 Release。首次品牌發布與完整舊 tuple 見 [transport-publication.md](transport-publication.md)。回復須還原完整已審查 tuple，重新走正常建置、guarded deployment 與公開驗證。
