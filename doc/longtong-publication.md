# 隆通物流｜來源整理後的靜態快照發布

日期：2026-11-27（UTC）。使用者於來源Repo完成目錄整理後明確要求「Push and merge and deploy」，本次更新既有 `/longtong-logistics/` 快照。來源維持Private；網站仍是XK自主作品集展示，不代表正式客戶委託、隆通正式營運網站或已收件。

## 來源與同一份CI產物

| 項目 | 證據 |
| --- | --- |
| 來源 | `xk2022/xk-lp-longtong-logistics` |
| 確切來源SHA | `af43789eba69494f93be17e108880c8acbf524e5`，來源PR #8已合併 |
| main來源CI | [45976676418](https://github.com/xk2022/xk-lp-longtong-logistics/actions/runs/45976676418)，完整成功 |
| 下載artifact | ID `15186549414`，`longtong-logistics-static-45976676418-1` |
| ZIP | 419183bytes、40entries，根目錄包含index.html及公開Next資產，CRC通過 |
| SHA-256 | `50e15ce69cf8750409ef3d3c42435be7f4ea383525bbb7368c971cec60d671d0` |
| 公開檔案邊界 | 無原始碼、環境檔、套件、依賴、source maps或真實表單草稿 |

使用下載的原始CI ZIP，沒有以工作區重建取代。經Hub的bounded materialize及Next validateExport後，在獨立目錄提供真實 `/longtong-logistics/` 掛載，執行來源完整48項：36個瀏覽器流程與12個模型／數字fixtures，48／48通過（57.6秒）。

資產內容及MIME、canonical／OG、zh-Hant、noindex／nofollow及路徑前綴均通過。A125件／每箱20件為6滿箱餘5，另裝7箱；A改120件為6箱餘0，B保留3箱與箱規待確認，實際剪貼簿全文符合最新摘要。沒有自動接單或永久保存。

## 隔離Release上傳

既有publisher新增固定 `longtong-logistics` selector，僅映射上述來源、`/longtong-logistics/` 與 `longtong-logistics-static.zip`。沿用既有Next與sitemap契約，來源HTML維持noindex；不改索引／gallery旗標、權限、Secrets或其他selector。

ZIP暫存為獨立Hub Git blob `9f02f6421d9ab3a6ab0c6e7e762bffd66093e37b`，沒有加進tree、commit或ref，也未提交建置輸出。blob SHA、ZIP SHA-256與來源SHA是不同識別。

[Bootstrap 45978085054](https://github.com/xk2022/xk-website-showcase/actions/runs/45978085054) 從已審閱Hub提交 `452ed71984cb853410a3744c6d10c15d1d4357e5` 成功，只執行隔離上傳job；正常resolve/build/Pages皆略過：

- Release：`longtong-logistics-af43789-v1`。
- [公開ZIP](https://github.com/xk2022/xk-website-showcase/releases/download/longtong-logistics-af43789-v1/longtong-logistics-static.zip)。
- [Release manifest](https://github.com/xk2022/xk-website-showcase/releases/download/longtong-logistics-af43789-v1/release-manifest.json)。

公開ZIP已重新下載，與來源CI ZIP逐位元組一致。manifest的sourceRepository、完整sourceSha、digest、staticOnly及bootstrap提交／run識別皆核對一致。manifest只記錄編譯輸出及發布來源，沒有假稱上傳job重新查核Private CI；上方的來源CI證據由本次準備工作獨立核對。

## 登錄更新與回復

只更新Longtong的ref及staticArtifact URL／sha256／sourceSha，保留其他21個登錄、gallery順序及既有控制。已同步並保留同時進行的其他專案main更新，測試衝突保留雙方案例，不以舊登錄覆蓋新值。

原快照可作回復依據，需經審閱還原整組並執行完整發布：

- sourceSha：`50ca189d9e87f31af5d02c7a8b340748bb32b5b0`。
- URL：`https://github.com/xk2022/xk-website-showcase/releases/download/preserved-showcase-45564113822-v1/longtong-logistics-static.zip`。
- SHA-256：`57e8a4d43d9374fc7673fede4416b1403fd68cb0ea6c310fc1689a8bba491f08`。

## 驗證與發布界線

以當時整合的main `26f7fc2bda41ca4fe8f1d0c3f02a1ca4b3232e6e` 為基準，完整Hub Node套件234／234通過、0skip。首次未清除繼承API憑證的本機執行被既有transport隔離守門拒絕；改用 `env -u GH_TOKEN -u GITHUB_TOKEN` 後通過，沒有修改或降低守門條件。

完整Hub建置、combined輸出的Longtong互動、transport與Chengce驗收、PR CI、main guarded deployment及公開manifest／路由／資產檢查須分別完成。Release上傳與本機來源驗收不能取代正式發布；最終Hub合併SHA、workflow及公開結果記錄於 [交付PR #48](https://github.com/xk2022/xk-website-showcase/pull/48)。

## 已執行的合併前驗收

- 完整Hub建置成功：22個登錄的合併輸出，manifest的隆通sha/sourceSha皆為af43789，既有其他案例保留。
- 在實際完整dist根服務 `/longtong-logistics/`，來源完整48項再次全部通過（57.3秒），不是改測來源out或獨立candidate。
- CI ZIP的40個檔案與combined case逐位元組一致；唯一新增項是Hub產生的_showcase-preview.jpg。
- Chengce 29項檢查通過，涵蓋375／768／1024／1440px；剪貼簿分支使用其既有明訂的測試替身，不傳送外部表單。
- transport 51個runtime檔案內容一致，fresh Hub-owned smoke通過；歷史source suite明列REUSED_NOT_RERUN，沒有冒稱重跑Private來源。
- browser及build程序移除GH_TOKEN／GITHUB_TOKEN；未提交產物、下載ZIP、解析計畫或驗收截圖。

中央其他案例的並行更新會繼續合併保留；本機上述結果代表其當時完整計畫，最終合併前以PR #48最新head的完整Hub CI為準，不沿用過期base的檢查宣稱新整合已通過。

後續同步main `e15adb7f03899819526b9d9d943bc190e167fbe4`，保留Taiyang／Hongjia新契約及全部測試後，以相同token-free指令完整241／241通過（11.67秒）。Longtong的registry tuple仍是唯一相對該main的登錄差異；新整合的全22站建置由最新PR CI再次驗證。
