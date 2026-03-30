# MindOS — Guia de Deploy

> Web + iOS + Android

---

## 1. Pré-requisitos

| Ferramenta | Versão mínima | Onde instalar |
|---|---|---|
| Node.js | 20+ | nodejs.org |
| npm | 10+ | incluído com Node |
| Expo CLI (EAS) | 16+ | `npm install -g eas-cli` |
| Conta Expo | — | expo.dev |
| Conta Supabase | — | supabase.com |
| Conta Vercel (web) | — | vercel.com |

---

## 2. Configurar o Supabase

### 2.1 Criar o projeto

1. Acesse **supabase.com → New Project**
2. Escolha uma região (preferencialmente São Paulo — `sa-east-1`)
3. Anote a **URL** e **anon key** (em Settings → API)

### 2.2 Executar o schema

1. No painel do Supabase, abra **SQL Editor → New Query**
2. Cole o conteúdo do arquivo `supabase/schema.sql`
3. Clique em **Run** — todas as tabelas e políticas RLS serão criadas

### 2.3 Configurar autenticação

No painel do Supabase:
- **Authentication → Providers → Email** → habilitar
- **Authentication → URL Configuration**:
  - Site URL: `https://seudominio.vercel.app`
  - Redirect URLs: adicionar `https://seudominio.vercel.app/**`

---

## 3. Configurar variáveis de ambiente

```bash
# Na raiz do projeto
cp .env.example .env.local
```

Edite `.env.local` com suas credenciais:

```env
EXPO_PUBLIC_SUPABASE_URL=https://SEU_PROJETO.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key_aqui
EXPO_PUBLIC_ANTHROPIC_KEY=sua_chave_aqui   # opcional
EXPO_PUBLIC_AUTH_REDIRECT_URL=https://seudominio.vercel.app/auth/reset
```

> **Nota sobre Anthropic:** a chave é opcional. Usuários podem inserir a própria chave em **Configurações → Coach IA** dentro do app.

---

## 4. Deploy Web (Vercel)

### 4.1 Build local (teste antes do deploy)

```bash
npm install
npx expo export --platform web --output-dir dist
```

O output vai para a pasta `dist/`.

### 4.2 Deploy na Vercel

**Opção A — Via CLI:**
```bash
npm install -g vercel
vercel --prod
```

**Opção B — Via dashboard:**
1. Acesse **vercel.com → Import Project**
2. Conecte o repositório GitHub
3. Framework preset: **Other**
4. Build command: `npx expo export --platform web`
5. Output directory: `dist`
6. Adicione as variáveis de ambiente (mesmo do `.env.local`)
7. Clique em **Deploy**

### 4.3 Configuração adicional da Vercel

Crie um arquivo `vercel.json` na raiz (já incluído no projeto):

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/" }]
}
```

Isso garante que o roteamento SPA funcione corretamente.

---

## 5. Build Mobile (EAS)

O projeto já está configurado com EAS (`eas.json` e `app.json` com projectId).

### 5.1 Login no EAS

```bash
eas login
# ou: npx eas-cli login
```

### 5.2 Configurar credenciais (primeira vez)

```bash
eas credentials
```

Siga as instruções para iOS (Certificates + Provisioning Profile) e Android (Keystore).

### 5.3 Build de preview (distribuição interna)

```bash
# Android (APK para testes)
eas build --platform android --profile preview

# iOS (TestFlight)
eas build --platform ios --profile preview
```

### 5.4 Build de produção (lojas)

```bash
# Ambas as plataformas em paralelo
eas build --platform all --profile production
```

### 5.5 Submeter às lojas

```bash
# Google Play Store
eas submit --platform android

# Apple App Store
eas submit --platform ios
```

---

## 6. Variáveis de ambiente no EAS

Para builds mobile, configure as variáveis no painel EAS ou via CLI:

```bash
eas secret:create --name EXPO_PUBLIC_SUPABASE_URL --value "https://..."
eas secret:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "eyJ..."
eas secret:create --name EXPO_PUBLIC_ANTHROPIC_KEY --value "sk-ant-..."
```

Ou acesse **expo.dev → seu projeto → Secrets**.

---

## 7. Atualizações OTA (Over-the-Air)

Para publicar atualizações de JavaScript sem rebuild nativo:

```bash
# Publicar para o canal production
eas update --branch production --message "Descrição da atualização"
```

---

## 8. Checklist de deploy

- [ ] Supabase criado e schema executado
- [ ] RLS verificada (teste com um usuário de teste)
- [ ] `.env.local` configurado
- [ ] Build web testado localmente (`npx expo export --platform web`)
- [ ] Deploy Vercel realizado
- [ ] URL de redirect configurada no Supabase Auth
- [ ] Build mobile (preview) testado
- [ ] Build de produção gerado
- [ ] App submetido às lojas

---

## 9. Estrutura do projeto

```
mindos/
├── app/                  # Telas (Expo Router)
│   ├── (auth)/           # Login, cadastro, reset senha
│   ├── (tabs)/           # Telas principais
│   ├── modals/           # Modais
│   └── settings/         # Configurações
├── src/
│   ├── components/       # Componentes reutilizáveis
│   ├── services/         # DB, AI, notifications, sync
│   ├── stores/           # Estado (Zustand)
│   ├── types/            # Tipos TypeScript
│   └── utils/            # Helpers
├── supabase/
│   └── schema.sql        # Schema completo do banco
├── .env.example          # Template de variáveis
├── app.json              # Configuração Expo
└── eas.json              # Configuração de builds
```

---

## 10. Troubleshooting

### "Supabase não configurado" ao fazer login
→ Verifique se `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_ANON_KEY` estão corretos no `.env.local` (ou nas secrets do EAS para builds mobile).

### "Coach IA indisponível"
→ A chave Anthropic é opcional. O usuário pode inserir a própria em **Configurações → Coach IA**.

### Notificações não aparecem no iOS
→ No `eas.json`, certifique-se que o perfil usa `"distribution": "internal"` para testes ou produção para a loja. As permissões estão declaradas em `app.json → ios → infoPlist`.

### Dados não sincronizam entre dispositivos
→ O app funciona **offline-first** (SQLite local). Para sincronizar, o usuário deve ir em **Configurações → Sync** e inserir as credenciais Supabase. Isso é por design — garante privacidade total por padrão.

---

*Dúvidas? Abra uma issue ou consulte a documentação do Expo em docs.expo.dev*
