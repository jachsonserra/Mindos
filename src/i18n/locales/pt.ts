const pt = {
  // ── Tabs ──────────────────────────────────────────────────────────────────
  tabs: {
    today: 'Hoje',
    routines: 'Rotinas',
    compass: 'Bússola',
    agenda: 'Agenda',
    more: 'Mais',
  },

  // ── Landing ───────────────────────────────────────────────────────────────
  landing: {
    tagline: 'Sua mente. Organizada.',
    description: 'O sistema de produtividade que combina hábitos, metas, IA e gamificação numa experiência única.',
    ctaStart: 'Começar agora — é grátis',
    ctaLogin: 'Já tenho conta',
    stats: {
      modules: 'módulos',
      habits: 'hábitos',
      private: '100% privado',
    },
    features: {
      habits: { title: 'Hábitos & Rotinas', desc: 'Crie e acompanhe hábitos poderosos com check-ins diários.' },
      xp: { title: 'XP & Missões', desc: 'Ganhe XP, suba de nível e complete desafios diários.' },
      goals: { title: 'Metas SMARTER', desc: 'Defina objetivos com método científico e acompanhe.' },
      coach: { title: 'Coach IA', desc: 'Seu coach pessoal com contexto total da sua vida.' },
      mind: { title: 'Second Mind', desc: 'Grafo de conhecimento para capturar suas ideias.' },
      gratitude: { title: 'Gratidão Diária', desc: 'Diário de gratidão e reflexão para fortalecer o mindset.' },
    },
  },

  // ── Auth ──────────────────────────────────────────────────────────────────
  auth: {
    continueWithGoogle: 'Continuar com Google',
    or: 'ou',
    email: 'Email',
    password: 'Senha',
    name: 'Nome',
    namePlaceholder: 'Seu nome',
    emailPlaceholder: 'seu@email.com',
    passwordPlaceholder: 'Mínimo 6 caracteres',
    confirmPassword: 'Confirmar senha',
    confirmPasswordPlaceholder: 'Repita a senha',
    signIn: {
      title: 'Entrar',
      subtitle: 'Bem-vindo de volta',
      button: 'Entrar',
      forgotPassword: 'Esqueci minha senha',
      noAccount: 'Não tem conta? ',
      createAccount: 'Criar agora',
    },
    signUp: {
      tagline: 'Comece sua jornada hoje',
      title: 'Criar conta',
      subtitle: 'Grátis para sempre',
      button: 'Criar conta grátis',
      hasAccount: 'Já tem conta? ',
      login: 'Entrar',
    },
    resetPassword: {
      title: 'Recuperar senha',
      subtitle: 'Enviaremos um link de recuperação',
      button: 'Enviar link',
      backToLogin: 'Voltar ao login',
      successTitle: 'Email enviado!',
      successDesc: 'Verifique sua caixa de entrada.',
    },
    errors: {
      nameRequired: 'Nome é obrigatório',
      emailRequired: 'Email é obrigatório',
      emailInvalid: 'Email inválido',
      passwordRequired: 'Senha é obrigatória',
      passwordMin: 'Mínimo 6 caracteres',
      passwordsNoMatch: 'Senhas não conferem',
      signInError: 'Erro ao entrar',
      signUpError: 'Erro ao criar conta',
      googleError: 'Erro com Google',
      tryAgain: 'Tente novamente',
    },
  },

  // ── Common ────────────────────────────────────────────────────────────────
  common: {
    save: 'Salvar',
    cancel: 'Cancelar',
    delete: 'Excluir',
    edit: 'Editar',
    add: 'Adicionar',
    create: 'Criar',
    close: 'Fechar',
    confirm: 'Confirmar',
    yes: 'Sim',
    no: 'Não',
    ok: 'OK',
    back: 'Voltar',
    next: 'Próximo',
    done: 'Concluído',
    loading: 'Carregando...',
    error: 'Erro',
    success: 'Sucesso',
    optional: 'opcional',
    today: 'Hoje',
    yesterday: 'Ontem',
    week: 'Semana',
    month: 'Mês',
    year: 'Ano',
    xp: 'XP',
    level: 'Nível',
    streak: 'streak',
    habits: 'hábitos',
    tasks: 'tarefas',
    description: 'Descrição',
    title: 'Título',
    name: 'Nome',
    send: 'Enviar',
    seeAll: 'Ver tudo →',
    noData: 'Nenhum dado encontrado',
  },

  // ── Home (Hoje) ───────────────────────────────────────────────────────────
  home: {
    insightOfDay: 'INSIGHT DO DIA',
    weekSummary: 'RESUMO DA SEMANA',
    weekSummaryTitle: 'Sua coach analisou sua semana',
    generatingSummary: 'Gerando resumo da semana...',
    startDay: 'Iniciar o dia',
    myPurpose: 'MEU PROPÓSITO',
    today: '📅 Hoje',
    seeAgenda: 'Ver agenda →',
    uploadingImage: 'Enviando imagem...',
    xpToday: 'XP hoje',
    greetings: {
      morning: 'Bom dia',
      afternoon: 'Boa tarde',
      evening: 'Boa noite',
    },
    empty: {
      agenda: 'Nenhum evento hoje.',
      habits: 'Nenhum hábito ativo.',
    },
    dreamPlaceholder: 'Toque para adicionar sua visão ou foto de sonho...',
    purposePlaceholder: 'Escreva seu propósito central aqui...',
    purposeAlert: 'Escreva seu propósito',
    purposeAlertMsg: 'Ajuste o texto antes de salvar.',
  },

  // ── More ──────────────────────────────────────────────────────────────────
  more: {
    title: 'Mais',
    subtitle: 'Todas as funcionalidades',
    items: {
      tasks: { label: 'Tarefas', subtitle: 'Organize com Pareto 20%' },
      journal: { label: 'Diário', subtitle: 'Gratidão + Cookie Jar' },
      studies: { label: 'Estudos', subtitle: 'Pomodoro + anotações' },
      progress: { label: 'Progresso', subtitle: 'XP, streak e heatmap' },
      missions: { label: 'Missões', subtitle: 'Desafios e conquistas' },
      secondMind: { label: 'Segunda Mente', subtitle: 'Grafo de ideias e nós' },
      insights: { label: 'Insights', subtitle: 'Padrões detectados pelo app' },
      coach: { label: 'Coach IA', subtitle: 'Seu coach pessoal com contexto' },
    },
    tip: {
      title: '💡 Dica de produtividade',
      text: '"Toda semana, 3 ações garantem 80% do resultado. Qual hábito diário puxa o resto?"',
    },
  },

  // ── Missions ──────────────────────────────────────────────────────────────
  missions: {
    title: '🎯 Missões',
    xpTotal: 'XP total',
    today: 'hoje',
    toLevel: 'Nível',
    activeMissions: 'Missões Ativas',
    completedMissions: 'Completadas',
    rewardWall: 'Mural de Recompensas',
    addReward: '+ Adicionar',
    claim: 'Resgatar!',
    noActive: 'Nenhuma missão ativa. Volte amanhã!',
    completed: '✓ Completa',
    types: {
      daily: 'Diária',
      weekly: 'Semanal',
      challenge: 'Desafio',
      phase: 'Fase',
    },
    reward: {
      unlocked: '✓ Conquistado!',
      newReward: 'Nova recompensa',
      unlockTitle: '🎁 Desbloquear recompensa?',
      xpCost: 'Custa {{cost}} XP',
      unlock: 'Desbloquear! 🎉',
      cancel: 'Cancelar',
    },
    modal: {
      newReward: 'Nova Recompensa',
      whatYouGet: 'O que você vai ganhar?',
      rewardPlaceholder: 'Ex: Assistir 1 episódio da série favorita',
      descLabel: 'Descrição (opcional)',
      descPlaceholder: 'Detalhes da recompensa...',
      tip: '💡 Missão Mural: vincule uma recompensa a uma missão (ex: "estudar 30min = jogar 20min")',
      createBtn: 'Criar Recompensa',
    },
  },

  // ── Coach ─────────────────────────────────────────────────────────────────
  coach: {
    title: 'Coach',
    contextLoaded: 'Contexto carregado para {{name}}',
    personalCoach: 'Seu coach pessoal',
    loadingContext: 'Iniciando contexto...',
    inputPlaceholder: 'Escreva para o seu coach...',
    noKey: {
      title: 'Configure sua chave da Anthropic',
      text: 'Adicione EXPO_PUBLIC_ANTHROPIC_KEY=sk-ant-... no arquivo .env.local do projeto e reinicie o app.\n\nObtenha em: console.anthropic.com/settings/keys',
    },
    quickPrompts: [
      'Como estou me saindo?',
      'O que devo focar hoje?',
      'Estou travado. Me ajuda.',
      'Analisa minha semana.',
    ],
  },

  // ── Progress ──────────────────────────────────────────────────────────────
  progress: {
    title: 'Progresso',
    xpHistory: 'Histórico de XP',
    heatmap: 'Heatmap de consistência',
    streakRecord: 'Recorde de streak',
    days: 'dias',
    totalXP: 'XP Total',
    currentStreak: 'Streak atual',
    bestStreak: 'Melhor streak',
    completionRate: 'Taxa de conclusão',
    thisWeek: 'Esta semana',
    thisMonth: 'Este mês',
    allTime: 'Todo o tempo',
  },

  // ── Gratitude ─────────────────────────────────────────────────────────────
  gratitude: {
    title: '🙏 Diário',
    todayEntry: 'Entrada de hoje',
    addEntry: 'Adicionar entrada',
    cookieJar: 'Cookie Jar 🍪',
    gratitudePlaceholder: 'Pelo que você é grato hoje?',
    winPlaceholder: 'Qual vitória ou momento especial?',
    save: 'Salvar entrada',
    saved: 'Entrada salva!',
    noEntries: 'Nenhuma entrada ainda. Comece hoje!',
    previousEntries: 'Entradas anteriores',
  },

  // ── Insights ──────────────────────────────────────────────────────────────
  insights: {
    title: '📊 Insights',
    subtitle: 'Padrões detectados',
    generating: 'Gerando insights...',
    noInsights: 'Nenhum insight disponível ainda.',
    refreshBtn: 'Atualizar insights',
    categories: {
      habits: 'Hábitos',
      mood: 'Humor',
      productivity: 'Produtividade',
      energy: 'Energia',
    },
  },

  // ── Routines ──────────────────────────────────────────────────────────────
  routines: {
    title: 'Rotinas',
    subtitle: 'Sequências de hábitos',
    addRoutine: '+ Nova rotina',
    templates: 'Templates',
    myRoutines: 'Minhas Rotinas',
    startRoutine: 'Iniciar',
    editRoutine: 'Editar',
    deleteRoutine: 'Excluir',
    noRoutines: 'Nenhuma rotina criada ainda.',
    morning: 'Manhã Produtiva',
    focus: 'Foco Profundo',
    night: 'Noite Tranquila',
  },

  // ── Objectives / Compass ──────────────────────────────────────────────────
  objectives: {
    title: 'Bússola',
    subtitle: 'Seus objetivos de vida',
    addObjective: '+ Novo objetivo',
    myObjectives: 'Meus Objetivos',
    smarter: 'Metas SMARTER',
    addGoal: '+ Nova meta',
    noObjectives: 'Nenhum objetivo criado ainda.',
    why: 'Por quê isso importa?',
    color: 'Cor',
    deadline: 'Prazo',
  },

  // ── Agenda ────────────────────────────────────────────────────────────────
  agenda: {
    title: 'Agenda',
    addEvent: '+ Novo evento',
    noEvents: 'Nenhum evento neste dia.',
    allDay: 'Dia todo',
    startTime: 'Início',
    endTime: 'Fim',
    repeat: 'Repetir',
    reminder: 'Lembrete',
  },

  // ── Tasks ─────────────────────────────────────────────────────────────────
  tasks: {
    title: '✅ Tarefas',
    subtitle: 'Foque no que importa (20%)',
    addTask: '+ Nova tarefa',
    pareto: 'Pareto 20%',
    priority: 'Prioridade',
    high: 'Alta',
    medium: 'Média',
    low: 'Baixa',
    noTasks: 'Nenhuma tarefa. Adicione algo!',
    completed: 'Concluídas',
    pending: 'Pendentes',
  },

  // ── Studies ───────────────────────────────────────────────────────────────
  studies: {
    title: '📚 Estudos',
    pomodoro: 'Pomodoro',
    notes: 'Anotações',
    startPomodoro: 'Iniciar Pomodoro',
    addNote: '+ Nova anotação',
    focusTime: 'Tempo de foco',
    breakTime: 'Pausa',
    minutes: 'min',
  },

  // ── Second Mind ───────────────────────────────────────────────────────────
  secondMind: {
    title: '🧠 Segunda Mente',
    subtitle: 'Grafo de conhecimento',
    addNode: '+ Novo nó',
    connect: 'Conectar',
    noNodes: 'Nenhum nó criado. Comece capturando ideias!',
    nodeTitle: 'Título do nó',
    nodeContent: 'Conteúdo',
  },

  // ── Settings ──────────────────────────────────────────────────────────────
  settings: {
    title: 'Configurações',
    profile: {
      title: 'Perfil',
      name: 'Nome',
      email: 'Email',
      photo: 'Foto',
      changePhoto: 'Alterar foto',
    },
    language: {
      title: 'Idioma',
      subtitle: 'Selecione o idioma do app',
      pt: 'Português',
      en: 'English',
    },
    notifications: {
      title: 'Notificações',
      enable: 'Ativar notificações',
      dailyReminder: 'Lembrete diário',
      time: 'Horário',
    },
    account: {
      title: 'Conta',
      sync: 'Sincronizar dados',
      syncing: 'Sincronizando...',
      syncSuccess: 'Sincronizado com sucesso!',
      syncError: 'Erro ao sincronizar',
      logout: 'Sair da conta',
      logoutConfirm: 'Tem certeza que deseja sair?',
      deleteAccount: 'Excluir conta',
    },
    about: {
      title: 'Sobre',
      version: 'Versão',
      privacy: 'Privacidade',
      terms: 'Termos de uso',
    },
    supabase: {
      title: 'Supabase',
      url: 'URL do Supabase',
      key: 'Chave anônima',
      configured: 'Configurado',
      notConfigured: 'Não configurado',
    },
    anthropic: {
      title: 'Anthropic (Coach IA)',
      key: 'Chave da API',
      configured: 'Configurado ✓',
      configure: 'Configurar',
    },
  },

  // ── Onboarding ────────────────────────────────────────────────────────────
  onboarding: {
    welcome: {
      title: 'Bem-vindo ao MindOS',
      subtitle: 'Vamos configurar seu perfil',
      nameLabel: 'Como posso te chamar?',
      namePlaceholder: 'Digite seu nome',
      continueBtn: 'Continuar',
    },
    whyAnchor: {
      title: 'Sua âncora de propósito',
      subtitle: 'O que te motiva a ser melhor a cada dia?',
      continueBtn: 'Continuar',
      skipBtn: 'Pular por enquanto',
    },
    routineSetup: {
      title: 'Monte sua rotina',
      subtitle: 'Escolha uma rotina inicial',
      continueBtn: 'Começar jornada',
      skipBtn: 'Configurar depois',
    },
    notifications: {
      title: 'Ativar lembretes?',
      subtitle: 'Notificações te ajudam a manter consistência',
      enableBtn: 'Ativar notificações',
      skipBtn: 'Não por agora',
    },
  },
} as const;

export default pt;
export type TranslationKeys = typeof pt;
