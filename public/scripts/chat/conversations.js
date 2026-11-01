function getConversations() {
  return conversations;
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

    const botMsg = { type: "bot", text: initialMessage, sentAt: new Date().toISOString() };
    conversation.messages.push(botMsg);
    await saveConversations(conversations);
    if (currentConversationId === conversationId) {
      renderMessages(conversationId);
    }
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

async function initializeConversations() {
  conversations = await loadConversationsFromServer();
  if (conversations.length === 0) {
    return createConversationWithInitialMessage();
  }
  currentConversationId = conversations[0].id;
  return Promise.resolve();
}
