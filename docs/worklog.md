# 工作日誌 (Work Log)

> 每個工作日結束時彙整一次，記錄當日完成的項目。非每個任務都更新。

---

## 2026-07-07

- 補齊 questions.json 全部 23 題的 description（湯面）/solution（湯底）/keys（關鍵字），並補上 keys 關鍵字自動判定「接近解答」機制 (app.js)。
- 清理重複檔案：刪除與全域 CLAUDE.md 重複的 rule.txt、已被 questions.json 取代的原始題庫 .ods 檔。
- 建立 docs/worklog.md、docs/chatlog.md、docs/handoff.md 三份文件框架，作為往後每日彙整的固定格式。
- 桌面版排版改為置中窄版（手機模擬顯示），移除桌面專用的雙欄/橫排版型，桌面與行動裝置外觀一致。
- 大廳與遊戲畫面版面調整：移除搜尋欄位；標題下方文字改為三行中文遊戲規則說明；進入問答畫面後隱藏頂部 header；題目標題置中；大廳的 header／規則／分類篩選列改為鎖定（sticky），只有題目卡片可捲動；題目卡片壓縮為固定 2 行（ID+標籤／標題+按鈕）。
- 新增「盲點」分類標籤：原本資料裡已零散使用但大廳篩選與標籤顏色都沒對應，這次補上篩選按鈕、標籤樣式與 questions.json 的欄位說明。
- Logo 圖示更換：測試角落小夥伴炸蝦尾玩偶照與插畫圖（使用者提供），去背處理後套用；已提醒使用者著作權歸屬與公開部署前需自行確認使用權利。
- 新增「切換主持人 AI」功能：遊戲畫面可選擇 Gemini 或 GPT 作為主持人，選擇後鎖定（一場遊戲僅能選一次）；後端 server.js 新增 OpenAI Chat Completions API 分支，兩種 provider 皆已用真實金鑰做端對端測試。
- 修復既有 Bug：問完問題後「返回大廳」按鈕會永久卡在 disabled 的狀態（isGenerating 判斷順序問題），已修正並驗證。
- 移除進入遊戲時聊天室自動出現的系統提示泡泡，改放進輸入欄 placeholder。
- 推送今日所有變更至 GitHub（jamessun0919-ops/turtlesoup, main 分支）。
