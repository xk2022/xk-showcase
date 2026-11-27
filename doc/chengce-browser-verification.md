# 澄策網站瀏覽器驗證

[scripts/test-chengce.mjs](../scripts/test-chengce.mjs) 是 Hub 對已編譯靜態成品執行的獨立檢查，不會重新建置私有來源庫，也不會寄出表單或建立預約。

## 執行方式

使用 Hub 現有的 Node.js 24、Playwright 相依與已安裝的 Chromium。傳入的根目錄必須包含 `consulting-chengce/index.html`，可以是候選成品暫存目錄或整合完成的 Hub `dist/`。

```sh
CHENGCE_SOURCE_SHA=dfe50a754e4f5c8317278e59d0c6cf89375e647d \
SHOWCASE_CHROMIUM_PATH=/usr/bin/chromium \
node scripts/test-chengce.mjs .release/chengce-candidate .release/chengce-report
```

GitHub Actions 如使用 Playwright 已安裝的 Chromium，可不設定 `SHOWCASE_CHROMIUM_PATH`。此指令不會安裝瀏覽器；缺少瀏覽器時應先使用既有工作流程的安裝步驟。

整合 Hub 的 `manifest.json` 必須恰有一筆來自 `xk2022/xk-lp-consulting-chengce` 的案例，並提供完整來源 SHA；若同時傳入 `CHENGCE_SOURCE_SHA`，兩者須相符。未傳入時會從 manifest 讀取；靜態 archive 的來源 SHA 亦須與案例版本相符。獨立候選目錄沒有 manifest 時，必須明確提供完整 `CHENGCE_SOURCE_SHA`，報告會標示版本由呼叫者提供。

上述版本檢查不能取代發布流程的 archive digest 與產物來源驗證。發布者須先完成這些檢查，再對同一份產物執行瀏覽器驗證。

## 檢查範圍

每個寬度（375、768、1024、1440px）檢查：

- 首頁 HTTP 200、單一可見 H1、canonical 與中央預覽索引政策。
- 無水平溢出、圖片正常載入、靜態資源留在案例子路徑並回應 200。
- 無舊展示、模擬、提案、待確認等產品字句，沒有未成立的送出或預約宣告。
- 桌面導覽與主要 CTA 的頁內定位；手機選單選取後關閉，Escape 關閉並返回按鈕焦點。
- 四項 FAQ 以滑鼠展開／收合，以及 Enter、Space 原生鍵盤操作。
- 五個必填欄位的錯誤訊息與第一個錯誤焦點、錯誤信箱格式提示。
- 合法合成資料產生準確的六欄摘要、修改保留資料、清除與重新整理後資料清空。
- 預設未配置收件管道時，不顯示郵件洽詢或外部聯絡按鈕。
- 複製成功回饋及失敗時可選取的唯讀文字退路。

所有外部請求均由瀏覽器路由阻擋；表單互動期間若出現 fetch、XHR 或非 GET／HEAD 請求即失敗。檢查也會拒絕 JavaScript、console、HTTP 或資源載入錯誤。

## 複製與資料界線

複製的成功、失敗案例使用明確設定的 `navigator.clipboard.writeText` 替身，確認傳入的摘要內容、頁面回饋、失敗退路及選取範圍。**這不代表已驗證作業系統剪貼簿權限或真實跨應用程式貼上。**

姓名、組織及 `example.com` 信箱為合成輸入，僅在本機頁面狀態中操作。腳本不點選郵件、LINE 或第三方表單，也不宣稱正式收件或預約成功。

## 執行紀錄

2026-11-27 對 `.release/chengce-candidate` 的來源 CI 靜態成品執行，以 Chromium 156.0.8078.79 通過四個寬度的 28 組檢查及一項全域網路／錯誤檢查，共 29 項。375px 與 1440px 的全頁截圖及375px摘要截圖亦已開啟檢視。

最終整合驗證已對完整 Hub `dist/` 執行，29 項全數通過。報告由 Hub manifest 獨立讀取並核對來源 `dfe50a754e4f5c8317278e59d0c6cf89375e647d`，provenance 為 `validated combined Hub manifest`。來源 CI、公開 Release digest 與完整建置證據見 [發布紀錄](chengce-publication.md)。

報告位置預設為 `.release/chengce-report/`：

```text
report.json
375-home.png
375-summary.png
1440-home.png
1440-summary.png
```

上述產物不提交至 Git；由發布或驗收流程保存。此檢查涵蓋 Chromium 編譯成品，未涵蓋 Safari、Firefox、真實手機、正式營運網域或實際收件管道。
