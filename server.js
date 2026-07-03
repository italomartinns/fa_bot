require("dotenv").config();
const express = require("express");
const path = require("path");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const {
  ADKS_QUESTIONS,
  ADKS_EXPLANATIONS,
  ADKS_CORRECT_ANSWERS,
} = require("./public/adks_data.js");

const app = express();
const PORT = process.env.PORT || 3000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

function securityHeaders(req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
  next();
}

app.use(securityHeaders);

async function initializeDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS profile_questionnaire (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL UNIQUE,
        sex TEXT NOT NULL,
        date_of_birth DATE NOT NULL,
        marital_status TEXT NOT NULL,
        caregiver BOOLEAN NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS adks_answers (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        question_id INTEGER NOT NULL,
        answer BOOLEAN NOT NULL,
        has_the_knowledge BOOLEAN NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, question_id),
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS chat_conversations (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        conversation_key BIGINT NOT NULL,
        title TEXT NOT NULL,
        subtitle TEXT NOT NULL DEFAULT '',
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, conversation_key),
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id SERIAL PRIMARY KEY,
        conversation_id INTEGER NOT NULL,
        message_order INTEGER NOT NULL,
        message_type TEXT NOT NULL,
        message_text TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(conversation_id, message_order),
        FOREIGN KEY(conversation_id) REFERENCES chat_conversations(id) ON DELETE CASCADE
      );
    `);

    console.log("✅ Banco de dados inicializado");
  } catch (error) {
    console.error("❌ Erro ao inicializar banco:", error.message);
    throw error;
  }
}

function normalizeUsername(value) {
  return value.trim().toLowerCase();
}

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

app.post("/api/register", async (req, res) => {
  try {
    const { name, username, password } = req.body || {};

    if (!name || !username || !password) {
      return res.status(400).json({ message: "Preencha todos os campos." });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "A senha precisa ter pelo menos 6 caracteres." });
    }

    const cleanUsername = normalizeUsername(username);
    const passwordHash = bcrypt.hashSync(password, 10);

    const result = await pool.query(
      "INSERT INTO users (name, username, password_hash) VALUES ($1, $2, $3) RETURNING id, name, username",
      [name.trim(), cleanUsername, passwordHash]
    );

    res.json(result.rows[0]);
  } catch (error) {
    if (error.message.includes("duplicate")) {
      return res.status(409).json({ message: "Esse username já está em uso." });
    }
    console.error("Erro /api/register:", error);
    res.status(500).json({ message: "Erro ao salvar usuário." });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({ message: "Preencha username e senha." });
    }

    const cleanUsername = normalizeUsername(username);

    const result = await pool.query(
      "SELECT id, name, username, password_hash FROM users WHERE username = $1",
      [cleanUsername]
    );

    if (result.rows.length === 0 || !bcrypt.compareSync(password, result.rows[0].password_hash)) {
      return res.status(401).json({ message: "Username ou senha incorretos." });
    }

    const user = result.rows[0];
    res.json({ id: user.id, name: user.name, username: user.username });
  } catch (error) {
    console.error("Erro /api/login:", error);
    res.status(500).json({ message: "Erro ao buscar usuário." });
  }
});

app.post("/api/profile", async (req, res) => {
  try {
    const { userId, sex, dateOfBirth, maritalStatus, caregiver } = req.body || {};

    const parsedUserId = Number(userId);

    if (!Number.isInteger(parsedUserId) || parsedUserId <= 0) {
      return res.status(400).json({ message: "Usuário inválido." });
    }

    if (!["Feminino", "Masculino", "Prefiro não responder"].includes(sex)) {
      return res.status(400).json({ message: "Sexo inválido." });
    }

    const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    if (!dateRegex.test(dateOfBirth)) {
      return res.status(400).json({ message: "Data de nascimento inválida. Use o formato DD/MM/YYYY." });
    }

    const [day, month, year] = dateOfBirth.split('/').map(Number);
    const dob = new Date(year, month - 1, day);
    
    if (isNaN(dob.getTime()) || dob.getDate() !== day || dob.getMonth() !== month - 1 || dob.getFullYear() !== year) {
      return res.status(400).json({ message: "Data de nascimento inválida." });
    }

    if (!["Casado", "União estável", "Solteiro", "Divorciado", "Viúvo"].includes(maritalStatus)) {
      return res.status(400).json({ message: "Estado civil inválido." });
    }

    if (typeof caregiver !== "boolean") {
      return res.status(400).json({ message: "Resposta de cuidador inválida." });
    }

    await pool.query(
      `INSERT INTO profile_questionnaire (user_id, sex, date_of_birth, marital_status, caregiver) 
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT(user_id) DO UPDATE SET
       sex = EXCLUDED.sex,
       date_of_birth = EXCLUDED.date_of_birth,
       marital_status = EXCLUDED.marital_status,
       caregiver = EXCLUDED.caregiver,
       updated_at = CURRENT_TIMESTAMP`,
      [parsedUserId, sex, dob, maritalStatus, caregiver]
    );

    res.json({ ok: true });
  } catch (error) {
    console.error("Erro /api/profile:", error);
    res.status(500).json({ message: "Erro ao salvar perfil." });
  }
});

app.post("/api/adks", async (req, res) => {
  try {
    const { userId, answers, incorrectAnswersDetails } = req.body || {};

    const parsedUserId = Number(userId);

    if (!Number.isInteger(parsedUserId) || parsedUserId <= 0) {
      return res.status(400).json({ message: "Usuário inválido." });
    }

    if (!Array.isArray(answers) || answers.length !== 30) {
      return res.status(400).json({ message: "Respostas do ADKS inválidas." });
    }

    for (const entry of answers) {
      const questionId = Number(entry?.questionId);
      if (!Number.isInteger(questionId) || questionId < 1 || questionId > 30) {
        return res.status(400).json({ message: "Respostas do ADKS inválidas." });
      }
      if (typeof entry?.answer !== "boolean" || typeof entry?.hasTheKnowledge !== "boolean") {
        return res.status(400).json({ message: "Respostas do ADKS inválidas." });
      }
    }

    const profileCheck = await pool.query(
      "SELECT 1 FROM profile_questionnaire WHERE user_id = $1",
      [parsedUserId]
    );

    if (profileCheck.rows.length === 0) {
      return res.status(400).json({ message: "Perfil não encontrado. Preencha o questionário primeiro." });
    }

    await pool.query("DELETE FROM adks_answers WHERE user_id = $1", [parsedUserId]);

    for (const answer of answers) {
      await pool.query(
        "INSERT INTO adks_answers (user_id, question_id, answer, has_the_knowledge) VALUES ($1, $2, $3, $4)",
        [parsedUserId, answer.questionId, answer.answer, answer.hasTheKnowledge]
      );
    }

    res.json({ ok: true });
    
  } catch (error) {
    console.error("Erro /api/adks:", error);
    res.status(500).json({ message: "Erro ao salvar ADKS." });
  }
});

app.post("/api/onboarding-status", async (req, res) => {
  try {
    const { userId } = req.body || {};
    const parsedUserId = Number(userId);

    if (!Number.isInteger(parsedUserId) || parsedUserId <= 0) {
      return res.status(400).json({ message: "Usuário inválido." });
    }

    const profileResult = await pool.query(
      "SELECT 1 FROM profile_questionnaire WHERE user_id = $1",
      [parsedUserId]
    );

    const adksResult = await pool.query(
      "SELECT COUNT(*) as total FROM adks_answers WHERE user_id = $1",
      [parsedUserId]
    );

    const adksTotal = parseInt(adksResult.rows[0].total) || 0;

    res.json({
      profileCompleted: profileResult.rows.length > 0,
      adksCompleted: adksTotal >= 30,
    });
  } catch (error) {
    console.error("Erro /api/onboarding-status:", error);
    res.status(500).json({ message: "Erro ao buscar status." });
  }
});

app.get("/api/chat-history", async (req, res) => {
  try {
    const parsedUserId = Number(req.query.userId);

    if (!Number.isInteger(parsedUserId) || parsedUserId <= 0) {
      return res.status(400).json({ message: "Usuário inválido." });
    }

    const conversationsResult = await pool.query(
      `SELECT id, conversation_key, title, subtitle, sort_order
       FROM chat_conversations
       WHERE user_id = $1
       ORDER BY sort_order ASC, id ASC`,
      [parsedUserId]
    );

    if (conversationsResult.rows.length === 0) {
      return res.json({ conversations: [] });
    }

    const messagesResult = await pool.query(
      `SELECT c.conversation_key, m.message_order, m.message_type, m.message_text
       FROM chat_conversations c
       LEFT JOIN chat_messages m ON m.conversation_id = c.id
       WHERE c.user_id = $1
       ORDER BY c.sort_order ASC, c.id ASC, m.message_order ASC, m.id ASC`,
      [parsedUserId]
    );

    const conversationMap = new Map();

    for (const row of conversationsResult.rows) {
      const conversationKey = Number(row.conversation_key);
      conversationMap.set(conversationKey, {
        id: conversationKey,
        title: row.title,
        subtitle: row.subtitle || "",
        messages: [],
      });
    }

    for (const row of messagesResult.rows) {
      const conversationKey = Number(row.conversation_key);
      const conversation = conversationMap.get(conversationKey);
      if (!conversation || row.message_text === null || row.message_text === undefined) {
        continue;
      }

      conversation.messages.push({
        type: row.message_type,
        text: row.message_text,
      });
    }

    res.json({
      conversations: Array.from(conversationMap.values()),
    });
  } catch (error) {
    console.error("Erro /api/chat-history:", error);
    res.status(500).json({ message: "Erro ao buscar histórico." });
  }
});

app.post("/api/chat-history", async (req, res) => {
  try {
    const { userId, conversations } = req.body || {};
    const parsedUserId = Number(userId);

    if (!Number.isInteger(parsedUserId) || parsedUserId <= 0) {
      return res.status(400).json({ message: "Usuário inválido." });
    }

    if (!Array.isArray(conversations)) {
      return res.status(400).json({ message: "Histórico inválido." });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const uniqueConversationKeys = Array.from(
        new Set(
          conversations
            .map((conversation) => Number(conversation?.id))
            .filter((conversationKey) => Number.isInteger(conversationKey) && conversationKey > 0)
        )
      );

      if (uniqueConversationKeys.length === 0) {
        await client.query("DELETE FROM chat_conversations WHERE user_id = $1", [parsedUserId]);
        await client.query("COMMIT");
        return res.json({ ok: true });
      }

      await client.query(
        `DELETE FROM chat_conversations
         WHERE user_id = $1
         AND NOT (conversation_key = ANY($2::bigint[]))`,
        [parsedUserId, uniqueConversationKeys]
      );

      for (let conversationIndex = 0; conversationIndex < conversations.length; conversationIndex += 1) {
        const conversation = conversations[conversationIndex] || {};
        const conversationKey = Number(conversation.id);

        if (!Number.isInteger(conversationKey) || conversationKey <= 0) {
          continue;
        }

        const title = typeof conversation.title === "string" && conversation.title.trim()
          ? conversation.title.trim()
          : `Chat ${conversationIndex + 1}`;
        const subtitle = typeof conversation.subtitle === "string" ? conversation.subtitle : "";

        const insertedConversation = await client.query(
          `INSERT INTO chat_conversations (user_id, conversation_key, title, subtitle, sort_order, updated_at)
           VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
           ON CONFLICT (user_id, conversation_key) DO UPDATE SET
           title = EXCLUDED.title,
           subtitle = EXCLUDED.subtitle,
           sort_order = EXCLUDED.sort_order,
           updated_at = CURRENT_TIMESTAMP
           RETURNING id`,
          [parsedUserId, conversationKey, title, subtitle, conversationIndex]
        );

        const conversationDbId = insertedConversation.rows[0].id;
        await client.query("DELETE FROM chat_messages WHERE conversation_id = $1", [conversationDbId]);

        const messages = Array.isArray(conversation.messages) ? conversation.messages : [];
        for (let messageIndex = 0; messageIndex < messages.length; messageIndex += 1) {
          const message = messages[messageIndex] || {};
          if (typeof message.text !== "string") {
            continue;
          }

          const messageType = message.type === "user" ? "user" : "bot";
          await client.query(
            `INSERT INTO chat_messages (conversation_id, message_order, message_type, message_text)
             VALUES ($1, $2, $3, $4)`,
            [conversationDbId, messageIndex, messageType, message.text]
          );
        }
      }

      await client.query("COMMIT");
    } catch (transactionError) {
      await client.query("ROLLBACK");
      throw transactionError;
    } finally {
      client.release();
    }

    res.json({ ok: true });
  } catch (error) {
    console.error("Erro /api/chat-history:", error);
    res.status(500).json({ message: "Erro ao salvar histórico." });
  }
});


app.post("/api/verify-user", async (req, res) => {
  try {
    const { userId } = req.body || {};
    const parsedUserId = Number(userId);

    if (!Number.isInteger(parsedUserId) || parsedUserId <= 0) {
      return res.status(400).json({ message: "Usuário inválido." });
    }

    const result = await pool.query("SELECT 1 FROM users WHERE id = $1", [
      parsedUserId,
    ]);

    res.json({ exists: result.rows.length > 0 });
  } catch (error) {
    console.error("Erro /api/verify-user:", error);
    res.status(500).json({ message: "Erro ao verificar usuário." });
  }
});

app.post("/api/agent", async (req, res) => {
  try {
    const { pergunta, userId } = req.body || {};

    if (!pergunta) {
      return res.status(400).json({ message: "Pergunta não fornecida." });
    }

    let webhookPayload = {
      pergunta,
      userId,
      incorrectAnswersDetails: [],
      userProfile: null,
    };

    if (userId) {
      const parsedUserId = Number(userId);
      if (Number.isInteger(parsedUserId) && parsedUserId > 0) {

        const answersResult = await pool.query(
          "SELECT question_id, answer FROM adks_answers WHERE user_id = $1 AND has_the_knowledge = false",
          [parsedUserId]
        );
        
        webhookPayload.incorrectAnswersDetails = answersResult.rows.map(row => {
          const questionId = row.question_id;
          const question = ADKS_QUESTIONS.find(q => q.id === questionId);
          
          return {
            questionId: questionId,
            adks_question: question ? question.text : "Pergunta não encontrada.",
            userAnswer: row.answer,
            correct_answer: ADKS_CORRECT_ANSWERS[questionId],
            adks_explanation: ADKS_EXPLANATIONS[questionId] || "Explicação não encontrada.",
          };
        });

const profileResult = await pool.query(
  `SELECT u.name, u.username, p.sex, p.date_of_birth, p.caregiver
   FROM users u
   JOIN profile_questionnaire p ON u.id = p.user_id
   WHERE u.id = $1`,
  [parsedUserId]
);

if (profileResult.rows.length > 0) {
  const profile = profileResult.rows[0];
  webhookPayload.userProfile = {
    name: profile.name,
    username: profile.username,
    genero: profile.sex,
    data_de_nascimento: profile.date_of_birth,
    caregiver: profile.caregiver,
  };
}
      }
    }

    const webhookUrl = process.env.AGENT_WEBHOOK;
    const agentSecret = process.env.AGENT_SECRET;

    if (!webhookUrl) {
      console.warn("AGENT_WEBHOOK não configurada, usando resposta mock");
      const mockResponse = `Entendi sua pergunta: "${pergunta}". Estou aqui para ajudar com informações sobre o Alzheimer.`;
      return res.json({ generated_text: mockResponse });
    }

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(agentSecret && { "X-Secret": agentSecret }),
      },
      body: JSON.stringify(webhookPayload),
    });

    if (!response.ok) {
      console.error("Erro ao chamar n8n:", response.status, response.statusText);
      return res.status(500).json({ message: "Erro ao processar pergunta no agente." });
    }

    const data = await response.json();
    const generatedText = data.generated_text || "Sem resposta do agente. Tente novamente.";

    res.json({ generated_text: generatedText });
  } catch (error) {
    console.error("Erro /api/agent:", error.message);
    res.status(500).json({ message: "Erro ao processar pergunta." });
  }
});

app.post("/api/initial-message", async (req, res) => {
  try {
    const { userId } = req.body || {};
    const parsedUserId = Number(userId);

    if (!Number.isInteger(parsedUserId) || parsedUserId <= 0) {
      return res.status(400).json({ message: "Usuário inválido." });
    }

    // Buscar nome do usuário
    const userResult = await pool.query(
      "SELECT name FROM users WHERE id = $1",
      [parsedUserId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: "Usuário não encontrado." });
    }

    const userName = userResult.rows[0].name;

    // Buscar todas as respostas do ADKS
    const answersResult = await pool.query(
      "SELECT question_id, answer, has_the_knowledge FROM adks_answers WHERE user_id = $1",
      [parsedUserId]
    );

    // Filtrar perguntas erradas e já aprendidas
    const wrongAnswers = [];
    const learnedAnswers = [];

    answersResult.rows.forEach(row => {
      const questionId = row.question_id;
      const userAnswer = row.answer;
      const correctAnswer = ADKS_CORRECT_ANSWERS[questionId];
      const hasTheKnowledge = row.has_the_knowledge;
      
      // Se a resposta está errada
      if (userAnswer !== correctAnswer) {
        if (hasTheKnowledge) {
          // Já aprendeu sobre essa pergunta
          learnedAnswers.push({
            id: questionId,
            text: ADKS_QUESTIONS.find(q => q.id === questionId)?.text || `Pergunta ${questionId}`,
            explanation: ADKS_EXPLANATIONS[questionId] || "Explicação não disponível.",
            userAnswer
          });
        } else {
          // Ainda não aprendeu
          wrongAnswers.push({
            id: questionId,
            text: ADKS_QUESTIONS.find(q => q.id === questionId)?.text || `Pergunta ${questionId}`,
            explanation: ADKS_EXPLANATIONS[questionId] || "Explicação não disponível.",
            userAnswer
          });
        }
      }
    });

    // Gerar mensagem personalizada
    let message = `Olá ${userName}! 👋\n`;
    message += `Vamos revisar seu desempenho?\n\n`;

    if (wrongAnswers.length > 0) {
      message += `**Algumas questões você respondeu incorretamente no questionário e ainda precisa aprender:**\n`;
      wrongAnswers.forEach((q, idx) => {
        const userAnswerLabel = q.userAnswer ? "Verdadeiro" : "Falso";
        message += `\n**${q.text}** 🤔\n`;
        message += `❌ Você respondeu: ${userAnswerLabel}\n`;
        message += `✅ Resposta correta: ${q.explanation}\n`;
      });
    }

    if (learnedAnswers.length > 0) {
      message += `\n\n✅ **Questões que você já está aprendendo:**\n`;
      learnedAnswers.forEach((q, idx) => {
        message += `\n**${q.text}**\n`;
      });
    }

    message += `\n💡 **Como podemos ajudar?**\n`;
    message += `Você pode:\n`;
    message += `• Fazer perguntas sobre os tópicos acima\n`;
    message += `• Pedir explicações mais detalhadas\n`;
    message += `• Solicitar dicas\n\n`;
    message += `Qual destes tópicos você gostaria de explorar agora?`;

    res.json({ generated_text: message });
  } catch (error) {
    console.error("Erro /api/initial-message:", error);
    res.status(500).json({ message: "Erro ao gerar mensagem inicial." });
  }
});

// apagar depois que colocar um ico real pra compartibilidade com browsers antigos
app.get("/favicon.ico", (req, res) => {
  res.redirect(302, "images/icon.svg");
});

app.use((req, res) => {
  res.status(404).json({ message: "Rota não encontrada." });
});

async function startServer() {
  try {
    await pool.query("SELECT NOW()");
    console.log("Conectado ao Neon PostgreSQL");
    await initializeDatabase();
    app.listen(PORT, () => {
      console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Falha ao iniciar o servidor:", error.message);
    process.exit(1);
  }
}

startServer();

process.on("SIGINT", async () => {
  console.log("\nEncerrando servidor...");
  await pool.end();
  process.exit(0);
});
