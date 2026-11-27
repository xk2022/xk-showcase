# XK Logistics｜離線合成互動展示

本次依使用者「暫時只完成showcase demo部署」更新既有 `/logistics/` 入口；不建立 Render、Neon、Vercel 資源，不提供正式物流 SaaS，也不宣稱完成全部 M5。來源保留在 `xk2022/xk-app-logistics`，Hub 只接收明確審查過的展示建置方式與不可變來源。

## 展示與隔離

- ADMIN／DISPATCHER／DRIVER 是公開合成 persona，不是真實帳密或身分驗證。訂單、派工、回報、內建照片標記、補件、完成、確認與結案只在分頁記憶體模擬。
- 無後端 API、付款、檔案上傳、Cookie／localStorage／sessionStorage／IndexedDB／cache／service worker 業務持久化。刷新／明確重置恢復合成種子；不能清掉同來源其他 Showcase 的儲存資料。
- 全程固定離線合成提醒，禁止輸入真實資料；照片只使用內建 SVG。這不核准正式派工、照片保存、例外或責任政策。
- 展示以獨立 `frontend/showcase/`、`npm run build:showcase` 及 `frontend/dist-showcase/` 建置，正常產品輸出不載入展示。HTML 固定 canonical、noindex／nofollow，CSP `connect-src 'none'` 與本地資源；不用攔截 API 偽造登入或成功回應。

## 不可變來源與建置

登錄只接受 exact slug `logistics`、repository `xk2022/xk-app-logistics`、full source SHA、`framework: interactive`、`indexable: false`、`VITE_SHOWCASE_DEMO: true`，並要求 `.github/workflows/ci.yml`／`Frontend quality` release gate。整個**最新 push workflow**及該 attempt 的 job 必須成功；不能只因前端 job 先完成而放行。物流不接受任意 staticArtifact 或其他來源替換。

來源 PR／合併／精確 main 四過後才更新本 Hub 的 source pin。建置只對這個精確物流登錄呼叫 `build:showcase` 並使用 `dist-showcase`；其他展示原建置方式與註冊保留。source install/build 程序不接收 API credentials。

物流有獨立的實際 Chromium smoke，核對角色、導航、重置及 network／storage／runtime 錯誤；不執行 Rotaract 的 selector。Hub 仍執行全部209個現有與新增單元、全22站建置、transport suite、發布 freshness guard，以及公開 manifest／路由／資源驗證。

## 目前實證與交付狀態

source 已完成本機1159個前端測試／41files、613後端／36suites、12工具測試與8個離線桌面／手機 browser cases，正常5個產品建置檔逐byte保留。Hub 原8f8a基準完整201個 Node tests 已通過；發布前同步最新 main `06100f0e619db5a3e4648f5d44a059d59a33d38b`，保留 Rotaract 新治理展示、來源 `4a7712436a7217f6065560e3ff695c39510896ee` 及其 artifact，完整209 tests 再過、0fail／0skip。其他21個登錄以此最新 main 與實際公開 manifest 作基線，不能覆蓋平行更新。初次 token 環境曾觸發既有拒絕 guard，改用規範要求的 token-free 程序後通過。同步後一次 broad Node 預設探索誤把需參數的 transport CLI 當測試入口，209斷言仍通過；改用明確 `tests/*.test.mjs` 範圍後完整209通過，未修改產品或守衛。

來源[PR #32](https://github.com/xk2022/xk-app-logistics/pull/32) source `278b8040ba0b3422ffeb189587c30bd311792665` 已合併為 `9b226ada240f3fb964b2f568bdbff76c690ef8ec`，Git tree相同。PR [45925506062](https://github.com/xk2022/xk-app-logistics/actions/runs/45925506062)／精確push-main [45926373215](https://github.com/xk2022/xk-app-logistics/actions/runs/45926373215) attempt1四項全成功、無rerun，才固定本登錄。main實數frontend1159、backend161＋452＝613／0failure/error/skip、工具12、舊真後端40（3.0m）、離線8（17.3s）、十HTTP3252／125份body-only family files，完整隱私與owned cleanup通過；PR輪HTTP3244，不能混用。

最終登錄後，按CI原指令完整209 tests／0skip、9.652秒通過；fresh resolve22通過精確main whole-workflow gate。無憑證完整22站建置、實際物流互動smoke及初始首頁縮圖（80,679 bytes）通過，縮圖已人工檢視。全22站候選manifest中的其餘21項，以及其餘21完整registry objects，均與最新06100f0e／公開基線逐項相同，只有物流來源更新。既有transport runtime逐byte比對及fresh Hub smoke通過，歷史source suite45564113822明確保留引用，沒有冒稱重跑。

對實際Hub輸出以本機server執行全量publication verifier：22sites／69pages／276assets／370requests通過；再跑來源自有桌面／Pixel7完整8案，1worker／0retry、20.6秒全過，未mock API／登入／回應。這不是公開上線證據。首版Hub PR #31／merge `6af6967dc1657b69a6a0b90dc663423340e6d899` 已完成PR45927603296及精確main45927903981 attempt1必要CI，main含freshness／Pages／公開verifier22sites／69pages／276assets成功；公開核心8案22.1秒通過。額外手機返回Hub檢查發現隱藏連結，故尚不宣稱全部手機導覽已驗收，依後續修正收據完成。舊物流screen回退source為 `070383e1ff76dcaaf16693e8fcd8d4f5c0bb915c`。來源與整合最終source／merge／run／attempt收據分別由[物流Demo PR](https://github.com/xk2022/xk-app-logistics/pulls?q=is%3Apr+head%3Afeat%2Flg-m5-showcase-demo+base%3Amain)及[Hub整合 PR](https://github.com/xk2022/xk-website-showcase/pulls?q=is%3Apr+head%3Afeat%2Flogistics-interactive-demo+base%3Amain)記錄。

## 發布後驗收及回退

發布後必須比較公開 `/manifest.json` 的精確來源 SHA／release evidence，並實際開啟 HTTPS `/logistics/` 執行桌面／手機劇本，確認 Hub 返回導覽、無 API／持久化寫入、手機布局及合成提醒。新的 registry／程式變更須通過自己的完整 PR／main 發布流程；舊 ZIP、舊 CI 或本機成功不代表已發布。

回退時恢復先前完整物流登錄與已驗證 source pin，經獨立 PR／全建置及正常發布，不直接改伺服器或繞過 freshness guard。發布後驗證失敗不會自動宣稱回退成功；依實際問題修復並保留失敗證據。既有其他21個來源／runtime pin、網域與發布權限不變。

## 平台用途與限制

GitHub Pages 官方條款允許個人與組織專案展示；本次只有離線合成互動，不提供付款、實際登入、商業 SaaS 或真實物流資料處理。不新購方案／改帳務，不表示既有帳戶總帳單為零；Pages／Actions 用量仍受現有額度。平台可能保留訪問安全紀錄，不宣稱完全不記錄訪客資訊。

正式產品的 Vercel／Render／Neon、Session／CSRF 跨平台、照片持久化、完整 M5、客戶 UAT 與 MVP v1.0.0 另待後續授權及驗收，本次不實作或宣稱完成。

公司規範於發布準備再核對最新 `xk2022/xplore-kaleidoscope@d7d0ffd95f199ddf7f9ef820f7562e3e70571f3e`；相較工程規範基準只新增正式品牌衍生素材，既有產品可待各案更新驗收後切換，本包保留已採用資產。

## 手機返回Hub修正與重新發布

獨立公開導覽先以桌面及Pixel7從Hub真卡片進入Demo、切司機再返回。首版桌面成功；手機唯一anchor位於`.sidebar-foot`，受共用640px樣式隱藏，實際locator timeout。原始失敗log、當時公開manifest與圖像保留，不以核心8案成功替代這個失敗。

來源窄修只移動獨立Demo的唯一anchor到頁首並明確44×44px，不改正常產品CSS／API／後端；source8保留原全部流程，新增每次進入與角色切換後的visible／unique／exacthref及手機bbox檢查。需由[source修正PR](https://github.com/xk2022/xk-app-logistics/pulls?q=is%3Apr+head%3Afix%2Fshowcase-mobile-hub-navigation+base%3Amain)與[Hub重新發布PR](https://github.com/xk2022/xk-website-showcase/pulls?q=is%3Apr+head%3Afix%2Flogistics-mobile-hub-navigation+base%3Amain)分別完成PR／精確main；來源四過後才改pin，再完整209／22站／transport／Pages／公開8及真卡片返回導覽。首版成功不當作新版本成功，其他21完整登錄、runtime pin、網域與權限仍保留。

修正來源[PR #33](https://github.com/xk2022/xk-app-logistics/pull/33) head `0890aa64381b3192ee261904a0352bad43131c6a` 已合併為 `01fb1bae59c6b6ec4010ef65524fc32bc9e6a2bf`，兩者tree相同；[PR45929256113](https://github.com/xk2022/xk-app-logistics/actions/runs/45929256113)及[精確main45930137774](https://github.com/xk2022/xk-app-logistics/actions/runs/45930137774) attempt1四項全成功、無rerun，才更新本Hub唯一物流ref。main實數1159frontend／613backend（161＋452、0failure/error/skip）／12工具／原40（3.0m）＋新8（17.5s）／十HTTP3251 assertions、125familyfiles，DR／privacy／cleanup成功；PR輪3255，不混用。

修正全量本機前端另定位既有CSRF resume測試的可操作等待競爭，只加retry-enabled等待，保留原所有fetch0／receipt／posts1斷言，不增timeout／sleep／retry／skip。正常產品runtime與5個輸出不改；原291 backend／API bytes相同，原frontend140／144相同，差異為原3metadata與此test-only等待。獨立修正source8保留原劇本再加導航44px回歸，本機20.8秒全過；完整1159／41files與lint/typecheck/build25.95秒通過。

本輪Hub以6af6967dc1657b69a6a0b90dc663423340e6d899為基準，只改物流ref與此驗收文件；最終登錄的完整209 tests／0skip、9.705秒及fresh resolve22／whole exact-main gate通過。全22站重建、transport、實際Hub輸出8案、Hub PR／main Pages與公開返回導覽等後續實際結果，由本修正唯一head PR收據記錄，未執行項目不宣稱成功。

本輪無憑證完整22站重建與物流實際smoke成功，新的真首頁縮圖81,036bytes已產生；其他21完整registry／candidate manifest objects與6af基準及公開基線精確相同。transport51runtimefiles byte-identical＋fresh Hub smoke成功，舊source suite45564113822仍明確REUSED_NOT_RERUN。新實際Hub輸出publication verifier22sites／69pages／276assets／370requests，以及原8案＋新導航回歸desktop／Pixel7、1worker／0retry、20.8秒全過。此為本機候選，最終Pages與真Hub往返成功以本PR實際遠端／公開收據為準。
