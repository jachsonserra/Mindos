/**
 * Testes unitários — useStaleLoader.ts
 *
 * O que é o useStaleLoader?
 * É um hook React que implementa o padrão "stale-time caching":
 * guarda o timestamp da última vez que os dados foram carregados
 * e, quando a tela recebe foco novamente, SÓ carrega se os dados
 * estiverem "velhos" (mais antigos que staleMs milissegundos).
 *
 * Por que isso importa no MindOS?
 * O Dashboard tem ~7 stores que fazem queries ao banco em cada foco.
 * Sem cache, trocar de aba e voltar = 7 queries desnecessárias.
 * Com staleMs = 90.000 (90 segundos), o usuário pode navegar
 * livremente sem causar N+1 queries ao banco SQLite.
 *
 * Desafio de testar Hooks React:
 * Hooks usam o ciclo de vida do React (useState, useCallback, useRef).
 * Fora de um componente, chamar um hook normalmente causaria erro:
 * "Hooks can only be called inside a function component or custom hook".
 *
 * Nossa estratégia: renderHook caseiro com react-test-renderer
 * react-test-renderer é um pacote React oficial para renderizar componentes
 * em ambiente de teste SEM browser/DOM real. Usamos TestRenderer.create()
 * para criar um componente wrapper que hospeda o hook durante o teste.
 *
 * Por que não usamos @testing-library/react aqui?
 * @testing-library/react tem um "renderHook" pronto, mas precisa ser
 * instalado separadamente. react-test-renderer já vem com jest-expo.
 * Construir o próprio renderHook é um ótimo exercício para entender
 * como os hooks são testados por baixo dos panos.
 *
 * Estado global do módulo — cuidado com vazamento de estado entre testes!
 * useStaleLoader usa um objeto `lastLoadedAt` no escopo do módulo (fora do hook).
 * Isso significa que um teste que chama markLoaded('chave-x') pode afetar
 * o próximo teste se ambos usarem 'chave-x'. Por isso, usamos beforeEach
 * para invalidar os caches entre testes, e usamos chaves únicas por teste.
 */

// "React" é necessário para criar elementos JSX via React.createElement.
// Sem ele, React.createElement('...') retornaria undefined.
import React from 'react';

// TestRenderer — renderiza componentes React em memória, sem DOM real.
// Importamos também "act", que garante que o React processe todas as
// atualizações de estado antes das asserções do teste.
import TestRenderer, { act } from 'react-test-renderer';

// Importamos o hook e a função utilitária de invalidar todos os caches.
import { useStaleLoader, invalidateAllCaches } from '../hooks/useStaleLoader';

// ─── renderHook caseiro ───────────────────────────────────────────────────────
//
// Esta é a nossa própria implementação de renderHook.
// Recebe uma callback que CHAMA o hook e retorna seu valor.
// Armazena o resultado em `resultRef.current` para que os testes possam lê-lo.
//
// Funcionamento:
// 1. Criamos um objeto ref mutável `resultRef` — vai guardar o valor atual do hook.
// 2. Criamos um componente funcional `TestWrapper` que:
//    a. Chama a callback (que contém o hook)
//    b. Guarda o retorno em `resultRef.current`
//    c. Retorna null (não renderiza nada visível)
// 3. act() + TestRenderer.create() executa a renderização React completa.
// 4. Retornamos `resultRef` para que o teste acesse `result.current`.
function renderHook<T>(callback: () => T): { current: T } {
  // O objeto `resultRef` vai ser populado durante a renderização do componente.
  // Usamos "as any" aqui apenas para inicializar — será preenchido antes de ser lido.
  const resultRef: { current: T } = { current: undefined as any };

  // TestWrapper é um componente funcional que "hospeda" o hook.
  // Toda vez que React renderizar TestWrapper, ele chamará nosso hook.
  function TestWrapper() {
    // Executamos a callback que contém o hook.
    // O valor retornado (ex: { shouldLoad, markLoaded, invalidate }) fica em resultRef.
    resultRef.current = callback();

    // Retornamos null porque não queremos renderizar nenhuma UI —
    // só precisamos que o React execute o hook.
    return null;
  }

  // act() garante que React processe TODOS os efeitos (useEffect, useState, etc.)
  // antes de retornar. Sem act(), o estado pode não estar atualizado nas asserções.
  act(() => {
    // TestRenderer.create() cria uma instância React do nosso TestWrapper.
    // Isso executa o componente, chama o hook, e popula resultRef.current.
    TestRenderer.create(React.createElement(TestWrapper));
  });

  // Retornamos o ref para que o teste acesse result.current.
  // Não retornamos o valor diretamente porque ele pode mudar após re-renders.
  return resultRef;
}

// ─── Setup: limpa o estado global antes de cada teste ────────────────────────

// "beforeEach" executa ANTES de cada teste individual ("it" ou "test").
// Aqui limpamos o objeto `lastLoadedAt` para evitar "vazamento de estado"
// entre testes — um problema clássico em módulos com estado global (singleton).
beforeEach(() => {
  invalidateAllCaches(); // Remove todos os timestamps do objeto lastLoadedAt.
});

// ─── Bloco de testes: shouldLoad ──────────────────────────────────────────────

describe('useStaleLoader — shouldLoad', () => {

  it('deve retornar shouldLoad = true na primeira chamada (cache vazio)', () => {
    // Em estado limpo (beforeEach acabou de rodar), 'dashboard:user1'
    // nunca foi carregado → shouldLoad deve ser true.
    const result = renderHook(() =>
      useStaleLoader('dashboard:user1', 5000) // staleMs = 5 segundos
    );

    // result.current.shouldLoad — o valor de shouldLoad retornado pelo hook.
    expect(result.current.shouldLoad).toBe(true);
  });

  it('deve retornar shouldLoad = false imediatamente após markLoaded()', () => {
    // Cenário: usuário abre o app → dados carregados → markLoaded().
    // Se ele trocar de aba e voltar em menos de staleMs, NÃO deve recarregar.
    const result = renderHook(() =>
      useStaleLoader('dashboard:user2', 5000)
    );

    expect(result.current.shouldLoad).toBe(true); // Antes: não carregado ainda.

    // act() é necessário quando executamos callbacks que podem causar efeitos colaterais.
    // markLoaded() modifica o objeto global lastLoadedAt — o próximo renderHook
    // usará esse valor atualizado.
    act(() => {
      result.current.markLoaded();
    });

    // Para ver o efeito de markLoaded(), criamos uma nova chamada ao hook.
    // Isso simula o comportamento real: o componente re-renderiza ao receber foco.
    // Passamos a MESMA chave para verificar que o cache foi salvo corretamente.
    const afterMark = renderHook(() =>
      useStaleLoader('dashboard:user2', 5000)
    );

    // Após markLoaded(), o timestamp foi registrado agora → shouldLoad = false.
    expect(afterMark.current.shouldLoad).toBe(false);
  });

  it('deve usar chaves diferentes para separar caches de recursos diferentes', () => {
    // Cada recurso tem sua própria chave de cache.
    // Um markLoaded em 'habits' NÃO deve afetar o cache de 'tasks'.

    const habitsResult = renderHook(() =>
      useStaleLoader('habits:user3', 5000)
    );
    const tasksResult = renderHook(() =>
      useStaleLoader('tasks:user3', 5000)
    );

    // Ambos começam sem cache → shouldLoad = true.
    expect(habitsResult.current.shouldLoad).toBe(true);
    expect(tasksResult.current.shouldLoad).toBe(true);

    // Marcamos APENAS habits como carregado.
    act(() => { habitsResult.current.markLoaded(); });

    // Verificamos após markLoaded:
    const habitsAfter = renderHook(() => useStaleLoader('habits:user3', 5000));
    const tasksAfter  = renderHook(() => useStaleLoader('tasks:user3',  5000));

    expect(habitsAfter.current.shouldLoad).toBe(false); // habits: carregado → não stale.
    expect(tasksAfter.current.shouldLoad).toBe(true);   // tasks: nunca marcado → stale.
  });

  it('deve retornar shouldLoad = true após staleMs expirar (dados velhos)', () => {
    // Este teste simula o cenário onde o usuário sai do app por mais de staleMs
    // e retorna — os dados devem ser recarregados pois estão "velhos".
    //
    // Técnica: "fake timers" (jest.useFakeTimers + jest.advanceTimersByTime)
    // Em vez de esperar segundos reais, dizemos ao Jest para "fingir" que
    // o tempo passou. Isso mantém os testes rápidos (milissegundos, não segundos).
    jest.useFakeTimers();

    const staleMs = 5000; // 5 segundos de validade para este teste.

    // Marcamos como carregado agora (tempo simulado = T0).
    const initial = renderHook(() => useStaleLoader('notes:user4', staleMs));
    act(() => { initial.current.markLoaded(); });

    // Verificamos que está fresco logo após o markLoaded.
    const fresh = renderHook(() => useStaleLoader('notes:user4', staleMs));
    expect(fresh.current.shouldLoad).toBe(false); // Recém carregado → não stale.

    // Avançamos 6 segundos — mais que os 5 segundos de staleMs.
    // jest.advanceTimersByTime(ms) faz Date.now() retornar um valor 6000ms maior.
    act(() => { jest.advanceTimersByTime(6000); });

    // Nova chamada ao hook com Date.now() avançado → 6s > 5s → stale!
    const stale = renderHook(() => useStaleLoader('notes:user4', staleMs));
    expect(stale.current.shouldLoad).toBe(true); // Dados velhos → recarregar.

    jest.useRealTimers(); // Restaura os timers reais ao final do teste.
  });

  it('deve respeitar o staleMs default de 2 minutos quando omitido', () => {
    // O hook tem default staleMs = 2 * 60 * 1000 = 120.000ms (2 minutos).
    // Testamos que dados com < 2 min não são recarregados, mas > 2 min sim.
    jest.useFakeTimers();

    const initial = renderHook(() => useStaleLoader('missions:user5')); // sem staleMs
    act(() => { initial.current.markLoaded(); });

    // Avança 1min59s (119.000ms) — dentro do limite de 2min.
    act(() => { jest.advanceTimersByTime(119_000); });
    const within = renderHook(() => useStaleLoader('missions:user5'));
    expect(within.current.shouldLoad).toBe(false); // Ainda válido.

    // Avança mais 2s → total 121s > 120s.
    act(() => { jest.advanceTimersByTime(2_000); });
    const expired = renderHook(() => useStaleLoader('missions:user5'));
    expect(expired.current.shouldLoad).toBe(true); // Expirado → recarregar.

    jest.useRealTimers();
  });

});

// ─── Bloco de testes: invalidate ─────────────────────────────────────────────

describe('useStaleLoader — invalidate', () => {

  it('deve forçar shouldLoad = true ao chamar invalidate() após markLoaded()', () => {
    // Cenário real: usuário CRIA um hábito (mutation no banco).
    // Após escrever, invalidamos o cache para garantir que na próxima visita
    // ao Dashboard os dados sejam recarregados (incluindo o novo hábito).

    const result = renderHook(() =>
      useStaleLoader('habits:user6', 5000)
    );

    // Fase 1: dados carregados → shouldLoad = false.
    act(() => { result.current.markLoaded(); });
    const afterMark = renderHook(() => useStaleLoader('habits:user6', 5000));
    expect(afterMark.current.shouldLoad).toBe(false);

    // Fase 2: usuário criou um hábito → invalidamos o cache.
    act(() => { result.current.invalidate(); });

    // Fase 3: após invalidate, não há mais timestamp → shouldLoad = true.
    const afterInvalidate = renderHook(() => useStaleLoader('habits:user6', 5000));
    expect(afterInvalidate.current.shouldLoad).toBe(true);
  });

  it('não deve afetar outras chaves ao invalidar uma chave específica', () => {
    // invalidate() deve remover APENAS a chave do hook atual, não limpar tudo.

    const habitsHook   = renderHook(() => useStaleLoader('habits:user7',   5000));
    const routinesHook = renderHook(() => useStaleLoader('routines:user7', 5000));

    // Ambos carregados.
    act(() => {
      habitsHook.current.markLoaded();
      routinesHook.current.markLoaded();
    });

    // Invalidamos APENAS habits.
    act(() => { habitsHook.current.invalidate(); });

    // Verificamos o estado de cada cache separadamente.
    const freshHabits   = renderHook(() => useStaleLoader('habits:user7',   5000));
    const freshRoutines = renderHook(() => useStaleLoader('routines:user7', 5000));

    expect(freshHabits.current.shouldLoad).toBe(true);   // habits: invalidado.
    expect(freshRoutines.current.shouldLoad).toBe(false); // routines: ainda válido.
  });

});

// ─── Bloco de testes: invalidateAllCaches ────────────────────────────────────

describe('invalidateAllCaches', () => {

  it('deve forçar shouldLoad = true em TODAS as chaves existentes', () => {
    // invalidateAllCaches() é chamado após o sync com Supabase para garantir
    // que TODOS os dados sejam recarregados do banco local atualizado.

    const chaves = ['habits:u8', 'tasks:u8', 'routines:u8', 'notes:u8'];

    // Carregamos todos os recursos.
    chaves.forEach(chave => {
      const h = renderHook(() => useStaleLoader(chave, 5000));
      act(() => { h.current.markLoaded(); });
    });

    // Todos fresco (shouldLoad = false).
    chaves.forEach(chave => {
      const h = renderHook(() => useStaleLoader(chave, 5000));
      expect(h.current.shouldLoad).toBe(false);
    });

    // Simula conclusão do sync → invalida TUDO.
    invalidateAllCaches();

    // Após o sync, TODOS devem recarregar.
    chaves.forEach(chave => {
      const h = renderHook(() => useStaleLoader(chave, 5000));
      expect(h.current.shouldLoad).toBe(true);
    });
  });

  it('não deve lançar erro ao ser chamado com cache vazio', () => {
    // Robustez: chamar invalidateAllCaches() sem nada no cache não deve quebrar.
    // "expect(() => fn()).not.toThrow()" verifica que nenhuma exceção é lançada.
    expect(() => invalidateAllCaches()).not.toThrow();
  });

});

// ─── Bloco de testes: lógica de shouldLoad (puro) ────────────────────────────

describe('useStaleLoader — lógica pura de shouldLoad', () => {

  it('deve ser true quando nunca carregado (ausência no cache)', () => {
    // Uma chave que nunca teve markLoaded() deve sempre retornar shouldLoad = true.
    // A condição no hook: !lastLoadedAt[key] → true quando a chave não existe.
    const result = renderHook(() =>
      useStaleLoader('never-loaded-key', 60_000)
    );
    expect(result.current.shouldLoad).toBe(true);
  });

  it('deve ser false para staleMs muito grande (dados "eternamente" válidos)', () => {
    // Se staleMs = Number.MAX_SAFE_INTEGER (o maior inteiro seguro em JS),
    // os dados NUNCA expirarão na prática — shouldLoad sempre false após markLoaded.
    const result = renderHook(() =>
      useStaleLoader('long-lived-key', Number.MAX_SAFE_INTEGER)
    );

    act(() => { result.current.markLoaded(); });

    const after = renderHook(() =>
      useStaleLoader('long-lived-key', Number.MAX_SAFE_INTEGER)
    );
    expect(after.current.shouldLoad).toBe(false);
  });

});
