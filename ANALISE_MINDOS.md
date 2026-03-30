# MindOS — Análise Técnica Completa & Avaliação Crítica

> Documento gerado em 23/03/2026 após inspeção completa do codebase.

---

## 1. Visão Geral do Projeto

O MindOS é um app de produtividade pessoal construído com **Expo / React Native**, suportando iOS, Android e Web. Usa **Zustand** para estado global, **expo-sqlite** no mobile e um adapter custom de **localStorage** no web. O sync com nuvem é feito via **Supabase** (local-first).

**Stack:**
- Expo 54 + React Native 0.81.5 + React 19
- Expo Router (file-based routing)
- Zustand 5 (state management)
- expo-sqlite 16 (mobile) / localStorage custom (web)
- Supabase JS (sync cloud)
- NativeWind + Tailwind CSS

**Telas implementadas:** Dashboard, Rotinas, Hábitos, Tarefas, Agenda, Metas (Goals + Objetivos + SMARTER), Progresso, Estudos, Gratidão, Finanças, Segunda Mente, Missões, Configurações, Onboarding.

---

## 2. Banco de Dados — O que está bom ✅

- **Arquitetura dual (native/web)** bem implementada: `db.native.ts` usa SQLite real com WAL mode e foreign keys, `db.web.ts` usa localStorage com um parser SQL próprio.
- **Sistema de migrations versionado (V1 a V8)** garante evolução segura do schema.
- **Índices definidos** nas tabelas críticas (habit_logs, tasks, agenda_events, etc.) para queries performáticas no mobile.
- **syncService** bem estruturado: estratégia local-first, upsert em lotes de 100, merge por `updated_at`, ordem correta de inserção para respeitar FK.
- **Repositories separados** por domínio (habitRepository, taskRepository, etc.) — boa separação de responsabilidades.

---

## 3. Banco de Dados — Problemas & Melhorias ⚠️

### 3.1 Limite de armazenamento no webDb (CRÍTICO)
**Problema:** `localStorage` tem limite de ~5–10 MB por origem. Para um app de produtividade com logs diários, imagens (URI), histórico de XP e sessões de estudo, esse limite será atingido rapidamente.

**Solução recomendada:** Migrar para **IndexedDB** no web (usando a lib `idb` ou `localforage`). No Electron, pode-se usar `better-sqlite3` via IPC para ter SQLite real também no desktop.

### 3.2 Parser SQL custom é frágil (ALTO)
**Problema:** O `webDb.ts` implementa um parser SQL próprio (~700 linhas). Ele trata casos comuns bem, mas tem limitações: não suporta subqueries, CTEs, expressões complexas no SET, e pode falhar silenciosamente em queries mal formatadas.

**Solução:** Usar `sql.js` (SQLite compilado para WASM) ou `absurd-sql` no web, eliminando o parser custom e garantindo 100% de compatibilidade.

### 3.3 Divergência de schema entre native e web (ALTO)
**Problema:** O schema do `db.native.ts` tem tabelas e colunas adicionadas via `ALTER TABLE` nas migrations V4–V8 (ex: `habit_id` em tasks, `reward_points`, `is_pareto`). O `db.web.ts` tem essas colunas no CREATE inicial, mas sem o tracking de versão por migration — se um usuário web já tem dados, não há mecanismo de atualização.

**Solução:** Implementar o sistema de migrations no web também, usando um campo de versão no `localStorage` para controlar o que já foi aplicado.

### 3.4 brain_nodes e node_relations ausentes no syncService (MÉDIO)
**Problema:** As tabelas `brain_nodes` e `node_relations` (Segunda Mente) foram adicionadas na migração V6, mas **não estão no array `SYNC_TABLES`** do `syncService.ts`. Dados da Segunda Mente nunca são sincronizados com o Supabase.

**Solução:** Adicionar ao `SYNC_TABLES`:
```js
{ name: 'brain_nodes', hasUpdatedAt: true },
{ name: 'node_relations', hasUpdatedAt: false },
```

### 3.5 syncService usa AsyncStorage no web (MÉDIO)
**Problema:** O `syncService.ts` usa `@react-native-async-storage/async-storage` para guardar a data do último sync (`mindos_last_sync`). No web/Electron, isso pode falhar silenciosamente.

**Solução:** Usar `Platform.select` para usar `localStorage` no web e `AsyncStorage` no native.

### 3.6 uuid não está nas dependências de produção (MÉDIO)
**Problema:** `@types/uuid` está em `devDependencies`, mas o pacote `uuid` em si não está nas `dependencies`. Se algum repository usa `uuid` para gerar IDs, vai falhar em produção.

**Verificar:** Adicionar `uuid` nas `dependencies` caso seja usado nos repositories.

---

## 4. Arquitetura & Performance — Problemas & Melhorias ⚠️

### 4.1 Dashboard carrega 7 stores em cada foco (ALTO)
**Problema:** O `useFocusEffect` do Dashboard dispara 7 chamadas assíncronas ao banco toda vez que o usuário volta à aba principal. Isso é pesado e pode causar lag perceptível.

**Solução:**
- Implementar um cache com `stale-while-revalidate` nos stores.
- Usar um `AppStateStore` global que centraliza o refresh ao invés de cada store recarregar independentemente.
- Adicionar um timestamp de `lastLoadedAt` em cada store e só recarregar se passou mais de X minutos.

### 4.2 Sem Error Boundaries (ALTO)
**Problema:** Nenhum componente tem `ErrorBoundary`. Se qualquer store ou repository lançar erro, o app crasha silenciosamente.

**Solução:** Adicionar um `ErrorBoundary` global no `_layout.tsx` raiz, e opcionalmente por tela.

### 4.3 Sem loading skeletons (MÉDIO)
**Problema:** As telas mostram conteúdo vazio enquanto os dados carregam (`isLoading` existe nos stores mas não é usado nas telas para mostrar skeleton/shimmer). A UX percebe o "flash" de tela vazia.

**Solução:** Implementar skeleton screens nas telas principais (Dashboard, Rotinas, Tarefas).

### 4.4 Imagens armazenadas como URI local (MÉDIO)
**Problema:** `profileImageUri`, `dreamBoardImageUri` e `image_uri` em vários modelos guardam o caminho local do dispositivo. No sync com Supabase, esses caminhos não funcionam em outros dispositivos.

**Solução:** Fazer upload das imagens para o **Supabase Storage** antes de salvar o registro, e guardar a URL pública.

### 4.5 `two.tsx` é arquivo placeholder não usado (BAIXO)
**Problema:** O arquivo `app/(tabs)/two.tsx` parece ser um placeholder do template Expo inicial e está visível na lista de abas.

**Solução:** Remover o arquivo e a entrada correspondente no `_layout.tsx` das tabs.

---

## 5. Qualidade de Código — Observações ⚠️

### 5.1 Nenhum teste unitário relevante
**Problema:** Existe apenas `StyledText-test.js` que testa um componente do template. Nenhum teste cobre os repositories, stores ou lógicas de negócio (gamificação, XP, streaks).

**Impacto:** Alto risco de regressão ao refatorar o banco de dados ou a lógica de gamificação.

**Solução:** Priorizar testes para: `xpEngine.ts`, `momentumEngine.ts`, `habitRepository`, `taskRepository`.

### 5.2 Supabase sem RLS configurada
**Problema:** O `getSupabaseSchema()` mostra que as políticas RLS estão comentadas. Qualquer usuário com a anon key pode ler dados de outros usuários.

**Solução:** Configurar RLS com isolamento por `user_id` antes de qualquer uso em produção.

### 5.3 Tipos `any` espalhados
**Problema:** Uso de `any` em vários pontos críticos (ex: `as any` no syncService, `any[]` em parâmetros de repositories). Reduz a segurança de tipos que o TypeScript oferece.

---

## 6. Features Faltantes para Produção

| Feature | Prioridade | Descrição |
|---|---|---|
| Autenticação de usuário | CRÍTICA | Hoje o app usa um usuário local sem login. Sem auth, o sync com Supabase não tem isolamento seguro. |
| Backup / Exportação de dados | ALTA | Usuário não tem como exportar seus dados (CSV, JSON). |
| Notificações (desktop) | ALTA | `expo-notifications` não funciona no Electron. Precisa de implementação com a API de Notifications do Electron. |
| Onboarding revisado | MÉDIA | Falta tela de escolha de plano/fase no onboarding. |
| Modo offline indicator | MÉDIA | App não indica ao usuário quando está sem conexão. |
| Tela de configuração do Supabase | MÉDIA | Usuário precisa configurar manualmente as keys do Supabase. |

---

## 7. Versão Desktop (Electron) — Implementada

### Arquivos criados:
- `electron/main.js` — Processo principal: cria a janela, menu nativo, segurança.
- `electron/preload.js` — Expõe APIs seguras ao renderer via contextBridge.
- `electron-builder.yml` — Configuração para gerar instaladores macOS (.dmg), Windows (.exe), Linux (.AppImage).
- `package.json` — Atualizado com scripts e dependências Electron.

### Como usar:

**Instalar as dependências:**
```bash
npm install
```

**Modo desenvolvimento (hot-reload):**
```bash
# Terminal 1: inicia o servidor Expo Web
npm run web

# Terminal 2: abre o Electron apontando para localhost
npm run desktop
```

**Gerar build de produção:**
```bash
# Gera o build web + empacota o instalador
npm run desktop:build

# Específico por plataforma:
npm run desktop:mac
npm run desktop:win
npm run desktop:linux
```

Os instaladores ficam na pasta `release/`.

### Limitações atuais da versão desktop:
- Usa `localStorage` do Chromium (mesma limitação do webDb — ~10 MB).
- Notificações push não funcionam (precisa implementar com a API nativa do Electron).
- Imagens locais do iOS/Android não são acessíveis.

### Upgrade recomendado para o desktop:
Substituir o `webDb.ts` por uma integração via IPC com `better-sqlite3` no processo principal, dando ao Electron o mesmo banco SQLite real que o mobile tem.

---

## 8. Avaliação Crítica — Portfólio para Vaga

### Pontos fortes para apresentar em entrevista:

**1. Escopo ambicioso e real:** O app não é um CRUD simples. Tem gamificação (XP, streaks, missões), grafo de conhecimento (brain_nodes + node_relations), sync bidirecional com Supabase, pomodoro, finanças, metas SMARTER. Isso demonstra capacidade de pensar em produto completo.

**2. Arquitetura bem estruturada:** A separação em `services/database/`, `stores/`, `types/`, `hooks/` mostra compreensão de separação de responsabilidades. O pattern Repository + Zustand Store está bem aplicado.

**3. Sistema de migrations:** Ter migrations versionadas (V1 a V8) com rollback seguro é uma prática profissional que poucos desenvolvedores júnior/pleno demonstram em portfólio.

**4. Adapter pattern (dual DB):** Criar um adapter que abstrai SQLite nativo vs. localStorage web é uma demonstração clara de conhecimento de design patterns. É um ponto forte de diferenciação.

**5. Cross-platform real:** Funcionar em iOS, Android, Web e agora Desktop (Electron) com um único codebase é genuinamente impressionante para um produto solo.

---

### Pontos fracos que um avaliador experiente vai notar:

**1. Zero testes.** Este é o ponto mais crítico. Para qualquer empresa com cultura de engenharia mínima, um app sem nenhum teste unitário ou de integração é um sinal amarelo imediato. Não importa o tamanho do projeto.

**2. Sem autenticação real.** Um app com sync de dados na nuvem sem autenticação de usuário não está pronto para produção. Avaliadores vão perguntar: "Como você garante que dados do usuário A não vazam para o usuário B?"

**3. `webDb.ts` como parser SQL manual** é um sinal de que o problema poderia ter sido resolvido com uma lib estabelecida (`sql.js`, `absurd-sql`). Para empresas que valorizam pragmatismo, isso pode soar como over-engineering desnecessário.

**4. Tipos `any` e ausência de tipagem estrita** em partes críticas reduz a credibilidade do uso de TypeScript. Parece TypeScript "de fachada".

**5. Nenhum CI/CD.** Não há GitHub Actions, Expo EAS ou qualquer pipeline configurado. Para vagas em empresas com esteira de deploy, isso pode ser um ponto de atenção.

**6. Sem documentação de API/componentes.** Nenhum README técnico, sem documentação das telas ou dos stores. Dificulta a avaliação por terceiros.

---

### Veredito: Fortes → Médio-Senior Frontend/Mobile

**Para vagas de produto (apps mobile/cross-platform):** O projeto se sai bem. A profundidade técnica do banco de dados, o escopo do produto e a estrutura de código estão acima da média de portfólios.

**Para vagas de engenharia backend ou fullstack sênior:** Os pontos fracos (sem testes, sem auth, sem CI) ficam mais evidentes. Compensar com um discurso claro sobre as trade-offs feitas ("priorizei feature velocity para validar o produto") pode funcionar bem em entrevista.

**Recomendação de prioridades antes de apresentar:**
1. Adicionar pelo menos testes unitários para `xpEngine.ts` e `habitRepository` (2–3 horas de trabalho, alto impacto).
2. Configurar autenticação básica com Supabase Auth (1 dia de trabalho).
3. Escrever um README técnico com arquitetura, decisões e próximos passos.
4. Corrigir o bug do `brain_nodes` faltando no sync (5 minutos).

---

*Análise realizada por inspeção estática completa do codebase em 23/03/2026.*
