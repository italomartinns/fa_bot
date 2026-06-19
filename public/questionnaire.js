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

const ADKS_QUESTIONS = [
  { id: 1, text: "01. Pessoas com Alzheimer são particularmente propensas à depressão." },
  { id: 2, text: "02. Está cientificamente comprovado que o exercício mental pode impedir que uma pessoa contraia a Doença de Alzheimer." },
  { id: 3, text: "03. Após o aparecimento dos sintomas da Doença de Alzheimer, a esperança média de vida é de 6 a 12 anos." },
  { id: 4, text: "04. Quando uma pessoa com Doença de Alzheimer fica agitada, exames médicos podem revelar outros problemas de saúde como causa dessa agitação." },
  { id: 5, text: "05. As pessoas com Doença de Alzheimer respondem melhor a instruções simples, dadas uma de cada vez." },
  { id: 6, text: "06. Quando as pessoas com Doença de Alzheimer começam a ter dificuldades em cuidar de si próprias, os cuidadores devem assumir imediatamente estas responsabilidades." },
  { id: 7, text: "07. Se uma pessoa com Doença de Alzheimer começa a ficar alerta e agitada durante o dia, uma boa estratégia é tentar certificar-se de que está praticando bastante atividade física durante o dia."},
  { id: 8, text: "08. Em casos raros, houve pessoas que recuperaram da Doença de Alzheimer." },
  { id: 9, text: "09. Pessoas cuja doença de Alzheimer ainda não é grave podem se beneficiar da psicoterapia para depressão e ansiedade." },
  { id: 10, text: "10. Se surgem problemas de memória e pensamentos confusos de forma repentina, tal deve-se provavelmente à Doença de Alzheimer." },
  { id: 11, text: "11. A maioria das pessoas com Alzheimer vive em lares de idosos." },
  { id: 12, text: "12. Má nutrição pode piorar os sintomas da doença de Alzheimer." },
  { id: 13, text: "13. Pessoas na casa dos 30 anos podem desenvolver a doença de Alzheimer." },
  { id: 14, text: "14. O risco de queda de uma pessoa com Doença de Alzheimer tende a aumentar com o agravamento da doença." },
  { id: 15, text: "15. Quando as pessoas com Doença de Alzheimer repetem uma pergunta ou história várias vezes, é útil relembrá-las que se estão a repetir." },
  { id: 16, text: "16. Assim que as pessoas têm Doença de Alzheimer, deixam de ser capazes de tomar decisões informadas sobre os seus próprios cuidados." },
  { id: 17, text: "17. Eventualmente, a pessoa com doença de Alzheimer precisará de supervisão 24 horas por dia." },
  { id: 18, text: "18. Ter colesterol elevado pode aumentar o risco de desenvolver Doença de Alzheimer." },
  { id: 19, text: "19. Tremor ou agitação das mãos ou braços é um sintoma comum em pessoas com Doença de Alzheimer." },
  { id: 20, text: "20. Sintomas graves de depressão podem ser confundidos com Alzheimer." },
  { id: 21, text: "21. A doença de Alzheimer é um tipo de demência." },
  { id: 22, text: "22. Dificuldades em lidar com o dinheiro ou em pagar as contas é um sintoma inicial comum da Doença de Alzheimer." },
  { id: 23, text: "23. Um sintoma que pode ocorrer com a Doença de Alzheimer é pensar que outras pessoas estão a roubar as nossas coisas." },
  { id: 24, text: "24. Quando uma pessoa tem doença de Alzheimer, a utilização de lembretes escritos é um apoio que pode contribuir para o seu declínio." },
  { id: 25, text: "25. Existem medicamentos, disponíveis mediante prescrição médica, que previnem a Doença de Alzheimer." },
  { id: 26, text: "26. Ter hipertensão arterial pode aumentar o risco de desenvolvimento de Doença de Alzheimer." },
  { id: 27, text: "27. Os genes contribuem apenas parcialmente para o desenvolvimento da Doença de Alzheimer." },
  { id: 28, text: "28. É seguro para uma pessoa com Doença de Alzheimer conduzir, desde que tenha sempre um acompanhante no carro." },
  { id: 29, text: "29. A Doença de Alzheimer é incurável." },
  { id: 30, text: "30. A maioria das pessoas com Alzheimer recorda mais facilmente acontecimentos recentes do que coisas que aconteceram no passado." }
];

function getCurrentUser() {
  try {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

function requireUser() {
  const user = getCurrentUser();
  if (!user || !user.id) {
    localStorage.removeItem(CURRENT_USER_KEY);
    window.location.href = "login.html";
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

async function initializeQuestionnaire() {
  const user = requireUser();
  if (!user) return;

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
      "Obrigado! Agora vamos iniciar o questionário ADKS com 30 perguntas de Verdadeiro ou Falso.",
      () => {
        showSection(adksSection, "adks");
      }
    );
  } else {
    showNotice(
      "Olá! Sou seu assistente de apoio para cuidadores familiares. Vou começar com algumas perguntas rápidas sobre você e sua situação, para depois aplicar o questionário de conhecimento sobre Alzheimer. Vamos lá!",
      () => {
        showSection(profileSection, "profile");
      }
    );
  }

  if (profileForm) {
    profileForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      clearError();

      const sex = document.querySelector('input[name="sex"]:checked')?.value;
      const ageInput = document.getElementById("profileAge");
      const maritalSelect = document.getElementById("profileMarital");
      const caregiver = document.querySelector('input[name="caregiver"]:checked')?.value;
      const ageValue = ageInput ? ageInput.value.trim() : "";
      const age = Number(ageValue);
      const maritalStatus = maritalSelect ? maritalSelect.value : "";

      if (!sex || !maritalStatus || !caregiver) {
        showError("Responda todas as perguntas do perfil.");
        return;
      }

      if (!Number.isInteger(age) || age <= 0) {
        showError("Informe uma idade valida.");
        return;
      }

      const isCaregiver = caregiver === "Sim";

      try {
        await apiPost("/api/profile", {
          userId: user.id,
          sex,
          age,
          maritalStatus,
          caregiver: isCaregiver,
        });

        showNotice(
          "Obrigado! Agora vamos iniciar o questionário ADKS com 30 perguntas de Verdadeiro ou Falso.",
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

      try {
        await apiPost("/api/adks", {
          userId: user.id,
          answers,
        });
        window.location.href = "index.html";
      } catch (error) {
        showError(error.message || "Erro ao salvar o questionario ADKS.");
      }
    });
  }
}

initializeQuestionnaire();
