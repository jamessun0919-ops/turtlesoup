// app.js - 海龜湯 AI 智慧主持人前端邏輯

// ==========================================
// 1. 全域狀態
// ==========================================
let questions = [];
let currentGame = null;
let chatHistory = [];
let questionCount = 0;
let isHintMode = false;
let isGenerating = false;

// ==========================================
// 2. DOM 元素選取
// ==========================================
const lobbyView = document.getElementById("lobby-view");
const gameView = document.getElementById("game-view");
const cardGrid = document.getElementById("card-grid");
const searchInput = document.getElementById("search-input");
const filterBtns = document.querySelectorAll(".filter-btn");

const btnBack = document.getElementById("btn-back");
const currentGameTitle = document.getElementById("current-game-title");
const riddleText = document.getElementById("riddle-text");
const chatBox = document.getElementById("chat-box");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const btnSend = document.getElementById("btn-send");

const statCount = document.getElementById("stat-count");
const hintToggle = document.getElementById("hint-toggle");
const guessInput = document.getElementById("guess-input");
const btnGuess = document.getElementById("btn-guess");
const btnReveal = document.getElementById("btn-reveal");
const logBody = document.getElementById("log-body");

const endingOverlay = document.getElementById("ending-overlay");
const endingHeader = document.getElementById("ending-header");
const endingTitle = document.getElementById("ending-title");
const endingCount = document.getElementById("ending-count");
const endingSolutionText = document.getElementById("ending-solution-text");
const btnEndingLobby = document.getElementById("btn-ending-lobby");

// ==========================================
// 3. 網頁初始化與資料載入
// ==========================================
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const qRes = await fetch("questions.json?t=" + Date.now());
    if (!qRes.ok) {
      throw new Error("無法讀取題目資料檔 (questions.json)。");
    }

    const allQuestions = await qRes.json();
    
    // 過濾掉備註欄位說明物件，只保留真正有 id 的題目
    questions = allQuestions.filter(q => q.id);

    initLobby();
  } catch (error) {
    console.error(error);
    cardGrid.innerHTML = `
      <div class="no-results">
        <i class="fa-solid fa-triangle-exclamation" style="font-size: 2.5rem; color: #ef4444; margin-bottom: 1rem;"></i>
        <p>載入題目資料失敗，請確認 questions.json 檔案存在且格式正確。</p>
        <p style="font-size: 0.85rem; margin-top: 0.5rem; color: var(--color-text-muted);">${error.message}</p>
      </div>
    `;
  }
});

// ==========================================
// 4. 大廳搜尋與過濾邏輯
// ==========================================
function initLobby() {
  renderCards(questions);

  // 搜尋功能
  searchInput.addEventListener("input", filterLobby);

  // 分類篩選
  filterBtns.forEach(btn => {
    btn.addEventListener("click", (e) => {
      filterBtns.forEach(b => b.classList.remove("active"));
      e.target.classList.add("active");
      filterLobby();
    });
  });

  // 提示切換事件
  hintToggle.checked = false;
  isHintMode = false;
  hintToggle.addEventListener("change", (e) => {
    isHintMode = e.target.checked;
  });
}

function filterLobby() {
  const query = searchInput.value.trim().toLowerCase();
  const activeBtn = document.querySelector(".filter-btn.active");
  const category = activeBtn ? activeBtn.getAttribute("data-category") : "all";

  const filtered = questions.filter(q => {
    const matchesSearch = q.title.toLowerCase().includes(query) || 
                          (q.highlight && q.highlight.toLowerCase().includes(query)) ||
                          (q.category1 && q.category1.toLowerCase().includes(query));
    
    const matchesCategory = category === "all" || 
                            q.category1 === category || 
                            q.category2 === category;

    return matchesSearch && matchesCategory;
  });

  renderCards(filtered);
}

function renderCards(list) {
  cardGrid.innerHTML = "";

  if (list.length === 0) {
    cardGrid.innerHTML = `
      <div class="no-results">
        <i class="fa-solid fa-ghost" style="font-size: 2.5rem; color: var(--color-text-muted); margin-bottom: 1rem;"></i>
        <p>找不到符合條件的題目。</p>
      </div>
    `;
    return;
  }

  list.forEach(q => {
    const card = document.createElement("div");
    card.className = "q-card";
    
    // 建立分類徽章
    let tagsHTML = "";
    if (q.category1) {
      tagsHTML += `<span class="tag ${getCategoryClass(q.category1)}">${q.category1}</span>`;
    }
    if (q.category2) {
      tagsHTML += `<span class="tag ${getCategoryClass(q.category2)}">${q.category2}</span>`;
    }
    if (q.highlight) {
      tagsHTML += `<span class="tag highlight">${q.highlight}</span>`;
    }

    card.innerHTML = `
      <div class="q-card-top">
        <div class="q-card-tags">${tagsHTML}</div>
        <h3 class="q-card-title">${q.title}</h3>
      </div>
      <div class="q-card-bottom">
        <span class="q-card-id">No. ${q.id}</span>
        <button class="q-card-btn">開始推理 <i class="fa-solid fa-chevron-right"></i></button>
      </div>
    `;

    card.addEventListener("click", () => startNewGame(q));
    cardGrid.appendChild(card);
  });
}

function getCategoryClass(cat) {
  if (cat === "經典") return "classic";
  if (cat === "犯罪") return "crime";
  if (cat === "日常") return "daily";
  return "";
}

// ==========================================
// 5. 遊戲流程與狀態控制
// ==========================================
function startNewGame(question) {
  currentGame = { ...question };
  questionCount = 0;
  chatHistory = [];
  isGenerating = false;

  // 切換視圖
  lobbyView.classList.add("hidden");
  gameView.classList.remove("hidden");
  
  currentGameTitle.textContent = `${currentGame.title}`;
  statCount.textContent = "0";
  
  // 清空推理筆記表格
  logBody.innerHTML = "";

  // 重置對話框
  chatBox.innerHTML = `
    <div class="msg-bubble system">
      <div class="msg-content">
        AI 主持人已就位。請閱讀上方的湯面，並在下方開始向主持人發問。
      </div>
    </div>
  `;

  // 檢查是否有湯面描述，若無則顯示警示，防範開發者尚未補充
  const riddleTextContent = currentGame.description.trim() || 
    `【提示】此題目目前尚未配置詳細的「湯面（riddle）」介紹。\n請開發者先至 questions.json 檔案中補充此題目的 description 欄位後重新載入。`;

  // 瞬間加載並以打字機效果渲染湯面介紹
  setControlsEnabled(false);
  typeWriter(riddleTextContent, "riddle-text", 20, () => {
    setControlsEnabled(true);
  });
  
  guessInput.value = "";
}

// 提問發送
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (isGenerating) return;

  const query = chatInput.value.trim();
  if (!query) return;

  chatInput.value = "";
  appendUserMessage(query);
  
  questionCount++;
  statCount.textContent = questionCount;

  await handleHostResponse(query, false);
});

// 提交推論猜測
btnGuess.addEventListener("click", async () => {
  if (isGenerating) return;

  const guess = guessInput.value.trim();
  if (!guess) {
    alert("請先輸入您的推論猜測內容！");
    return;
  }

  appendUserMessage(`【提交推論猜測】\n${guess}`);
  guessInput.value = "";
  
  questionCount++;
  statCount.textContent = questionCount;

  await handleHostResponse(guess, true);
});

// 放棄觀看真相
btnReveal.addEventListener("click", () => {
  if (confirm("您確定要放棄並看真相嗎？這將會結束挑戰並顯示答案。")) {
    triggerEnding(false);
  }
});

// 返回大廳
btnBack.addEventListener("click", () => {
  if (!isGenerating && questionCount > 0) {
    if (!confirm("確定要返回大廳嗎？目前的推理進度將會遺失。")) {
      return;
    }
  }
  gameView.classList.add("hidden");
  lobbyView.classList.remove("hidden");
  currentGame = null;
});

btnEndingLobby.addEventListener("click", () => {
  endingOverlay.classList.add("hidden");
  gameView.classList.add("hidden");
  lobbyView.classList.remove("hidden");
  currentGame = null;
});

// ==========================================
// 6. 伺服器通訊與主持人答覆
// ==========================================
async function handleHostResponse(userInput, isGuess = false) {
  isGenerating = true;
  setControlsEnabled(false);

  // 顯示打字中指示器
  const typingIndicator = showTypingIndicator();

  // 包裝傳送給後端的歷史對話
  const apiQuery = isGuess ? `推論：${userInput}` : `提問：${userInput}`;
  chatHistory.push({ role: "user", parts: [{ text: apiQuery }] });

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messages: chatHistory,
        isHintMode: isHintMode,
        game: {
          title: currentGame.title,
          description: currentGame.description,
          solution: currentGame.solution
        }
      })
    });

    typingIndicator.remove();

    // 處理 429 頻率/額度限制異常
    if (response.status === 429) {
      const errData = await response.json();
      appendSystemErrorMessage(`🚫 ${errData.message || "AI 主持人額度已用盡，請稍候再試。"}`);
      
      // 自歷史紀錄移除該筆失敗提問，避免其污染上下文
      chatHistory.pop();
      
      // 退回計數器
      questionCount = Math.max(0, questionCount - 1);
      statCount.textContent = questionCount;

      // 鎖定發問欄位 10 秒防範重複狂點
      setTimeout(() => {
        setControlsEnabled(true);
        isGenerating = false;
        appendSystemMessage("鎖定解除，您可以重新嘗試提問。");
      }, 10000);
      return;
    }

    // 處理其它錯誤狀態
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || `連線伺服器失敗 (HTTP ${response.status})`);
    }

    const resData = await response.json();
    const replyText = resData.reply;

    // 將成功的回答存入歷史紀錄
    chatHistory.push({ role: "model", parts: [{ text: replyText }] });

    // 在畫面上呈現 AI 的回答
    appendHostMessage(replyText);

    // 解析判定結果並記錄到「推理筆記」表格 (排除提示內容)
    const coreVerdict = parseCoreVerdict(replyText);
    appendToDeductionLog(questionCount, userInput, coreVerdict);

    // 偵測是否成功破案
    if (replyText.includes("恭喜你，你解開了這碗海龜湯！")) {
      setTimeout(() => triggerEnding(true), 1500);
    } else {
      setControlsEnabled(true);
      isGenerating = false;
    }

  } catch (error) {
    console.error("AI Host 通訊出錯:", error);
    typingIndicator.remove();
    appendSystemErrorMessage(`連線出錯：${error.message}`);
    
    // 自歷史紀錄移除失敗提問
    chatHistory.pop();
    questionCount = Math.max(0, questionCount - 1);
    statCount.textContent = questionCount;

    setControlsEnabled(true);
    isGenerating = false;
  }
}

// 解析 AI 回覆的核心判定結果 (是/否/是也不是/無關/是非題)
function parseCoreVerdict(reply) {
  if (reply.includes("遊戲只能詢問是非題喔")) return "是非題";
  
  // 先比對較長詞彙，防止 substring 誤判
  if (reply.includes("是也不是")) return "是也不是";
  if (reply.includes("無關")) return "無關";
  
  // 檢測是否包含破案關鍵句
  if (reply.includes("恭喜你，你解開了這碗海龜湯！")) return "是";

  // 單獨字元比對
  if (reply.includes("是")) return "是";
  if (reply.includes("否") || reply.includes("不對") || reply.includes("錯誤")) return "否";
  
  return "否"; // 預設值
}

// ==========================================
// 7. UI 輔助與動態渲染函式
// ==========================================
function setControlsEnabled(enabled) {
  chatInput.disabled = !enabled;
  btnSend.disabled = !enabled;
  guessInput.disabled = !enabled;
  btnGuess.disabled = !enabled;
  btnReveal.disabled = !enabled;
  btnBack.disabled = isGenerating; // 系統忙碌中，不允許點擊返回按鈕防止狀態衝突
  
  if (enabled) {
    chatInput.focus();
  }
}

function typeWriter(text, elementId, speed = 25, callback = null) {
  const element = document.getElementById(elementId);
  element.innerHTML = "";
  let i = 0;
  
  function type() {
    if (i < text.length) {
      element.innerHTML += text.charAt(i);
      i++;
      setTimeout(type, speed);
    } else if (callback) {
      callback();
    }
  }
  type();
}

function appendUserMessage(text) {
  const bubble = document.createElement("div");
  bubble.className = "msg-bubble user";
  bubble.innerHTML = `<div class="msg-content">${escapeHTML(text)}</div>`;
  chatBox.appendChild(bubble);
  scrollToBottom();
}

function appendHostMessage(text) {
  const bubble = document.createElement("div");
  bubble.className = "msg-bubble ai";
  bubble.innerHTML = `<div class="msg-content">${escapeHTML(text)}</div>`;
  chatBox.appendChild(bubble);
  scrollToBottom();
}

function appendSystemMessage(text) {
  const bubble = document.createElement("div");
  bubble.className = "msg-bubble system";
  bubble.innerHTML = `<div class="msg-content">${escapeHTML(text)}</div>`;
  chatBox.appendChild(bubble);
  scrollToBottom();
}

function appendSystemErrorMessage(text) {
  const bubble = document.createElement("div");
  bubble.className = "msg-bubble system-error";
  bubble.innerHTML = `<div class="msg-content">${escapeHTML(text)}</div>`;
  chatBox.appendChild(bubble);
  scrollToBottom();
}

function showTypingIndicator() {
  const indicator = document.createElement("div");
  indicator.className = "msg-bubble ai thinking-msg";
  indicator.innerHTML = `
    <div class="thinking-indicator">
      <div class="thinking-dot"></div>
      <div class="thinking-dot"></div>
      <div class="thinking-dot"></div>
    </div>
  `;
  chatBox.appendChild(indicator);
  scrollToBottom();
  return indicator;
}

// 動態寫入推理筆記表格
function appendToDeductionLog(num, query, verdict) {
  const tr = document.createElement("tr");
  
  // 截取問題前 10 個字，超過補 ...
  const summary = query.length > 10 ? query.substring(0, 10) + "..." : query;
  
  let badgeClass = "verdict-no";
  if (verdict === "是") badgeClass = "verdict-yes";
  else if (verdict === "是也不是") badgeClass = "verdict-maybe";
  else if (verdict === "無關") badgeClass = "verdict-irrelevant";
  else if (verdict === "是非題") badgeClass = "verdict-invalid";
  
  tr.innerHTML = `
    <td style="text-align: center; color: var(--color-text-muted);">${num}</td>
    <td>${escapeHTML(summary)}</td>
    <td style="text-align: center;"><span class="verdict-badge ${badgeClass}">${verdict}</span></td>
  `;
  
  logBody.appendChild(tr);
  
  // 自動將表格滾動到底部
  const wrapper = logBody.closest(".log-table-wrapper");
  if (wrapper) {
    wrapper.scrollTop = wrapper.scrollHeight;
  }
}

function scrollToBottom() {
  chatBox.scrollTop = chatBox.scrollHeight;
}

function escapeHTML(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
    .replace(/\n/g, "<br>");
}

// ==========================================
// 8. 破案與結局面板觸發
// ==========================================
function triggerEnding(isWin) {
  endingCount.textContent = questionCount;
  
  // 寫入完整答案
  endingSolutionText.textContent = currentGame.solution;

  if (isWin) {
    endingHeader.className = "ending-header win";
    endingHeader.innerHTML = `
      <i class="fa-solid fa-trophy trophy-icon"></i>
      <h2 id="ending-title">恭喜破案！</h2>
    `;
    endingTitle.style.color = "var(--accent-gold)";
  } else {
    endingHeader.className = "ending-header lose";
    endingHeader.innerHTML = `
      <i class="fa-solid fa-face-sad-tear trophy-icon" style="color: #9ca3af; text-shadow: none;"></i>
      <h2 id="ending-title">挑戰結束</h2>
    `;
    endingTitle.style.color = "var(--color-text-muted)";
  }

  endingOverlay.classList.remove("hidden");
}
