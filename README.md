# 🐢 海龜湯 AI 推理館 (AI Hosted Turtle Soup Game)

[![Node.js CI](https://github.com/jamessun0919-ops/turtlesoup/actions/workflows/node-ci.yml/badge.svg)](https://github.com/jamessun0919-ops/turtlesoup/actions/workflows/node-ci.yml)

本專案是一個懸疑暗黑氛圍的 **海龜湯（側向思考推理）單頁遊戲網頁 (SPA)**，搭載由後端 Node.js Proxy 伺服器代理與金鑰保護的 AI 主持人，支援 **Google Gemini** 與 **OpenAI GPT** 雙引擎切換。

---

## 🚀 體驗通道 (Demo Access)

| 🌐 線上即時體驗 (Render Live) | 💻 本機開發遊玩 | ⚡ 一鍵雲端複製 (Vercel) |
| :---: | :---: | :---: |
| [![Live Demo](https://img.shields.io/badge/Live_Demo-Render-00c0a5?style=for-the-badge&logo=render)](https://turtlesoup-o7au.onrender.com) | [![Local Play](https://img.shields.io/badge/Local_Play-http%3A%2F%2Flocalhost%3A3000-D4AF37?style=for-the-badge&logo=localhost)](http://localhost:3000) | [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fjamessun0919-ops%2Fturtlesoup&env=GEMINI_API_KEY&project-name=turtlesoup-ai) |
| *直接點擊開啟線上版遊玩* | *本機啟動 Node 伺服器後遊玩* | *一鍵複製部署至您個人的平台* |

---

## 🎯 專案目標 (Project Goal)

打造一個免安裝、行動裝置優先（手機模擬窄版排版）的海龜湯推理遊戲網頁，由 AI 擔任嚴謹的「是／否／是也不是／無關」主持人，並讓玩家可自由切換 Gemini 或 GPT 作為主持人引擎，比較兩者的主持風格與回答品質。

---

## 🏗️ 計畫架構 (Architecture)

- `server.js`：Node.js + Express 後端代理伺服器。將 `GEMINI_API_KEY`／`OPENAI_API_KEY` 儲存於伺服器端 `.env`，前端僅呼叫 `/api/chat`，金鑰不會暴露給使用者。依前端傳入的 `provider` 參數分流呼叫 Gemini 或 OpenAI Chat Completions API，未設定金鑰時自動降級為本地 Mock 模式。
- `index.html` / `style.css` / `app.js`：SPA 前端骨架、懸疑暗黑風格樣式、狀態管理與畫面渲染邏輯。
- `questions.json`：海龜湯題庫（湯面／湯底／分類標籤／關鍵字），第一筆為欄位說明用的 schema note。
- `rules_host.txt` / `rules_hint.txt`：AI 主持人在一般模式／提示模式下的系統提示詞規則。
- `docs/`：工作日誌 (worklog)、對話紀錄 (chatlog)、交接文件 (handoff)，每個工作日結束時彙整一次。

**主要功能特色**：
1. **無狀態安全代理**：金鑰只存在伺服器端，前端無法逆向取得。
2. **雙 AI 引擎切換**：遊戲中可選擇 Gemini 或 GPT，選擇後鎖定（一場遊戲僅能選一次）。
3. **推理筆記功能**：自動記錄提問摘要與 AI 核心判定（是／否／是也不是／無關）。
4. **智慧降級與容災**：Gemini 主模型過載時自動降級至備用模型。
5. **關鍵字自動判定**：提問命中題目關鍵字時自動判定為解開謎題。
6. **免金鑰本地模擬器 (Mock Mode)**：未設定金鑰時仍可完整體驗前端互動。

---

## ✅ 已完成進度 (Completed)

- 全數 23 題湯面／湯底／關鍵字內容補齊，含「盲點」等分類標籤與大廳篩選功能。
- 手機模擬置中窄版排版（桌面與行動裝置外觀一致），大廳 header／規則說明／分類篩選列鎖定，僅題目卡片可捲動。
- 遊戲畫面：進入問答後隱藏頂部 header、標題置中、聊天室簡化為 placeholder 提示。
- 新增「切換主持人 AI」功能（Gemini／GPT），已完成前後端串接與端對端測試。
- 修復「返回大廳」按鈕在問完問題後永久卡死的既有 bug。

## 🚧 未完成事項 (TODO)

- keys 關鍵字判定機制尚待更大量的實際遊玩驗證。
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
兩把金鑰皆為選填，未設定的引擎會自動以 Mock Mode 運作。

### 3. 啟動伺服器
```bash
npm start
```
伺服器啟動後，請開啟瀏覽器訪問 [http://localhost:3000](http://localhost:3000) 即可開始遊玩！
