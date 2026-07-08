# 🐢 海龜湯 AI 推理館 (AI Hosted Turtle Soup Game)

[![Node.js CI](https://github.com/jamessun0919-ops/turtlesoup/actions/workflows/node-ci.yml/badge.svg)](https://github.com/jamessun0919-ops/turtlesoup/actions/workflows/node-ci.yml)

本專案是一個懸疑暗黑氛圍的 **海龜湯（側向思考推理）單頁遊戲網頁 (SPA)**，搭載由後端 Node.js Proxy 伺服器代理與金鑰保護的 AI 主持人，以 **Google Gemini** 為主要引擎、**OpenAI GPT** 作為自動備援，確保主持人服務穩定不中斷。

---

## 🚀 體驗通道 (Demo Access)

| 🌐 線上即時體驗 (Render Live) | 💻 本機開發遊玩 | ⚡ 一鍵雲端複製 (Vercel) |
| :---: | :---: | :---: |
| [![Live Demo](https://img.shields.io/badge/Live_Demo-Render-00c0a5?style=for-the-badge&logo=render)](https://turtlesoup-o7au.onrender.com) | [![Local Play](https://img.shields.io/badge/Local_Play-http%3A%2F%2Flocalhost%3A3000-D4AF37?style=for-the-badge&logo=localhost)](http://localhost:3000) | [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fjamessun0919-ops%2Fturtlesoup&env=GEMINI_API_KEY&project-name=turtlesoup-ai) |
| *直接點擊開啟線上版遊玩* | *本機啟動 Node 伺服器後遊玩* | *一鍵複製部署至您個人的平台* |

---

## 🎯 專案目標 (Project Goal)

打造一個免安裝、行動裝置優先（手機模擬窄版排版）的海龜湯推理遊戲網頁，由 AI 擔任嚴謹的「是／否／是也不是／無關」主持人，主引擎 Gemini 無法使用時自動降級改用備援 OpenAI GPT，確保玩家體驗一致且不中斷。

---

## 🏗️ 計畫架構 (Architecture)

- `server.js`：Node.js + Express 後端代理伺服器。將 `GEMINI_API_KEY`／`OPENAI_API_KEY` 儲存於伺服器端 `.env`，前端僅呼叫 `/api/chat`，金鑰不會暴露給使用者。以 Gemini 為主要引擎（`callGemini()`），失敗或無金鑰時自動降級改用備援 OpenAI（`callOpenAI()`），兩者皆無金鑰時降級為本地 Mock 模式。
- `index.html` / `style.css` / `app.js`：SPA 前端骨架、懸疑暗黑風格樣式、狀態管理與畫面渲染邏輯。
- `questions.json`：海龜湯題庫（湯面／湯底／分類標籤／關鍵字），第一筆為欄位說明用的 schema note。
- `rules_host.txt` / `rules_hint.txt`：AI 主持人在一般模式／提示模式下的系統提示詞規則。
- `docs/`：工作日誌 (worklog)、對話紀錄 (chatlog)、交接文件 (handoff)、AI 主持人規則訓練紀錄 (training)，每個工作日結束時彙整一次。

**主要功能特色**：
1. **無狀態安全代理**：金鑰只存在伺服器端，前端無法逆向取得。
2. **單向自動備援**：Gemini 為主要引擎，過載或無法使用時自動降級改用備援 OpenAI，玩家無需手動切換。
3. **統一破關判定**：提問內容命中題目關鍵字，或語意上完整涵蓋湯底核心要素，即自動判定解開謎題並顯示完整湯底。
4. **智慧降級與容災**：Gemini 主模型過載時自動於備用模型間切換，全數失敗才降級 OpenAI。
5. **免金鑰本地模擬器 (Mock Mode)**：未設定任何金鑰時仍可完整體驗前端互動。

---

## ✅ 已完成進度 (Completed)

- 全數題目湯面／湯底／關鍵字內容補齊，含「盲點」等分類標籤與大廳篩選功能。
- 手機模擬置中窄版排版（桌面與行動裝置外觀一致），大廳 header／規則說明／分類篩選列鎖定，僅題目卡片可捲動。
- 遊戲畫面：進入問答後隱藏頂部 header、標題置中；問題輸入框移至對話框最上方，對話顯示改為最新回合置頂；提示模式開關移到標題列右側；已提問次數移至湯面卡片標題列右側。
- 簡化遊戲機制：移除「遊戲狀態（含手動切換主持人）」「推理筆記」「猜測真相」面板；主持人 AI 改為 Gemini 主引擎＋ OpenAI 單向自動備援；破關判定統一為「提問命中關鍵字或語意涵蓋湯底」。
- 修復「返回大廳」按鈕在問完問題後永久卡死的既有 bug。
- 建立 `docs/training.txt` 作為 AI 主持人規則調整的專用訓練紀錄，累積規則微調的討論脈絡與真實 API 測試結果。

## 🚧 未完成事項 (TODO)

- 「開放式問題誤判」修正尚未完全解決：部分不標準提問句型（例如含「誰」的問句）仍可能被誤判為開放式問題而拒答，需累積更多實際案例持續調整。
- 排版與 logo 尚未在真實手機瀏覽器（非模擬視窗）上實測。
- Logo 使用的角色素材（角落小夥伴炸蝦尾）屬 San-X 官方著作權素材，正式對外經營前需自行確認使用授權。

---

## 🛠️ 本地開發與啟動指南 (Local Setup)

### 1. 安裝套件依賴
在專案根目錄中執行：
```bash
npm install
```

### 2. 配置 API 金鑰
在專案根目錄中建立或編輯 `.env` 檔案，填入您的金鑰：
```env
GEMINI_API_KEY=您的_GEMINI_API_KEY
OPENAI_API_KEY=您的_OPENAI_API_KEY
```
兩把金鑰皆為選填；只要設定其中一把即可正常運作（Gemini 為主、OpenAI 為備援），兩把都未設定時會自動以 Mock Mode 運作。

### 3. 啟動伺服器
```bash
npm start
```
伺服器啟動後，請開啟瀏覽器訪問 [http://localhost:3000](http://localhost:3000) 即可開始遊玩！
