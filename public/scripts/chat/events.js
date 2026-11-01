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

      const userMessage = { type: "user", text: value, sentAt: new Date().toISOString() };
      conversation.messages.push(userMessage);

      input.value = "";
      const isFirstMessage = conversation.messages.length === 1;
      pendingReplies.set(conversation.id, (pendingReplies.get(conversation.id) || 0) + 1);
      renderMessages(conversation.id);
      messages.scrollTop = messages.scrollHeight;
      let replyIndex = -1;

      try {
        if (isFirstMessage) {
          await renameConversationToFirstMessage(conversation.id);
          updateConversationList();
        } else {
          await saveConversations(conversations);
        }
        const url = window.API_CONFIG.getApiUrl('/api/agent');
        const resp = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pergunta: value, userId: getCurrentUser()?.id }),
        });

        if (!resp.ok) throw new Error("Erro ao consultar o agente.");
        const data = await resp.json().catch(() => ({}));
        const generated = data && data.generated_text ? data.generated_text : "";
        if (conversations.includes(conversation)) {
          replyIndex = conversation.messages.length;
          conversation.messages.push({ type: "bot", text: generated || "Sem resposta do agente.", sentAt: new Date().toISOString() });
        }
      } catch (err) {
        if (conversations.includes(conversation)) {
          replyIndex = conversation.messages.length;
          conversation.messages.push({ type: "bot", text: "Erro ao consultar o agente.", sentAt: new Date().toISOString() });
        }
      } finally {
        const remaining = (pendingReplies.get(conversation.id) || 1) - 1;
        if (remaining) pendingReplies.set(conversation.id, remaining);
        else pendingReplies.delete(conversation.id);
        if (currentConversationId === conversation.id) {
          renderMessages(conversation.id);
          const reply = messages.children[replyIndex];
          if (reply) {
            messages.scrollTop += reply.getBoundingClientRect().top - messages.getBoundingClientRect().top;
          }
        }
        if (conversations.includes(conversation)) {
          try { await saveConversations(conversations); }
          catch (error) { console.error("Erro ao salvar conversa:", error); }
        }
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
