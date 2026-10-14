const composer = document.getElementById("composer");
const input = document.getElementById("messageInput");
const messages = document.getElementById("messages");
const logoutBtn = document.getElementById("logoutBtn");
const currentUserName = document.getElementById("currentUserName");
const newChatBtn = document.querySelector(".new-chat-btn");
const conversationList = document.getElementById("conversationList");
const menuBtn = document.getElementById("menuBtn");
const closeSidebarBtn = document.getElementById("closeSidebarBtn");
const sidebarPanel = document.getElementById("sidebarPanel");
const sidebarBackdrop = document.getElementById("sidebarBackdrop");

const USERS_KEY = "fa_users";
const CURRENT_USER_KEY = "fa_current_user";

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
  return conversations;
}

async function loadConversationsFromServer() {
  const user = getCurrentUser();
  if (!user?.id) {
    return [];
  }

  const url = window.API_CONFIG.getApiUrl(`/api/chat-history?userId=${encodeURIComponent(user.id)}`);
  const response = await fetch(url);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = data && data.message ? data.message : "Erro inesperado.";
    throw new Error(message);
  }

  return Array.isArray(data.conversations) ? data.conversations : [];
}

async function saveConversations(conversationsToSave) {
  const user = getCurrentUser();
  if (!user?.id) {
    return;
  }

  await apiPost("/api/chat-history", {
    userId: user.id,
    conversations: conversationsToSave,
  });
}

async function appendInitialMessageToConversation(conversationId) {
  try {
    const url = window.API_CONFIG.getApiUrl('/api/initial-message');
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: getCurrentUser()?.id }),
    });

    const data = await resp.json().catch(() => ({}));
    const initialMessage = data && data.generated_text ? data.generated_text : "";

    if (!initialMessage || currentConversationId !== conversationId) {
      return;
    }

    const conversation = conversations.find((c) => c.id === conversationId);
    if (!conversation) {
      return;
    }

    const botMsg = { type: "bot", text: initialMessage };
    conversation.messages.push(botMsg);
    await saveConversations(conversations);
    appendMessage(initialMessage, "bot");
  } catch (err) {
    console.error("Erro ao buscar mensagem inicial:", err);
  }
}

async function createNewConversation() {
  const conversationsList = getConversations();
  const newConversation = {
    id: Date.now(),
    title: `Chat ${conversationsList.length + 1}`,
    subtitle: "",
    messages: [],
  };
  conversationsList.push(newConversation);
  await saveConversations(conversationsList);
  return newConversation;
}

async function createConversationWithInitialMessage() {
  const newConversation = await createNewConversation();
  conversations = getConversations();
  currentConversationId = newConversation.id;
  updateConversationList();
  renderConversation(currentConversationId);
  await appendInitialMessageToConversation(newConversation.id);
  return newConversation;
}

async function renameConversationToFirstMessage(conversationId) {
  const conversation = conversations.find((c) => c.id === conversationId);
  if (!conversation) return;

  const firstUserMessage = conversation.messages.find((msg) => msg.type === "user");
  if (!firstUserMessage) return;

  const truncated = firstUserMessage.text.substring(0, 30);
  conversation.title = truncated.length < firstUserMessage.text.length
    ? `${truncated}...`
    : truncated;
  await saveConversations(conversations);
}

async function deleteConversation(conversationId) {
  conversations = conversations.filter((c) => c.id !== conversationId);
  await saveConversations(conversations);

  if (currentConversationId === conversationId) {
    currentConversationId = conversations.length > 0 ? conversations[0].id : null;
  }

  if (currentConversationId) {
    updateConversationList();
    renderConversation(currentConversationId);
    return;
  }

  return createConversationWithInitialMessage();
}

async function renameConversation(conversationId, title) {
  const conversation = conversations.find((c) => c.id === conversationId);
  const nextTitle = title.trim();

  if (!conversation || !nextTitle || nextTitle === conversation.title) {
    return false;
  }

  conversation.title = nextTitle;
  await saveConversations(conversations);
  updateConversationList();
  renderConversation(conversationId);
  return true;
}

let conversations = [];
let currentConversationId = null;

function isMobileLayout() {
  return window.matchMedia("(max-width: 900px)").matches;
}

function setSidebarOpen(isOpen) {
  document.body.classList.toggle("sidebar-open", isOpen);
  if (menuBtn) {
    menuBtn.setAttribute("aria-expanded", String(isOpen));
  }
}

function closeSidebarOnMobile() {
  if (isMobileLayout()) {
    setSidebarOpen(false);
  }
}

function currentTime() {
  const now = new Date();
  return now.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatMessageContent(text) {
  const safeText = escapeHtml(String(text));
  const withBold = safeText.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  return withBold.replace(/\n/g, "<br>");
}

function appendMessage(text, type, timeStr = null) {
  const article = document.createElement("article");
  article.className = `message ${type}`;
  const p = document.createElement("p");
  p.innerHTML = formatMessageContent(text);
  const time = document.createElement("time");
  time.textContent = timeStr || currentTime();

  article.appendChild(p);
  article.appendChild(time);
  messages.appendChild(article);
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
  document.querySelectorAll(".conversation-menu").forEach((menu) => {
    menu.remove();
  });
  conversationList.innerHTML = "";
  conversations.forEach((conv) => {
    const item = document.createElement("div");
    item.className = "conversation-item" + (conv.id === currentConversationId ? " active" : "");

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

    const selectBtn = document.createElement("button");
    selectBtn.className = "conversation-select";
    selectBtn.type = "button";
    selectBtn.appendChild(avatar);
    selectBtn.appendChild(meta);

    selectBtn.addEventListener("click", () => {
      if (currentConversationId === conv.id) return;
      currentConversationId = conv.id;
      updateConversationList();
      renderMessages(currentConversationId);
      closeSidebarOnMobile();
    });

    const actions = document.createElement("div");
    actions.className = "conversation-actions";

    const menuBtn = document.createElement("button");
    menuBtn.className = "conversation-menu-btn";
    menuBtn.type = "button";
    menuBtn.title = "Acoes da conversa";
    menuBtn.setAttribute("aria-label", `Acoes da conversa ${conv.title}`);
    menuBtn.setAttribute("aria-expanded", "false");
    menuBtn.innerHTML = '<span class="material-symbols-outlined" aria-hidden="true">more_horiz</span>';

    const menu = document.createElement("div");
    menu.className = "conversation-menu";
    menu.hidden = true;

    const renameBtn = document.createElement("button");
    renameBtn.type = "button";
    renameBtn.textContent = "renomear";
    renameBtn.addEventListener("click", () => {
      menu.hidden = true;
      menuBtn.setAttribute("aria-expanded", "false");
      startConversationRename(conv, item, selectBtn, meta, actions);
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.textContent = "excluir";
    deleteBtn.addEventListener("click", async () => {
      menu.hidden = true;
      menuBtn.setAttribute("aria-expanded", "false");
      try {
        await deleteConversation(conv.id);
      } catch (error) {
        console.error("Erro ao excluir conversa:", error);
        window.alert("Nao foi possivel excluir a conversa.");
      }
    });

    menu.appendChild(renameBtn);
    menu.appendChild(deleteBtn);
    document.body.appendChild(menu);
    menuBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      const isOpen = !menu.hidden;
      document.querySelectorAll(".conversation-menu").forEach((otherMenu) => {
        otherMenu.hidden = true;
      });
      document.querySelectorAll(".conversation-menu-btn").forEach((otherBtn) => {
        otherBtn.setAttribute("aria-expanded", "false");
      });
      menu.hidden = isOpen;
      menuBtn.setAttribute("aria-expanded", String(!isOpen));

      if (!isOpen) {
        const buttonRect = menuBtn.getBoundingClientRect();
        menu.style.top = `${buttonRect.bottom + 6}px`;
        menu.style.left = "0px";

        const menuRect = menu.getBoundingClientRect();
        const maxLeft = window.innerWidth - menuRect.width - 8;
        const anchoredLeft = buttonRect.right - menuRect.width;
        menu.style.left = `${Math.min(Math.max(8, anchoredLeft), maxLeft)}px`;

        if (menuRect.bottom > window.innerHeight - 8) {
          menu.style.top = `${buttonRect.top - menuRect.height - 6}px`;
        }
      }
    });

    actions.appendChild(menuBtn);
    item.appendChild(selectBtn);
    item.appendChild(actions);
    conversationList.appendChild(item);
  });
}

function closeConversationMenus() {
  document.querySelectorAll(".conversation-menu").forEach((menu) => {
    menu.hidden = true;
  });
  document.querySelectorAll(".conversation-menu-btn").forEach((button) => {
    button.setAttribute("aria-expanded", "false");
  });
}

function startConversationRename(conversation, item, selectBtn, meta, actions) {
  const renameInput = document.createElement("input");
  renameInput.className = "conversation-rename-input";
  renameInput.type = "text";
  renameInput.value = conversation.title.slice(0, 16);
  renameInput.maxLength = 16;
  renameInput.setAttribute("aria-label", "Novo nome da conversa");

  const saveRenameBtn = document.createElement("button");
  saveRenameBtn.className = "conversation-rename-save";
  saveRenameBtn.type = "button";
  saveRenameBtn.textContent = "Salvar";

  const cancelRenameBtn = document.createElement("button");
  cancelRenameBtn.className = "conversation-rename-cancel";
  cancelRenameBtn.type = "button";
  cancelRenameBtn.textContent = "Cancelar";

  let finished = false;
  const finish = async (shouldSave) => {
    if (finished) return;
    finished = true;

    const nextTitle = renameInput.value.trim();
    if (shouldSave && nextTitle.length > 16) {
      finished = false;
      renameInput.focus();
      window.alert("O nome da conversa deve ter no maximo 16 caracteres.");
      return;
    }

    if (shouldSave && nextTitle && nextTitle !== conversation.title) {
      try {
        await renameConversation(conversation.id, nextTitle);
        return;
      } catch (error) {
        console.error("Erro ao renomear conversa:", error);
        window.alert("Nao foi possivel renomear a conversa.");
      }
    }

    updateConversationList();
  };

  item.classList.add("conversation-item-editing");
  actions.classList.add("conversation-edit-actions");
  meta.hidden = true;
  selectBtn.hidden = false;
  item.insertBefore(renameInput, actions);
  actions.replaceChildren(saveRenameBtn, cancelRenameBtn);
  renameInput.focus();
  renameInput.select();

  renameInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      finish(true);
    } else if (event.key === "Escape") {
      event.preventDefault();
      finish(false);
    }
  });
  renameInput.addEventListener("blur", () => finish(true));
  saveRenameBtn.addEventListener("click", () => finish(true));
  cancelRenameBtn.addEventListener("click", () => finish(false));
}

function renderConversation(conversationId) {
  const chatTitleEl = document.getElementById("chatTitle");
  const conversation = conversations.find((c) => c.id === conversationId);
  if (conversation && chatTitleEl) {
    chatTitleEl.textContent = conversation.title;
  }
  renderMessages(conversationId);
}

async function initializeConversations() {
  conversations = await loadConversationsFromServer();
  if (conversations.length === 0) {
    return createConversationWithInitialMessage();
  }
  currentConversationId = conversations[0].id;
  return Promise.resolve();
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
        await renameConversationToFirstMessage(currentConversationId);
        updateConversationList();
      }

      appendMessage(value, "user");
      input.value = "";

      // mensagem placeholder de aguardo -- substituir por animacao no futuro
      const placeholder = { type: "bot", text: "..." };
      conversation.messages.push(placeholder);
      appendMessage(placeholder.text, "bot");
      await saveConversations(conversations);

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
        await saveConversations(conversations);
        renderMessages(currentConversationId);
      } catch (err) {
        const lastIdx = conversation.messages.length - 1;
        conversation.messages[lastIdx].text = "Erro ao consultar o agente.";
        await saveConversations(conversations);
        renderMessages(currentConversationId);
      }
    });
  }

  if (newChatBtn) {
    newChatBtn.addEventListener("click", async () => {
      await createConversationWithInitialMessage();
      closeSidebarOnMobile();
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem(CURRENT_USER_KEY);
      window.location.href = "login.html";
    });
  }

  if (menuBtn) {
    menuBtn.addEventListener("click", () => {
      setSidebarOpen(!document.body.classList.contains("sidebar-open"));
    });
  }

  if (closeSidebarBtn) {
    closeSidebarBtn.addEventListener("click", () => setSidebarOpen(false));
  }

  if (sidebarBackdrop) {
    sidebarBackdrop.addEventListener("click", () => setSidebarOpen(false));
  }

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".conversation-actions, .conversation-menu")) {
      closeConversationMenus();
    }
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      setSidebarOpen(false);
    }
  });
}

async function initializeChat(activeUser) {
  if (currentUserName) {
    currentUserName.textContent = activeUser.name;
  }

  await initializeConversations();
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

  await initializeChat(activeUser);
}

bootstrap();
