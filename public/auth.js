const CURRENT_USER_KEY = "fa_current_user";
const USERNAME_ERROR = "Use apenas letras (a-z), números, ponto e sublinhado (_) no username, sem espaços.";

function isValidUsername(value) {
  return typeof value === "string" && value.length > 0 && !/[^a-zA-Z0-9._]/.test(value);
}

function filterUsernameInput(event) {
  if (event.isComposing) return;
  const input = event.target;
  const value = input.value;
  const cleanValue = value.replace(/[^a-zA-Z0-9._]/g, "");
  if (value === cleanValue) return;

  const start = value.slice(0, input.selectionStart).replace(/[^a-zA-Z0-9._]/g, "").length;
  const end = value.slice(0, input.selectionEnd).replace(/[^a-zA-Z0-9._]/g, "").length;
  input.value = cleanValue;
  input.setSelectionRange(start, end);
}

document.querySelectorAll('input[name="username"]').forEach((input) => {
  input.addEventListener("input", filterUsernameInput);
  input.addEventListener("compositionend", filterUsernameInput);
});

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

function setCurrentUser(user) {
  localStorage.setItem(
    CURRENT_USER_KEY,
    JSON.stringify({ id: user.id, name: user.name, username: user.username })
  );
}

function showError(message) {
  const errorEl = document.getElementById("formError");
  if (!errorEl) return;
  errorEl.textContent = message;
  errorEl.classList.add("visible");
}

function clearError() {
  const errorEl = document.getElementById("formError");
  if (!errorEl) return;
  errorEl.textContent = "";
  errorEl.classList.remove("visible");
}

function normalizeUsername(value) {
  return value.trim().toLowerCase();
}

function redirectIfLoggedIn() {
  const raw = localStorage.getItem(CURRENT_USER_KEY);
  if (raw) {
    window.location.href = "index.html";
  }
}

redirectIfLoggedIn();

const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearError();

    const usernameInput = document.getElementById("loginUsername");
    const passwordInput = document.getElementById("loginPassword");
    if (!isValidUsername(usernameInput.value)) {
      showError(USERNAME_ERROR);
      return;
    }
    const username = normalizeUsername(usernameInput.value);
    const password = passwordInput.value.trim();

    if (!username || !password) {
      showError("Preencha username e senha.");
      return;
    }

    try {
      const user = await apiPost("/api/login", { username, password });
      setCurrentUser(user);
      window.location.href = "index.html";
    } catch (error) {
      showError(error.message || "Erro ao fazer login.");
    }
  });
}

const registerForm = document.getElementById("registerForm");
if (registerForm) {
  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearError();

    const nameInput = document.getElementById("registerName");
    const usernameInput = document.getElementById("registerUsername");
    const passwordInput = document.getElementById("registerPassword");
    const confirmInput = document.getElementById("registerConfirm");

    if (!isValidUsername(usernameInput.value)) {
      showError(USERNAME_ERROR);
      return;
    }
    const name = nameInput.value.trim();
    const username = normalizeUsername(usernameInput.value);
    const password = passwordInput.value.trim();
    const confirm = confirmInput.value.trim();

    if (!name || !username || !password || !confirm) {
      showError("Preencha todos os campos.");
      return;
    }

    if (password.length < 6) {
      showError("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    if (password !== confirm) {
      showError("As senhas nao conferem.");
      return;
    }

    try {
      const user = await apiPost("/api/register", {
        name,
        username,
        password,
      });
      setCurrentUser(user);
      window.location.href = "/questionnaire/questionnaire.html";
    } catch (error) {
      showError(error.message || "Erro ao cadastrar.");
    }
  });
}
