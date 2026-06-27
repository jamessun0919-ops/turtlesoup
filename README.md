# 🐢 海龜湯 AI 推理館 (AI Hosted Turtle Soup Game)

[![Node.js CI](https://github.com/jamessun0919-ops/turtlesoup/actions/workflows/node-ci.yml/badge.svg)](https://github.com/jamessun0919-ops/turtlesoup/actions/workflows/node-ci.yml)

本專案是一個懸疑暗黑氛圍的 **海龜湯（側向思考推理）單頁遊戲網頁 (SPA)**，搭載由後端 Node.js Proxy 伺服器代理與金鑰保護的 **Google Gemini 3.5 Flash** 智慧 AI 主持人。

---

## 🚀 體驗按鈕 (Demo Actions)

| 💻 本機啟動體驗 | ⚡ 一鍵雲端部署 (線上 Demo) |
| :---: | :---: |
| [![Local Demo](https://img.shields.io/badge/Local_Play-http%3A%2F%2Flocalhost%3A3000-D4AF37?style=for-the-badge&logo=localhost)](http://localhost:3000) | [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fjamessun0919-ops%2Fturtlesoup&env=GEMINI_API_KEY&project-name=turtlesoup-ai) |
| *請先於本機安裝依賴並啟動 Node 伺服器* | *一鍵將本專案複製並部署至您個人的 Vercel 平台，僅需填入金鑰即可開啟線上免金鑰 Demo！* |

---

## 🎨 遊戲特色 (Key Features)

1. **無狀態安全代理 (Stateless Proxy)**：
   - 採用 Node.js + Express 架構，將 `GEMINI_API_KEY` 儲存於伺服器端的 `.env` 設定檔中。
   - 前端僅呼叫 `/api/chat`，完全防止您的 Gemini API 金鑰被前端使用者逆向工程外洩。
2. **推理筆記功能 (Deduction Notebook)**：
   - 遊戲室右側內建推理筆記，會自動截取您提問的前 10 個字，且排除額外提示內容，僅記錄核心判定結果（**是**／**否**／**是也不是**／**無關**／**是非題**）。
3. **智慧降級與容災 (Self-healing Fallback)**：
   - 當 Gemini 3.5 Flash 因全球高存取流量拋出 503 超載或 429 頻率限制錯誤時，伺服器會自動降級並重試 `gemini-2.5-flash`，確保主持人服務不中斷。
4. **開放式提問過濾**：
   - 當玩家發問「為什麼、如何、是誰」等非是非題之開放式問題時，AI 均會自動回覆並過濾「遊戲只能詢問是非題喔」，引導正確推理。
5. **免金鑰本地模擬器 (Mock Mode)**：
   - 當未在環境變數中填寫金鑰時，伺服器會自動啟用模擬主持人以供快速展示所有前端 UI 與問答功能。

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
```

### 3. 啟動伺服器
```bash
npm start
```
伺服器啟動後，請開啟瀏覽器訪問 [http://localhost:3000](http://localhost:3000) 即可開始遊玩！

---

## 📂 專案檔案結構
- `server.js`：Node.js 後端代理伺服器，處理 Gemini API 請求與安全金鑰管理。
- `index.html`：SPA 單頁前端網頁骨架。
- `style.css`：懸疑暗黑推理氛圍樣式與動畫。
- `app.js`：前端核心狀態、打字機渲染與對話更新邏輯。
- `questions.json`：海龜湯題目庫（包含預設的詳細湯面與答案）。
- `rules_host.txt` / `rules_hint.txt`：AI 主持人在不同模式下的系統提示詞引導規則。
