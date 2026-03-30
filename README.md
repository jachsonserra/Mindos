# MindOS

Sistema de produtividade pessoal com gamificação, hábitos, metas SMARTER, finanças e segunda mente.
Construído em React Native + Expo, roda em **iOS**, **Android**, **Web** e **Desktop (Electron)**.

---

## Índice

1. [Visão Geral](#visão-geral)
2. [Stack Tecnológica](#stack-tecnológica)
3. [Estrutura do Projeto](#estrutura-do-projeto)
4. [Pré-requisitos](#pré-requisitos)
5. [Instalação](#instalação)
6. [Variáveis de Ambiente](#variáveis-de-ambiente)
7. [Rodando o Projeto](#rodando-o-projeto)
8. [Build Desktop (Electron)](#build-desktop-electron)
9. [Banco de Dados](#banco-de-dados)
10. [Sincronização com Supabase](#sincronização-com-supabase)
11. [Arquitetura de Estado](#arquitetura-de-estado)
12. [Sistema de Gamificação](#sistema-de-gamificação)
13. [Testes](#testes)
14. [Scripts Disponíveis](#scripts-disponíveis)

---

## Visão Geral

MindOS é um "segundo cérebro" operacional — centraliza hábitos, tarefas, metas, estudos, finanças e journaling num único app com progressão gamificada (XP, níveis, missões, momentum).

**Módulos principais:**

- **Hábitos & Rotinas** — habit loop (gatilho → desejo → recompensa), streaks, notificações
- **Tarefas** — Matriz Pareto, agenda diária integrada
- **Metas SMARTER** — Metas → Objetivos → Sub-objetivos → Checkpoints
- **Gamificação** — XP por ações, níveis (1–50), missões, recompensas, momentum score
- **Finanças** — contas, transações, categorias, dashboard
- **Estudos** — Pomodoro integrado, sessões, notas por matéria
- **Segunda Mente** — grafo de nós e relações (brain nodes)
- **Gratidão & Cookie Jar** — journaling positivo
- **Priming** — afirmações e visualizações com imagens

---

## Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| Framework | Expo SDK 54 / React Native 0.81.5 / React 19 |
| Roteamento | Expo Router 6 (file-based) |
| Estado | Zustand 5 (13 stores) |
| Banco nativo | expo-sqlite (SQLite) |
| Banco web | IndexedDB (via webDb.ts, memory-first) |
| Desktop | Electron 33 + electron-builder |
| Estilização | NativeWind 4 (Tailwind para RN) |
| Sync nuvem | Supabase JS 2 (opcional) |
| Notificações | expo-notifications |
| Testes | Jest 29 + jest-expo |
| Tipos | TypeScript 5.9 |

---

## Estrutura do Projeto

```
mindos/
├── app/                        # Rotas (Expo Router, file-based)
│   ├── (tabs)/                 # Abas principais do app
│   │   ├── index.tsx           # Dashboard (tela inicial)
│   │   ├── routines.tsx        # Hábitos e Rotinas
│   │   ├── tasks.tsx           # Tarefas
│   │   ├── goals.tsx           # Metas
│   │   ├── progress.tsx        # Progresso e gamificação
│   │   └── ...                 # Demais abas
│   ├── (onboarding)/           # Fluxo de onboarding
│   ├── modals/                 # Modais (sheets)
│   ├── settings/               # Configurações
│   └── _layout.tsx             # Layout raiz + ErrorBoundary
│
├── src/
│   ├── __tests__/              # Testes unitários
│   │   ├── xpEngine.test.ts
│   │   ├── momentumEngine.test.ts
│   │   └── useStaleLoader.test.ts
│   ├── components/
│   │   ├── ErrorBoundary.tsx   # Captura erros de render com UI de recuperação
│   │   ├── shared/             # Componentes compartilhados (ex: Timer)
│   │   └── ui/                 # Componentes de UI reutilizáveis
│   ├── hooks/
│   │   ├── useStaleLoader.ts   # Cache stale-time para evitar re-queries
│   │   ├── useAutoRefresh.ts   # Auto-atualização periódica
│   │   └── useDailyReset.ts    # Reset diário de estado
│   ├── services/
│   │   ├── database/
│   │   │   ├── db.ts           # Entry point (redireciona native vs web)
│   │   │   ├── db.native.ts    # SQLite via expo-sqlite (iOS/Android)
│   │   │   ├── db.web.ts       # IndexedDB memory-first (Web/Electron)
│   │   │   ├── webDb.ts        # Implementação completa do banco web
│   │   │   └── *Repository.ts  # Queries por domínio (14 repositórios)
│   │   ├── gamification/
│   │   │   ├── xpEngine.ts     # Cálculos de XP, níveis, streaks
│   │   │   ├── momentumEngine.ts # Momentum score (0–100)
│   │   │   └── defaultMissions.ts
│   │   ├── notifications/
│   │   │   └── notificationService.ts
│   │   └── sync/
│   │       ├── supabaseClient.ts  # Inicialização lazy do cliente Supabase
│   │       └── syncService.ts     # Sync bidirecional local ↔ Supabase
│   ├── stores/                 # 13 stores Zustand (um por domínio)
│   ├── types/                  # Interfaces TypeScript globais
│   ├── utils/                  # Funções utilitárias puras
│   └── data/                   # Dados estáticos (ex: versículos)
│
├── electron/
│   ├── main.js                 # Processo principal do Electron
│   └── preload.js              # Bridge segura (contextBridge)
│
├── electron-builder.yml        # Config de empacotamento desktop
├── .env.example                # Exemplo de variáveis de ambiente
└── package.json
```

---

## Pré-requisitos

- **Node.js** 18+ (recomendado: 20 LTS)
- **npm** 9+
- **Expo CLI** (instalado automaticamente via `npx expo`)
- Para iOS: macOS + Xcode 15+
- Para Android: Android Studio + SDK 34+
- Para Desktop: nenhum adicional (Electron instalado pelo npm)

---

## Instalação

```bash
# Clone o repositório
git clone <seu-repositorio> mindos
cd mindos

# Instale as dependências
npm install

# Configure as variáveis de ambiente (ver próxima seção)
cp .env.example .env.local
```

---

## Variáveis de Ambiente

Copie `.env.example` para `.env.local` e preencha:

```env
# ─── Supabase (opcional — o app funciona offline sem isso) ────────────────────
# Obtenha em: https://supabase.com → seu projeto → Settings → API
EXPO_PUBLIC_SUPABASE_URL=https://SEU_PROJETO.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key_aqui
```

> **Importante:** variáveis prefixadas com `EXPO_PUBLIC_` ficam visíveis no bundle.
> Nunca coloque chaves secretas (`service_role`) com esse prefixo.
> O app funciona completamente offline sem o Supabase configurado — a sincronização é opcional.

### Configurando o banco Supabase (opcional)

Se quiser habilitar sync em nuvem, execute o SQL gerado pela função `getSupabaseSchema()` do `syncService.ts` no SQL Editor do seu projeto Supabase. Isso criará todas as tabelas espelhando o esquema local.

---

## Rodando o Projeto

```bash
# Modo desenvolvimento (abre QR code para Expo Go)
npm start

# iOS Simulator (requer macOS + Xcode)
npm run ios

# Android Emulator (requer Android Studio)
npm run android

# Web (abre no browser em localhost:8081)
npm run web

# Desktop — modo dev (hot-reload, DevTools disponível)
npm run desktop
```

---

## Build Desktop (Electron)

O app desktop é gerado a partir do build web do Expo empacotado pelo Electron.

### Desenvolvimento (hot-reload)

```bash
# Em um terminal: inicia o servidor web do Expo
npm run web

# Em outro terminal: abre janela Electron apontando para localhost:19006
npm run desktop
```

### Build de produção

```bash
# Build completo (web → Electron → instalador nativo)
npm run desktop:build

# Plataforma específica
npm run desktop:mac    # → release/MindOS-x.x.x.dmg (macOS)
npm run desktop:win    # → release/MindOS Setup x.x.x.exe (Windows)
npm run desktop:linux  # → release/MindOS-x.x.x.AppImage (Linux)
```

Os instaladores são gerados na pasta `release/`.

> **Nota macOS:** para distribuir fora da App Store sem aviso de "desenvolvedor não identificado", é necessário assinar o app com um certificado Apple Developer. Configure `mac.identity` no `electron-builder.yml`.

### API nativa (window.electronAPI)

Dentro do app, quando rodando no Electron, `window.electronAPI` expõe:

```typescript
window.electronAPI.isElectron    // true
window.electronAPI.platform      // 'darwin' | 'win32' | 'linux'
window.electronAPI.getAppVersion() // Promise<string>
window.electronAPI.getSystemTheme() // Promise<'dark' | 'light'>
```

---

## Banco de Dados

MindOS usa uma estratégia **local-first** — todos os dados vivem no dispositivo, com sync opcional para nuvem.

### Nativo (iOS / Android)

`expo-sqlite` com SQLite. As migrações são versionadas (V1–V8) e aplicadas automaticamente na inicialização via `runMigrationsNative()` em `db.native.ts`.

### Web / Desktop (Electron)

`IndexedDB` com estratégia **memory-first**:

1. Na inicialização, todos os dados são carregados do IndexedDB para memória.
2. Queries SQL são executadas na memória (síncrono, sem await).
3. Escritas são persistidas no IndexedDB de forma assíncrona com debounce de 400ms.

Isso garante que a API do banco (assíncrona) seja compatível com o mesmo código do nativo, sem sacrificar performance.

As migrações Web (V1–V8) espelham exatamente as do nativo, incluindo `ALTER TABLE ADD COLUMN` para novas colunas.

### Schema de migrações

| Versão | O que foi adicionado |
|---|---|
| V1 | Tabelas base: users, habits, routines, habit_logs, user_xp, xp_history |
| V2 | missions, rewards |
| V3 | notes, priming_items, personal_metrics, metric_entries |
| V4 | goals, sub_goals, tasks, agenda_events |
| V5 | objectives, smarter_goals, goal_checkpoints |
| V6 | finance_accounts, finance_categories, transactions |
| V7 | study_subjects, study_sessions, study_notes |
| V8 | gratitude_entries, cookie_jar, brain_nodes, node_relations |

---

## Sincronização com Supabase

O sync é **bidirecional** e usa a estratégia **"o mais recente vence"** (last-write-wins via `updated_at`).

### Push (local → Supabase)

- Envia linhas criadas ou modificadas desde o último sync.
- Usa `upsert` em lotes de 100 registros para evitar timeout.

### Pull (Supabase → local)

- Baixa linhas novas ou modificadas no servidor.
- Compara `updated_at` local vs remoto — mantém o mais recente.
- Tabelas sem `updated_at` usam `created_at` para delta pull.

### Tabelas sincronizadas

29 tabelas na ordem correta (FK respeitadas): `users → habits → routines → routine_habits → habit_logs → user_xp → xp_history → missions → rewards → notes → priming_items → personal_metrics → metric_entries → goals → sub_goals → tasks → agenda_events → objectives → smarter_goals → goal_checkpoints → finance_accounts → finance_categories → transactions → study_subjects → study_sessions → study_notes → gratitude_entries → cookie_jar → brain_nodes → node_relations`

### Como acionar sync

```typescript
import { syncData } from '@/src/services/sync/syncService';
const result = await syncData(userId);
// result.status: 'success' | 'error' | 'not_configured'
// result.tables: [{ name, pushed, pulled }]
```

Após sync bem-sucedido, chamar `invalidateAllCaches()` para forçar reload dos stores.

---

## Arquitetura de Estado

13 stores Zustand, um por domínio:

| Store | Responsabilidade |
|---|---|
| `useUserStore` | Perfil, onboarding, fase atual |
| `useHabitStore` | Hábitos, rotinas, logs |
| `useTaskStore` | Tarefas, lista diária |
| `useGoalStore` | Metas, sub-metas |
| `useObjectiveStore` | Objetivos, metas SMARTER |
| `useSmarterGoalStore` | Metas SMARTER detalhadas |
| `useGamificationStore` | XP, nível, missões, momentum |
| `useAgendaStore` | Eventos da agenda |
| `useFinanceStore` | Contas, transações, categorias |
| `useStudyStore` | Matérias, sessões, notas |
| `useGratitudeStore` | Entradas de gratidão, cookie jar |
| `useSecondMindStore` | Notas, priming, métricas |
| `useBrainStore` | Nós e relações do brain map |

### Padrão de carregamento (stale-time)

Para evitar queries redundantes ao banco, o Dashboard usa `useStaleLoader`:

```typescript
const { shouldLoad, markLoaded } = useStaleLoader(`dashboard:${userId}`, 90_000);

useFocusEffect(useCallback(() => {
  if (!shouldLoad) return; // Dados frescos (< 90s) → pula reload
  Promise.all([loadHabits(userId), loadTasks(userId), ...]).then(markLoaded);
}, [shouldLoad]));
```

---

## Sistema de Gamificação

### XP Engine (`xpEngine.ts`)

- `calculateLevel(totalXP)` — nível 1–50 com curva exponencial
- `calculateStreakBonus(streak, baseXP)` — bônus de 0–100% por streak
- `getLevelTitle(level)` — título do nível ("Iniciante" → "Mestre Mental")
- `getLevelProgressPercent(totalXP)` — % de progresso no nível atual

### Momentum Engine (`momentumEngine.ts`)

Score 0–100 que representa consistência recente:

- `calculateDailyDecay(momentum, daysMissed)` — decay de 8%/dia: `momentum * 0.92^daysMissed`
- `calculateGain(habitsCompleted, routineCompleted)` — `min(habits*3 + routine?10:0, 25)`
- `addBoost(momentum, xpAmount)` — `min(momentum + min(xp*0.5, 20), 100)`
- `getMomentumLabel(score)` — "Parado" | "Aquecendo" | "Em Movimento" | "Acelerado" | "Em Chamas"

---

## Testes

```bash
# Roda todos os testes uma vez
npm test

# Modo watch (re-roda ao salvar arquivos)
npm run test:watch

# Com relatório de cobertura (threshold: 80%)
npm run test:coverage
```

### Arquivos de teste

| Arquivo | O que testa | Casos |
|---|---|---|
| `xpEngine.test.ts` | calculateLevel, calculateCurrentLevelXP, getXPForNextLevel, getLevelTitle, calculateStreakBonus, getLevelProgressPercent | 32 |
| `momentumEngine.test.ts` | calculateDailyDecay, calculateGain, addBoost, getMomentumLabel, getMomentumEmoji, getMomentumColor | 31 |
| `useStaleLoader.test.ts` | shouldLoad, markLoaded, invalidate, invalidateAllCaches, chaves dinâmicas | 9 |

### Dependências de teste

- `jest` + `jest-expo` — runner e preset para React Native
- `@testing-library/react` — renderHook e act para testar hooks
- `ts-jest` — suporte a TypeScript nos testes
- `@types/jest` — tipos TypeScript para APIs do Jest

---

## Scripts Disponíveis

```bash
npm start              # Expo dev server (QR code)
npm run ios            # iOS Simulator
npm run android        # Android Emulator
npm run web            # Browser (localhost:8081)

npm run desktop        # Desktop dev (Electron + Expo web)
npm run desktop:build  # Build instaladores para todas as plataformas
npm run desktop:mac    # Somente macOS (.dmg)
npm run desktop:win    # Somente Windows (.exe NSIS)
npm run desktop:linux  # Somente Linux (.AppImage + .deb)

npm test               # Roda testes (uma vez)
npm run test:watch     # Roda testes em modo watch
npm run test:coverage  # Roda testes + relatório de cobertura

npm run build:web      # Build web para produção (dist/)
```

---

## Observações de Desenvolvimento

**Por que IndexedDB no lugar de localStorage para web/desktop?**
localStorage tem limite de 5–10MB por origem — insuficiente para um app com centenas de hábitos, tarefas e transações. IndexedDB não tem limite prático e suporta operações assíncronas robustas.

**Por que memory-first no banco web?**
A API SQL do projeto é assíncrona (retorna Promises). Se cada query precisasse ir ao IndexedDB, teríamos latência percebível. Carregar tudo na memória na inicialização (< 200ms para dados típicos) e persistir em background mantém a UX fluida.

**Por que Zustand e não Redux?**
Zustand tem API mais simples (sem actions/reducers boilerplate), bundle menor (~3kb vs ~7kb+), e suporte nativo a TypeScript sem configuração adicional. Para o tamanho deste projeto, é a escolha mais pragmática.

**Por que Expo Router e não React Navigation diretamente?**
File-based routing elimina o registro manual de rotas, facilita deep linking e é o padrão atual do ecossistema Expo. O trade-off é menos controle fino sobre transições — aceitável para este tipo de app.
