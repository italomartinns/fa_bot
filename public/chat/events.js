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
