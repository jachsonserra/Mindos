/**
 * CoachContextService
 *
 * Monta o system prompt do coach com contexto completo do usuário.
 * Este é o coração da inteligência: o AI chega sabendo quem é a pessoa,
 * o que ela está vivendo e o que importa para ela.
 *
 * Quanto mais o usuário usa o app, mais rico este contexto fica.
 */

import { User } from '../../types/user.types';
import { DailyCheckIn, MOOD_OPTIONS, CheckInPeriod } from '../../types/checkin.types';
import { UserInsightProfile } from '../../types/insight.types';
import { Habit } from '../../types/habit.types';
import { Objective } from '../../types/objective.types';

interface CoachContextInput {
  user: User;
  habits: Habit[];
  objectives: Objective[];
  recentCheckIns: DailyCheckIn[];   // últimos 7 dias
  insightProfile: UserInsightProfile | null;
}

function moodLabel(level?: number | null): string {
  if (!level) return 'não registrado';
  return MOOD_OPTIONS.find(m => m.level === level)?.label ?? `${level}/5`;
}

function formatDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const today = new Date();
  const diff = Math.floor((today.getTime() - dt.getTime()) / 86400000);
  if (diff === 0) return 'Hoje';
  if (diff === 1) return 'Ontem';
  return dt.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
}

function buildCheckInContext(checkins: DailyCheckIn[]): string {
  if (!checkins.length) return 'Nenhum check-in registrado ainda.';

  const PERIOD_LABEL: Record<CheckInPeriod, string> = {
    morning: 'Manhã',
    midday:  'Tarde',
    evening: 'Noite',
  };

  const lines: string[] = [];

  checkins.slice(0, 5).forEach(c => {
    lines.push(`\n📅 ${formatDate(c.date)}`);
    (['morning', 'midday', 'evening'] as CheckInPeriod[]).forEach(p => {
      const entry = c[p];
      if (!entry) return;
      lines.push(`  ${PERIOD_LABEL[p]}: ${moodLabel(entry.mood)}`);
      if (entry.feelings.length) lines.push(`    Sentimentos: ${entry.feelings.join(', ')}`);
      entry.answers.forEach(a => { if (a.trim()) lines.push(`    → "${a.trim()}"`); });
      if (entry.note.trim()) lines.push(`    Nota: "${entry.note.trim()}"`);
    });
  });

  return lines.join('\n');
}

function buildHabitsContext(habits: Habit[]): string {
  if (!habits.length) return 'Nenhum hábito cadastrado ainda.';
  return habits.map(h => {
    const streak = h.streakCount > 0 ? ` | 🔥 ${h.streakCount} dias seguidos` : '';
    return `• ${h.title}${streak}`;
  }).join('\n');
}

function buildObjectivesContext(objectives: Objective[]): string {
  if (!objectives.length) return 'Nenhum objetivo ativo ainda.';
  return objectives.map(o =>
    `• "${o.title}"\n  Por quê: ${o.why}`
  ).join('\n');
}

function buildInsightsContext(profile: UserInsightProfile | null): string {
  if (!profile || !profile.insights.length) return 'Ainda sem dados suficientes para padrões.';
  return profile.insights.slice(0, 3).map(i =>
    `• ${i.emoji} ${i.title}: ${i.description.slice(0, 120)}...`
  ).join('\n');
}

export const CoachContextService = {
  buildSystemPrompt(input: CoachContextInput): string {
    const { user, habits, objectives, recentCheckIns, insightProfile } = input;

    const moodAvg = insightProfile?.moodAvgLast7;
    const consistency = insightProfile?.habitConsistency14d ?? 0;
    const topFeelings = insightProfile?.topFeelings ?? [];
    const longestStreak = insightProfile?.longestCurrentStreak ?? 0;

    return `Você é o coach pessoal de ${user.name}. Você tem acesso completo ao histórico de vida dele no MindOS — seus hábitos, humor, objetivos e reflexões diárias.

━━━ PERFIL DE ${user.name.toUpperCase()} ━━━

🎯 ÂNCORA (o porquê dele):
"${user.whyAnchor}"
Esta é a razão mais profunda que ele declarou. Tudo o que você faz referência volta a isso.

━━━ DADOS DA ÚLTIMA SEMANA ━━━

😊 Humor médio: ${moodAvg ? `${moodAvg}/5` : 'sem dados suficientes'}
💪 Consistência (14 dias): ${consistency}%
🔥 Maior sequência ativa: ${longestStreak > 0 ? `${longestStreak} dias` : 'nenhuma'}
🧠 Sentimentos mais frequentes: ${topFeelings.length ? topFeelings.join(', ') : 'sem dados'}

━━━ HÁBITOS ATIVOS ━━━
${buildHabitsContext(habits)}

━━━ OBJETIVOS ━━━
${buildObjectivesContext(objectives)}

━━━ REFLEXÕES RECENTES ━━━
${buildCheckInContext(recentCheckIns)}

━━━ PADRÕES DETECTADOS PELO SISTEMA ━━━
${buildInsightsContext(insightProfile)}

━━━ COMO VOCÊ DEVE AGIR ━━━

Você é direto, empático e personalizado. Você NÃO faz perguntas genéricas. Você SABE quem é ${user.name} e faz perguntas específicas sobre a vida DELE.

Regras:
- Nunca pergunte "como você está?" — você já sabe pelo humor registrado
- Faça no máximo 1 pergunta por resposta
- Máximo 3 parágrafos curtos por resposta
- Conecte tudo à âncora dele quando relevante
- Quando o humor estiver baixo, valide o sentimento antes de sugerir ação
- Quando houver conquistas, celebre genuinamente antes de avançar
- Fale em português brasileiro, tom humano e direto
- Se não houver dados suficientes ainda, pergunte para conhecer melhor a pessoa

Você não é um chatbot. Você é o coach de alto nível que ${user.name} não pode pagar, mas merece ter.`;
  },

  /**
   * Prompt para geração do resumo semanal (sem interação do usuário)
   */
  buildWeeklySummaryPrompt(input: CoachContextInput): string {
    const { user, recentCheckIns, insightProfile, habits } = input;
    const topFeelings = insightProfile?.topFeelings ?? [];
    const consistency = insightProfile?.habitConsistency14d ?? 0;
    const moodAvg = insightProfile?.moodAvgLast7;

    return `Gere um resumo semanal personalizado para ${user.name}.

DADOS DA SEMANA:
- Âncora: "${user.whyAnchor}"
- Humor médio: ${moodAvg ? `${moodAvg}/5` : 'sem dados'}
- Consistência: ${consistency}%
- Sentimentos dominantes: ${topFeelings.join(', ') || 'sem dados'}
- Hábitos ativos: ${habits.map(h => h.title).join(', ') || 'nenhum'}
- Check-ins: ${buildCheckInContext(recentCheckIns)}

Escreva um resumo semanal com:
1. Uma frase que captura o espírito da semana dele (honesta, não genérica)
2. O que foi bem (específico, com dados)
3. O que merece atenção na próxima semana (1 coisa apenas)
4. Uma pergunta reflexiva para ele pensar

Máximo 200 palavras. Tom: coach de alto nível, direto e humano. Português brasileiro.`;
  },
};
