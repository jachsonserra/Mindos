const en = {
  // ── Tabs ──────────────────────────────────────────────────────────────────
  tabs: {
    today: 'Today',
    routines: 'Routines',
    compass: 'Compass',
    agenda: 'Agenda',
    more: 'More',
  },

  // ── Landing ───────────────────────────────────────────────────────────────
  landing: {
    tagline: 'Your mind. Organized.',
    description: 'The productivity system combining habits, goals, AI and gamification in one unique experience.',
    ctaStart: 'Get started — it\'s free',
    ctaLogin: 'I already have an account',
    stats: {
      modules: 'modules',
      habits: 'habits',
      private: '100% private',
    },
    features: {
      habits: { title: 'Habits & Routines', desc: 'Build and track powerful habits with daily check-ins.' },
      xp: { title: 'XP & Missions', desc: 'Earn XP, level up and complete daily challenges.' },
      goals: { title: 'SMARTER Goals', desc: 'Set scientific method objectives and track them.' },
      coach: { title: 'AI Coach', desc: 'Your personal coach with full context of your life.' },
      mind: { title: 'Second Mind', desc: 'Knowledge graph to capture your ideas and thoughts.' },
      gratitude: { title: 'Daily Gratitude', desc: 'Gratitude journal and reflection to strengthen mindset.' },
    },
  },

  // ── Auth ──────────────────────────────────────────────────────────────────
  auth: {
    continueWithGoogle: 'Continue with Google',
    or: 'or',
    email: 'Email',
    password: 'Password',
    name: 'Name',
    namePlaceholder: 'Your name',
    emailPlaceholder: 'you@email.com',
    passwordPlaceholder: 'Minimum 6 characters',
    confirmPassword: 'Confirm password',
    confirmPasswordPlaceholder: 'Repeat your password',
    signIn: {
      title: 'Sign in',
      subtitle: 'Welcome back',
      button: 'Sign in',
      forgotPassword: 'Forgot my password',
      noAccount: 'Don\'t have an account? ',
      createAccount: 'Create now',
    },
    signUp: {
      tagline: 'Start your journey today',
      title: 'Create account',
      subtitle: 'Free forever',
      button: 'Create free account',
      hasAccount: 'Already have an account? ',
      login: 'Sign in',
    },
    resetPassword: {
      title: 'Reset password',
      subtitle: 'We\'ll send a recovery link',
      button: 'Send link',
      backToLogin: 'Back to sign in',
      successTitle: 'Email sent!',
      successDesc: 'Check your inbox.',
    },
    errors: {
      nameRequired: 'Name is required',
      emailRequired: 'Email is required',
      emailInvalid: 'Invalid email',
      passwordRequired: 'Password is required',
      passwordMin: 'Minimum 6 characters',
      passwordsNoMatch: 'Passwords do not match',
      signInError: 'Sign in error',
      signUpError: 'Account creation error',
      googleError: 'Google sign in error',
      tryAgain: 'Please try again',
    },
  },

  // ── Common ────────────────────────────────────────────────────────────────
  common: {
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    add: 'Add',
    create: 'Create',
    close: 'Close',
    confirm: 'Confirm',
    yes: 'Yes',
    no: 'No',
    ok: 'OK',
    back: 'Back',
    next: 'Next',
    done: 'Done',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    optional: 'optional',
    today: 'Today',
    yesterday: 'Yesterday',
    week: 'Week',
    month: 'Month',
    year: 'Year',
    xp: 'XP',
    level: 'Level',
    streak: 'streak',
    habits: 'habits',
    tasks: 'tasks',
    description: 'Description',
    title: 'Title',
    name: 'Name',
    send: 'Send',
    seeAll: 'See all →',
    noData: 'No data found',
  },

  // ── Home (Today) ──────────────────────────────────────────────────────────
  home: {
    insightOfDay: 'INSIGHT OF THE DAY',
    weekSummary: 'WEEKLY SUMMARY',
    weekSummaryTitle: 'Your coach analyzed your week',
    generatingSummary: 'Generating weekly summary...',
    startDay: 'Start the day',
    myPurpose: 'MY PURPOSE',
    today: '📅 Today',
    seeAgenda: 'See agenda →',
    uploadingImage: 'Uploading image...',
    xpToday: 'XP today',
    greetings: {
      morning: 'Good morning',
      afternoon: 'Good afternoon',
      evening: 'Good evening',
    },
    empty: {
      agenda: 'No events today.',
      habits: 'No active habits.',
    },
    dreamPlaceholder: 'Tap to add your vision or dream photo...',
    purposePlaceholder: 'Write your central purpose here...',
    purposeAlert: 'Write your purpose',
    purposeAlertMsg: 'Adjust the text before saving.',
  },

  // ── More ──────────────────────────────────────────────────────────────────
  more: {
    title: 'More',
    subtitle: 'All features',
    items: {
      tasks: { label: 'Tasks', subtitle: 'Organize with Pareto 20%' },
      journal: { label: 'Journal', subtitle: 'Gratitude + Cookie Jar' },
      studies: { label: 'Studies', subtitle: 'Pomodoro + notes' },
      progress: { label: 'Progress', subtitle: 'XP, streak & heatmap' },
      missions: { label: 'Missions', subtitle: 'Challenges & achievements' },
      secondMind: { label: 'Second Mind', subtitle: 'Idea graph & nodes' },
      insights: { label: 'Insights', subtitle: 'Patterns detected by the app' },
      coach: { label: 'AI Coach', subtitle: 'Your personal coach with context' },
    },
    tip: {
      title: '💡 Productivity tip',
      text: '"Every week, 3 actions deliver 80% of the results. Which daily habit drives the rest?"',
    },
  },

  // ── Missions ──────────────────────────────────────────────────────────────
  missions: {
    title: '🎯 Missions',
    xpTotal: 'total XP',
    today: 'today',
    toLevel: 'Level',
    activeMissions: 'Active Missions',
    completedMissions: 'Completed',
    rewardWall: 'Reward Wall',
    addReward: '+ Add',
    claim: 'Claim!',
    noActive: 'No active missions. Come back tomorrow!',
    completed: '✓ Complete',
    types: {
      daily: 'Daily',
      weekly: 'Weekly',
      challenge: 'Challenge',
      phase: 'Phase',
    },
    reward: {
      unlocked: '✓ Achieved!',
      newReward: 'New reward',
      unlockTitle: '🎁 Unlock reward?',
      xpCost: 'Costs {{cost}} XP',
      unlock: 'Unlock! 🎉',
      cancel: 'Cancel',
    },
    modal: {
      newReward: 'New Reward',
      whatYouGet: 'What will you earn?',
      rewardPlaceholder: 'E.g.: Watch 1 episode of your favorite series',
      descLabel: 'Description (optional)',
      descPlaceholder: 'Reward details...',
      tip: '💡 Reward Wall: link a reward to a mission (e.g., "study 30min = play 20min")',
      createBtn: 'Create Reward',
    },
  },

  // ── Coach ─────────────────────────────────────────────────────────────────
  coach: {
    title: 'Coach',
    contextLoaded: 'Context loaded for {{name}}',
    personalCoach: 'Your personal coach',
    loadingContext: 'Loading context...',
    inputPlaceholder: 'Write to your coach...',
    noKey: {
      title: 'Configure your Anthropic key',
      text: 'Add EXPO_PUBLIC_ANTHROPIC_KEY=sk-ant-... to the .env.local file and restart the app.\n\nGet yours at: console.anthropic.com/settings/keys',
    },
    quickPrompts: [
      'How am I doing?',
      'What should I focus on today?',
      'I\'m stuck. Help me.',
      'Analyze my week.',
    ],
  },

  // ── Progress ──────────────────────────────────────────────────────────────
  progress: {
    title: 'Progress',
    xpHistory: 'XP History',
    heatmap: 'Consistency heatmap',
    streakRecord: 'Streak record',
    days: 'days',
    totalXP: 'Total XP',
    currentStreak: 'Current streak',
    bestStreak: 'Best streak',
    completionRate: 'Completion rate',
    thisWeek: 'This week',
    thisMonth: 'This month',
    allTime: 'All time',
  },

  // ── Gratitude ─────────────────────────────────────────────────────────────
  gratitude: {
    title: '🙏 Journal',
    todayEntry: 'Today\'s entry',
    addEntry: 'Add entry',
    cookieJar: 'Cookie Jar 🍪',
    gratitudePlaceholder: 'What are you grateful for today?',
    winPlaceholder: 'What\'s a win or special moment?',
    save: 'Save entry',
    saved: 'Entry saved!',
    noEntries: 'No entries yet. Start today!',
    previousEntries: 'Previous entries',
  },

  // ── Insights ──────────────────────────────────────────────────────────────
  insights: {
    title: '📊 Insights',
    subtitle: 'Detected patterns',
    generating: 'Generating insights...',
    noInsights: 'No insights available yet.',
    refreshBtn: 'Refresh insights',
    categories: {
      habits: 'Habits',
      mood: 'Mood',
      productivity: 'Productivity',
      energy: 'Energy',
    },
  },

  // ── Routines ──────────────────────────────────────────────────────────────
  routines: {
    title: 'Routines',
    subtitle: 'Habit sequences',
    addRoutine: '+ New routine',
    templates: 'Templates',
    myRoutines: 'My Routines',
    startRoutine: 'Start',
    editRoutine: 'Edit',
    deleteRoutine: 'Delete',
    noRoutines: 'No routines created yet.',
    morning: 'Productive Morning',
    focus: 'Deep Focus',
    night: 'Peaceful Night',
  },

  // ── Objectives / Compass ──────────────────────────────────────────────────
  objectives: {
    title: 'Compass',
    subtitle: 'Your life objectives',
    addObjective: '+ New objective',
    myObjectives: 'My Objectives',
    smarter: 'SMARTER Goals',
    addGoal: '+ New goal',
    noObjectives: 'No objectives created yet.',
    why: 'Why does this matter?',
    color: 'Color',
    deadline: 'Deadline',
  },

  // ── Agenda ────────────────────────────────────────────────────────────────
  agenda: {
    title: 'Agenda',
    addEvent: '+ New event',
    noEvents: 'No events on this day.',
    allDay: 'All day',
    startTime: 'Start',
    endTime: 'End',
    repeat: 'Repeat',
    reminder: 'Reminder',
  },

  // ── Tasks ─────────────────────────────────────────────────────────────────
  tasks: {
    title: '✅ Tasks',
    subtitle: 'Focus on what matters (20%)',
    addTask: '+ New task',
    pareto: 'Pareto 20%',
    priority: 'Priority',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
    noTasks: 'No tasks. Add something!',
    completed: 'Completed',
    pending: 'Pending',
  },

  // ── Studies ───────────────────────────────────────────────────────────────
  studies: {
    title: '📚 Studies',
    pomodoro: 'Pomodoro',
    notes: 'Notes',
    startPomodoro: 'Start Pomodoro',
    addNote: '+ New note',
    focusTime: 'Focus time',
    breakTime: 'Break',
    minutes: 'min',
  },

  // ── Second Mind ───────────────────────────────────────────────────────────
  secondMind: {
    title: '🧠 Second Mind',
    subtitle: 'Knowledge graph',
    addNode: '+ New node',
    connect: 'Connect',
    noNodes: 'No nodes created. Start capturing ideas!',
    nodeTitle: 'Node title',
    nodeContent: 'Content',
  },

  // ── Settings ──────────────────────────────────────────────────────────────
  settings: {
    title: 'Settings',
    profile: {
      title: 'Profile',
      name: 'Name',
      email: 'Email',
      photo: 'Photo',
      changePhoto: 'Change photo',
    },
    language: {
      title: 'Language',
      subtitle: 'Select app language',
      pt: 'Português',
      en: 'English',
    },
    notifications: {
      title: 'Notifications',
      enable: 'Enable notifications',
      dailyReminder: 'Daily reminder',
      time: 'Time',
    },
    account: {
      title: 'Account',
      sync: 'Sync data',
      syncing: 'Syncing...',
      syncSuccess: 'Synced successfully!',
      syncError: 'Sync error',
      logout: 'Sign out',
      logoutConfirm: 'Are you sure you want to sign out?',
      deleteAccount: 'Delete account',
    },
    about: {
      title: 'About',
      version: 'Version',
      privacy: 'Privacy',
      terms: 'Terms of use',
    },
    supabase: {
      title: 'Supabase',
      url: 'Supabase URL',
      key: 'Anonymous key',
      configured: 'Configured',
      notConfigured: 'Not configured',
    },
    anthropic: {
      title: 'Anthropic (AI Coach)',
      key: 'API Key',
      configured: 'Configured ✓',
      configure: 'Configure',
    },
  },

  // ── Onboarding ────────────────────────────────────────────────────────────
  onboarding: {
    welcome: {
      title: 'Welcome to MindOS',
      subtitle: 'Let\'s set up your profile',
      nameLabel: 'What should I call you?',
      namePlaceholder: 'Enter your name',
      continueBtn: 'Continue',
    },
    whyAnchor: {
      title: 'Your purpose anchor',
      subtitle: 'What motivates you to be better every day?',
      continueBtn: 'Continue',
      skipBtn: 'Skip for now',
    },
    routineSetup: {
      title: 'Set up your routine',
      subtitle: 'Choose a starting routine',
      continueBtn: 'Start journey',
      skipBtn: 'Configure later',
    },
    notifications: {
      title: 'Enable reminders?',
      subtitle: 'Notifications help you stay consistent',
      enableBtn: 'Enable notifications',
      skipBtn: 'Not right now',
    },
  },
} as const;

export default en;
