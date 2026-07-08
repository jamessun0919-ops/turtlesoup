# 交接文件 (Handoff)

> 精簡且高度機器可讀，供下次啟動時直接貼上作為 Prompt。此文件會被覆寫為最新狀態（非累積式日誌）。

## 專案目標 (Project Goal)
海龜湯（側向思考推理）單頁遊戲網頁，由 Node.js Proxy 伺服器代理 AI（Gemini 為主、OpenAI GPT 為自動備援）作為主持人。

## 已完成進度 (Completed)
- questions.json 全部題目的 description/solution/keys 已補齊；keys 關鍵字比對機制已驗證。
- 桌面/手機統一置中窄版排版；大廳 header/篩選列 sticky 鎖定；卡片精簡為 2 行；「盲點」分類標籤。
- 遊戲機制簡化：僅保留「放棄並觀看完整湯底」；主持人 AI 改為 Gemini 主引擎＋ OpenAI 單向自動備援；破關判定統一。
- `docs/training.txt`：AI 主持人規則訓練紀錄，記錄議題 A（認知落差判定，已驗證有效）與議題 B（開放式問題誤判，**尚未完全解決**）。
- 伺服器端 `hasYesNoMarker()` 決定性判斷句尾是非題標記；Gemini/OpenAI `temperature` 降為 0。
- **移除爭議 logo 素材**：`shrimp-logo.png` 檔案與程式引用已全數刪除，大廳標題改為純文字，不放替代圖片。`logo.jpg`（使用者原始上傳照片，未被程式引用）仍留在 repo 未動。
- **修正遊戲頁進入時捲動位置錯誤**：`startNewGame()` 未重置 `window.scrollTo`，導致大廳滑動過後進入遊戲會停在接近頁尾處；已加 `window.scrollTo(0, 0)`，並用 Playwright 模擬「大廳先滑到 scrollY=800 再進入遊戲」驗證修正有效。
- **新增「提示模式選擇」彈窗**：提問滿 3 題、且瀏覽器 `localStorage`（key: `turtlesoup_hintMode`，值 `"on"`/`"off"`）尚未記錄過選擇時彈出，強制二選一（AI提示/無提示），選擇後寫入 localStorage；原提示切換開關仍保留、手動切換也會同步寫入。之後題目結束／返回大廳／重新選題目／重新整理頁面皆沿用已記錄的模式，不再重複彈出。
- **README 修正**：Live Demo 徽章連結語法錯誤已修回；`<mark>` 標籤因 GitHub 會整段剝除 `style` 屬性、深色模式對比度不足，已全部改為 `**粗體**`（不依賴顏色、任何主題下都可讀）。
- **重大安全性重構（commit `54734bb`）**：
  - 原本 `questions.json`（含全部湯底/關鍵字）會整包下載到前端，且因整個專案目錄被 `express.static` 靜態託管，`questions.json`／`server.js`／`rules_host.txt`／`rules_hint.txt`／`package.json` 等檔案皆可被直接 GET 下載（已用 curl 實測證實）。
  - 題庫改為僅存於伺服器記憶體；新增 `GET /api/questions`（回傳過濾後的公開欄位，無 solution/keys）與 `GET /api/questions/:id/solution`（放棄/破關時取得湯底）。
  - `POST /api/chat` 改收 `questionId`（**breaking change**，原本是收整個 `game` 物件），伺服器依 id 查表帶入湯底，不再信任前端傳來的內容；關鍵字即時破案判定也搬到伺服器端。
  - 靜態檔案服務改為僅明確開放 `index.html`／`style.css`／`app.js`，其餘路徑一律回退到 SPA fallback（回傳 index.html 而非洩漏檔案內容）；`vercel.json` 同步移除 `questions.json`／`rules_*.txt` 的公開路由，新增 `/api/questions` 路由。
  - `/api/chat` 新增 `express-rate-limit`：每 IP 15 分鐘最多 30 次請求，防止繞過前端直接打 API 消耗金鑰額度。
  - 已用真實伺服器（非 mock）驗證：`/api/questions` 無 solution/keys 欄位；`/questions.json`、`/server.js`、`/.env`、`/rules_host.txts` 等路徑皆回傳 SPA fallback；關鍵字破案與放棄看湯底流程皆正確顯示伺服器回傳的湯底；花 1 次真實 Gemini 呼叫驗證改寫後的 system prompt 組裝邏輯正常；rate limit 標頭確認存在。

## 目前的瓶頸或停頓點 (Current Blocker/Status)
- 議題 B（開放式問題誤判）修正**尚未完全解決**：`temperature=0` 已解決「同句話重複問答案不一致」，但動態覆寫指令對 **GPT-4o-mini 目前無效**；對 Gemini 是否有效**尚未驗證**（先前測試時 Gemini 免費額度已用盡，全數落到 OpenAI 備援）。
- **正式環境（Render／Vercel）尚未確認已用最新 commit `54734bb` 重新部署並實測**：這次 `/api/chat` 的請求格式從 `{game: {...}}` 改成 `{questionId: ...}` 是破壞性變更，若正式環境還在跑舊版前端快取，會因缺少 `questionId` 被後端擋掉（400）。部署完成後務必實際玩一輪確認。
- `vercel.json` 的路由改動（新增 `/api/questions` 路由、移除 `questions.json`/`rules_*.txt` 路由）**未在真實 Vercel 環境測試過**，只確認過本機 Express 伺服器行為；若專案仍在用 Vercel 部署，建議部署後額外驗證。
- README「未完成事項」仍列著兩則已經過時的項目（「排版與 logo 尚未在真機測試」「logo 著作權疑慮」）——手機排版已由使用者在真實瀏覽器測試完畢、logo 已整個移除不再適用，尚未清理，因為之前只有口頭提出未獲得使用者確認是否要動。

## 下一步行動 (Next Steps)
1. 確認 Render／Vercel 是否已自動部署最新 commit（`54734bb`），並在正式環境實際玩一輪，確認 `questionId` 破壞性變更沒有造成 400 錯誤。
2. 等 Gemini 免費額度重置後，用 `docs/training.txt` 議題 B 最後一節的測試句重新驗證這次修正對 Gemini 是否有效。
3. 若對 GPT-4o-mini 仍無效，考慮：(a) 覆寫指令挪到 systemInstruction 最前面、(b) 改用結構化輸出強迫模型先給分類欄位。
4. 詢問使用者是否要一併清理 README 未完成事項裡兩則已過時的項目。
5.（低優先權，已列入 README TODO）`server.js` Mock Mode 的關鍵字判斷目前寫死對應兩三題，其餘題目在無金鑰模式下會答非所問，需要時再改成依題目 id 查表判斷。

## 關鍵設定與上下文 (Key Context & Rules)
- **GitHub 倉庫**：https://github.com/jamessun0919-ops/turtlesoup（main 分支）。此資料夾往後的專案工作皆推送至此處，除非另有指示。
- 伺服器預設 port 為 3000（server.js，可用 PORT 環境變數覆寫）。
- 無對應金鑰（GEMINI_API_KEY／OPENAI_API_KEY）時系統自動啟用 Mock Mode（兩把金鑰都沒有才會啟用）。
- **真實 API 測試務必節制**：Gemini 免費額度每模型僅 20 次/期。測試新功能時優先用「關鍵字即時破案」路徑（不呼叫 LLM）或攔截 `/api/chat` 網路請求（如 Playwright `page.route`）驗證前端邏輯，只有在需要驗證伺服器端 system prompt 組裝邏輯本身時才打真實 API，且僅打最少必要次數。
- **`/api/chat` 請求格式（breaking change, commit 54734bb 起）**：body 為 `{ messages, isHintMode, questionId }`，不再是 `{ messages, isHintMode, game: {...} }`。伺服器依 `questionId` 從記憶體題庫查出完整題目（含湯底/關鍵字）。
- **新增端點**：`GET /api/questions`（大廳用，過濾後不含 solution/keys）、`GET /api/questions/:id/solution`（破案/放棄時取得湯底）。
- **靜態檔案僅開放 3 個**：`index.html`／`style.css`／`app.js`（server.js 用明確路由，非整目錄 `express.static`）。之後如需新增前端要直接抓取的靜態檔案（例如新圖片），記得在 server.js 加對應的明確路由，否則會被 SPA fallback 擋掉變成回傳 index.html。
- questions.json 第 0 筆為 schema 說明用的 note，非實際題目；題目標題可能被開發者直接於 IDE 編輯，若程式或測試腳本硬編標題字串，需以當下 questions.json 內容為準。
- 規則檔案（`rules_host.txt`／`rules_hint.txt`）段落順序：核心回答規範／特別限制（拒答範例）→ 是非題判斷方法（代換測試法）→ 認知落差判定 → 破案判定 → 資訊邊界原則。兩份檔案需保持同步修改。這兩份檔案現在也不再對外公開下載（見安全性重構）。
- `docs/training.txt` 是獨立於 `docs/chatlog.md` 的規則訓練紀錄，每次「主持人規則補充/調整」類型的討論都應記錄於此。
- 中英文版本若存在，修改須同步執行；網頁配色需注意底色與文字對比度（例如 GitHub README 會整段剝除 `style` 屬性，畫重點請優先用 `**粗體**` 而非 `<mark style="...">`）。
- 提示模式偏好存於瀏覽器 `localStorage`（key: `turtlesoup_hintMode`），跨遊戲/重新整理皆會維持；相關 DOM id：`hint-mode-overlay`／`btn-hint-mode-on`／`btn-hint-mode-off`。
- OpenAI 呼叫的 model 名稱寫死預設 `gpt-4o-mini`，可用 `.env` 的 `OPENAI_MODEL` 覆寫。
- `testlog.txt` 為使用者保留的備用空檔案，不納入 git 版控。
- `express-rate-limit` 已加入 package.json 依賴，`/api/chat` 限制每 IP 15 分鐘 30 次請求。
