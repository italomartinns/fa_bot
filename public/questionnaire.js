const CURRENT_USER_KEY = "fa_current_user";

const noticeModal = document.getElementById("noticeModal");
const noticeMessage = document.getElementById("noticeMessage");
const noticeOk = document.getElementById("noticeOk");
const profileSection = document.getElementById("profileSection");
const adksSection = document.getElementById("adksSection");
const profileForm = document.getElementById("profileForm");
const adksForm = document.getElementById("adksForm");
const adksQuestions = document.getElementById("adksQuestions");
const errorEl = document.getElementById("questionnaireError");
const questionnaireTitle = document.getElementById("questionnaireTitle");
const questionnaireSubtitle = document.getElementById("questionnaireSubtitle");
const logoutButton = document.getElementById("logoutButton");

const STAGE_COPY = {
  profile: {
    title: "Questionário Sócio-Demográfico",
    subtitle: "Responda rapidamente para iniciar o atendimento."
  },
  adks: {
    title: "Questionário ADKS",
    subtitle: "Responda as 30 perguntas para concluir o questionário."
  }
};



function getCurrentUser() {
  try {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

function logout() {
  localStorage.removeItem(CURRENT_USER_KEY);
  window.location.href = "login.html";
}

function requireUser() {
  const user = getCurrentUser();
  if (!user || !user.id) {
    logout();
    return null;
  }
  return user;
}

function showError(message) {
  if (!errorEl) return;
  errorEl.textContent = message;
  errorEl.classList.add("visible");
}

function clearError() {
  if (!errorEl) return;
  errorEl.textContent = "";
  errorEl.classList.remove("visible");
}

function showNotice(message, onConfirm) {
  if (!noticeModal || !noticeOk || !noticeMessage) return;
  noticeMessage.textContent = message;
  noticeModal.classList.add("visible");

  const handler = () => {
    noticeModal.classList.remove("visible");
    noticeOk.removeEventListener("click", handler);
    onConfirm();
  };

  noticeOk.addEventListener("click", handler);
}

function setHeader(stage) {
  const copy = stage ? STAGE_COPY[stage] : null;
  if (!copy) return;
  if (questionnaireTitle) questionnaireTitle.textContent = copy.title;
  if (questionnaireSubtitle) questionnaireSubtitle.textContent = copy.subtitle;
}

function showSection(section, stage) {
  if (profileSection) profileSection.classList.remove("active");
  if (adksSection) adksSection.classList.remove("active");
  if (section) section.classList.add("active");
  if (stage) setHeader(stage);
}

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

function createAdksOption(questionId, value, labelText) {
  const label = document.createElement("label");
  label.className = "option-pill";

  const input = document.createElement("input");
  input.type = "radio";
  input.name = `adks_${questionId}`;
  input.value = value;

  label.appendChild(input);
  label.appendChild(document.createTextNode(labelText));
  return label;
}

function buildAdksQuestions() {
  if (!adksQuestions) return;

  ADKS_QUESTIONS.forEach((question) => {
    const item = document.createElement("div");
    item.className = "adks-item";

    const text = document.createElement("p");
    text.textContent = question.text;

    const options = document.createElement("div");
    options.className = "adks-options";
    options.appendChild(createAdksOption(question.id, "true", "Verdadeiro"));
    options.appendChild(createAdksOption(question.id, "false", "Falso"));

    item.appendChild(text);
    item.appendChild(options);
    adksQuestions.appendChild(item);
  });
}

function formatDateInput(event) {
  let input = event.target.value.replace(/\D/g, '');
  let formattedInput = '';

  if (input.length > 0) {
    formattedInput += input.substring(0, 2);
  }
  if (input.length > 2) {
    formattedInput += '/' + input.substring(2, 4);
  }
  if (input.length > 4) {
    formattedInput += '/' + input.substring(4, 8);
  }

  event.target.value = formattedInput;
}

async function initializeQuestionnaire() {
  const user = requireUser();
  if (!user) return;

  try {
    const verification = await apiPost("/api/verify-user", { userId: user.id });
    if (!verification.exists) {
      logout();
      return;
    }
  } catch (error) {
    showError(error.message || "Erro ao verificar usuário.");
    return;
  }

  const userName = user.name;

  buildAdksQuestions();

  let status;
  try {
    status = await getOnboardingStatus(user.id);
  } catch (error) {
    showError(error.message || "Erro ao carregar o status do questionario.");
    return;
  }

  if (status?.adksCompleted) {
    window.location.href = "index.html";
    return;
  }

  if (status?.profileCompleted) {
    showNotice(
      `Obrigado, ${userName}! Agora vamos iniciar o questionário ADKS com 30 perguntas de Verdadeiro ou Falso.`,
      () => {
        showSection(adksSection, "adks");
      }
    );
  } else {
    showNotice(
      `Olá, ${userName}! Sou seu assistente de apoio para cuidadores familiares. Vou começar com algumas perguntas rápidas sobre você e sua situação, para depois aplicar o questionário de conhecimento sobre Alzheimer. Vamos lá!`,
      () => {
        showSection(profileSection, "profile");
      }
    );
  }

  if (profileForm) {
    const dateOfBirthInput = document.getElementById("profileDateOfBirth");
    if (dateOfBirthInput) {
      dateOfBirthInput.addEventListener("input", formatDateInput);
    }

    profileForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      clearError();

      const sex = document.querySelector('input[name="sex"]:checked')?.value;
      const dateOfBirthInput = document.getElementById("profileDateOfBirth");
      const maritalSelect = document.getElementById("profileMarital");
      const caregiver = document.querySelector('input[name="caregiver"]:checked')?.value;
      const dateOfBirth = dateOfBirthInput ? dateOfBirthInput.value.trim() : "";
      const maritalStatus = maritalSelect ? maritalSelect.value : "";

      if (!sex || !maritalStatus || !caregiver || !dateOfBirth) {
        showError("Responda todas as perguntas do perfil.");
        return;
      }

      const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
      if (!dateRegex.test(dateOfBirth)) {
        showError("Informe uma data de nascimento válida no formato DD/MM/YYYY.");
        return;
      }

      const isCaregiver = caregiver === "Sim";

      try {
        await apiPost("/api/profile", {
          userId: user.id,
          sex,
          dateOfBirth,
          maritalStatus,
          caregiver: isCaregiver,
        });

        showNotice(
          `Obrigado, ${userName}! Agora vamos iniciar o questionário ADKS com 30 perguntas de Verdadeiro ou Falso.`,
          () => {
            showSection(adksSection, "adks");
          }
        );
      } catch (error) {
        showError(error.message || "Erro ao salvar o questionario de perfil.");
      }
    });
  }

  if (adksForm) {
    adksForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      clearError();

      const answers = ADKS_QUESTIONS.map((question) => {
        const selected = document.querySelector(`input[name="adks_${question.id}"]:checked`);
        if (!selected) {
          return null;
        }
        return {
          questionId: question.id,
          answer: selected.value === "true",
        };
      });

      if (answers.some((answer) => !answer)) {
        showError("Responda todas as perguntas do questionario ADKS.");
        return;
      }

      const adksResults = [];
      const incorrectAnswersDetails = [];
      let incorrectAnswersSummary = "Respostas incorretas no questionário ADKS:\n";

      answers.forEach((userAnswer) => {
        const questionId = userAnswer.questionId;
        const hasTheKnowledge = userAnswer.answer === ADKS_CORRECT_ANSWERS[questionId];
        adksResults.push({
          questionId: questionId,
          answer: userAnswer.answer,
          hasTheKnowledge: hasTheKnowledge,
          correctAnswer: ADKS_CORRECT_ANSWERS[questionId],
        });

        if (!hasTheKnowledge) {
          const questionText = ADKS_QUESTIONS.find(q => q.id === questionId).text;
          const explanationText = ADKS_EXPLANATIONS[questionId];
          incorrectAnswersSummary += `- ${questionText} (Sua resposta: ${userAnswer.answer ? 'Verdadeiro' : 'Falso'}, Correta: ${ADKS_CORRECT_ANSWERS[questionId] ? 'Verdadeiro' : 'Falso'}. Explicação: ${explanationText})\n`;
          incorrectAnswersDetails.push({
            questionId: questionId,
            questionText: questionText,
            userAnswer: userAnswer.answer,
            correctAnswer: ADKS_CORRECT_ANSWERS[questionId],
            explanation: explanationText,
          });
        }
      });
      
      // If no incorrect answers, provide a positive message
      if (incorrectAnswersSummary === "Respostas incorretas no questionário ADKS:\n") {
        incorrectAnswersSummary = "Parabéns! Você acertou todas as perguntas do questionário ADKS.";
      }

      try {
        await apiPost("/api/adks", {
          userId: user.id,
          answers: adksResults, // Send detailed results
          incorrectAnswersSummary: incorrectAnswersSummary, // Send summary for webhook
          incorrectAnswersDetails: incorrectAnswersDetails, // Send detailed explanations for webhook
        });
        window.location.href = "index.html";
      } catch (error) {
        showError(error.message || "Erro ao salvar o questionario ADKS.");
      }
    });
  }
}

if (logoutButton) {
  logoutButton.addEventListener("click", logout);
}

initializeQuestionnaire();
