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
let currentTurnContainer = null;

// ==========================================
// 2. DOM 元素選取
// ==========================================
const appHeader = document.getElementById("app-header");
const lobbyView = document.getElementById("lobby-view");
const gameView = document.getElementById("game-view");
const cardGrid = document.getElementById("card-grid");
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
const btnReveal = document.getElementById("btn-reveal");

const endingOverlay = document.getElementById("ending-overlay");
const endingHeader = document.getElementById("ending-header");
const endingTitle = document.getElementById("ending-title");
const endingCount = document.getElementById("ending-count");
const endingSolutionText = document.getElementById("ending-solution-text");
const btnEndingLobby = document.getElementById("btn-ending-lobby");

const hintModeOverlay = document.getElementById("hint-mode-overlay");
const btnHintModeOn = document.getElementById("btn-hint-mode-on");
const btnHintModeOff = document.getElementById("btn-hint-mode-off");

// 提示模式偏好記錄於瀏覽器 localStorage，跨遊戲/重新整理皆會維持
const HINT_MODE_STORAGE_KEY = "turtlesoup_hintMode";

function getSavedHintMode() {
  return localStorage.getItem(HINT_MODE_STORAGE_KEY); // "on" | "off" | null
}

function setHintMode(isOn) {
  isHintMode = isOn;
  hintToggle.checked = isOn;
  localStorage.setItem(HINT_MODE_STORAGE_KEY, isOn ? "on" : "off");
}

// ==========================================
// 3. 網頁初始化與資料載入
// ==========================================
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const qRes = await fetch("/api/questions?t=" + Date.now());
    if (!qRes.ok) {
      throw new Error("無法讀取題目資料。");
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
        <p>載入題目資料失敗，請確認伺服器已正常啟動。</p>
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

  // 分類篩選
  filterBtns.forEach(btn => {
    btn.addEventListener("click", (e) => {
      filterBtns.forEach(b => b.classList.remove("active"));
      e.target.classList.add("active");
      filterLobby();
    });
  });

  // 提示切換事件：預設關閉，若瀏覽器已記錄過選擇的模式則沿用
  isHintMode = getSavedHintMode() === "on";
  hintToggle.checked = isHintMode;
  hintToggle.addEventListener("change", (e) => {
    setHintMode(e.target.checked);
  });

  btnHintModeOn.addEventListener("click", () => {
    setHintMode(true);
    hintModeOverlay.classList.add("hidden");
  });

  btnHintModeOff.addEventListener("click", () => {
    setHintMode(false);
    hintModeOverlay.classList.add("hidden");
  });
}

function filterLobby() {
  const activeBtn = document.querySelector(".filter-btn.active");
  const category = activeBtn ? activeBtn.getAttribute("data-category") : "all";

  const filtered = questions.filter(q => {
    return category === "all" ||
           q.category1 === category ||
           q.category2 === category;
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

    card.innerHTML = `
      <div class="q-card-top">
        <span class="q-card-id">No. ${q.id}</span>
        ${tagsHTML}
      </div>
      <div class="q-card-bottom">
        <h3 class="q-card-title">${q.title}</h3>
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
  if (cat === "盲點") return "blindspot";
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
  appHeader.classList.add("hidden");
  lobbyView.classList.add("hidden");
  gameView.classList.remove("hidden");
  window.scrollTo(0, 0);

  currentGameTitle.textContent = `${currentGame.title}`;
  statCount.textContent = "0";

  // 重置對話框
  chatBox.innerHTML = "";
  currentTurnContainer = null;

  // 檢查是否有湯面描述，若無則顯示警示，防範開發者尚未補充
  const riddleTextContent = currentGame.description.trim() || 
    `【提示】此題目目前尚未配置詳細的「湯面（riddle）」介紹。\n請開發者先至 questions.json 檔案中補充此題目的 description 欄位後重新載入。`;

  // 瞬間加載並以打字機效果渲染湯面介紹
  setControlsEnabled(false);
  typeWriter(riddleTextContent, "riddle-text", 20, () => {
    setControlsEnabled(true);
  });
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

  // 提問滿三題後，若使用者尚未選擇過提示模式，跳出視窗詢問
  if (questionCount === 3 && getSavedHintMode() === null) {
    hintModeOverlay.classList.remove("hidden");
  }

  await handleHostResponse(query);
});

// 放棄觀看真相
btnReveal.addEventListener("click", async () => {
  if (!confirm("您確定要放棄並看真相嗎？這將會結束挑戰並顯示答案。")) return;

  let solutionText = "（無法取得湯底內容，請稍後再試）";
  try {
    const res = await fetch(`/api/questions/${currentGame.id}/solution`);
    if (res.ok) {
      const data = await res.json();
      solutionText = data.solution;
    }
  } catch (error) {
    console.error("取得湯底失敗:", error);
  }

  triggerEnding(false, solutionText);
});

// 返回大廳
btnBack.addEventListener("click", () => {
  if (!isGenerating && questionCount > 0) {
    if (!confirm("確定要返回大廳嗎？目前的推理進度將會遺失。")) {
      return;
    }
  }
  appHeader.classList.remove("hidden");
  gameView.classList.add("hidden");
  lobbyView.classList.remove("hidden");
  currentGame = null;
});

btnEndingLobby.addEventListener("click", () => {
  endingOverlay.classList.add("hidden");
  appHeader.classList.remove("hidden");
  gameView.classList.add("hidden");
  lobbyView.classList.remove("hidden");
  currentGame = null;
});

// ==========================================
// 6. 伺服器通訊與主持人答覆
// ==========================================
async function handleHostResponse(userInput) {
  isGenerating = true;
  setControlsEnabled(false);

  // 顯示打字中指示器
  const typingIndicator = showTypingIndicator();

  // 包裝傳送給後端的歷史對話
  const apiQuery = `提問：${userInput}`;
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
        questionId: currentGame.id
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
        isGenerating = false;
        setControlsEnabled(true);
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

    // 偵測是否成功破案
    if (replyText.includes("恭喜你，你解開了這碗海龜湯！")) {
      setTimeout(() => triggerEnding(true, resData.solution), 1500);
    } else {
      isGenerating = false;
      setControlsEnabled(true);
    }

  } catch (error) {
    console.error("AI Host 通訊出錯:", error);
    typingIndicator.remove();
    appendSystemErrorMessage(`連線出錯：${error.message}`);
    
    // 自歷史紀錄移除失敗提問
    chatHistory.pop();
    questionCount = Math.max(0, questionCount - 1);
    statCount.textContent = questionCount;

    isGenerating = false;
    setControlsEnabled(true);
  }
}

// ==========================================
// 7. UI 輔助與動態渲染函式
// ==========================================
function setControlsEnabled(enabled) {
  chatInput.disabled = !enabled;
  btnSend.disabled = !enabled;
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

// 每次提問建立一個新的「對話回合」容器，並置頂顯示，回合內則維持提問在上、回覆在下的順序
function appendUserMessage(text) {
  currentTurnContainer = document.createElement("div");
  currentTurnContainer.className = "chat-turn";
  chatBox.prepend(currentTurnContainer);

  const bubble = document.createElement("div");
  bubble.className = "msg-bubble user";
  bubble.innerHTML = `<div class="msg-content">${escapeHTML(text)}</div>`;
  currentTurnContainer.appendChild(bubble);
  scrollToTop();
}

function appendHostMessage(text) {
  const bubble = document.createElement("div");
  bubble.className = "msg-bubble ai";
  bubble.innerHTML = `<div class="msg-content">${escapeHTML(text)}</div>`;
  (currentTurnContainer || chatBox).appendChild(bubble);
  scrollToTop();
}

function appendSystemMessage(text) {
  const bubble = document.createElement("div");
  bubble.className = "msg-bubble system";
  bubble.innerHTML = `<div class="msg-content">${escapeHTML(text)}</div>`;
  (currentTurnContainer || chatBox).appendChild(bubble);
  scrollToTop();
}

function appendSystemErrorMessage(text) {
  const bubble = document.createElement("div");
  bubble.className = "msg-bubble system-error";
  bubble.innerHTML = `<div class="msg-content">${escapeHTML(text)}</div>`;
  (currentTurnContainer || chatBox).appendChild(bubble);
  scrollToTop();
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
  (currentTurnContainer || chatBox).appendChild(indicator);
  scrollToTop();
  return indicator;
}

function scrollToTop() {
  chatBox.scrollTop = 0;
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
function triggerEnding(isWin, solutionText) {
  endingCount.textContent = questionCount;

  // 寫入完整答案
  endingSolutionText.textContent = solutionText || "（無法取得湯底內容，請稍後再試）";

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
