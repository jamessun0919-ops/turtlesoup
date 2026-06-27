const express = require('express');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// 載入環境變數
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// 託管根目錄下的靜態前端網頁與資料檔
app.use(express.static(path.join(__dirname)));

// 遊戲問答代理端點 (POST /api/chat)
app.post('/api/chat', async (req, res) => {
  const { messages, isHintMode, game } = req.body;
  
  if (!messages || !game) {
    return res.status(400).json({ 
      error: "INVALID_REQUEST", 
      message: "缺少必要參數 (messages, game)" 
    });
  }
  
  const apiKey = process.env.GEMINI_API_KEY;
  const isMockMode = !apiKey || apiKey === "YOUR_GEMINI_API_KEY_HERE" || apiKey.trim() === "";
  
  if (isMockMode) {
    console.log(`[提示] 偵測到 API 金鑰尚未配置。系統已啟用「AI 主持人模擬器 (Mock Mode)」以供功能展示與測試。`);
  }
  
  try {
    if (isMockMode) {
      // 本地 Mock 主持人邏輯，用於免金鑰的完整功能示範
      const queryText = messages[messages.length - 1].parts[0].text;
      const isGuessQuery = queryText.includes("推論：");
      const cleanQuery = queryText.replace("提問：", "").replace("推論：", "").trim();
      
      let reply = "";
      if (isGuessQuery) {
        // 比對推論與湯底的關鍵字匹配度
        const matchTerms = ["燈塔", "看守", "指引", "船", "撞", "沉", "自責", "自殺", "高跟鞋", "矮", "蒙眼", "飛刀", "切", "死", "蚊子", "吸血", "拍死", "撐", "飽"];
        let hitCount = 0;
        for (const term of matchTerms) {
          if (cleanQuery.includes(term)) hitCount++;
        }
        
        if (hitCount >= 2 || cleanQuery.includes("看守") || cleanQuery.includes("飛刀") || cleanQuery.includes("蚊子")) {
          reply = "恭喜你，你解開了這碗海龜湯！";
        } else {
          reply = "否";
        }
      } else {
        // 偵測是否為開放式問題 (Mock 模式判定)
        const openQuestionTerms = ["為什麼", "怎麼", "如何", "是誰", "什麼", "在哪", "哪裡", "原因", "幾", "誰"];
        const isOpenQuestion = openQuestionTerms.some(t => cleanQuery.includes(t));
        
        const yesTerms = ["是嗎", "燈塔", "看守", "工作", "職業", "飛刀", "馬戲團", "高跟鞋", "矮", "高", "蚊子", "吸血", "血", "拍死", "死", "船", "觸礁", "撞", "關燈"];
        const irrTerms = ["名字", "天氣", "顏色", "年齡", "家人", "妻子", "星期幾", "早餐", "紅", "黃", "綠", "藍", "黑", "白", "紫", "粉", "色"];
        
        let isYes = yesTerms.some(t => cleanQuery.includes(t));
        let isIrr = irrTerms.some(t => cleanQuery.includes(t));
        
        if (isOpenQuestion) {
          reply = "遊戲只能詢問是非題喔";
        } else if (isIrr) {
          reply = isHintMode ? "無關，這對拼湊出故事真相沒有任何幫助。" : "無關";
        } else if (isYes) {
          reply = isHintMode ? "是，你抓到關鍵點了！這跟主角的特殊職業或環境高度相關。" : "是";
        } else {
          // 是也不是
          if (cleanQuery.includes("人") || cleanQuery.includes("男") || cleanQuery.includes("女") || cleanQuery.includes("知道")) {
            reply = "是也不是";
          } else {
            reply = isHintMode ? "否，或許你該換個方向思考，注意他的動機。" : "否";
          }
        }
      }
      
      // 延遲 500ms 模擬網路通訊
      await new Promise(resolve => setTimeout(resolve, 500));
      return res.json({ reply });
    }
    // 根據提示模式，載入對應的規則文字檔
    const ruleFile = isHintMode ? 'rules_hint.txt' : 'rules_host.txt';
    const rulePath = path.join(__dirname, ruleFile);
    
    if (!fs.existsSync(rulePath)) {
      return res.status(500).json({ 
        error: "RULE_FILE_MISSING", 
        message: `伺服器找不到指定的規則檔案: ${ruleFile}` 
      });
    }
    
    const ruleText = fs.readFileSync(rulePath, 'utf8');
    
    // 組合系統指令 (System Instruction)
    const systemInstruction = `
      ${ruleText}
      
      【當前進行的謎題資訊】
      題目名稱：${game.title}
      湯面（謎題故事）：${game.description || "未提供詳細湯面"}
      湯底（故事真相答案）：${game.solution}
    `;
    
    const models = ["gemini-3.5-flash", "gemini-2.5-flash"];
    let apiRes;
    let currentModel = "";
    let lastErrorMsg = "";
    let lastErrorStatus = 200;
    let lastErrorReason = "";
    
    for (const model of models) {
      currentModel = model;
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      
      const payload = {
        contents: messages,
        systemInstruction: {
          parts: [{ text: systemInstruction }]
        },
        generationConfig: {
          temperature: 0.2
        }
      };
      
      // 調用 Gemini API (使用 Node.js 內建的 fetch)
      apiRes = await fetch(geminiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      
      if (apiRes.ok) {
        break;
      }
      
      const errData = await apiRes.json().catch(() => ({}));
      lastErrorStatus = apiRes.status;
      lastErrorMsg = errData.error?.message || "Gemini API 呼叫失敗";
      lastErrorReason = errData.error?.status || "";
      
      console.warn(`[API警告] 使用模型 ${model} 失敗 (狀態碼 ${lastErrorStatus}): ${lastErrorMsg}`);
      
      // 判斷是否為可重試的超載/限流錯誤
      const isRetryableError = lastErrorStatus === 429 || 
                               lastErrorStatus === 503 || 
                               lastErrorReason === "RESOURCE_EXHAUSTED" || 
                               lastErrorMsg.includes("high demand") || 
                               lastErrorMsg.includes("temporary");
                               
      if (!isRetryableError) {
        break;
      }
      
      console.log(`[自動降級] 模型 ${model} 目前負載過高，自動嘗試切換至下一個備用模型...`);
    }
    
    if (!apiRes.ok) {
      console.error(`[API錯誤] 嘗試所有備用模型後依然失敗。最後錯誤 (狀態碼 ${lastErrorStatus}): ${lastErrorMsg}`);
      
      // 偵測頻率限制或額度超限
      if (lastErrorStatus === 429 || lastErrorStatus === 503 || lastErrorReason === "RESOURCE_EXHAUSTED" || lastErrorMsg.includes("Quota exceeded") || lastErrorMsg.includes("high demand")) {
        return res.status(429).json({
          error: "RESOURCE_EXHAUSTED",
          message: "目前 AI 主持人存取次數過於頻繁，或伺服器負載過高。請稍候再試。"
        });
      }
      
      return res.status(500).json({
        error: "API_ERROR",
        message: `AI 主持人連線失敗 (${lastErrorMsg})`
      });
    }
    
    const data = await apiRes.json();
    if (!data.candidates || data.candidates.length === 0) {
      return res.status(500).json({ 
        error: "EMPTY_RESPONSE", 
        message: "AI 主持人沒有給予任何回覆。" 
      });
    }
    
    const responseText = data.candidates[0].content.parts[0].text;
    res.json({ reply: responseText });
    
  } catch (error) {
    console.error("伺服器處理 API 請求時發生錯誤:", error);
    res.status(500).json({ 
      error: "INTERNAL_ERROR", 
      message: "伺服器內部發生未知錯誤。" 
    });
  }
});

// 單頁應用 (SPA) 路由回退，確保直接整理頁面時仍能載入
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`  海龜湯 AI 主持人代理伺服器已啟動！`);
  console.log(`  本地網址: http://localhost:${PORT}`);
  console.log(`==================================================`);
});
