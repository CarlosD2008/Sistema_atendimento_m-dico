/**
 * Cordis Cardiologia - Core Application Logic
 * Pure Vanilla JS, IIFE Scope Protection
 */
(() => {
  // ==========================================================================
  // ESTADO GLOBAL DA APLICAÇÃO
  // ==========================================================================
  const AppState = {
    isLoggedIn: false,
    user: null,
    appointments: [],

    // Agendamento Wizard State
    selectedDate: null,
    selectedTime: null,
    currentMonth: new Date(),
    editingAppointmentId: null,

    // Configurações
    monthsBr: [
      "Janeiro",
      "Fevereiro",
      "Março",
      "Abril",
      "Maio",
      "Junho",
      "Julho",
      "Agosto",
      "Setembro",
      "Outubro",
      "Novembro",
      "Dezembro",
    ],
    weekdaysBr: ["D", "S", "T", "Q", "Q", "S", "S"],
  };

  const API_BASE =
    window.location.protocol === "file:" ? "http://localhost:3000" : "";

  // ==========================================================================
  // INICIALIZAÇÃO E BINDING
  // ==========================================================================
  window.addEventListener("DOMContentLoaded", () => {
    // Inicializar biblioteca de animações
    AOS.init({ duration: 800, once: true });

    initTheme();
    initLeafletMap();
    checkExistingSession();
    bindEvents();
    initCounters();
    initFaqAccordion();
    initTestimonialSlider();
  });

  // ==========================================================================
  // GERENCIAMENTO DE MÚLTIPLOS EVENTOS (Binds)
  // ==========================================================================
  function bindEvents() {
    // --- Rotas de Navegação Principal ---
    document
      .getElementById("logoHome")
      .addEventListener("click", () => showPage("home"));
    document
      .getElementById("btnNavHome")
      .addEventListener("click", () => showPage("home"));

    // Navegação Inteligente (Rolagem ou redirecionamento para Home)
    const sectionsToScroll = [
      "Sobre",
      "Servicos",
      "Beneficios",
      "FAQ",
      "Contato",
    ];
    sectionsToScroll.forEach((sect) => {
      const btn = document.getElementById(`btnNav${sect}`);
      if (btn) {
        btn.addEventListener("click", () => {
          navigateToSection(sect.toLowerCase());
          closeMobileMenu();
        });
      }
    });

    // Links Rápidos do Footer
    sectionsToScroll.forEach((sect) => {
      const link = document.getElementById(`footLink${sect}`);
      if (link) {
        link.addEventListener("click", (e) => {
          e.preventDefault();
          navigateToSection(sect.toLowerCase());
        });
      }
    });

    const footLinkInicio = document.getElementById("footLinkInicio");
    if (footLinkInicio) {
      footLinkInicio.addEventListener("click", (e) => {
        e.preventDefault();
        showPage("home");
        window.scrollTo(0, 0);
      });
    }

    // Ações de Botões de Acesso ao Portal
    document.getElementById("btnNavAuth").addEventListener("click", () => {
      if (AppState.isLoggedIn) {
        showPage("dashboard");
      } else {
        showPage("auth");
      }
      closeMobileMenu();
    });

    document.getElementById("btnNavDashboard").addEventListener("click", () => {
      showPage("dashboard");
      closeMobileMenu();
    });

    // Botões CTA de Agendamento
    const agendarBtns = [
      "btnNavAgendar",
      "heroBtnAgendar",
      "ctaBtnAgendar",
      "btnAgendarPeloDash",
    ];
    agendarBtns.forEach((id) => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.addEventListener("click", () => {
          if (!AppState.isLoggedIn) {
            showToast(
              "Acesso restrito. Efetue login ou cadastre-se para agendar uma consulta.",
              "warning",
            );
            showPage("auth");
          } else {
            resetAgendamentoForm();
            showPage("agendamento");
          }
          closeMobileMenu();
        });
      }
    });

    // Direcionar botão de Saiba Mais no Hero
    document.getElementById("heroBtnSobre").addEventListener("click", () => {
      navigateToSection("sobre");
    });

    // Menu Sanduíche Mobile
    document
      .getElementById("hamburgerBtn")
      .addEventListener("click", toggleMobileMenu);

    // --- Alternar Temas (Claro/Escuro) ---
    document
      .getElementById("themeToggleBtn")
      .addEventListener("click", toggleTheme);

    // --- Fluxo de Autenticação (Toggles e Submits) ---
    document
      .getElementById("linkToRegister")
      .addEventListener("click", toggleAuthForm);
    document
      .getElementById("linkToLogin")
      .addEventListener("click", toggleAuthForm);

    document
      .getElementById("formLogin")
      .addEventListener("submit", handleLoginSubmit);
    document
      .getElementById("formRegister")
      .addEventListener("submit", handleRegisterSubmit);
    document
      .getElementById("btnLogoff")
      .addEventListener("click", handleLogoff);

    // --- Wizard de Agendamento ---
    document
      .getElementById("btnStep1Next")
      .addEventListener("click", () => validateAndGoToStep(2));
    document
      .getElementById("btnStep2Prev")
      .addEventListener("click", () => goToStep(1));
    document
      .getElementById("btnStep2Next")
      .addEventListener("click", () => validateAndGoToStep(3));
    document
      .getElementById("btnStep3Prev")
      .addEventListener("click", () => goToStep(2));
    document
      .getElementById("formAgendar")
      .addEventListener("submit", handleBookingSubmit);

    // Controles do Calendário
    document
      .getElementById("btnCalendarPrev")
      .addEventListener("click", () => changeMonth(-1));
    document
      .getElementById("btnCalendarNext")
      .addEventListener("click", () => changeMonth(1));

    // --- Formulário de Contato ---
    document
      .getElementById("formContato")
      .addEventListener("submit", handleContactSubmit);

    // --- Botão Voltar ao Topo ---
    window.addEventListener("scroll", handleWindowScroll);
    document.getElementById("backToTopBtn").addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    // --- Máscaras de Inputs ---
    setupInputMask("regCpf", maskCpf);
    setupInputMask("regCelular", maskPhone);
    setupInputMask("contatoCelular", maskPhone);
  }

  // ==========================================================================
  // ROTEAMENTO SPA E ROLAGEM DE SEÇÃO
  // ==========================================================================
  function showPage(pageId) {
    // Validação UX de Fluxo Real: Redireciona usuários deslogados tentando agendar/acessar painel
    if (
      (pageId === "agendamento" || pageId === "dashboard") &&
      !AppState.isLoggedIn
    ) {
      showToast(
        "Acesso restrito. Faça login ou cadastre-se primeiro.",
        "warning",
      );
      pageId = "auth";
    }

    document.querySelectorAll(".page-content").forEach((page) => {
      page.classList.remove("page-active");
    });

    const activePage = document.getElementById(pageId);
    if (activePage) {
      activePage.classList.add("page-active");
    }

    // Fechar menu mobile se estiver aberto
    closeMobileMenu();

    // Scroll para o topo
    window.scrollTo({ top: 0, behavior: "instant" });

    // Atualizar AOS
    AOS.refresh();
  }

  function navigateToSection(sectionId) {
    const targetEl = document.getElementById(sectionId);
    const activePage = document.querySelector(".page-content.page-active");

    if (activePage && activePage.id !== "home") {
      // Se não estiver na home, primeiro abre a home
      showPage("home");
      // Espera carregar a página home e executa rolagem
      setTimeout(() => {
        const el = document.getElementById(sectionId);
        if (el) {
          const headerHeight =
            document.querySelector(".header-custom").offsetHeight;
          window.scrollTo({
            top: el.offsetTop - headerHeight,
            behavior: "smooth",
          });
        }
      }, 300);
    } else {
      if (targetEl) {
        const headerHeight =
          document.querySelector(".header-custom").offsetHeight;
        window.scrollTo({
          top: targetEl.offsetTop - headerHeight,
          behavior: "smooth",
        });
      }
    }
  }

  // ==========================================================================
  // MENU RESPONSIVO MOBILE
  // ==========================================================================
  function toggleMobileMenu() {
    const navLinks = document.getElementById("navLinks");
    const isExpanded = navLinks.classList.toggle("active");
    document
      .getElementById("hamburgerBtn")
      .setAttribute("aria-expanded", isExpanded);
  }

  function closeMobileMenu() {
    const navLinks = document.getElementById("navLinks");
    if (navLinks.classList.contains("active")) {
      navLinks.classList.remove("active");
      document
        .getElementById("hamburgerBtn")
        .setAttribute("aria-expanded", "false");
    }
  }

  // ==========================================================================
  // GERENCIAMENTO DE TEMAS (Dark / Light Mode)
  // ==========================================================================
  function initTheme() {
    const savedTheme = localStorage.getItem("theme") || "light";
    if (savedTheme === "dark") {
      document.body.classList.add("dark-theme");
      document.getElementById("themeToggleIcon").className = "bi bi-sun-fill";
    } else {
      document.body.classList.remove("dark-theme");
      document.getElementById("themeToggleIcon").className = "bi bi-moon-fill";
    }
  }

  function toggleTheme() {
    const isDark = document.body.classList.toggle("dark-theme");
    const icon = document.getElementById("themeToggleIcon");

    if (isDark) {
      localStorage.setItem("theme", "dark");
      icon.className = "bi bi-sun-fill";
      showToast("Modo Escuro ativado.", "info");
    } else {
      localStorage.setItem("theme", "light");
      icon.className = "bi bi-moon-fill";
      showToast("Modo Claro ativado.", "info");
    }
  }

  // ==========================================================================
  // SESSÕES DE USUÁRIO (Autenticação)
  // ==========================================================================
  function checkExistingSession() {
    const savedUser = sessionStorage.getItem("user");
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        setLoggedInState(user);
      } catch (err) {
        sessionStorage.removeItem("user");
      }
    }
  }

  function setLoggedInState(user) {
    AppState.isLoggedIn = true;
    AppState.user = user;

    // Atualizar UI do Header
    document.getElementById("btnNavAuth").innerText = "Minha Conta";
    document.getElementById("btnNavDashboard").style.display = "block";

    // Atualizar UI do Dashboard
    document.getElementById("dashNomePaciente").innerText = user.nome;

    // Carregar dados reais de consultas
    loadDashboardData();
  }

  function setLoggedOutState() {
    AppState.isLoggedIn = false;
    AppState.user = null;
    AppState.appointments = [];

    // Restaurar UI do Header
    document.getElementById("btnNavAuth").innerText = "Login";
    document.getElementById("btnNavDashboard").style.display = "none";
  }

  function toggleAuthForm() {
    const loginCard = document.getElementById("loginFormCard");
    const registerCard = document.getElementById("registerFormCard");

    if (loginCard.style.display === "none") {
      loginCard.style.display = "block";
      registerCard.style.display = "none";
    } else {
      loginCard.style.display = "none";
      registerCard.style.display = "block";
    }
  }

  // Envio de Formulário de Login (Requisição Real)
  async function handleLoginSubmit(e) {
    e.preventDefault();
    const loginUser = document.getElementById("loginUser").value.trim();
    const senha = document.getElementById("loginSenha").value;
    try {
      const users = JSON.parse(localStorage.getItem("users") || "[]");
      const user = users.find(u => u.email.toLowerCase() === loginUser.toLowerCase() || u.cpf.replace(/\D/g,'') === loginUser.replace(/\D/g,''));
      if (!user) throw new Error("Usuário não encontrado.");
      if (user.senha !== senha) throw new Error("Senha inválida.");
      const loggedUser = {id:user.id,nome:user.nome,email:user.email,cpf:user.cpf,celular:user.celular};
      sessionStorage.setItem("user", JSON.stringify(loggedUser));
      setLoggedInState(loggedUser);
      showToast(`Bem-vindo(a) de volta, ${loggedUser.nome}!`, "success");
      document.getElementById("formLogin").reset();
      showPage("dashboard");
    } catch (err) { showToast(err.message, "danger"); }
  }

  // Envio de Formulário de Cadastro (Requisição Real)
  async function handleRegisterSubmit(e) {
    e.preventDefault();
    const nome = document.getElementById("regNome").value.trim();
    const email = document.getElementById("regEmail").value.trim();
    const cpf = document.getElementById("regCpf").value.trim();
    const celular = document.getElementById("regCelular").value.trim();
    const senha = document.getElementById("regSenha").value;
    if (senha.length < 4) return showToast("A senha deve conter no mínimo 4 caracteres.","warning");
    try {
      const users = JSON.parse(localStorage.getItem("users") || "[]");
      if (users.find(u => u.email.toLowerCase()===email.toLowerCase() || u.cpf===cpf)) throw new Error("CPF ou e-mail já cadastrado.");
      const user = {id:Date.now().toString(),nome,email,cpf,celular,senha};
      users.push(user);
      localStorage.setItem("users", JSON.stringify(users));
      const loggedUser = {id:user.id,nome,email,cpf,celular};
      sessionStorage.setItem("user", JSON.stringify(loggedUser));
      setLoggedInState(loggedUser);
      showToast("Cadastro criado com sucesso!","success");
      document.getElementById("formRegister").reset();
      showPage("dashboard");
    } catch (err) { showToast(err.message, "danger"); }
  }

  // Logoff
  function handleLogoff() {
    sessionStorage.removeItem("user");
    setLoggedOutState();
    showToast("Sessão encerrada com sucesso.", "info");
    showPage("home");
  }

  // ==========================================================================
  // CARREGAMENTO DE DADOS DO DASHBOARD (INTEGRAÇÃO API)
  // ==========================================================================
  async function loadDashboardData() {
    if (!AppState.isLoggedIn || !AppState.user) return;

    try {
      const response = await fetch(
        `${API_BASE}/api/appointments?patientCpf=${encodeURIComponent(AppState.user.cpf)}`,
      );
      if (!response.ok) {
        throw new Error("Erro ao buscar agendamentos no banco.");
      }

      const appointments = await response.json();
      AppState.appointments = appointments;
      renderDashboardAppointments();
    } catch (err) {
      console.error(err);
      showToast(
        "Não foi possível carregar os dados de consultas do servidor.",
        "danger",
      );
    }
  }

  function renderDashboardAppointments() {
    const nextBox = document.getElementById("nextAppointmentBox");
    const historyBody = document.getElementById("historyTableBody");
    const hojeStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    // Encontrar próxima consulta futura
    // As consultas já vêm ordenadas por data crescente da API
    const proxima = AppState.appointments.find((app) => app.data >= hojeStr);

    // --- 1. Renderizar Próxima Consulta ---
    if (proxima) {
      const partes = proxima.data.split("-");
      const dataFormatada = `${partes[2]}/${partes[1]}/${partes[0]}`;

      nextBox.className = "next-appointment-box";
      nextBox.innerHTML = `
        <div class="next-appointment-icon">
          <i class="bi bi-calendar-check-fill"></i>
        </div>
        <div class="next-appointment-date">${dataFormatada} às ${proxima.horario}</div>
        <div class="next-appointment-details">
          <strong>Serviço:</strong> ${proxima.servico}<br>
          <strong>Convênio:</strong> ${proxima.convenio}
          ${proxima.observacoes ? `<br><small class="text-muted">Obs: ${proxima.observacoes}</small>` : ""}
        </div>
        <span class="badge-status badge-confirmado" style="display:inline-block; margin-bottom:15px;">Confirmado</span>
        <div style="display:flex; justify-content:center; gap:10px;">
          <button class="btn-custom btn-secondary-custom btn-edit-app" data-id="${proxima.id}" style="font-size: 0.8rem; padding: 8px 16px;">
            <i class="bi bi-pencil-square"></i> Reagendar
          </button>
          <button class="btn-custom btn-secondary-custom btn-cancel-app" data-id="${proxima.id}" style="font-size: 0.8rem; padding: 8px 16px; color: var(--color-danger); border-color: rgba(239, 68, 68, 0.2);">
            <i class="bi bi-trash"></i> Cancelar
          </button>
        </div>
      `;

      // Adicionar Event Listeners dos botões de ação
      nextBox
        .querySelector(".btn-edit-app")
        .addEventListener("click", () => startRescheduleFlow(proxima));
      nextBox
        .querySelector(".btn-cancel-app")
        .addEventListener("click", () => handleCancelFlow(proxima.id));
    } else {
      nextBox.className = "next-appointment-box empty";
      nextBox.innerHTML = `
        <div class="next-appointment-icon">
          <i class="bi bi-calendar-x"></i>
        </div>
        <div class="next-appointment-details" style="margin-bottom:15px;">Nenhuma consulta agendada no momento.</div>
        <button class="btn-custom btn-primary-custom" id="btnAgendarPeloDashInterno" style="font-size: 0.85rem; padding: 10px 20px;">
          Agendar Nova Consulta
        </button>
      `;
      document
        .getElementById("btnAgendarPeloDashInterno")
        .addEventListener("click", () => {
          resetAgendamentoForm();
          showPage("agendamento");
        });
    }

    // --- 2. Renderizar Histórico (Tabela) ---
    historyBody.innerHTML = "";
    if (AppState.appointments.length > 0) {
      AppState.appointments.forEach((app) => {
        const partes = app.data.split("-");
        const dataFormatada = `${partes[2]}/${partes[1]}/${partes[0]}`;
        const isFutura = app.data >= hojeStr;
        const statusBadge = isFutura
          ? `<span class="badge-status badge-confirmado">Confirmado</span>`
          : `<span class="badge-status badge-concluido">Concluído</span>`;

        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${dataFormatada} - ${app.horario}</td>
          <td><strong>${app.servico}</strong></td>
          <td>${app.convenio}</td>
          <td>${statusBadge}</td>
        `;
        historyBody.appendChild(tr);
      });
    } else {
      historyBody.innerHTML = `
        <tr>
          <td colspan="4" class="text-center text-muted" style="padding: 30px;">
            Nenhum histórico de atividades registrado.
          </td>
        </tr>
      `;
    }
  }

  // Fluxo de Cancelamento (API Real)
  async function handleCancelFlow(appointmentId) {
    if (
      !confirm(
        "Tem certeza de que deseja cancelar este agendamento? Esta ação não pode ser desfeita.",
      )
    ) {
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE}/api/appointments/${appointmentId}`,
        {
          method: "DELETE",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao cancelar consulta.");
      }

      showToast("Agendamento cancelado com sucesso.", "success");
      loadDashboardData();
    } catch (err) {
      showToast(err.message, "danger");
    }
  }

  // Fluxo de Edição / Reagendamento (Interface Setup)
  function startRescheduleFlow(app) {
    AppState.editingAppointmentId = app.id;

    // Setar valores atuais
    document.getElementById("servicoSelect").value = app.servico;
    document.getElementById("convenioSelect").value = app.convenio;

    AppState.selectedDate = app.data;
    document.getElementById("dataAgenda").value = app.data;
    AppState.selectedTime = app.horario;
    document.getElementById("selectedTime").value = app.horario;
    document.getElementById("observacoesPaciente").value = app.observacoes;

    // Ajustar mês do calendário para o mês da consulta a ser editada
    const partes = app.data.split("-");
    AppState.currentMonth = new Date(partes[0], partes[1] - 1, 1);

    document.getElementById("agendamentoTitle").innerText =
      "Ajustar / Reagendar Consulta";

    // Abrir Passo 1 preenchido
    showPage("agendamento");
    goToStep(1);
  }

  // ==========================================================================
  // WIZARD DE AGENDAMENTO (Interface e Logica Calendário)
  // ==========================================================================
  function goToStep(s) {
    document.getElementById("step1").style.display = s === 1 ? "block" : "none";
    document.getElementById("step2").style.display = s === 2 ? "block" : "none";
    document.getElementById("step3").style.display = s === 3 ? "block" : "none";

    // Atualizar classes dos indicadores
    for (let i = 1; i <= 3; i++) {
      const indicator = document.getElementById(`step${i}-indicator`);
      if (i === s) {
        indicator.className = "step active";
      } else if (i < s) {
        indicator.className = "step completed";
      } else {
        indicator.className = "step";
      }
    }
  }

  function validateAndGoToStep(s) {
    if (s === 2) {
      const servico = document.getElementById("servicoSelect").value;
      const convenio = document.getElementById("convenioSelect").value;

      if (!servico || !convenio) {
        return showToast(
          "Por favor, selecione o serviço e o convênio desejados.",
          "warning",
        );
      }

      // Renderizar o calendário e iniciar
      renderCalendar();
      goToStep(2);
    } else if (s === 3) {
      const data = document.getElementById("dataAgenda").value;
      const hora = document.getElementById("selectedTime").value;

      if (!data || !hora) {
        return showToast(
          "Selecione o dia da consulta e um dos horários disponíveis.",
          "warning",
        );
      }

      // Preencher Resumo do Passo 3
      document.getElementById("resumoServico").innerText =
        document.getElementById("servicoSelect").value;
      document.getElementById("resumoConvenio").innerText =
        document.getElementById("convenioSelect").value;

      const partes = data.split("-");
      document.getElementById("resumoData").innerText =
        `${partes[2]}/${partes[1]}/${partes[0]}`;
      document.getElementById("resumoHora").innerText = hora;

      goToStep(3);
    }
  }

  function resetAgendamentoForm() {
    AppState.editingAppointmentId = null;
    AppState.selectedDate = null;
    AppState.selectedTime = null;
    AppState.currentMonth = new Date();

    document.getElementById("agendamentoTitle").innerText =
      "Agendar Nova Consulta";
    document.getElementById("formAgendar").reset();
    document.getElementById("dataAgenda").value = "";
    document.getElementById("selectedTime").value = "";
    document.getElementById("timeSlots").innerHTML = `
      <div class="text-center text-muted" style="grid-column: 1 / -1; padding: 10px;">
        Selecione um dia no calendário para ver os horários.
      </div>
    `;

    goToStep(1);
  }

  // --- Render do Calendário ---
  function renderCalendar() {
    const y = AppState.currentMonth.getFullYear();
    const m = AppState.currentMonth.getMonth();
    const hoje = new Date();

    document.getElementById("calendarTitle").innerText =
      `${AppState.monthsBr[m]} ${y}`;

    // Desabilitar voltar mês se for o mês corrente
    const btnPrev = document.getElementById("btnCalendarPrev");
    btnPrev.disabled = y === hoje.getFullYear() && m === hoje.getMonth();

    const grid = document.getElementById("calendarGrid");
    grid.innerHTML = "";

    // Adicionar dias da semana no grid
    AppState.weekdaysBr.forEach((d) => {
      const div = document.createElement("div");
      div.className = "calendar-weekday";
      div.innerText = d;
      grid.appendChild(div);
    });

    const firstDayIndex = new Date(y, m, 1).getDay();
    const totalDays = new Date(y, m + 1, 0).getDate();
    const hojeStr = hoje.toISOString().split("T")[0];

    // Espaços em branco antes do primeiro dia
    for (let i = 0; i < firstDayIndex; i++) {
      grid.appendChild(document.createElement("div"));
    }

    // Dias do mês
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const tempDate = new Date(y, m, d);

      const div = document.createElement("div");
      div.className = "calendar-day";
      div.innerText = d;

      // Desabilitar dias anteriores ao dia de hoje, ou finais de semana
      if (
        dateStr < hojeStr ||
        tempDate.getDay() === 0 ||
        tempDate.getDay() === 6
      ) {
        div.classList.add("disabled");
      } else {
        if (AppState.selectedDate === dateStr) {
          div.classList.add("selected");
        }

        div.onclick = () => {
          document
            .querySelectorAll(".calendar-day")
            .forEach((el) => el.classList.remove("selected"));
          div.classList.add("selected");
          AppState.selectedDate = dateStr;
          document.getElementById("dataAgenda").value = dateStr;

          // Buscar horários vagos no backend
          loadAvailableSlots(dateStr);
        };
      }
      grid.appendChild(div);
    }
  }

  function changeMonth(dir) {
    const hoje = new Date();
    const novaData = new Date(AppState.currentMonth);
    novaData.setMonth(novaData.getMonth() + dir);

    // Evitar retrocesso a meses anteriores ao atual
    if (
      novaData.getFullYear() < hoje.getFullYear() ||
      (novaData.getFullYear() === hoje.getFullYear() &&
        novaData.getMonth() < hoje.getMonth())
    ) {
      return;
    }

    AppState.currentMonth = novaData;
    renderCalendar();
  }

  // Carregar slots ocupados/livres da API
  async function loadAvailableSlots(date) {
    const horarios = [
      '08:00','08:30','09:00','09:30','10:00','10:30',
      '11:00','11:30','13:00','13:30','14:00','14:30',
      '15:00','15:30','16:00','16:30','17:00'
    ];
    const slots = horarios.map(h => ({time:h, available:true}));
    renderTimeSlots(slots);
  }

  function renderTimeSlots(slots) {
    const container = document.getElementById("timeSlots");
    container.innerHTML = "";

    slots.forEach((slot) => {
      const div = document.createElement("div");
      div.className = "time-slot";

      if (!slot.available) {
        div.classList.add("disabled");
        div.title = "Horário ocupado";
      } else {
        if (AppState.selectedTime === slot.time) {
          div.classList.add("active");
        }

        div.onclick = () => {
          document
            .querySelectorAll(".time-slot")
            .forEach((s) => s.classList.remove("active"));
          div.classList.add("active");
          AppState.selectedTime = slot.time;
          document.getElementById("selectedTime").value = slot.time;
        };
      }

      div.innerText = slot.time;
      container.appendChild(div);
    });
  }

  // Gravar agendamento (Criação / Edição real via API)
  async function handleBookingSubmit(e) {
    e.preventDefault();

    const loading = document.getElementById("bookingLoading");
    loading.classList.add("active");

    const payload = {
      patientCpf: AppState.user.cpf,
      data: AppState.selectedDate,
      horario: AppState.selectedTime,
      servico: document.getElementById("servicoSelect").value,
      convenio: document.getElementById("convenioSelect").value,
      observacoes: document.getElementById("observacoesPaciente").value.trim(),
    };

    const isEdit = AppState.editingAppointmentId !== null;
    const url = isEdit
      ? `${API_BASE}/api/appointments/${AppState.editingAppointmentId}`
      : `${API_BASE}/api/appointments`;
    const method = isEdit ? "PUT" : "POST";

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao processar agendamento.");
      }

      showToast(
        isEdit
          ? "✓ Consulta reagendada com sucesso!"
          : "✓ Consulta agendada com sucesso!",
        "success",
      );

      // Carregar os novos dados atualizados
      await loadDashboardData();

      setTimeout(() => {
        loading.classList.remove("active");
        showPage("dashboard");
      }, 1200);
    } catch (err) {
      loading.classList.remove("active");
      showToast(err.message, "danger");
    }
  }

  // ==========================================================================
  // FORMULÁRIO DE CONTATO (VALIDAÇÃO E SUBMISSÃO)
  // ==========================================================================
  function handleContactSubmit(e) {
    e.preventDefault();
    const loading = document.getElementById("contactFormLoading");
    loading.classList.add("active");

    // Simular envio de e-mail ao backend
    setTimeout(() => {
      loading.classList.remove("active");
      showToast(
        "Mensagem enviada com sucesso! Nossa equipe entrará em contato em breve.",
        "success",
      );
      document.getElementById("formContato").reset();
    }, 1500);
  }

  // ==========================================================================
  // ANIMAÇÃO DE NÚMEROS (Counter Up)
  // ==========================================================================
  function initCounters() {
    const statsGrid = document.querySelector(".stats-grid");
    if (!statsGrid) return;

    let animated = false;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !animated) {
            animated = true;
            document.querySelectorAll(".stat-number").forEach((counter) => {
              const target = parseInt(counter.getAttribute("data-target"));
              const duration = 1500; // ms
              const stepTime = Math.max(Math.floor(duration / target), 15);
              let current = 0;

              const timer = setInterval(() => {
                // Incremento inteligente para números grandes
                const increment = Math.ceil(target / 80);
                current += increment;

                if (current >= target) {
                  counter.innerText =
                    target.toLocaleString() + (target === 99 ? "%" : "+");
                  clearInterval(timer);
                } else {
                  counter.innerText = current.toLocaleString();
                }
              }, stepTime);
            });
          }
        });
      },
      { threshold: 0.2 },
    );

    observer.observe(statsGrid);
  }

  // ==========================================================================
  // ACORDEON DO FAQ (Visual)
  // ==========================================================================
  function initFaqAccordion() {
    const faqItems = document.querySelectorAll(".faq-item");

    faqItems.forEach((item) => {
      const header = item.querySelector(".faq-header");
      const content = item.querySelector(".faq-content");

      header.addEventListener("click", () => {
        const isActive = item.classList.contains("active");

        // Fechar todos
        faqItems.forEach((i) => {
          i.classList.remove("active");
          i.querySelector(".faq-content").style.maxHeight = "0";
        });

        // Abrir o clicado se não estava aberto
        if (!isActive) {
          item.classList.add("active");
          content.style.maxHeight = content.scrollHeight + "px";
        }
      });
    });
  }

  // ==========================================================================
  // CARROSSEL DE DEPOIMENTOS (Testimonials)
  // ==========================================================================
  function initTestimonialSlider() {
    const track = document.getElementById("testimonialTrack");
    const slides = document.querySelectorAll(".testimonial-slide");
    const dotsContainer = document.getElementById("testimonialDots");
    const prevBtn = document.getElementById("prevTestimonial");
    const nextBtn = document.getElementById("nextTestimonial");

    if (!track || slides.length === 0) return;

    let currentIndex = 0;

    // Gerar pontos (dots)
    slides.forEach((_, index) => {
      const dot = document.createElement("div");
      dot.className = `testimonial-dot ${index === 0 ? "active" : ""}`;
      dot.addEventListener("click", () => goToSlide(index));
      dotsContainer.appendChild(dot);
    });

    const dots = document.querySelectorAll(".testimonial-dot");

    function goToSlide(index) {
      if (index < 0) index = slides.length - 1;
      if (index >= slides.length) index = 0;

      track.style.transform = `translateX(-${index * 100}%)`;
      dots.forEach((dot, idx) => {
        dot.classList.toggle("active", idx === index);
      });
      currentIndex = index;
    }

    prevBtn.addEventListener("click", () => goToSlide(currentIndex - 1));
    nextBtn.addEventListener("click", () => goToSlide(currentIndex + 1));

    // Rotação Automática (a cada 6s)
    let autoSlide = setInterval(() => goToSlide(currentIndex + 1), 6000);

    // Parar rotação ao passar mouse
    const slider = document.querySelector(".testimonials-slider");
    slider.addEventListener("mouseenter", () => clearInterval(autoSlide));
    slider.addEventListener("mouseleave", () => {
      autoSlide = setInterval(() => goToSlide(currentIndex + 1), 6000);
    });
  }

  // ==========================================================================
  // INSTITUIÇÃO MAP (Leaflet)
  // ==========================================================================
  function initLeafletMap() {
    const mapEl = document.getElementById("mapContainer");
    if (!mapEl) return;

    try {
      // Coordenadas da clínica (-23.6521, -46.5385)
      const latLng = [-23.6521, -46.5385];
      const map = L.map("mapContainer", { scrollWheelZoom: false }).setView(
        latLng,
        16,
      );

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      L.marker(latLng)
        .addTo(map)
        .bindPopup("<b>Cordis Cardiologia</b><br>Av. Dom Pedro II, 620")
        .openPopup();
    } catch (e) {
      console.warn("Erro ao carregar mapa Leaflet:", e);
    }
  }

  // ==========================================================================
  // SISTEMA DE TOASTS CUSTOMIZADOS (Helpers)
  // ==========================================================================
  function showToast(message, type = "info") {
    const container = document.getElementById("toastContainer");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast-custom ${type}`;

    let iconClass = "bi-info-circle-fill";
    if (type === "success") iconClass = "bi-check-circle-fill";
    if (type === "warning") iconClass = "bi-exclamation-triangle-fill";
    if (type === "danger") iconClass = "bi-x-circle-fill";

    toast.innerHTML = `<i class="bi ${iconClass}"></i> <span>${message}</span>`;
    container.appendChild(toast);

    // Animação de saída
    setTimeout(() => {
      toast.style.animation =
        "toastSlideOut 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28) forwards";
      toast.addEventListener("animationend", () => toast.remove());
    }, 4000);
  }

  // Estilo de saída dinâmico inserido no CSS via script se não declarado
  const styleSheet = document.createElement("style");
  styleSheet.innerText = `
    @keyframes toastSlideOut {
      from { transform: translateX(0); opacity: 1; }
      to { transform: translateX(100px); opacity: 0; }
    }
  `;
  document.head.appendChild(styleSheet);

  // ==========================================================================
  // COMPORTAMENTO WINDOW E AUXILIARES
  // ==========================================================================
  function handleWindowScroll() {
    const btn = document.getElementById("backToTopBtn");
    if (window.scrollY > 400) {
      btn.classList.add("visible");
    } else {
      btn.classList.remove("visible");
    }
  }

  function setupInputMask(inputId, maskFn) {
    const input = document.getElementById(inputId);
    if (input) {
      input.addEventListener("input", (e) => {
        e.target.value = maskFn(e.target.value);
      });
    }
  }

  // Máscaras Regex
  function maskCpf(v) {
    return v
      .replace(/\D/g, "")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }

  function maskPhone(v) {
    return v
      .replace(/\D/g, "")
      .replace(/^(\d{2})(\d)/g, "($1) $2")
      .replace(/(\d{5})(\d)/, "$1-$2");
  }
})();
