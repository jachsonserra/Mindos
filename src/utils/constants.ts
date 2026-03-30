export const PHASES = {
  1: { name: 'Anel da Terra', description: 'Diagnóstico e Preparação', color: '#8B4513' },
  2: { name: 'Início do Dia', description: 'Quebra da Inércia', color: '#FF8C00' },
  3: { name: 'Ação Imediata', description: 'Mushin e Fudoshin', color: '#DC143C' },
  4: { name: 'Anel da Água', description: 'Consistência e Sistemas', color: '#1E90FF' },
  5: { name: 'Gamificação', description: 'Hackeando a Dopamina', color: '#9400D3' },
  6: { name: 'Maestria', description: 'Anéis do Fogo, Vento e Vazio', color: '#FFD700' },
} as const;

export const XP_VALUES = {
  HABIT_COMPLETE: 10,
  ROUTINE_COMPLETE: 25,
  STREAK_BONUS_3: 15,
  STREAK_BONUS_7: 40,
  STREAK_BONUS_30: 150,
  MISSION_DAILY: 50,
  MISSION_WEEKLY: 150,
  MISSION_CHALLENGE: 300,
  PHASE_UNLOCK: 500,
  NOTE_REFLECTION: 5,
  TIME_TRACKED_HOUR: 8,
  FIRST_VICTORY: 20,
  ANGER_MODE_USED: 30,
  PRIMING_DONE: 10,
} as const;

export const LEVEL_TITLES = [
  'Iniciante',
  'Desperto',
  'Disciplinado',
  'Focado',
  'Guerreiro',
  'Mestre do Tempo',
  'Fudoshin',
  'Mushin',
  'Samurai Mental',
  'MindOS Elite',
];

export const COLORS = {
  // ── Accent principal — vermelho premium ───────────────────────────────────
  primary: '#E53935',
  primaryLight: '#EF5350',
  primaryDark: '#C62828',
  primaryMuted: 'rgba(229,57,53,0.14)',

  // ── Fundos — tema escuro profundo ─────────────────────────────────────────
  background: '#0F0F14',
  surface: '#18181F',
  surfaceAlt: '#222230',
  surfaceDark: '#0B0B10',   // sidebar / áreas mais escuras

  // ── Texto ──────────────────────────────────────────────────────────────────
  text: '#F1F0F9',
  textSecondary: '#9796AB',
  textMuted: '#58566B',

  // ── Bordas ─────────────────────────────────────────────────────────────────
  border: '#252535',
  borderStrong: '#353550',

  // ── Semânticos ─────────────────────────────────────────────────────────────
  success: '#3DD68C',
  warning: '#F0A429',
  error: '#F06292',
  info: '#5AB4FF',
  celebrate: '#FFD166',     // dourado — recompensa / XP

  // ── Legado (mantidos para não quebrar código existente) ───────────────────
  secondary: '#EF5350',
  surfaceAlt2: '#16213E',
  momentum: {
    fire: '#F06292',
    fast: '#F0A429',
    moving: '#FFD166',
    warming: '#3DD68C',
    stopped: '#58566B',
  },

  // ── Paleta de metas (6 tons) ───────────────────────────────────────────────
  goalColors: ['#E53935', '#EF5350', '#5AB4FF', '#F0A429', '#3DD68C', '#F06292'],
};

// ── Tipografia ────────────────────────────────────────────────────────────────
export const TYPOGRAPHY = {
  h1:        { fontSize: 28, fontWeight: '700' as const, lineHeight: 36 },
  h2:        { fontSize: 22, fontWeight: '700' as const, lineHeight: 30 },
  h3:        { fontSize: 18, fontWeight: '600' as const, lineHeight: 26 },
  h4:        { fontSize: 15, fontWeight: '600' as const, lineHeight: 22 },
  body:      { fontSize: 14, fontWeight: '400' as const, lineHeight: 21 },
  bodySmall: { fontSize: 12, fontWeight: '400' as const, lineHeight: 18 },
  label:     { fontSize: 11, fontWeight: '600' as const, lineHeight: 14, letterSpacing: 0.8 },
  caption:   { fontSize: 10, fontWeight: '500' as const, lineHeight: 13 },
};

// ── Espaçamento ───────────────────────────────────────────────────────────────
export const SPACING = {
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  24,
  xxl: 32,
};

// ── Border radius ─────────────────────────────────────────────────────────────
export const RADIUS = {
  sm:   6,
  md:   10,
  lg:   14,
  xl:   20,
  full: 9999,
};

// TODAY() foi removido — era código morto (nunca utilizado).
// Use today() de src/utils/dateHelpers.ts para obter a data atual no formato YYYY-MM-DD.
// Manter dois locais com a mesma lógica causava confusão e risco de divergência.
