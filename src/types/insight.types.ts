// ─── Tipos de Insight ──────────────────────────────────────────────────────────

export type InsightType =
  | 'streak'        // Sequência de hábitos
  | 'trend'         // Tendência de humor
  | 'correlation'   // Correlação hábito ↔ humor
  | 'pattern'       // Padrão semanal
  | 'celebration'   // Conquista
  | 'attention'     // Precisa de atenção
  | 'theme';        // Tema recorrente nas reflexões

export type InsightCategory = 'habits' | 'mood' | 'goals' | 'consistency' | 'mindset';

export type InsightStrength = 'low' | 'medium' | 'high';

export interface InsightDataPoint {
  label: string;
  value: number;
  color?: string;
}

export interface Insight {
  id: string;
  type: InsightType;
  category: InsightCategory;
  strength: InsightStrength;   // Confiança / impacto do dado
  emoji: string;
  title: string;               // Frase curta e direta
  description: string;         // Explicação e contexto
  highlight?: string;          // Número ou dado de destaque (ex: "87%")
  highlightLabel?: string;     // Rótulo do dado (ex: "de consistência")
  chartData?: InsightDataPoint[]; // Para mini-gráfico opcional
  detectedAt: string;
}

export interface UserInsightProfile {
  userId: string;
  generatedAt: string;
  insights: Insight[];
  // Contexto geral do usuário
  moodAvgLast7: number | null;       // 1–5
  habitConsistency14d: number;       // 0–100%
  activeObjectivesCount: number;
  longestCurrentStreak: number;
  topFeelings: string[];            // Top 3 tags mais frequentes
}
