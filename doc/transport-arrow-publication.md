# 萬花筒運輸｜無背景箭頭更新

日期：2026-11-27（UTC）。本次僅將裝飾文字箭頭換成透明、單色 SVG，保留按鈕背景、品牌、文案、網址及模擬詢價行為。公開站尚待此候選的正常 Hub PR／main 發布；不以來源合併或 Release 上傳代替上線驗證。

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

Hub PR CI、main freshness guard、Pages 與獨立公開核對待實際執行後補記。公開比對需使用該次部署的 resolved plan，確認完整 tuple、51 個 runtime bytes 與單色 SVG；`.nojekyll` 只列為本機／ZIP 的控制標記，不要求公開 HTTP 200。

## 可回復快照

保留上一版萬花筒快照 `90a33ad`／`94971f455523bf85c10d5d0768f09471c69392688a73eb271ea0f2316f3eca1d`，以及最早 `3506dbd` preserved tuple；不覆寫或刪除既有 Release。首次品牌發布與完整舊 tuple 見 [transport-publication.md](transport-publication.md)。回復須還原完整已審查 tuple，重新走正常建置、guarded deployment 與公開驗證。
