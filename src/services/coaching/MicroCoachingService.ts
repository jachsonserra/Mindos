import { CheckInPeriod, MoodLevel } from '../../types/checkin.types';

interface CoachingInput {
  period: CheckInPeriod;
  mood: MoodLevel;
  feelings: string[];
  answers: string[];
}

export interface CoachingResult {
  emoji: string;
  title: string;
  observation: string;
  nudge: string;
}

export const MicroCoachingService = {
  generate({ period, mood, feelings, answers }: CoachingInput): CoachingResult {
    const hasAnxiety      = feelings.includes('Ansioso');
    const hasTired        = feelings.includes('Cansado') || feelings.includes('Sobrecarregado');
    const hasGratitude    = feelings.includes('Grato');
    const hasFocus        = feelings.includes('Focado') || feelings.includes('Produtivo');
    const hasStress       = feelings.includes('Estressado') || feelings.includes('Irritado');
    const hasCalm         = feelings.includes('Calmo') || feelings.includes('Tranquilo');
    const writtenSomething = answers.some(a => a.trim().length > 20);

    // ── HUMOR BAIXO (1–2) ──────────────────────────────────────────────────────
    if (mood <= 2) {
      if (hasAnxiety) return {
        emoji: '🌊',
        title: 'Ansiedade registrada.',
        observation: 'Você nomeou o que está sentindo — e isso por si só já reduz a intensidade da emoção.',
        nudge: period === 'morning'
          ? 'Antes de qualquer coisa: 1 respiração longa. Depois escolha 1 tarefa pequena e faça só ela.'
          : 'Identifica 1 coisa que está fora do seu controle agora. Escreve ela e deixa ir.',
      };
      if (hasTired) return {
        emoji: '🔋',
        title: 'Bateria baixa.',
        observation: 'Cansaço honesto é diferente de falta de vontade. Seu corpo está se comunicando.',
        nudge: period === 'evening'
          ? 'Hoje: só o mínimo que te mantém em movimento. Descanso real é estratégia, não fraqueza.'
          : 'O que você pode tirar do seu dia de hoje para preservar energia?',
      };
      if (hasStress) return {
        emoji: '🌡️',
        title: 'Temperatura alta.',
        observation: 'Estresse e irritação sinalizam que algo importante está ameaçado. Vale identificar o quê.',
        nudge: 'Nomeie 1 coisa específica que está gerando isso. Ela está dentro ou fora do seu controle?',
      };
      if (writtenSomething) return {
        emoji: '📝',
        title: 'Você escreveu sobre isso.',
        observation: 'Externalizar o que pesa libera espaço mental. É uma das ferramentas mais subestimadas.',
        nudge: 'Releia suas palavras amanhã com distância. A solução muitas vezes já está na escrita.',
      };
      return {
        emoji: '🫂',
        title: 'Dia difícil registrado.',
        observation: 'Registrar um dia difícil exige honestidade consigo mesmo. Isso é força, não fraqueza.',
        nudge: period === 'evening'
          ? 'Amanhã é uma nova janela. Priorize o descanso esta noite.'
          : 'Uma pergunta: o que tornaria as próximas horas 10% mais suportáveis?',
      };
    }

    // ── HUMOR ALTO (4–5) ───────────────────────────────────────────────────────
    if (mood >= 4) {
      if (hasFocus && period === 'morning') return {
        emoji: '🎯',
        title: 'Foco matinal.',
        observation: 'Manhãs com clareza são raras. As próximas 2 horas determinam o tom do seu dia inteiro.',
        nudge: 'Silencia notificações agora. Coloca a sua tarefa mais importante na frente. Só isso.',
      };
      if (hasGratitude) return {
        emoji: '✨',
        title: 'Gratidão ativa.',
        observation: 'Gratidão consciente muda a forma como o cérebro processa o que acontece ao seu redor.',
        nudge: 'Diz para alguém específico que você é grato por eles hoje. Transforma o dia dos dois.',
      };
      if (mood === 5 && period === 'evening') return {
        emoji: '🏆',
        title: 'Dia de pico.',
        observation: 'Dias assim são raros. Entender o que os causa vale mais do que apenas vivê-los.',
        nudge: 'Anota rápido: o que foi diferente hoje? Isso é o seu manual de como repetir esse estado.',
      };
      if (hasCalm && period === 'midday') return {
        emoji: '⚖️',
        title: 'Equilíbrio de pico.',
        observation: 'Calma com bem-estar é o estado ideal para decisões difíceis e trabalho profundo.',
        nudge: 'Use as próximas horas para o que exige mais clareza de você. Você está no estado certo.',
      };
      if (period === 'morning') return {
        emoji: '⚡',
        title: 'Energia de manhã.',
        observation: 'Começar bem já coloca você à frente. Não deixe o momentum escapar em tarefas menores.',
        nudge: 'Qual é a coisa mais importante que você pode atacar nas próximas 2 horas?',
      };
      return {
        emoji: '🚀',
        title: 'Estado positivo.',
        observation: 'Energia assim é um recurso escasso. Não desperdice em coisas sem impacto real.',
        nudge: period === 'midday'
          ? 'Use esse estado para atacar o que você estava postergando.'
          : 'Encerre o dia consolidando o que você conquistou.',
      };
    }

    // ── HUMOR NEUTRO (3) ───────────────────────────────────────────────────────
    if (period === 'morning') return {
      emoji: '☀️',
      title: 'Manhã neutra.',
      observation: 'Neutralidade não é ruim — é uma tela em branco. Você tem o dia inteiro para decidir o que pinta.',
      nudge: 'Define 1 intenção clara para hoje. Só 1. Isso cria direção sem criar pressão desnecessária.',
    };
    if (period === 'evening') return {
      emoji: '🌙',
      title: 'Dia equilibrado.',
      observation: 'Dias sem picos extremos são onde a consistência se constrói. É o trabalho invisível.',
      nudge: 'Amanhã: o que você pode fazer diferente para tornar o dia mais seu?',
    };
    return {
      emoji: '🔄',
      title: 'No meio do caminho.',
      observation: 'Equilíbrio é válido. Mas às vezes "neutro" esconde algo que merece atenção.',
      nudge: 'Uma pergunta honesta: o que está te impedindo de estar no "bem" agora?',
    };
  },
};
