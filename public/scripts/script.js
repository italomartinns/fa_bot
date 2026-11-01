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
