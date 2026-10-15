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

function currentTime() {
  const now = new Date();
  return now.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMessageContent(text) {
  return messageMarkdown.render(String(text));
}

function appendMessage(text, type, timeStr = null) {
  const article = document.createElement("article");
  article.className = `message ${type}`;
  const content = document.createElement("div");
  content.className = "message-content";
  content.innerHTML = formatMessageContent(text);
  const time = document.createElement("time");
  time.textContent = timeStr || currentTime();

  article.appendChild(content);
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
