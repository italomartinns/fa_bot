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
