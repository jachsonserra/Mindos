/**
 * Testes unitários — xpEngine.ts
 *
 * O que são testes unitários?
 * São funções que verificam automaticamente se o seu código funciona corretamente.
 * Em vez de abrir o app e testar na mão toda vez, você escreve um teste uma vez
 * e pode rodar centenas de verificações em milissegundos com "npm test".
 *
 * Por que testar o xpEngine especificamente?
 * Este arquivo contém a lógica de negócio mais crítica do app: cálculo de level,
 * XP e progressão. Se um bug entrar aqui, o usuário pode ganhar level incorreto,
 * perder XP ou ver barra de progresso errada — e isso arruína a experiência.
 * Testes garantem que qualquer alteração futura não quebre esse comportamento.
 */

// ─── Importações ──────────────────────────────────────────────────────────────

// "import" traz código de outro arquivo para usar aqui.
// O caminho "../services/gamification/xpEngine" é relativo a este arquivo:
// "__tests__" sobe um nível (..) e então entra em services/gamification/xpEngine.
// As chaves {} significam que estamos importando exportações nomeadas — cada
// função foi exportada com "export function" no arquivo original.
// Alternativa: se o arquivo tivesse "export default", importaríamos sem chaves:
// import xpEngine from '../services/gamification/xpEngine'
import {
  calculateLevel,          // Calcula o level com base no XP total
  calculateCurrentLevelXP, // Calcula quantos XP o usuário tem dentro do level atual
  getXPForNextLevel,        // Retorna o XP necessário para passar para o próximo level
  getLevelTitle,            // Retorna o título do level (ex: "Guerreiro")
  calculateStreakBonus,     // Retorna o bônus de XP por sequência de dias
  getLevelProgressPercent,  // Retorna 0-100% de progresso no level atual
} from '../services/gamification/xpEngine';

// ─── Bloco de testes: calculateLevel ─────────────────────────────────────────

// "describe" é uma função do Jest que agrupa testes relacionados.
// O primeiro argumento é um nome descritivo que aparece no relatório de testes.
// O segundo argumento é uma função de callback (arrow function) que contém os testes.
// Pense em "describe" como um título de capítulo num livro.
describe('calculateLevel', () => {

  // "it" (ou "test" — são sinônimos) define um caso de teste individual.
  // O primeiro argumento descreve o comportamento esperado em linguagem humana.
  // Convenção: "it should [fazer algo] when [condição]" — lê-se como uma frase.
  // O segundo argumento é a função que executa a verificação.
  it('deve retornar level 1 quando o usuário não tem XP (totalXP = 0)', () => {

    // "const" declara uma constante — uma variável que não pode ser reatribuída.
    // Aqui chamamos a função real que está sendo testada com o valor 0.
    // Em testes, o padrão é: AAA (Arrange, Act, Assert):
    //   - Arrange: preparar os dados de entrada (aqui: totalXP = 0)
    //   - Act: executar a função (aqui: calculateLevel(0))
    //   - Assert: verificar o resultado (aqui: expect(...).toBe(1))
    const resultado = calculateLevel(0); // Act: executa a função com XP zero

    // "expect" cria uma "expectativa" sobre o valor.
    // ".toBe(1)" verifica se o resultado é estritamente igual a 1 (usa ===).
    // Se não for 1, o teste falha e mostra uma mensagem de erro clara.
    // Alternativas: .toEqual() para objetos, .toBeTruthy() para verdadeiro, etc.
    expect(resultado).toBe(1); // Assert: esperamos level 1 para XP = 0
  });

  it('deve retornar level 1 com XP menor que 100 (XP insuficiente para level 2)', () => {
    // Testamos um valor de borda (boundary value): 99 XP está logo abaixo do limiar.
    // Testes de borda são importantes porque erros frequentemente acontecem nos limites.
    // Por exemplo: >= 100 sobe de level, mas 99 não deve subir.
    const resultado = calculateLevel(99); // 99 XP — um a menos do que o necessário para level 2
    expect(resultado).toBe(1); // ainda deve ser level 1
  });

  it('deve retornar level 2 exatamente ao atingir 100 XP', () => {
    // 100 XP é o limiar exato para o level 2.
    // Testar o valor exato do limiar é crucial — o bug mais comum é usar > em vez de >=.
    const resultado = calculateLevel(100); // exatamente 100 XP
    expect(resultado).toBe(2); // deve subir para level 2
  });

  it('deve retornar level 3 ao acumular XP suficiente (100 + 120 = 220 XP)', () => {
    // Level 1→2: 100 XP. Level 2→3: 120 XP (100 * 1.2 = 120). Total: 220 XP.
    // Calculamos manualmente para garantir que entendemos a fórmula antes de testar.
    // Sempre que puder, calcule o resultado esperado à mão — isso revela bugs na sua lógica.
    const resultado = calculateLevel(220); // 100 + 120 = 220 XP completos
    expect(resultado).toBe(3);
  });

  it('deve lidar com XP muito alto sem erros (nível máximo/elite)', () => {
    // Testamos um valor extremo para garantir que a função não trava em loop infinito
    // ou retorna NaN/undefined com valores grandes.
    // "Fuzz testing" básico: valores extremos frequentemente revelam bugs escondidos.
    const resultado = calculateLevel(999999); // XP muito alto
    expect(resultado).toBeGreaterThan(10); // deve calcular um level alto, não travar
    expect(typeof resultado).toBe('number'); // deve sempre retornar um número
    expect(isNaN(resultado)).toBe(false);    // não pode ser NaN (Not a Number)
  });

  it('deve retornar level progressivamente maior conforme XP aumenta', () => {
    // Este teste verifica uma propriedade matemática fundamental:
    // mais XP SEMPRE resulta em level igual ou maior — nunca menor.
    // ".toBeGreaterThanOrEqual" verifica >=.
    const level100  = calculateLevel(100);   // level 2
    const level500  = calculateLevel(500);   // level maior
    const level1000 = calculateLevel(1000);  // level ainda maior
    expect(level500).toBeGreaterThanOrEqual(level100);
    expect(level1000).toBeGreaterThanOrEqual(level500);
  });
});

// ─── Bloco de testes: calculateCurrentLevelXP ────────────────────────────────

describe('calculateCurrentLevelXP', () => {

  it('deve retornar 0 quando o usuário está no início do level 1 (XP = 0)', () => {
    // No início do jogo, o usuário tem 0 XP e está no início do level 1.
    // O XP "dentro do level atual" deve ser 0 (não completou nenhum XP ainda).
    const resultado = calculateCurrentLevelXP(0);
    expect(resultado).toBe(0);
  });

  it('deve retornar 50 quando o usuário tem 50 XP (metade do level 1)', () => {
    // Com 50 XP total, ainda no level 1 (que vai de 0 a 99 XP),
    // o XP dentro do level atual é 50.
    const resultado = calculateCurrentLevelXP(50);
    expect(resultado).toBe(50);
  });

  it('deve retornar 0 ao exatamente completar um level (100 XP = início do level 2)', () => {
    // Ao completar 100 XP, o usuário sobe para level 2 com 0 XP acumulado nesse novo level.
    // É como um odômetro: ao completar 100km, o contador do trecho atual volta para 0.
    const resultado = calculateCurrentLevelXP(100);
    expect(resultado).toBe(0);
  });

  it('deve retornar 20 quando o usuário tem 120 XP (20 XP dentro do level 2)', () => {
    // Level 2 começa em 100 XP. Com 120 XP total, o usuário tem 20 XP dentro do level 2.
    // 120 - 100 = 20 XP no level atual.
    const resultado = calculateCurrentLevelXP(120);
    expect(resultado).toBe(20);
  });

  it('deve retornar sempre um valor entre 0 e o XP necessário para o próximo level', () => {
    // Propriedade invariante: o XP dentro do level nunca pode ser negativo
    // nem maior do que o necessário para o próximo level.
    // "toBeGreaterThanOrEqual(0)" verifica >= 0.
    // "toBeLessThan" verifica <.
    const totalXP = 350;
    const currentLevelXP = calculateCurrentLevelXP(totalXP);
    const level = 3; // sabemos que 350 XP = level 3 aproximadamente
    const nextLevelXP = getXPForNextLevel(level);

    expect(currentLevelXP).toBeGreaterThanOrEqual(0);     // nunca negativo
    expect(currentLevelXP).toBeLessThan(nextLevelXP);     // nunca igual ou maior que o necessário
  });
});

// ─── Bloco de testes: getXPForNextLevel ──────────────────────────────────────

describe('getXPForNextLevel', () => {

  it('deve retornar 100 XP para o level 1 (primeiro level sempre custa 100 XP)', () => {
    // A fórmula é: Math.floor(100 * Math.pow(1.2, level - 1))
    // Para level 1: Math.floor(100 * Math.pow(1.2, 0)) = Math.floor(100 * 1) = 100
    // Math.pow(base, expoente) calcula potência. 1.2^0 = 1 (qualquer número elevado a 0 = 1).
    const resultado = getXPForNextLevel(1);
    expect(resultado).toBe(100);
  });

  it('deve retornar 120 XP para o level 2 (100 * 1.2^1 = 120)', () => {
    // Para level 2: Math.floor(100 * Math.pow(1.2, 1)) = Math.floor(120) = 120
    const resultado = getXPForNextLevel(2);
    expect(resultado).toBe(120);
  });

  it('deve retornar 144 XP para o level 3 (100 * 1.2^2 = 144)', () => {
    // Para level 3: Math.floor(100 * Math.pow(1.2, 2)) = Math.floor(144) = 144
    // A progressão é exponencial — cada level custa 20% mais que o anterior.
    // Isso é chamado de "curva de progressão exponencial", comum em jogos.
    const resultado = getXPForNextLevel(3);
    expect(resultado).toBe(144);
  });

  it('deve ser sempre crescente (level mais alto exige mais XP)', () => {
    // Testamos a propriedade de monotonicidade crescente:
    // XP para level N+1 deve sempre ser maior que para level N.
    for (let level = 1; level <= 9; level++) {
      // "for" é um loop que repete o código com level variando de 1 a 9.
      // A cada iteração, level aumenta em 1 (level++).
      const xpAtual   = getXPForNextLevel(level);
      const xpProximo = getXPForNextLevel(level + 1);
      expect(xpProximo).toBeGreaterThan(xpAtual); // próximo nível sempre mais caro
    }
  });
});

// ─── Bloco de testes: getLevelTitle ──────────────────────────────────────────

describe('getLevelTitle', () => {

  it('deve retornar "Iniciante" para o level 1', () => {
    // O array LEVEL_TITLES começa em índice 0, mas levels começam em 1.
    // A função usa (level - 1) como índice, então level 1 → índice 0 → "Iniciante".
    const resultado = getLevelTitle(1);
    expect(resultado).toBe('Iniciante');
  });

  it('deve retornar "Desperto" para o level 2', () => {
    const resultado = getLevelTitle(2);
    expect(resultado).toBe('Desperto');
  });

  it('deve retornar o último título para levels além do array (não deve crashar)', () => {
    // A função usa Math.min(level - 1, LEVEL_TITLES.length - 1) para evitar
    // acessar índice fora do array. Isso é chamado de "clamping" (limitação).
    // Testamos um level absurdamente alto para garantir que não retorna undefined.
    const resultado = getLevelTitle(9999);
    expect(typeof resultado).toBe('string'); // deve ser sempre string
    expect(resultado.length).toBeGreaterThan(0); // não pode ser string vazia
  });

  it('deve retornar strings diferentes para levels consecutivos (1 ao 5)', () => {
    // Garantimos que os títulos não se repetem para os primeiros levels.
    // Criamos um Set (coleção sem duplicatas) e verificamos que tem 5 elementos únicos.
    // Set é uma estrutura de dados que automaticamente remove duplicatas.
    const titulos = new Set([
      getLevelTitle(1),
      getLevelTitle(2),
      getLevelTitle(3),
      getLevelTitle(4),
      getLevelTitle(5),
    ]);
    expect(titulos.size).toBe(5); // 5 títulos únicos, sem repetição
  });
});

// ─── Bloco de testes: calculateStreakBonus ────────────────────────────────────

describe('calculateStreakBonus', () => {

  it('deve retornar 0 bônus para streak de 1 dia (não atingiu mínimo de 3)', () => {
    // Sem streak mínimo (3 dias), não há bônus. Retorno esperado: 0.
    const resultado = calculateStreakBonus(1);
    expect(resultado).toBe(0);
  });

  it('deve retornar 0 para streak de 2 dias (ainda falta 1 para o bônus de 3 dias)', () => {
    // Testamos o valor de borda inferior: 2 dias não atinge o mínimo de 3.
    const resultado = calculateStreakBonus(2);
    expect(resultado).toBe(0);
  });

  it('deve retornar STREAK_BONUS_3 (15 XP) para streak de 3 dias', () => {
    // 3 dias é o limiar do primeiro bônus. A constante STREAK_BONUS_3 = 15.
    // Usamos o valor 15 diretamente para deixar o teste legível e explícito.
    const resultado = calculateStreakBonus(3);
    expect(resultado).toBe(15); // XP_VALUES.STREAK_BONUS_3 = 15
  });

  it('deve retornar 15 XP para streak entre 3 e 6 dias (mantém bônus de 3)', () => {
    // Com 6 dias, ainda não atingimos o bônus de 7 dias, então mantemos o de 3.
    const resultado = calculateStreakBonus(6);
    expect(resultado).toBe(15);
  });

  it('deve retornar STREAK_BONUS_7 (40 XP) para streak de 7 dias', () => {
    // 7 dias ativa o segundo nível de bônus: 40 XP.
    const resultado = calculateStreakBonus(7);
    expect(resultado).toBe(40); // XP_VALUES.STREAK_BONUS_7 = 40
  });

  it('deve retornar 40 XP para streak de 29 dias (ainda não chegou a 30)', () => {
    // 29 dias não ativa o bônus máximo (30 dias), então retorna o bônus de 7 dias.
    const resultado = calculateStreakBonus(29);
    expect(resultado).toBe(40);
  });

  it('deve retornar STREAK_BONUS_30 (150 XP) para streak de exatamente 30 dias', () => {
    // 30 dias ativa o bônus máximo: 150 XP.
    const resultado = calculateStreakBonus(30);
    expect(resultado).toBe(150); // XP_VALUES.STREAK_BONUS_30 = 150
  });

  it('deve manter 150 XP para streaks além de 30 dias (bônus máximo não aumenta)', () => {
    // Com 100 dias de streak, o bônus não aumenta além de 150 XP.
    // Isso evita que usuários antigos ganhem vantagem excessiva sobre novos.
    const resultado = calculateStreakBonus(100);
    expect(resultado).toBe(150);
  });
});

// ─── Bloco de testes: getLevelProgressPercent ────────────────────────────────

describe('getLevelProgressPercent', () => {

  it('deve retornar 0% no início do level 1 (sem XP)', () => {
    // No começo do jogo, a barra de progresso deve estar em 0%.
    const resultado = getLevelProgressPercent(0);
    expect(resultado).toBe(0);
  });

  it('deve retornar 50% na metade do level 1 (50 XP de 100)', () => {
    // Com 50 XP e precisando de 100, a barra deve estar em 50%.
    // Math.floor(50/100 * 100) = 50%
    const resultado = getLevelProgressPercent(50);
    expect(resultado).toBe(50);
  });

  it('deve retornar 0% ao completar exatamente um level (reset da barra)', () => {
    // Ao completar o level, a barra zera para o início do próximo level.
    // 100 XP = início do level 2, barra em 0%.
    const resultado = getLevelProgressPercent(100);
    expect(resultado).toBe(0);
  });

  it('deve sempre retornar valor entre 0 e 100 (nunca ultrapassar 100%)', () => {
    // A função usa Math.min(100, ...) para garantir que nunca passa de 100.
    // Testamos vários valores para garantir a invariante.
    // "Array.from({ length: 10 }, (_, i) => ...)" cria um array de 10 elementos.
    // O underscore (_) é convenção para parâmetro não utilizado.
    const valoresXP = [0, 50, 99, 100, 200, 500, 1000, 5000];
    for (const xp of valoresXP) {
      // "for...of" itera sobre cada elemento de um array — mais legível que for(let i...).
      const percent = getLevelProgressPercent(xp);
      expect(percent).toBeGreaterThanOrEqual(0);   // nunca negativo
      expect(percent).toBeLessThanOrEqual(100);     // nunca mais de 100%
    }
  });

  it('deve retornar um número inteiro (sem decimais na barra de progresso)', () => {
    // A função usa Math.floor() para garantir valores inteiros.
    // Barras de progresso com decimais (ex: 33.33%) causam micro-renderizações desnecessárias.
    // Number.isInteger() retorna true se o número não tem parte decimal.
    const resultado = getLevelProgressPercent(75);
    expect(Number.isInteger(resultado)).toBe(true);
  });
});
