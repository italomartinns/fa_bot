const CURRENT_USER_KEY = "fa_current_user";
const form = document.getElementById("settingsForm");
const status = document.getElementById("settingsStatus");
const birthInput = document.getElementById("settingsBirth");
const passwordDialog = document.getElementById("passwordDialog");
const passwordForm = document.getElementById("passwordForm");
const passwordError = document.getElementById("passwordError");
let user;
try { user = JSON.parse(localStorage.getItem(CURRENT_USER_KEY)); } catch { user = null; }

function logout() {
  localStorage.removeItem(CURRENT_USER_KEY);
  window.location.href = "/login.html";
}
document.getElementById("settingsLogout").addEventListener("click", logout);
document.getElementById("openPasswordDialog").addEventListener("click", () => {
  passwordForm.reset();
  passwordError.textContent = "";
  passwordDialog.showModal();
});
document.getElementById("cancelPassword").addEventListener("click", () => passwordDialog.close());
passwordDialog.addEventListener("close", () => {
  passwordForm.reset();
  passwordError.textContent = "";
});
passwordForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  passwordError.textContent = "";
  const currentPassword = document.getElementById("currentPassword").value.trim();
  const newPassword = document.getElementById("newPassword").value.trim();
  const confirmPassword = document.getElementById("confirmPassword").value.trim();
  if (newPassword.length < 6) { passwordError.textContent = "A senha precisa ter pelo menos 6 caracteres."; return; }
  if (newPassword !== confirmPassword) { passwordError.textContent = "As senhas não conferem."; return; }
  const button = passwordForm.querySelector('button[type="submit"]');
  button.disabled = true;
  try {
    await request("/api/change-password", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, currentPassword, newPassword })
    });
    passwordDialog.close();
    showStatus("Senha alterada com sucesso.");
  } catch (error) { passwordError.textContent = error.message; }
  finally { button.disabled = false; }
});
birthInput.addEventListener("input", () => {
  const digits = birthInput.value.replace(/\D/g, "").slice(0, 8);
  birthInput.value = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean).join("/");
});

function showStatus(message, isError = false) {
  status.textContent = message;
  status.classList.toggle("error", isError);
}

async function request(path, options) {
  const response = await fetch(window.API_CONFIG.getApiUrl(path), options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Erro inesperado.");
  return data;
}

async function loadSettings() {
  if (!user?.id) { logout(); return; }
  try {
    const profile = await request(`/api/settings?userId=${encodeURIComponent(user.id)}`);
    form.elements.name.value = profile.name;
    form.elements.username.value = profile.username;
    const [year, month, day] = profile.date_of_birth.split("-");
    form.elements.dateOfBirth.value = `${day}/${month}/${year}`;
    const maritalAliases = { "União estável": "Uniao estavel", "Viúvo": "Viuvo" };
    form.elements.maritalStatus.value = maritalAliases[profile.marital_status] || profile.marital_status;
    form.elements.caregiver.value = String(profile.caregiver);
    form.hidden = false;
    document.getElementById("saveSettings").hidden = false;
  } catch (error) { showStatus(error.message, true); }
  finally {
    document.getElementById("profileLoading").hidden = true;
    document.getElementById("profileFields").setAttribute("aria-busy", "false");
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  showStatus("");
  const button = document.getElementById("saveSettings");
  button.disabled = true;
  try {
    const [day, month, year] = form.elements.dateOfBirth.value.split("/");
    const updated = await request("/api/settings", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, name: form.elements.name.value,
        username: form.elements.username.value, dateOfBirth: `${year}-${month}-${day}`,
        maritalStatus: form.elements.maritalStatus.value, caregiver: form.elements.caregiver.value === "true" })
    });
    user = updated;
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    form.elements.name.value = user.name;
    form.elements.username.value = user.username;
    showStatus("Alterações salvas com sucesso.");
  } catch (error) { showStatus(error.message, true); }
  finally { button.disabled = false; }
});
loadSettings();
