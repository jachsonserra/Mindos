/**
 * Testes unitários — momentumEngine.ts
 *
 * O que é o MomentumEngine?
 * É o sistema que calcula o "momentum" (impulso) do usuário — uma pontuação
 * de 0 a 100 que representa o quão consistente ele está sendo.
 * Ela aumenta quando o usuário completa hábitos e cai quando fica inativo.
 *
 * Por que testar isso?
 * A lógica de decay (queda) usa matemática exponencial — um tipo de fórmula
 * onde o erro é mais difícil de perceber visualmente. Testes garantem que
 * a pontuação cai na taxa certa e nunca fica negativa ou passa de 100.
 *
 * Conceito novo neste arquivo: "mock" e funções puras
 * O MomentumEngine usa apenas números como entrada e saída — sem banco de dados,
 * sem rede, sem estado global. Isso é chamado de "função pura".
 * Funções puras são as mais fáceis de testar porque o resultado depende APENAS
 * dos argumentos — nada de efeitos colaterais.
 */

// Importamos o objeto MomentumEngine inteiro (não uma função específica).
// Quando usamos "export const Objeto = { metodo() {} }", importamos o objeto com chaves.
// Se fosse "export default Objeto", importaríamos sem chaves: import MomentumEngine from '...'
import { MomentumEngine } from '../services/gamification/momentumEngine';

// ─── Bloco de testes: calculateDailyDecay ────────────────────────────────────

describe('MomentumEngine.calculateDailyDecay', () => {

  it('deve retornar o mesmo momentum quando 0 dias se passaram (sem decay)', () => {
    // Se o usuário abre o app no mesmo dia, nenhum decay deve ser aplicado.
    // Math.pow(1 - 0.08, 0) = Math.pow(0.92, 0) = 1 (qualquer número ^ 0 = 1)
    // Então: 80 * 1 = 80 — o momentum fica igual.
    const resultado = MomentumEngine.calculateDailyDecay(80, 0); // 80 momentum, 0 dias perdidos
    expect(resultado).toBe(80);
  });

  it('deve reduzir o momentum em ~8% após 1 dia perdido', () => {
    // A fórmula é: momentum * (1 - 0.08)^daysMissed
    // Com 1 dia: 100 * 0.92^1 = 100 * 0.92 = 92
    const resultado = MomentumEngine.calculateDailyDecay(100, 1);

    // ".toBeCloseTo(92, 1)" verifica se o valor é próximo de 92 com 1 casa decimal de precisão.
    // Usamos toBeCloseTo em vez de toBe porque operações com números decimais (float)
    // às vezes têm pequenos erros de arredondamento: 92.00000001 !== 92
    // O segundo argumento (1) controla quantas casas decimais verificar.
    expect(resultado).toBeCloseTo(92, 1);
  });

  it('deve reduzir o momentum progressivamente após múltiplos dias', () => {
    // Após 7 dias sem usar o app: 100 * 0.92^7 ≈ 55.8
    // Math.pow(0.92, 7) = 0.5578... → 100 * 0.5578 ≈ 55.78
    // Dica: nunca escreva o valor esperado "de cabeça" — calcule com node:
    //   node -e "console.log(100 * Math.pow(0.92, 7))" → 55.784660...
    const resultado = MomentumEngine.calculateDailyDecay(100, 7);
    expect(resultado).toBeCloseTo(55.8, 0); // ~56 com precisão de 0 casas decimais
  });

  it('deve nunca retornar valor negativo (mesmo com muitos dias perdidos)', () => {
    // A fórmula usa Math.max(0, ...) para garantir que o momentum nunca fica negativo.
    // Mesmo com 365 dias (um ano) sem usar o app, o resultado mínimo é 0.
    const resultado = MomentumEngine.calculateDailyDecay(100, 365);
    expect(resultado).toBeGreaterThanOrEqual(0); // >= 0, nunca negativo
  });

  it('deve retornar 0 quando o momentum inicial é 0 (zero * qualquer coisa = zero)', () => {
    // Se o usuário já tem momentum 0, o decay não pode diminuir mais.
    // 0 * qualquer número = 0 — propriedade matemática fundamental.
    const resultado = MomentumEngine.calculateDailyDecay(0, 10);
    expect(resultado).toBe(0);
  });

  it('deve decair mais com mais dias perdidos (propriedade de monotonicidade)', () => {
    // Quanto mais dias perdidos, menor o momentum — sempre.
    // Testamos que decay(100, 5) > decay(100, 10) > decay(100, 20)
    const apos5Dias  = MomentumEngine.calculateDailyDecay(100, 5);
    const apos10Dias = MomentumEngine.calculateDailyDecay(100, 10);
    const apos20Dias = MomentumEngine.calculateDailyDecay(100, 20);

    expect(apos5Dias).toBeGreaterThan(apos10Dias);  // 5 dias perdidos → momentum maior que 10
    expect(apos10Dias).toBeGreaterThan(apos20Dias); // 10 dias perdidos → momentum maior que 20
  });
});

// ─── Bloco de testes: calculateGain ──────────────────────────────────────────

describe('MomentumEngine.calculateGain', () => {

  it('deve retornar 0 quando nenhum hábito foi completado e rotina não foi feita', () => {
    // Sem completar nada, não há ganho de momentum.
    // A fórmula é: (habitsCompleted * 3) + (routineCompleted ? 10 : 0), limitado a 25.
    const resultado = MomentumEngine.calculateGain(0, false);
    expect(resultado).toBe(0);
  });

  it('deve retornar 3 por cada hábito completado (sem rotina)', () => {
    // 1 hábito * 3 = 3 de ganho de momentum.
    const resultado = MomentumEngine.calculateGain(1, false);
    expect(resultado).toBe(3);
  });

  it('deve somar 10 ao ganho quando a rotina foi completada', () => {
    // 1 hábito (3) + rotina completada (10) = 13 de ganho.
    const resultado = MomentumEngine.calculateGain(1, true);
    expect(resultado).toBe(13);
  });

  it('deve ser limitado a no máximo 25 de ganho por dia (cap/teto)', () => {
    // Mesmo com muitos hábitos e rotina, o ganho diário máximo é 25.
    // Isso evita que usuários que completem 20 hábitos num dia subam rápido demais.
    // Esse limite é chamado de "cap" (teto) — prática comum em game design.
    // 10 hábitos * 3 = 30, mas o cap é 25. Com rotina: 10*3 + 10 = 40 > 25, ainda cap 25.
    const muitosHabitos = MomentumEngine.calculateGain(10, true);
    expect(muitosHabitos).toBe(25); // nunca passa de 25

    const habitsExtreme = MomentumEngine.calculateGain(100, true);
    expect(habitsExtreme).toBe(25); // 100 hábitos: ainda 25 máximo
  });

  it('deve retornar apenas 10 ao completar só a rotina (sem hábitos)', () => {
    // Rotina completada sem nenhum hábito = 0 + 10 = 10 de ganho.
    const resultado = MomentumEngine.calculateGain(0, true);
    expect(resultado).toBe(10);
  });
});

// ─── Bloco de testes: addBoost ────────────────────────────────────────────────

describe('MomentumEngine.addBoost', () => {

  it('deve aumentar o momentum ao receber um boost de XP', () => {
    // Completar uma missão ou desbloquear achievement dá um boost de momentum.
    // A fórmula: boost = Math.min(xpAmount * 0.5, 20) → adiciona ao momentum atual.
    const resultado = MomentumEngine.addBoost(50, 30); // momentum 50 + boost de 30 XP
    // boost = Math.min(30 * 0.5, 20) = Math.min(15, 20) = 15
    // novo momentum = 50 + 15 = 65
    expect(resultado).toBe(65);
  });

  it('deve limitar o boost a no máximo 20 pontos por chamada', () => {
    // Mesmo com 1000 XP de boost, o momentum só sobe no máximo 20 por vez.
    // Math.min(1000 * 0.5, 20) = Math.min(500, 20) = 20
    const resultado = MomentumEngine.addBoost(50, 1000);
    expect(resultado).toBe(70); // 50 + 20 = 70 (boost limitado a 20)
  });

  it('deve nunca ultrapassar 100 de momentum (cap máximo)', () => {
    // Mesmo com momentum já em 95 e boost de 20, não passa de 100.
    // Math.min(100, 95 + 20) = Math.min(100, 115) = 100
    const resultado = MomentumEngine.addBoost(95, 100); // momentum 95 + boost enorme
    expect(resultado).toBe(100);
  });

  it('deve retornar exatamente 100 ao atingir o momentum máximo', () => {
    // Testamos o teto exato para garantir que não há off-by-one error.
    // "Off-by-one" é um bug clássico onde o limite está errado por 1 (ex: > em vez de >=).
    const resultado = MomentumEngine.addBoost(100, 100); // já no máximo
    expect(resultado).toBe(100);
  });
});

// ─── Bloco de testes: getMomentumLabel ───────────────────────────────────────

describe('MomentumEngine.getMomentumLabel', () => {

  // Aqui usamos uma tabela de dados para evitar repetir código.
  // "test.each" é uma feature do Jest que executa o mesmo teste com múltiplos inputs.
  // A sintaxe [[input, esperado], ...] cria uma tabela de casos de teste.
  // %i e %s são placeholders para mostrar os valores no nome do teste.
  test.each([
    [0,  'Parado'],      // 0-19: Parado
    [10, 'Parado'],      // 10: ainda Parado
    [19, 'Parado'],      // 19: limite superior de Parado
    [20, 'Aquecendo'],   // 20: entra em Aquecendo
    [39, 'Aquecendo'],   // 39: limite superior de Aquecendo
    [40, 'Em Movimento'],// 40: entra em Movimento
    [59, 'Em Movimento'],// 59: limite superior de Movimento
    [60, 'Acelerado'],   // 60: entra em Acelerado
    [79, 'Acelerado'],   // 79: limite superior de Acelerado
    [80, 'Em Chamas'],   // 80: entra em Chamas
    [100,'Em Chamas'],   // 100: máximo, ainda Em Chamas
  ])('deve retornar "%s" para score %i', (score, labelEsperado) => {
    // "score" recebe o primeiro valor da tupla (ex: 0, 10, 19...)
    // "labelEsperado" recebe o segundo (ex: 'Parado', 'Aquecendo'...)
    const resultado = MomentumEngine.getMomentumLabel(score);
    expect(resultado).toBe(labelEsperado);
  });
});

// ─── Bloco de testes: getMomentumEmoji ───────────────────────────────────────

describe('MomentumEngine.getMomentumEmoji', () => {

  it('deve retornar ⬜ para momentum baixo (Parado)', () => {
    const resultado = MomentumEngine.getMomentumEmoji(0);
    expect(resultado).toBe('⬜');
  });

  it('deve retornar 🔥 para momentum máximo (Em Chamas)', () => {
    const resultado = MomentumEngine.getMomentumEmoji(100);
    expect(resultado).toBe('🔥');
  });

  it('deve retornar sempre um emoji (nunca string vazia ou undefined)', () => {
    // Garantimos que para qualquer valor entre 0 e 100, sempre há um emoji.
    // ".toBeTruthy()" verifica se o valor é "verdadeiro" em JavaScript
    // (strings não-vazias são truthy, strings vazias são falsy).
    for (let score = 0; score <= 100; score += 10) {
      const emoji = MomentumEngine.getMomentumEmoji(score);
      expect(emoji).toBeTruthy();    // não é vazio, null ou undefined
      expect(typeof emoji).toBe('string'); // é sempre uma string
    }
  });
});

// ─── Bloco de testes: getMomentumColor ───────────────────────────────────────

describe('MomentumEngine.getMomentumColor', () => {

  it('deve retornar uma string de cor válida (não vazia) para qualquer score', () => {
    // Não testamos o valor exato da cor (que pode mudar com o tema),
    // mas garantimos que sempre retorna uma string não-vazia.
    // Esta é uma estratégia pragmática: testar propriedades (não vazio, é string)
    // em vez de valores fixos que mudam com frequência.
    for (let score = 0; score <= 100; score += 20) {
      const cor = MomentumEngine.getMomentumColor(score);
      expect(typeof cor).toBe('string');
      expect(cor.length).toBeGreaterThan(0);
    }
  });

  it('deve retornar cores diferentes para estados diferentes', () => {
    // Labels diferentes devem ter cores diferentes — senão o visual não faz sentido.
    const corParado   = MomentumEngine.getMomentumColor(10);  // Parado
    const corChamas   = MomentumEngine.getMomentumColor(90);  // Em Chamas

    // "not.toBe()" — o "not" inverte qualquer matcher do Jest.
    // Aqui verificamos que as cores são DIFERENTES entre si.
    expect(corParado).not.toBe(corChamas);
  });
});
