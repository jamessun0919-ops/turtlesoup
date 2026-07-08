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

function isValidKey(key) {
  return !!key && key !== "YOUR_GEMINI_API_KEY_HERE" && key !== "YOUR_OPENAI_API_KEY_HERE" && key.trim() !== "";
}

// 句尾是否帶有明確的是非題標記（嗎/是不是/是否/有沒有/對不對）。
// 這類句子即使內含「誰」、「什麼」、「哪裡」等疑問詞，結構上仍是合法的是非題，
// 不應交由 AI 自行判斷是否拒答（該判斷已證實不穩定），改用程式碼直接判定。
const YES_NO_MARKER_REGEX = /(嗎|是不是|是否|有沒有|對不對)/;

function hasYesNoMarker(text) {
  return YES_NO_MARKER_REGEX.test(text);
}

// 呼叫 Gemini API，過載時自動於備用模型間切換
async function callGemini(apiKey, systemInstruction, messages) {
  const models = ["gemini-3.5-flash", "gemini-2.5-flash"];
  let lastErrorMsg = "";
  let lastErrorStatus = 200;
  let lastErrorReason = "";

  for (const model of models) {
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const payload = {
      contents: messages,
      systemInstruction: {
        parts: [{ text: systemInstruction }]
      },
      generationConfig: {
        temperature: 0
      }
    };

    const apiRes = await fetch(geminiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (apiRes.ok) {
      const data = await apiRes.json();
      if (!data.candidates || data.candidates.length === 0) {
        return { ok: false, status: 500, message: "AI 主持人沒有給予任何回覆。" };
      }
      return { ok: true, replyText: data.candidates[0].content.parts[0].text };
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

    if (!isRetryableError) break;

    console.log(`[自動降級] 模型 ${model} 目前負載過高，自動嘗試切換至下一個備用模型...`);
  }

  console.error(`[API錯誤] Gemini 嘗試所有備用模型後依然失敗。最後錯誤 (狀態碼 ${lastErrorStatus}): ${lastErrorMsg}`);

  const isQuotaError = lastErrorStatus === 429 || lastErrorStatus === 503 || lastErrorReason === "RESOURCE_EXHAUSTED" || lastErrorMsg.includes("Quota exceeded") || lastErrorMsg.includes("high demand");

  return {
    ok: false,
    status: isQuotaError ? 429 : 500,
    message: isQuotaError ? "目前 AI 主持人存取次數過於頻繁，或伺服器負載過高。請稍候再試。" : `AI 主持人連線失敗 (${lastErrorMsg})`
  };
}

// 呼叫 OpenAI API，僅作為 Gemini 無法使用時的備援引擎
async function callOpenAI(apiKey, systemInstruction, messages) {
  const openaiModel = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const openaiMessages = [
    { role: "system", content: systemInstruction },
    ...messages.map(m => ({
      role: m.role === "model" ? "assistant" : "user",
      content: (m.parts || []).map(p => p.text).join("")
    }))
  ];

  const apiRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: openaiModel,
      messages: openaiMessages,
      temperature: 0
    })
  });

  if (!apiRes.ok) {
    const errData = await apiRes.json().catch(() => ({}));
    const errMsg = errData.error?.message || "OpenAI API 呼叫失敗";
    console.error(`[API錯誤] 備援 OpenAI (${openaiModel}) 呼叫失敗 (狀態碼 ${apiRes.status}): ${errMsg}`);

    if (apiRes.status === 429) {
      return {
        ok: false,
        status: 429,
        message: "目前 AI 主持人存取次數過於頻繁，或伺服器負載過高。請稍候再試。"
      };
    }

    return { ok: false, status: 500, message: `AI 主持人連線失敗 (${errMsg})` };
  }

  const data = await apiRes.json();
  const responseText = data.choices?.[0]?.message?.content;

  if (!responseText) {
    return { ok: false, status: 500, message: "AI 主持人沒有給予任何回覆。" };
  }

  return { ok: true, replyText: responseText };
}

// 遊戲問答代理端點 (POST /api/chat)
app.post('/api/chat', async (req, res) => {
  const { messages, isHintMode, game } = req.body;

  if (!messages || !game) {
    return res.status(400).json({
      error: "INVALID_REQUEST",
      message: "缺少必要參數 (messages, game)"
    });
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const hasGeminiKey = isValidKey(geminiKey);
  const hasOpenAIKey = isValidKey(openaiKey);

  if (!hasGeminiKey && !hasOpenAIKey) {
    console.log(`[提示] 偵測到 AI API 金鑰尚未配置。系統已啟用「AI 主持人模擬器 (Mock Mode)」以供功能展示與測試。`);

    // 本地 Mock 主持人邏輯，用於免金鑰的完整功能示範
    const queryText = messages[messages.length - 1].parts[0].text;
    const cleanQuery = queryText.replace("提問：", "").trim();

    // 偵測是否為開放式問題 (Mock 模式判定)
    // 句尾若有明確是非題標記（嗎/是不是等），即使內含疑問詞，也不算開放式問題
    const openQuestionTerms = ["為什麼", "怎麼", "如何", "是誰", "什麼", "在哪", "哪裡", "原因", "幾", "誰"];
    const isOpenQuestion = openQuestionTerms.some(t => cleanQuery.includes(t)) && !hasYesNoMarker(cleanQuery);

    // 比對提問與湯底的關鍵詞符合度，模擬「提問完整涵蓋湯底真相」的破案判定
    const solveTerms = ["燈塔", "看守", "指引", "船", "撞", "沉", "自責", "自殺", "高跟鞋", "矮", "蒙眼", "飛刀", "切", "死", "蚊子", "吸血", "拍死", "撐", "飽"];
    const solveHits = solveTerms.filter(term => cleanQuery.includes(term)).length;
    const isFullSolve = solveHits >= 2 || cleanQuery.includes("看守") || cleanQuery.includes("飛刀") || cleanQuery.includes("蚊子");

    const yesTerms = ["是嗎", "燈塔", "看守", "工作", "職業", "飛刀", "馬戲團", "高跟鞋", "矮", "高", "蚊子", "吸血", "血", "拍死", "死", "船", "觸礁", "撞", "關燈"];
    const irrTerms = ["名字", "天氣", "顏色", "年齡", "家人", "妻子", "星期幾", "早餐", "紅", "黃", "綠", "藍", "黑", "白", "紫", "粉", "色"];

    const isYes = yesTerms.some(t => cleanQuery.includes(t));
    const isIrr = irrTerms.some(t => cleanQuery.includes(t));

    let reply = "";
    if (isOpenQuestion) {
      reply = "遊戲只能詢問是非題喔";
    } else if (isFullSolve) {
      reply = "恭喜你，你解開了這碗海龜湯！";
    } else if (isIrr) {
      reply = isHintMode ? "無關，這對拼湊出故事真相沒有任何幫助。" : "無關";
    } else if (isYes) {
      reply = isHintMode ? "是，你抓到關鍵點了！這跟主角的特殊職業或環境高度相關。" : "是";
    } else if (cleanQuery.includes("人") || cleanQuery.includes("男") || cleanQuery.includes("女") || cleanQuery.includes("知道")) {
      reply = "是也不是";
    } else {
      reply = isHintMode ? "否，或許你該換個方向思考，注意他的動機。" : "否";
    }

    // 延遲 500ms 模擬網路通訊
    await new Promise(resolve => setTimeout(resolve, 500));
    return res.json({ reply });
  }

  try {
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

    // 句尾若有明確是非題標記，直接由程式碼判定為合法是非題，
    // 不交由 AI 自行判斷是否拒答（已實測證實該判斷會有隨機浮動）
    const latestQueryText = messages[messages.length - 1]?.parts?.[0]?.text || "";
    const forceValidYesNo = hasYesNoMarker(latestQueryText);

    // 組合系統指令 (System Instruction)
    const systemInstruction = `
      ${ruleText}

      【當前進行的謎題資訊】
      題目名稱：${game.title}
      湯面（謎題故事）：${game.description || "未提供詳細湯面"}
      湯底（故事真相答案）：${game.solution}
      ${forceValidYesNo ? `
      【系統額外指令】本次玩家提問句尾已包含明確的是非題標記（嗎／是不是／是否／有沒有／對不對），無論句子裡是否出現「誰」、「什麼」、「哪裡」等疑問詞，一律視為合法的是非題，必須依照上方規則以「是」、「否」、「是也不是」、「無關」其中之一回答，絕對不可回覆「遊戲只能詢問是非題喔」。
      ` : ""}
    `;

    // 主引擎為 Gemini；僅在無 Gemini 金鑰或呼叫失敗時，才降級改用備援 OpenAI GPT
    let result = hasGeminiKey ? await callGemini(geminiKey, systemInstruction, messages) : null;

    if ((!result || !result.ok) && hasOpenAIKey) {
      if (result) {
        console.log(`[自動降級] Gemini 無法使用，改用備援 OpenAI (${process.env.OPENAI_MODEL || "gpt-4o-mini"})...`);
      }
      result = await callOpenAI(openaiKey, systemInstruction, messages);
    }

    if (!result || !result.ok) {
      const status = result ? result.status : 500;
      return res.status(status).json({
        error: status === 429 ? "RESOURCE_EXHAUSTED" : "API_ERROR",
        message: result ? result.message : "AI 主持人連線失敗。"
      });
    }

    return res.json({ reply: result.replyText });

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
