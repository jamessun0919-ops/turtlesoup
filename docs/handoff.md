# 交接文件 (Handoff)

> 精簡且高度機器可讀，供下次啟動時直接貼上作為 Prompt。此文件會被覆寫為最新狀態（非累積式日誌）。

## 專案目標 (Project Goal)
海龜湯（側向思考推理）單頁遊戲網頁，由 Node.js Proxy 伺服器代理 Gemini API 作為 AI 主持人。

## 已完成進度 (Completed)
- questions.json 全部 23 題的 description/solution/keys 已補齊（無空白湯面/湯底）。
- app.js 已實作 keys 關鍵字比對機制：使用者提問命中任一題目 keys 即判定為接近解答 (app.js:287-291)。
- 清理重複的 rule.txt（內容重複於全域 CLAUDE.md）與原始 .ods 題庫來源檔（已被 questions.json 取代）。
- 專案根目錄的本機 CLAUDE.md 副本已加入 .gitignore（本專案無其他協作者，不需入庫）。
- 建立 docs/worklog.md、docs/chatlog.md、docs/handoff.md 三份文件框架。
- 桌面版排版改為置中窄版（手機模擬顯示）：#app-container max-width 1200px→480px (style.css:64)；移除 .lobby-controls 於 768px 與 .game-layout 於 992px 的雙欄/橫排 media query override，使桌面與行動裝置外觀一致。已用 Playwright 於 1440x900 視窗截圖驗證。
- Logo 素材測試順序：先試 `Fried Shrimp.png`（玩偶實拍照），後改用使用者提供的 `logo.jpg`（扁平插畫風格，同一角色）。兩個原始檔都保留未動，去背後統一輸出成 `shrimp-logo.png` 套用於 index.html:28。
  - 實拍照（絨毛紋理、有雜訊反光）：需要「局部模糊去噪去除反光雜點」+「模糊邊緣 alpha」處理。
  - 向量插畫（logo.jpg，邊緣本身就乾脆俐落）：改成「不做額外模糊、直接依亮度門檻取 alpha」，否則模糊會在描邊外側留下一圈灰白色的殘影（因為模糊後某些像素的 alpha 是「合成」出來的部分透明值，但該像素原始顏色其實是純白或純咖啡色其中一種，去污染公式會算出錯誤顏色）。
  - 兩者都採用「顏色去污染 (color decontamination)」+ 輸出透明背景 PNG（非填實色），因 header 坐落在 radial-gradient 而非純色背景。
  - 去背腳本為一次性素材處理，未存成專案內固定 script。
- **著作權提醒**：`Fried Shrimp.png`（玩偶實拍照）與 `logo.jpg`（插畫）都是 San-X 官方角落小夥伴角色的衍生素材，屬受著作權保護。本機測試/開發沒有問題，但此專案有 Render 公開 Demo 連結，**正式部署前需使用者自行確認是否有適當使用權利**，agent 僅依指示套用使用者提供的圖檔，未做授權查核。
- 大廳版面：移除搜尋欄位（index.html 原 `.search-box`），同步清掉 app.js 的 `searchInput` 變數與 `filterLobby()` 裡的關鍵字比對邏輯（僅留分類篩選），並移除 style.css 對應的 `.search-box`/`.search-icon`/`#search-input` 規則。已用 Playwright 點擊分類按鈕確認無 JS 錯誤、篩選正常。
- 標題下方文字從英文標語改為三行中文遊戲規則說明（海龜湯定義／提問規則／回答限制），對應調整 .subtitle 樣式（改用 sans 字體、拿掉大寫字距，改為適合多行內文的 line-height）。
- 進入遊戲問答畫面後隱藏頂部 header（logo/標題/規則說明）：header 加上 id="app-header"，在 `startNewGame()` 加 hidden、在返回大廳／結束回大廳時移除 hidden (app.js)。
- 遊戲畫面題目標題置中：`.game-top-bar` 改為三欄 grid (`minmax(0,1fr) auto minmax(0,1fr)`)，返回按鈕 `justify-self:start`，標題落在中間欄自然置中 (style.css)。
- **新增「切換主持人 AI」功能（Gemini／GPT）**：
  - 前端：遊戲狀態面板新增 Gemini/GPT 兩個按鈕 (index.html)，`aiProvider`/`aiProviderLocked` 全域狀態，點擊任一按鈕即鎖定兩顆按鈕（一場遊戲僅能選一次），`startNewGame()` 時重置回 Gemini/解鎖 (app.js)。選擇的 provider 會隨每次 `/api/chat` 請求送出。
  - 後端：`server.js` 依 `req.body.provider` 分流；GPT 分支呼叫 OpenAI Chat Completions API (`gpt-4o-mini`，可用 `OPENAI_MODEL` 環境變數覆寫)，把 Gemini 格式的訊息 (`role/parts`) 轉換成 OpenAI 格式 (`role/content`，`model`→`assistant`)。兩種 provider 各自依其金鑰是否存在判斷 Mock Mode。
  - 已用 Playwright 對兩個 provider 各送出一次真實 API 呼叫測試（`.env` 中的 GEMINI_API_KEY 與 OPENAI_API_KEY 都是有效金鑰，非 mock），皆正常收到「是」的回覆，伺服器 log 無錯誤。**注意：這會消耗兩邊的真實 API 額度/費用**，之後若要重複測試請注意。
- **修復既有 Bug**：`setControlsEnabled()` (app.js) 原本在成功取得 AI 回覆的三處分支都寫成先 `setControlsEnabled(true)` 再 `isGenerating = false`，但函式內部是用**呼叫當下**的 `isGenerating` 值設定 `btnBack.disabled`，導致每場遊戲問完第一個問題後「返回大廳」按鈕永久卡在 disabled。已將三處都改成先 `isGenerating = false` 再呼叫 `setControlsEnabled(true)`（app.js 約 362-363、392-393、406-407 行一帶）。已用 Playwright 驗證：問完問題後 btnBack 不再是 disabled，點擊後能正常返回大廳。
- 取消進入遊戲時聊天室自動出現的系統提示泡泡「AI 主持人已就位。請閱讀上方的湯面...」，`startNewGame()` 改成 `chatBox.innerHTML = ""`（app.js）。對應說明文字改放到 `#chat-input` 的 placeholder：「AI 主持人已就位，請開始發問。」(index.html)。
- 大廳版面鎖定 header／規則說明／分類篩選列，只有題目卡片區塊可滾動：`.app-header` 與 `.lobby-controls` 都改成 `position:sticky`（分別 `top:0` 與 `top:212px`，212px＝目前 header 實際渲染高度，是量測得出的數值，非公式計算；若之後改動 header 內容高度，這個數字需要重新量測調整），背景補 `var(--bg-primary)` 避免卡片滾動時透出。已用 Playwright 捲動整頁到底部驗證 header/篩選列全程固定。
- 題目卡片改為固定 2 行、移除原本 `height:200px` 固定高度：第一行 ID+分類標籤 (`.q-card-top`)，第二行 title+開始推理按鈕同排 (`.q-card-bottom`，`justify-content:space-between`)，標題過長會用 ellipsis 截斷 (app.js renderCards + style.css)。
- questions.json 新增「盲點」分類標籤支援：這個值其實原本就已經零散用在多筆題目的 category1/category2 裡（id 1,3,4,5,7,14,15,21,23），但大廳篩選列跟 `getCategoryClass()` 都沒有對應，等於是個「有資料但用不到」的標籤。已補上：大廳篩選按鈕新增「盲點」(index.html)、`getCategoryClass()` 新增對應 (app.js)、卡片標籤新增綠色 `.tag.blindspot` 樣式 (style.css)、questions.json 的 schema note 補上 category1/category2/highlight 欄位說明。已用 Playwright 點擊「盲點」篩選鈕驗證，篩出的 9 筆與資料吻合。

## 已解決事項
- `Fried Shrimp.png` 消失一事已由使用者確認為手動刪除（不再需要，維持用 `logo.jpg` 產生 `shrimp-logo.png` 的處理方式）。`testlog.txt`（空檔案）使用者要求保留備用，不刪除、也不納入 git 版控。

## 目前的瓶頸或停頓點 (Current Blocker/Status)
- 今日變更已推送至 GitHub（見下方「GitHub 倉庫」）。
- 尚未驗證 keys 關鍵字判定機制的實際遊玩效果。
- 尚未在真實手機瀏覽器（非模擬）上驗證排版與 logo。

## 下一步行動 (Next Steps)
1. 實際遊玩驗證 keys 關鍵字判定是否符合預期（含 mock mode 與有金鑰模式）。
2. 確認排版與 logo 變更在真實手機瀏覽器上也正常。
3. 更新 GitHub README（Demo／專案目標／計畫架構／已完成進度／未完成事項），已於本次推送一併更新，後續變更需持續維護。

## 關鍵設定與上下文 (Key Context & Rules)
- **GitHub 倉庫**：https://github.com/jamessun0919-ops/turtlesoup（main 分支）。此資料夾往後的專案工作皆推送至此處，除非另有指示。
- 伺服器預設 port 為 3000（server.js:10，可用 PORT 環境變數覆寫）；本次測試以 `PORT=8000 node server.js` 於背景執行中。
- 無對應金鑰（GEMINI_API_KEY／OPENAI_API_KEY）時該 provider 自動啟用 Mock Mode。
- questions.json 第 0 筆為 schema 說明用的 note，非實際題目。
- 中英文版本若存在，修改須同步執行；網頁配色需注意底色與文字對比度。
- 若未來要用官方角落小夥伴素材，需使用者自行提供已取得授權的圖檔，agent 不會自行產生/下載該角色的官方外觀重製圖。
- OpenAI 呼叫的 model 名稱寫死預設 `gpt-4o-mini`，可用 `.env` 的 `OPENAI_MODEL` 覆寫，未來若該模型下架需更新。
- `testlog.txt` 為使用者保留的備用空檔案，不納入 git 版控（.gitignore 或不 add）。
