const messageMarkdown = window.markdownit({
  html: false,
  breaks: true,
  linkify: true,
});

messageMarkdown.renderer.rules.link_open = (tokens, index, options, env, renderer) => {
  tokens[index].attrSet("target", "_blank");
  tokens[index].attrSet("rel", "noopener noreferrer");
  return renderer.renderToken(tokens, index, options);
};

messageMarkdown.renderer.rules.table_open = () => '<div class="message-table"><table>\n';
messageMarkdown.renderer.rules.table_close = () => '</table></div>\n';

function formatMessageContent(text) {
  return messageMarkdown.render(String(text));
}

function appendMessage(text, type, sentAt) {
  const article = document.createElement("article");
  article.className = `message ${type}`;
  const content = document.createElement("div");
  content.className = "message-content";
  content.innerHTML = formatMessageContent(text);
  const time = document.createElement("time");
  const sentDate = new Date(sentAt);
  time.dateTime = sentDate.toISOString();
  time.textContent = sentDate.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  time.title = sentDate.toLocaleString("pt-BR");

  article.appendChild(content);
  article.appendChild(time);
  messages.appendChild(article);
}

function appendTypingIndicator() {
  const indicator = document.createElement("div");
  indicator.className = "message bot typing-indicator";
  indicator.setAttribute("role", "status");
  indicator.setAttribute("aria-label", "Assistente está digitando");
  indicator.innerHTML = '<span aria-hidden="true"></span><span aria-hidden="true"></span><span aria-hidden="true"></span>';
  messages.appendChild(indicator);
}

function renderMessages(conversationId) {
  const conversation = conversations.find((c) => c.id === conversationId);
  if (!conversation) return;

  messages.innerHTML = "";
  conversation.messages.forEach((msg) => {
    appendMessage(msg.text, msg.type, msg.sentAt);
  });
  if (pendingReplies.get(conversationId)) appendTypingIndicator();
}

function renderConversation(conversationId) {
  const chatTitleEl = document.getElementById("chatTitle");
  const conversation = conversations.find((c) => c.id === conversationId);
  if (conversation && chatTitleEl) {
    chatTitleEl.textContent = conversation.title;
  }
  renderMessages(conversationId);
}
