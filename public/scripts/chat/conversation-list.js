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
