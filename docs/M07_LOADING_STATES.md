# M07 - Loading States & Error Boundaries

**Data:** 23/03/2026  
**Status:** ✅ Implementado  
**Impacto:** Elimina "flash de tela vazia" + recuperação de erros melhorada

---

## 1. Problema Resolvido

### Antes (ruim para UX)

```
User abre agenda → Spinner genérico → [Dados carregam] → Renderiza
Problema: Tela vazia + scary spinner assusta usuário
```

### Depois (ótima para UX)

```
User abre agenda → Skeleton do layout → [Dados preenchem] → Interativo
Vantagem: Sempre há algo visual, transição suave, sensação de rapidez
```

---

## 2. Componentes Implementados

### Loading Skeletons

**Arquivo:** [src/components/LoadingSkeletons.tsx](../src/components/LoadingSkeletons.tsx)

#### `<SkeletonBar />`

Barra cinza (placeholder) que simula texto/conteúdo:

```tsx
<SkeletonBar width="60%" height={16} borderRadius={8} />
```

#### `<SkeletonListItem />`

Skeleton de um item em lista (ex: hábito, tarefa):

```tsx
<View>
  <SkeletonBar width={40} height={40} borderRadius={20} /> {/* avatar */}
  <SkeletonBar width="60%" height={16} /> {/* título */}
  <SkeletonBar width="40%" height={12} /> {/* subtítulo */}
</View>
```

#### `<SkeletonCard />`

Skeleton de card (ex: objetivo, estatística):

```tsx
<SkeletonCard lines={3} />  {/* 3 linhas de placeholder */}
```

#### `<DashboardSkeleton />`

Layout completo de dashboard enquanto carrega:

- Header skeleton
- Stats cards skeleton
- List items skeleton

#### `<AgendaSkeleton />`

Layout de agenda/eventos esqueletizados

### Error Handling

#### `<ErrorScreen />`

Tela de erro amigável:

```tsx
<ErrorScreen
  title="Erro ao carregar dados"
  message="Verifique sua conexão e tente novamente"
  onRetry={refetchData}
/>
```

#### `<ErrorBoundary />`

(Já existe em [src/components/ErrorBoundary.tsx](../src/components/ErrorBoundary.tsx))

- Captura erros de renderização
- Exibe tela de recuperação
- Integrado no root layout

---

## 3. Padrão de Uso em Componentes

### Sem SWR (carregamento inicial)

```tsx
export function AgendaScreen() {
  const { events, isLoading } = useAgendaWithSWR();

  return (
    <ScrollView>
      {isLoading ? <AgendaSkeleton /> : <EventList events={events} />}
    </ScrollView>
  );
}
```

### Com SWR (loading mínimo)

```tsx
export function AgendaScreen() {
  const { events, isLoading, isRevalidating } = useAgendaWithSWR();

  return (
    <ScrollView>
      {/* Renderiza com dados em cache (mesmo que ligeiramente stale) */}
      {isLoading && !events.length ? (
        <AgendaSkeleton />
      ) : (
        <EventList events={events} />
      )}

      {/* Indicador discreto enquanto revalida */}
      {isRevalidating && <SyncIndicator />}
    </ScrollView>
  );
}
```

### Com Error Recovery

```tsx
export function AgendaScreen() {
  const [error, setError] = useState<string | null>(null);
  const { events, isLoading, refetch } = useAgendaWithSWR();

  if (error) {
    return (
      <ErrorScreen
        title="Erro ao carregar agenda"
        message={error}
        onRetry={() => {
          setError(null);
          refetch();
        }}
      />
    );
  }

  return (
    <ScrollView>
      {isLoading && !events.length ? (
        <AgendaSkeleton />
      ) : (
        <EventList events={events} />
      )}
    </ScrollView>
  );
}
```

---

## 4. Integração com ErrorBoundary

```tsx
export default function AppRoot() {
  return (
    <ErrorBoundary context="Dashboard">
      <DashboardScreen />
    </ErrorBoundary>
  );
}
```

O ErrorBoundary captura:

- ❌ Erros de renderização
- ❌ Erros em lifecycle methods
- ❌ Erros em construtores

Não captura:

- ✅ Erros assíncronos (async/await)
- ✅ Erros em event listeners
- ✅ Erros em timers

Para assíncronos, use try/catch + `setError(...)`.

---

## 5. UX Timeline Comparação

### Sem Skeletons

```
0ms   : User toca
100ms : Show spinner
800ms : Load completa
900ms : Renderiza conteúdo

Perceived load: 800ms (spinner visible)
```

### Com Skeletons

```
0ms   : User toca
100ms : Show skeleton layout
200ms : Skeleton "preload" visual
500ms : Load completa
600ms : Dados preenchem
700ms : Fully interactive

Perceived load: 200ms (algo já renderizado)
Improvement: 75% redução percebida
```

---

## 6. Customização de Skeletons

### Tema Escuro

Skeletons automaticamente adaptam cores com `useColorScheme()`:

```tsx
const colorScheme = useColorScheme();
const isDark = colorScheme === "dark";
// Cores ajustadas automaticamente
```

### Tamanhos Customizados

```tsx
<SkeletonBar
  width="80%"
  height={24}
  borderRadius={4}
/>

<SkeletonListItem avatarSize={60} />

<SkeletonCard lines={5} />
```

---

## 7. Performance Notes

### Skeletons vs Spinner

| Aspecto         | Spinner  | Skeleton    |
| --------------- | -------- | ----------- |
| CPU uso         | Baixo    | Muito baixo |
| Perceived speed | Lento    | Rápido      |
| UX feel         | Robótico | Natural     |
| Desenvolvedor   | Fácil    | +setup      |

**Conclusão:** Skeletons sempre preferíveis quando há design fixo.

---

## 8. Rollout Strategy

### Fase 1 (agora - M07)

- [x] Componentes criados
- [x] ErrorBoundary existente integrado
- [x] Testes passando

### Fase 2 (próxima)

- [ ] Integrar `<DashboardSkeleton />` em `/(tabs)/index.tsx`
- [ ] Integrar `<AgendaSkeleton />` em `/(tabs)/agenda.tsx`
- [ ] Adicionar em outras telas principais

### Fase 3 (M08+)

- [ ] Shimmer animation em skeletons
- [ ] Progressive skeleton depth
- [ ] Skeleton presets por feature

---

## 9. Testing

### Mock Skeletons em Testes

```typescript
jest.mock('src/components/LoadingSkeletons', () => ({
  DashboardSkeleton: () => <div>Loading...</div>,
  AgendaSkeleton: () => <div>Loading...</div>,
}));
```

### Test Error Boundary

```typescript
test('ErrorBoundary recovers from error', () => {
  const { getByText } = render(
    <ErrorBoundary>
      <ComponentThatThrows />
    </ErrorBoundary>
  );

  expect(getByText(/erro/i)).toBeInTheDocument();
});
```

---

**Checklist de Aceitação M07:**

- [x] LoadingSkeletons componentes criados
- [x] SkeletonBar, SkeletonListItem, SkeletonCard funcionam
- [x] DashboardSkeleton e AgendaSkeleton prontos
- [x] ErrorScreen com retry implementado
- [x] ErrorBoundary integrado
- [x] Dark mode support em skeletons
- [x] Testes passando
- [x] Typecheck sem erros

**Status:** ✅ PRONTO PARA INTEGRAÇÃO EM TELAS
