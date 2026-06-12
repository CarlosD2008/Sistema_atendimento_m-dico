const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Servir arquivos estáticos do frontend (raiz do projeto)
app.use(express.static(path.join(__dirname)));

const dbPath = path.join(__dirname, "data", "db.json");

// Função auxiliar para ler banco de dados JSON
function readDb() {
  try {
    if (!fs.existsSync(dbPath)) {
      // Inicializar arquivo se não existir
      const initialDb = { users: [], appointments: [] };
      fs.mkdirSync(path.dirname(dbPath), { recursive: true });
      fs.writeFileSync(dbPath, JSON.stringify(initialDb, null, 2), "utf8");
      return initialDb;
    }
    const data = fs.readFileSync(dbPath, "utf8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Erro ao ler banco de dados:", err);
    return { users: [], appointments: [] };
  }
}

// Função auxiliar para salvar no banco de dados JSON
function writeDb(data) {
  try {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error("Erro ao salvar no banco de dados:", err);
  }
}

// --- ROTAS DE AUTENTICAÇÃO ---

// Registro de Usuário (Cadastro)
app.post("/api/auth/register", (req, res) => {
  try {
    const { nome, email, cpf, celular, senha } = req.body;

    if (!nome || !email || !cpf || !celular || !senha) {
      return res
        .status(400)
        .json({ error: "Todos os campos são obrigatórios para o cadastro." });
    }

    const db = readDb();

    // Funções seguras de limpeza de strings
    const cleanCpf = (v) =>
      v && typeof v === "string" ? v.replace(/\D/g, "") : "";
    const cleanEmail = (v) =>
      v && typeof v === "string" ? v.trim().toLowerCase() : "";

    const cleanInputCpf = cleanCpf(cpf);
    const cleanInputEmail = cleanEmail(email);

    // Verificar se o CPF ou E-mail já existem (comparação normalizada segura)
    const userExists = db.users.some(
      (u) =>
        cleanCpf(u.cpf) === cleanInputCpf ||
        cleanEmail(u.email) === cleanInputEmail,
    );

    if (userExists) {
      return res
        .status(400)
        .json({
          error: "Um paciente com este CPF ou E-mail já está cadastrado.",
        });
    }

    const newUser = {
      id: Date.now().toString(),
      nome,
      email,
      cpf, // Salva formatado para exibição do portal, mas validações normalizam
      celular,
      senha,
    };

    db.users.push(newUser);
    writeDb(db);

    // Retornar dados públicos do usuário registrado
    const { senha: _, ...userPublic } = newUser;
    res.status(201).json({ success: true, user: userPublic });
  } catch (err) {
    console.error("Erro no cadastro:", err);
    res
      .status(500)
      .json({
        error: "Erro interno no servidor durante o cadastro: " + err.message,
      });
  }
});

// Login de Usuário
app.post("/api/auth/login", (req, res) => {
  try {
    const { loginUser, senha } = req.body;

    if (!loginUser || !senha) {
      return res
        .status(400)
        .json({ error: "Informe o usuário (E-mail ou CPF) e a senha." });
    }

    const db = readDb();

    // Funções seguras de limpeza de strings
    const cleanCpf = (v) =>
      v && typeof v === "string" ? v.replace(/\D/g, "") : "";
    const cleanEmail = (v) =>
      v && typeof v === "string" ? v.trim().toLowerCase() : "";

    const cleanInputUser = loginUser.trim();
    const cleanInputUserCpf = cleanCpf(cleanInputUser);

    // Buscar usuário por CPF (normalizado) ou E-mail
    const user = db.users.find(
      (u) =>
        (cleanEmail(u.email) === cleanInputUser.toLowerCase() ||
          cleanCpf(u.cpf) === cleanInputUserCpf) &&
        u.senha === senha,
    );

    if (!user) {
      return res
        .status(401)
        .json({ error: "Acesso negado. Usuário ou senha incorretos." });
    }

    const { senha: _, ...userPublic } = user;
    res.json({ success: true, user: userPublic });
  } catch (err) {
    console.error("Erro no login:", err);
    res
      .status(500)
      .json({
        error: "Erro interno no servidor durante o login: " + err.message,
      });
  }
});

// --- ROTAS DE AGENDAMENTO ---

// Obter horários disponíveis para uma data específica
app.get("/api/appointments/available-slots", (req, res) => {
  const { date } = req.query;

  if (!date) {
    return res
      .status(400)
      .json({ error: "A data é obrigatória para verificar disponibilidade." });
  }

  const db = readDb();

  // Filtrar consultas ativas no dia selecionado
  const bookedTimes = db.appointments
    .filter((app) => app.data === date)
    .map((app) => app.horario);

  // Horários de atendimento padrão da clínica
  const allSlots = ["08:00", "09:00", "10:00", "14:00", "15:00", "16:00"];

  // Gerar o status de cada slot
  const slotsStatus = allSlots.map((time) => ({
    time,
    available: !bookedTimes.includes(time),
  }));

  res.json(slotsStatus);
});

// Obter agendamentos de um paciente específico (filtro por CPF normalizado)
app.get("/api/appointments", (req, res) => {
  const { patientCpf } = req.query;

  if (!patientCpf) {
    return res
      .status(400)
      .json({ error: "Identificação do paciente (CPF) é obrigatória." });
  }

  const db = readDb();
  const cleanCpf = (v) => v.replace(/\D/g, "");
  const patientAppointments = db.appointments.filter(
    (app) => cleanCpf(app.patientCpf) === cleanCpf(patientCpf),
  );

  // Ordenar por data e hora decrescente/crescente para exibição amigável
  patientAppointments.sort((a, b) => {
    const datetimeA = new Date(`${a.data}T${a.horario}`);
    const datetimeB = new Date(`${b.data}T${b.horario}`);
    return datetimeA - datetimeB;
  });

  res.json(patientAppointments);
});

// Criar novo agendamento
app.post("/api/appointments", (req, res) => {
  const { patientCpf, data, horario, servico, convenio, observacoes } =
    req.body;

  if (!patientCpf || !data || !horario || !servico || !convenio) {
    return res
      .status(400)
      .json({ error: "Campos obrigatórios incompletos para agendamento." });
  }

  const db = readDb();

  // Validar se o horário já está reservado
  const isTimeBooked = db.appointments.some(
    (app) => app.data === data && app.horario === horario,
  );
  if (isTimeBooked) {
    return res
      .status(400)
      .json({
        error:
          "Desculpe, este horário foi reservado recentemente por outro paciente. Escolha outro.",
      });
  }

  const newAppointment = {
    id: Date.now().toString(),
    patientCpf,
    data,
    horario,
    servico,
    convenio,
    observacoes: observacoes || "",
  };

  db.appointments.push(newAppointment);
  writeDb(db);

  res.status(201).json({ success: true, appointment: newAppointment });
});

// Atualizar/Resgatar agendamento (Reagendamento)
app.put("/api/appointments/:id", (req, res) => {
  const { id } = req.params;
  const { data, horario, servico, convenio, observacoes } = req.body;

  if (!data || !horario || !servico || !convenio) {
    return res
      .status(400)
      .json({ error: "Campos de atualização obrigatórios não preenchidos." });
  }

  const db = readDb();
  const index = db.appointments.findIndex((app) => app.id === id);

  if (index === -1) {
    return res.status(404).json({ error: "Agendamento não encontrado." });
  }

  // Validar se o novo horário está reservado por OUTRA consulta
  const isTimeBookedByOther = db.appointments.some(
    (app) => app.id !== id && app.data === data && app.horario === horario,
  );
  if (isTimeBookedByOther) {
    return res
      .status(400)
      .json({ error: "Este horário está reservado por outro paciente." });
  }

  // Atualizar dados do agendamento
  const updatedAppointment = {
    ...db.appointments[index],
    data,
    horario,
    servico,
    convenio,
    observacoes:
      observacoes !== undefined
        ? observacoes
        : db.appointments[index].observacoes,
  };

  db.appointments[index] = updatedAppointment;
  writeDb(db);

  res.json({ success: true, appointment: updatedAppointment });
});

// Cancelar/Deletar agendamento
app.delete("/api/appointments/:id", (req, res) => {
  const { id } = req.params;
  const db = readDb();

  const initialLength = db.appointments.length;
  db.appointments = db.appointments.filter((app) => app.id !== id);

  if (db.appointments.length === initialLength) {
    return res
      .status(404)
      .json({ error: "Agendamento não encontrado para exclusão." });
  }

  writeDb(db);
  res.json({ success: true, message: "Agendamento cancelado com sucesso." });
});

// Iniciando o servidor
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`  Servidor Cordis Cardiologia rodando em:`);
  console.log(`  http://localhost:${PORT}`);
  console.log(`=======================================================`);
});
