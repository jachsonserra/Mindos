/**
 * UserInsightService
 *
 * Motor de inteligência do MindOS. Cruza dados de todas as fontes
 * (hábitos, humor, objetivos, reflexões) para gerar insights reais
 * sobre padrões comportamentais do usuário.
 *
 * Cada algoritmo é independente e retorna 0 ou 1 Insight.
 * O serviço agrega tudo e retorna um UserInsightProfile.
 */

import { HabitRepository } from '../database/habitRepository';
import { CheckInRepository } from '../database/checkinRepository';
import { ObjectiveRepository } from '../database/objectiveRepository';
import { DailyCheckIn, MoodLevel } from '../../types/checkin.types';
import { Insight, InsightDataPoint, UserInsightProfile } from '../../types/insight.types';
import { today } from '../../utils/dateHelpers';

// ─── Helpers internos ─────────────────────────────────────────────────────────

function uuid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function dateNDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function avgMoodOfDay(day: DailyCheckIn): number | null {
  const vals = (['morning', 'midday', 'evening'] as const)
    .map(p => day[p]?.mood)
    .filter((v): v is MoodLevel => v != null);
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function moodLabel(avg: number): string {
  if (avg >= 4.5) return 'excelente';
  if (avg >= 3.5) return 'bom';
  if (avg >= 2.5) return 'neutro';
  if (avg >= 1.5) return 'baixo';
  return 'muito baixo';
}

const WEEKDAY_LABELS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

// ─── Algoritmos de Insight ────────────────────────────────────────────────────

/**
 * 1. TENDÊNCIA DE HUMOR (últimos 7d vs 7d anteriores)
 */
function detectMoodTrend(checkins: DailyCheckIn[]): Insight | null {
  const now = new Date();
  const last7: DailyCheckIn[]  = [];
  const prev7: DailyCheckIn[]  = [];

  checkins.forEach(c => {
    const date = new Date(c.date + 'T12:00:00');
    const diff = Math.floor((now.getTime() - date.getTime()) / 86400000);
    if (diff <= 7)       last7.push(c);
    else if (diff <= 14) prev7.push(c);
  });

  const avgOf = (days: DailyCheckIn[]) => {
    const vals = days.map(avgMoodOfDay).filter((v): v is number => v != null);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  };

  const curr = avgOf(last7);
  const prev = avgOf(prev7);
  if (!curr) return null;

  const chartData: InsightDataPoint[] = last7
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(d => ({
      label: new Date(d.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short' }),
      value: avgMoodOfDay(d) ?? 0,
      color: (avgMoodOfDay(d) ?? 0) >= 3.5 ? '#66BB6A' : '#EF5350',
    }));

  if (prev !== null && curr - prev >= 0.4) {
    return {
      id: uuid(), type: 'trend', category: 'mood', strength: 'high',
      emoji: '📈',
      title: 'Humor em alta esta semana',
      description: `Seu humor subiu ${((curr - prev) / prev * 100).toFixed(0)}% em relação à semana passada. Continue assim!`,
      highlight: curr.toFixed(1),
      highlightLabel: 'média de humor (1–5)',
      chartData,
      detectedAt: today(),
    };
  }

  if (prev !== null && prev - curr >= 0.4) {
    return {
      id: uuid(), type: 'attention', category: 'mood', strength: 'medium',
      emoji: '📉',
      title: 'Humor mais baixo esta semana',
      description: `Você está um pouco mais ${moodLabel(curr)} que na semana passada. O que mudou? O app vai te ajudar a descobrir.`,
      highlight: curr.toFixed(1),
      highlightLabel: 'média de humor (1–5)',
      chartData,
      detectedAt: today(),
    };
  }

  // Humor estável
  return {
    id: uuid(), type: 'trend', category: 'mood', strength: 'low',
    emoji: '😌',
    title: 'Humor estável esta semana',
    description: `Média de ${curr.toFixed(1)} — consistência emocional é uma habilidade.`,
    highlight: curr.toFixed(1),
    highlightLabel: 'média de humor',
    chartData,
    detectedAt: today(),
  };
}

/**
 * 2. CORRELAÇÃO HÁBITOS ↔ HUMOR
 * Dias com mais hábitos completados = humor melhor?
 */
function detectHabitMoodCorrelation(
  checkins: DailyCheckIn[],
  completionsByDate: Record<string, number>,
): Insight | null {
  const pairs: { completions: number; mood: number }[] = [];

  checkins.forEach(c => {
    const mood = avgMoodOfDay(c);
    const completions = completionsByDate[c.date] ?? 0;
    if (mood !== null) pairs.push({ completions, mood });
  });

  if (pairs.length < 7) return null;

  const median = [...pairs].sort((a, b) => a.completions - b.completions)[Math.floor(pairs.length / 2)].completions;
  const highDays = pairs.filter(p => p.completions >= median);
  const lowDays  = pairs.filter(p => p.completions < median);

  if (!highDays.length || !lowDays.length) return null;

  const avgHigh = highDays.reduce((s, p) => s + p.mood, 0) / highDays.length;
  const avgLow  = lowDays.reduce((s, p) => s + p.mood, 0)  / lowDays.length;
  const diff = avgHigh - avgLow;

  if (Math.abs(diff) < 0.3) return null;

  if (diff > 0) {
    return {
      id: uuid(), type: 'correlation', category: 'habits', strength: diff > 0.7 ? 'high' : 'medium',
      emoji: '🔗',
      title: 'Hábitos impulsionam seu humor',
      description: `Nos dias em que você completa mais hábitos, seu humor é ${(diff / avgLow * 100).toFixed(0)}% mais alto. Isso é ciência comportamental aplicada a você.`,
      highlight: `+${(diff / avgLow * 100).toFixed(0)}%`,
      highlightLabel: 'de humor nos dias produtivos',
      chartData: [
        { label: 'Dias c/ mais hábitos', value: avgHigh, color: '#66BB6A' },
        { label: 'Dias com menos', value: avgLow, color: '#EF5350' },
      ],
      detectedAt: today(),
    };
  }

  return null;
}

/**
 * 3. MELHOR DIA DA SEMANA
 */
function detectBestWeekday(
  checkins: DailyCheckIn[],
  completionsByDate: Record<string, number>,
): Insight | null {
  if (checkins.length < 14) return null;

  const weekdayStats: Record<number, { moods: number[]; completions: number[] }> = {};
  for (let i = 0; i < 7; i++) weekdayStats[i] = { moods: [], completions: [] };

  checkins.forEach(c => {
    const d = new Date(c.date + 'T12:00:00');
    const dow = d.getDay();
    const mood = avgMoodOfDay(c);
    if (mood !== null) weekdayStats[dow].moods.push(mood);
    weekdayStats[dow].completions.push(completionsByDate[c.date] ?? 0);
  });

  let bestDay = -1, bestScore = -1, worstDay = -1, worstScore = 99;
  const chartData: InsightDataPoint[] = [];

  for (let i = 0; i < 7; i++) {
    const stats = weekdayStats[i];
    if (!stats.moods.length) continue;
    const avgM = stats.moods.reduce((a, b) => a + b, 0) / stats.moods.length;
    const avgC = stats.completions.length
      ? stats.completions.reduce((a, b) => a + b, 0) / stats.completions.length
      : 0;
    const score = avgM * 0.6 + avgC * 0.4;
    chartData.push({ label: WEEKDAY_LABELS[i].slice(0, 3), value: Math.round(score * 10), color: '#5AB4FF' });
    if (score > bestScore)  { bestScore = score; bestDay = i; }
    if (score < worstScore) { worstScore = score; worstDay = i; }
  }

  if (bestDay === -1 || bestDay === worstDay) return null;

  return {
    id: uuid(), type: 'pattern', category: 'habits', strength: 'medium',
    emoji: '📅',
    title: `${WEEKDAY_LABELS[bestDay]} é o seu melhor dia`,
    description: `Você tem mais energia, completa mais hábitos e se sente melhor nas ${WEEKDAY_LABELS[bestDay].toLowerCase()}s. Use isso a seu favor.`,
    highlight: WEEKDAY_LABELS[bestDay],
    highlightLabel: 'seu dia mais forte da semana',
    chartData,
    detectedAt: today(),
  };
}

/**
 * 4. SEQUÊNCIA (STREAK) DE HÁBITOS
 */
async function detectStreak(userId: string): Promise<Insight | null> {
  const habits = await HabitRepository.getByUser(userId);
  if (!habits.length) return null;

  const best = habits.reduce((a, b) => (b.streakCount > a.streakCount ? b : a), habits[0]);
  if (best.streakCount < 3) return null;

  const isPersonalBest = best.streakCount >= best.bestStreak;

  return {
    id: uuid(), type: 'streak', category: 'habits', strength: best.streakCount >= 7 ? 'high' : 'medium',
    emoji: '🔥',
    title: isPersonalBest
      ? `Recorde pessoal! ${best.streakCount} dias seguidos`
      : `${best.streakCount} dias em sequência`,
    description: `"${best.title}" — ${isPersonalBest ? 'Isso é um recorde pessoal seu. Não quebre agora.' : `Seu recorde é ${best.bestStreak} dias. Você está indo bem.`}`,
    highlight: `${best.streakCount}d`,
    highlightLabel: 'dias de sequência',
    detectedAt: today(),
  };
}

/**
 * 5. CONSISTÊNCIA GERAL (últimos 14 dias)
 * Quantos dias tiveram check-in + hábito completado?
 */
function detectConsistency(
  checkins: DailyCheckIn[],
  completionsByDate: Record<string, number>,
): Insight | null {
  const days14 = Array.from({ length: 14 }, (_, i) => dateNDaysAgo(i));
  const activeDays = days14.filter(d =>
    checkins.some(c => c.date === d) || (completionsByDate[d] ?? 0) > 0
  ).length;
  const pct = Math.round((activeDays / 14) * 100);

  if (pct >= 80) {
    return {
      id: uuid(), type: 'celebration', category: 'consistency', strength: 'high',
      emoji: '🏆',
      title: 'Consistência impressionante',
      description: `Você esteve ativo em ${activeDays} dos últimos 14 dias (${pct}%). Consistência é o que separa intenção de resultado.`,
      highlight: `${pct}%`,
      highlightLabel: 'de consistência nos últimos 14 dias',
      detectedAt: today(),
    };
  }
  if (pct >= 50) {
    return {
      id: uuid(), type: 'pattern', category: 'consistency', strength: 'medium',
      emoji: '💪',
      title: 'Construindo consistência',
      description: `${activeDays} de 14 dias ativos (${pct}%). Você está no caminho — o próximo nível é chegar a 80%.`,
      highlight: `${pct}%`,
      highlightLabel: 'de dias ativos',
      detectedAt: today(),
    };
  }
  return {
    id: uuid(), type: 'attention', category: 'consistency', strength: 'medium',
    emoji: '🌱',
    title: 'Hora de reativar a rotina',
    description: `Nos últimos 14 dias, você esteve ativo em apenas ${activeDays} deles. Não é julgamento — é dado. O que está travando?`,
    highlight: `${pct}%`,
    highlightLabel: 'de consistência',
    detectedAt: today(),
  };
}

/**
 * 6. SENTIMENTOS MAIS FREQUENTES
 */
function detectTopFeelings(checkins: DailyCheckIn[]): { insight: Insight | null; top: string[] } {
  const counts: Record<string, number> = {};
  checkins.forEach(c => {
    (['morning', 'midday', 'evening'] as const).forEach(p => {
      c[p]?.feelings.forEach(f => { counts[f] = (counts[f] ?? 0) + 1; });
    });
  });

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (sorted.length < 2) return { insight: null, top: [] };

  const top = sorted.slice(0, 3).map(([f]) => f);
  const topEntry = sorted[0];
  const chartData: InsightDataPoint[] = sorted.slice(0, 5).map(([label, value]) => ({
    label, value,
    color: ['Ansioso', 'Irritado', 'Estressado', 'Sobrecarregado', 'Triste'].includes(label)
      ? '#EF5350' : '#66BB6A',
  }));

  const isPositive = !['Ansioso', 'Irritado', 'Estressado', 'Sobrecarregado', 'Triste', 'Cansado'].includes(topEntry[0]);

  return {
    top,
    insight: {
      id: uuid(), type: 'theme', category: 'mindset', strength: 'medium',
      emoji: isPositive ? '🌟' : '🧐',
      title: isPositive
        ? `"${topEntry[0]}" domina suas reflexões`
        : `Você tem se sentido "${topEntry[0]}" com frequência`,
      description: isPositive
        ? `Esse é o sentimento mais frequente nos seus check-ins. Emoções positivas persistentes são sinal de alinhamento de vida.`
        : `"${topEntry[0]}" apareceu ${topEntry[1]} vezes nos seus registros. Vale investigar o que está causando isso.`,
      highlight: `${topEntry[1]}x`,
      highlightLabel: `"${topEntry[0]}" nos últimos 30 dias`,
      chartData,
      detectedAt: today(),
    },
  };
}

/**
 * 7. IMPACTO DA MANHÃ NO RESTO DO DIA
 */
function detectMorningImpact(checkins: DailyCheckIn[]): Insight | null {
  const goodMorning: number[] = []; // avg mood do resto do dia quando manhã >= 4
  const badMorning:  number[] = []; // avg mood do resto do dia quando manhã <= 2

  checkins.forEach(c => {
    const mMood = c.morning?.mood;
    if (!mMood) return;
    const restMoods = (['midday', 'evening'] as const)
      .map(p => c[p]?.mood).filter((v): v is MoodLevel => v != null);
    if (!restMoods.length) return;
    const restAvg = restMoods.reduce((a, b) => a + b, 0) / restMoods.length;
    if (mMood >= 4) goodMorning.push(restAvg);
    if (mMood <= 2) badMorning.push(restAvg);
  });

  if (goodMorning.length < 3 || badMorning.length < 3) return null;

  const avgGood = goodMorning.reduce((a, b) => a + b, 0) / goodMorning.length;
  const avgBad  = badMorning.reduce((a, b) => a + b, 0)  / badMorning.length;
  const diff = avgGood - avgBad;

  if (diff < 0.4) return null;

  return {
    id: uuid(), type: 'correlation', category: 'mood', strength: diff > 0.8 ? 'high' : 'medium',
    emoji: '🌅',
    title: 'Sua manhã define o dia',
    description: `Quando você começa o dia bem (humor ≥4), o restante do dia fica ${(diff / avgBad * 100).toFixed(0)}% melhor em média. A rotina matinal não é opcional pra você.`,
    highlight: `+${(diff / avgBad * 100).toFixed(0)}%`,
    highlightLabel: 'de humor quando a manhã é boa',
    chartData: [
      { label: 'Manhã boa', value: parseFloat(avgGood.toFixed(1)), color: '#66BB6A' },
      { label: 'Manhã difícil', value: parseFloat(avgBad.toFixed(1)), color: '#EF5350' },
    ],
    detectedAt: today(),
  };
}

/**
 * 8. OBJETIVOS ATIVOS
 */
async function detectGoalContext(userId: string): Promise<Insight | null> {
  const objectives = await ObjectiveRepository.getActive(userId);
  if (!objectives.length) return null;

  return {
    id: uuid(), type: 'pattern', category: 'goals', strength: 'low',
    emoji: '🎯',
    title: objectives.length === 1
      ? `1 objetivo ativo: "${objectives[0].title}"`
      : `${objectives.length} objetivos ativos`,
    description: objectives.length === 1
      ? `Por que isso importa: "${objectives[0].why}". Cada hábito completado te aproxima disso.`
      : `Você está perseguindo ${objectives.length} objetivos ao mesmo tempo. Isso testa sua disciplina — o app vai te ajudar a manter o foco.`,
    highlight: `${objectives.length}`,
    highlightLabel: 'objetivo(s) em andamento',
    detectedAt: today(),
  };
}

// ─── Serviço Principal ────────────────────────────────────────────────────────

export const UserInsightService = {
  async generate(userId: string): Promise<UserInsightProfile> {
    const from30 = dateNDaysAgo(30);
    const todayStr = today();

    // Busca paralela de todos os dados
    const [checkins, completionsByDate] = await Promise.all([
      CheckInRepository.getByDateRange(userId, from30, todayStr),
      HabitRepository.getCompletionsByDate(userId, 30),
    ]);

    // Roda todos os algoritmos
    const [streakInsight, goalInsight] = await Promise.all([
      detectStreak(userId),
      detectGoalContext(userId),
    ]);

    const { insight: feelingInsight, top: topFeelings } = detectTopFeelings(checkins);

    const rawInsights: (Insight | null)[] = [
      detectMoodTrend(checkins),
      detectHabitMoodCorrelation(checkins, completionsByDate),
      detectMorningImpact(checkins),
      detectBestWeekday(checkins, completionsByDate),
      detectConsistency(checkins, completionsByDate),
      streakInsight,
      feelingInsight,
      goalInsight,
    ];

    // Filtra nulos e ordena por força (high > medium > low)
    const strengthOrder = { high: 0, medium: 1, low: 2 };
    const insights = rawInsights
      .filter((i): i is Insight => i !== null)
      .sort((a, b) => strengthOrder[a.strength] - strengthOrder[b.strength]);

    // Métricas do perfil
    const last7Checkins = checkins.filter(c => c.date >= dateNDaysAgo(7));
    const allMoods = last7Checkins.flatMap(c =>
      (['morning', 'midday', 'evening'] as const)
        .map(p => c[p]?.mood)
        .filter((v): v is MoodLevel => v != null)
    );
    const moodAvgLast7 = allMoods.length
      ? parseFloat((allMoods.reduce((a, b) => a + b, 0) / allMoods.length).toFixed(1))
      : null;

    const days14 = Array.from({ length: 14 }, (_, i) => dateNDaysAgo(i));
    const activeDays14 = days14.filter(d =>
      checkins.some(c => c.date === d) || (completionsByDate[d] ?? 0) > 0
    ).length;

    let longestCurrentStreak = 0;
    try {
      const habits = await HabitRepository.getByUser(userId);
      longestCurrentStreak = habits.reduce((max, h) => Math.max(max, h.streakCount), 0);
    } catch {}

    let activeObjectivesCount = 0;
    try {
      const objs = await ObjectiveRepository.getActive(userId);
      activeObjectivesCount = objs.length;
    } catch {}

    return {
      userId,
      generatedAt: new Date().toISOString(),
      insights,
      moodAvgLast7,
      habitConsistency14d: Math.round((activeDays14 / 14) * 100),
      activeObjectivesCount,
      longestCurrentStreak,
      topFeelings,
    };
  },
};
