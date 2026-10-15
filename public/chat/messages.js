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

function renderConversation(conversationId) {
  const chatTitleEl = document.getElementById("chatTitle");
  const conversation = conversations.find((c) => c.id === conversationId);
  if (conversation && chatTitleEl) {
    chatTitleEl.textContent = conversation.title;
  }
  renderMessages(conversationId);
}
