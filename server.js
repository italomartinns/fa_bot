require("dotenv").config();
const express = require("express");
const path = require("path");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");

const app = express();
const PORT = process.env.PORT || 3000;

// Configurar pool de conexão com Neon PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Headers de segurança
function securityHeaders(req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
  next();
}

app.use(securityHeaders);

// Inicializar banco de dados (criar tabelas se não existirem)
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
        age INTEGER NOT NULL,
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, question_id),
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    console.log("✅ Banco de dados inicializado");
  } catch (error) {
    console.error("❌ Erro ao inicializar banco:", error.message);
  }
}

// Normalizar username
function normalizeUsername(value) {
  return value.trim().toLowerCase();
}

// Rota raiz
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

// POST /api/register - Criar novo usuário
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

// POST /api/login - Autenticar usuário
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

// POST /api/profile - Salvar perfil demográfico
app.post("/api/profile", async (req, res) => {
  try {
    const { userId, sex, age, maritalStatus, caregiver } = req.body || {};

    const parsedUserId = Number(userId);
    const parsedAge = Number(age);

    if (!Number.isInteger(parsedUserId) || parsedUserId <= 0) {
      return res.status(400).json({ message: "Usuário inválido." });
    }

    if (!["Feminino", "Masculino", "Prefiro não responder"].includes(sex)) {
      return res.status(400).json({ message: "Sexo inválido." });
    }

    if (!["Casado", "União estável", "Solteiro", "Divorciado", "Viúvo"].includes(maritalStatus)) {
      return res.status(400).json({ message: "Estado civil inválido." });
    }

    if (!Number.isInteger(parsedAge) || parsedAge <= 0 || parsedAge > 150) {
      return res.status(400).json({ message: "Idade inválida." });
    }

    if (typeof caregiver !== "boolean") {
      return res.status(400).json({ message: "Resposta de cuidador inválida." });
    }

    await pool.query(
      `INSERT INTO profile_questionnaire (user_id, sex, age, marital_status, caregiver) 
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT(user_id) DO UPDATE SET
       sex = EXCLUDED.sex,
       age = EXCLUDED.age,
       marital_status = EXCLUDED.marital_status,
       caregiver = EXCLUDED.caregiver,
       updated_at = CURRENT_TIMESTAMP`,
      [parsedUserId, sex, parsedAge, maritalStatus, caregiver]
    );

    res.json({ ok: true });
  } catch (error) {
    console.error("Erro /api/profile:", error);
    res.status(500).json({ message: "Erro ao salvar perfil." });
  }
});

// POST /api/adks - Salvar respostas ADKS
app.post("/api/adks", async (req, res) => {
  try {
    const { userId, answers } = req.body || {};

    const parsedUserId = Number(userId);

    if (!Number.isInteger(parsedUserId) || parsedUserId <= 0) {
      return res.status(400).json({ message: "Usuário inválido." });
    }

    if (!Array.isArray(answers) || answers.length !== 30) {
      return res.status(400).json({ message: "Respostas do ADKS inválidas." });
    }

    // Validar respostas
    for (const entry of answers) {
      const questionId = Number(entry?.questionId);
      if (!Number.isInteger(questionId) || questionId < 1 || questionId > 30) {
        return res.status(400).json({ message: "Respostas do ADKS inválidas." });
      }
      if (typeof entry?.answer !== "boolean") {
        return res.status(400).json({ message: "Respostas do ADKS inválidas." });
      }
    }

    // Verificar se perfil existe
    const profileCheck = await pool.query(
      "SELECT 1 FROM profile_questionnaire WHERE user_id = $1",
      [parsedUserId]
    );

    if (profileCheck.rows.length === 0) {
      return res.status(400).json({ message: "Perfil não encontrado. Preencha o questionário primeiro." });
    }

    // Deletar respostas antigas
    await pool.query("DELETE FROM adks_answers WHERE user_id = $1", [parsedUserId]);

    // Inserir novas respostas
    for (const answer of answers) {
      await pool.query(
        "INSERT INTO adks_answers (user_id, question_id, answer) VALUES ($1, $2, $3)",
        [parsedUserId, answer.questionId, answer.answer]
      );
    }

    res.json({ ok: true });
  } catch (error) {
    console.error("Erro /api/adks:", error);
    res.status(500).json({ message: "Erro ao salvar ADKS." });
  }
});

// POST /api/onboarding-status - Verificar status de onboarding
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

// POST /api/agent - Consultar agente IA via n8n
app.post("/api/agent", async (req, res) => {
  try {
    const { pergunta, userId } = req.body || {};

    if (!pergunta) {
      return res.status(400).json({ message: "Pergunta não fornecida." });
    }

    const webhookUrl = process.env.AGENT_WEBHOOK;
    const agentSecret = process.env.AGENT_SECRET;

    if (!webhookUrl) {
      console.warn("⚠️ AGENT_WEBHOOK não configurada, usando resposta mock");
      const mockResponse = `Entendi sua pergunta: "${pergunta}". Estou aqui para ajudar com informações sobre o Alzheimer.`;
      return res.json({ answer: mockResponse });
    }

    // Chamar webhook do n8n
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(agentSecret && { "X-Secret": agentSecret }),
      },
      body: JSON.stringify({ pergunta, userId }),
    });

    if (!response.ok) {
      console.error("Erro ao chamar n8n:", response.status, response.statusText);
      return res.status(500).json({ message: "Erro ao processar pergunta no agente." });
    }

    const data = await response.json();
    res.json({ answer: data.answer || data.response || data.text || "Sem resposta do agente." });
  } catch (error) {
    console.error("Erro /api/agent:", error.message);
    res.status(500).json({ message: "Erro ao processar pergunta." });
  }
});

// Tratamento de erro 404
app.use((req, res) => {
  res.status(404).json({ message: "Rota não encontrada." });
});

// Iniciar servidor
async function startServer() {
  try {
    // Testar conexão com banco
    await pool.query("SELECT NOW()");
    console.log("✅ Conectado ao Neon PostgreSQL");

    // Inicializar banco
    await initializeDatabase();

    app.listen(PORT, () => {
      console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("❌ Erro ao conectar banco de dados:", error.message);
    process.exit(1);
  }
}

startServer();

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\nEncerrando servidor...");
  await pool.end();
  process.exit(0);
});
