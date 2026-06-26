const composer = document.getElementById("composer");
const input = document.getElementById("messageInput");
const messages = document.getElementById("messages");
const logoutBtn = document.getElementById("logoutBtn");
const currentUserName = document.getElementById("currentUserName");
const newChatBtn = document.querySelector(".new-chat-btn");
const conversationList = document.getElementById("conversationList");

const USERS_KEY = "fa_users";
const CURRENT_USER_KEY = "fa_current_user";
const CONVERSATIONS_KEY = "fa_conversations";

function getCurrentUser() {
  try {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

function requireAuth() {
  const user = getCurrentUser();
  if (!user || !user.id) {
    localStorage.removeItem(CURRENT_USER_KEY);
    window.location.href = "login.html";
    return null;
  }
  return user;
}

async function apiPost(path, payload) {
  const url = window.API_CONFIG.getApiUrl(path);
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data && data.message ? data.message : "Erro inesperado.";
    throw new Error(message);
  }
  return data;
}

async function getOnboardingStatus(userId) {
  return apiPost("/api/onboarding-status", { userId });
}

async function ensureAdksCompleted(user) {
  try {
    const status = await getOnboardingStatus(user.id);
    if (!status?.adksCompleted) {
      window.location.href = "questionnaire.html";
      return false;
    }
    return true;
  } catch (error) {
    window.location.href = "questionnaire.html";
    return false;
  }
}

function getConversations() {
  try {
    const raw = localStorage.getItem(CONVERSATIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    return [];
  }
}

function saveConversations(conversations) {
  localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(conversations));
}

function createNewConversation() {
  const conversations = getConversations();
  const newConversation = {
    id: Date.now(),
    title: `Chat ${conversations.length + 1}`,
    subtitle: "",
    messages: []
  };
  conversations.push(newConversation);
  saveConversations(conversations);
  return newConversation;
}

function renameConversationToFirstMessage(conversationId) {
  const conversation = conversations.find((c) => c.id === conversationId);
  if (!conversation) return;
  
  const firstUserMessage = conversation.messages.find((msg) => msg.type === "user");
  if (firstUserMessage) {
    const truncated = firstUserMessage.text.substring(0, 30);
    conversation.title = truncated.length < firstUserMessage.text.length 
      ? truncated + "..." 
      : truncated;
    saveConversations(conversations);
  }
}

function deleteConversation(conversationId) {
  conversations = conversations.filter((c) => c.id !== conversationId);
  saveConversations(conversations);
  
  if (currentConversationId === conversationId) {
    currentConversationId = conversations.length > 0 ? conversations[0].id : null;
  }
  
  if (currentConversationId) {
    updateConversationList();
    renderConversation(currentConversationId);
  } else {
    const newConversation = createNewConversation();
    conversations = getConversations();
    currentConversationId = newConversation.id;
    updateConversationList();
    renderConversation(currentConversationId);
  }
}

let conversations = [];
let currentConversationId = null;

function currentTime() {
  const now = new Date();
  return now.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}


function appendMessage(text, type, timeStr = null) {
  const article = document.createElement("article");
  article.className = `message ${type}`;
  const p = document.createElement("p");
  p.innerHTML = text.replace(/\n/g, "<br>");
  const time = document.createElement("time");
  time.textContent = timeStr || currentTime();

  article.appendChild(p);
  article.appendChild(time);
  messages.appendChild(article);
  messages.scrollTop = messages.scrollHeight;
}

function renderMessages(conversationId) {
  const conversation = conversations.find((c) => c.id === conversationId);
  if (!conversation) return;

  messages.innerHTML = "";
  conversation.messages.forEach((msg) => {
    appendMessage(msg.text, msg.type);
  });
}

function updateConversationList() {
  conversationList.innerHTML = "";
  conversations.forEach((conv) => {
    const btn = document.createElement("button");
    btn.className = "conversation-item" + (conv.id === currentConversationId ? " active" : "");
    btn.type = "button";
    
    const avatar = document.createElement("span");
    avatar.className = "avatar";
    avatar.textContent = conv.title.charAt(0).toUpperCase();
    
    const meta = document.createElement("span");
    meta.className = "meta";
    
    const strong = document.createElement("strong");
    strong.textContent = conv.title;
    
    const small = document.createElement("small");
    small.textContent = conv.subtitle;
    
    meta.appendChild(strong);
    meta.appendChild(small);
    btn.appendChild(avatar);
    btn.appendChild(meta);
    
    btn.addEventListener("click", () => {
      if (currentConversationId === conv.id) return;
      currentConversationId = conv.id;
      updateConversationList();
      renderMessages(currentConversationId);
    });
    
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-conversation-btn";
    deleteBtn.type = "button";
    deleteBtn.textContent = "✕";
    deleteBtn.title = "Deletar conversa";
    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      deleteConversation(conv.id);
    });
    
    btn.appendChild(deleteBtn);
    conversationList.appendChild(btn);
  });
}

function renderConversation(conversationId) {
  const chatTitleEl = document.getElementById("chatTitle");
  const conversation = conversations.find((c) => c.id === conversationId);
  if (conversation && chatTitleEl) {
    chatTitleEl.textContent = conversation.title;
  }
  renderMessages(conversationId);
}

function initializeConversations() {
  conversations = getConversations();
  if (conversations.length === 0) {
    const initialConversation = createNewConversation();
    conversations = getConversations();
    currentConversationId = initialConversation.id;
    return;
  }
  currentConversationId = conversations[0].id;
}

function bindEventHandlers() {
  if (composer) {
    composer.addEventListener("submit", async (event) => {
      event.preventDefault();

      const value = input.value.trim();
      if (!value) {
        return;
      }

      const conversation = conversations.find((c) => c.id === currentConversationId);
      if (!conversation) return;

      const userMessage = { type: "user", text: value };
      conversation.messages.push(userMessage);

      if (conversation.messages.length === 1) {
        renameConversationToFirstMessage(currentConversationId);
        updateConversationList();
      }

      appendMessage(value, "user");
      input.value = "";

      // adiciona placeholder de resposta enquanto aguarda o agente
      const placeholder = { type: "bot", text: "..." };
      conversation.messages.push(placeholder);
      appendMessage(placeholder.text, "bot");
      saveConversations(conversations);

      try {
        const url = window.API_CONFIG.getApiUrl('/api/agent');
        const resp = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pergunta: value, userId: getCurrentUser()?.id }),
        });

        const data = await resp.json().catch(() => ({}));
        const generated = data && data.generated_text ? data.generated_text : "";

        const lastIdx = conversation.messages.length - 1;
        conversation.messages[lastIdx].text = generated || "Sem resposta do agente.";
        saveConversations(conversations);
        renderMessages(currentConversationId);
      } catch (err) {
        const lastIdx = conversation.messages.length - 1;
        conversation.messages[lastIdx].text = "Erro ao consultar o agente.";
        saveConversations(conversations);
        renderMessages(currentConversationId);
      }
    });
  }

  if (newChatBtn) {
    newChatBtn.addEventListener("click", () => {
      const newConversation = createNewConversation();
      conversations = getConversations();
      currentConversationId = newConversation.id;
      updateConversationList();
      renderConversation(currentConversationId);
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem(CURRENT_USER_KEY);
      window.location.href = "login.html";
    });
  }
}

function initializeChat(activeUser) {
  if (currentUserName) {
    currentUserName.textContent = activeUser.name;
  }

  initializeConversations();
  bindEventHandlers();
  updateConversationList();
  if (currentConversationId) {
    renderConversation(currentConversationId);
  }
}

async function bootstrap() {
  const activeUser = requireAuth();
  if (!activeUser) return;

  const allowed = await ensureAdksCompleted(activeUser);
  if (!allowed) return;

  initializeChat(activeUser);
}

bootstrap();
