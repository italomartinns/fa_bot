function getCurrentUser() {
  try {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

function requireAuth() {
  const user = getCurrentUser();
  if (!user || !user.id) {
    localStorage.removeItem(CURRENT_USER_KEY);
    window.location.href = "login.html";
    return null;
  }
  return user;
}

async function ensureAdksCompleted(user) {
  try {
    const status = await getOnboardingStatus(user.id);
    if (!status?.adksCompleted) {
      window.location.href = "/questionnaire/questionnaire.html";
      return false;
    }
    return true;
  } catch (error) {
    window.location.href = "/questionnaire/questionnaire.html";
    return false;
  }
}
