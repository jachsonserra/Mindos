# Arquitetura Técnica — MindOS

Data: 23/03/2026

## Visão geral

O app usa arquitetura local-first com sincronização por usuário:

1. UI em Expo/React Native
2. Estado global com Zustand
3. Persistência local com SQLite (mobile) e IndexedDB (web)
4. Sincronização e autenticação com Supabase

## Camadas

- `app/*`: telas e navegação
- `src/stores/*`: estado e casos de uso
- `src/services/database/*`: repositórios e persistência local
- `src/services/sync/*`: integração com Supabase
- `src/services/media/*`: upload de imagens
- `src/hooks/*`: cache e carregamento SWR

## Segurança

- `Auth`: sessão via Supabase Auth
- `Isolamento`: `user.id = auth.uid`
- `RLS`: políticas por usuário no schema de sync

## Performance

- Estratégia `stale-while-revalidate`
- Renderização imediata de cache local
- Revalidação em background
- Skeletons para evitar flash de tela vazia

## Mídia (M08)

- Serviço `uploadUserImage()` em src/services/media/imageUploadService.ts
- Buckets: `avatars`, `visions`, `memories`
- Script de setup: docs/M08_SUPABASE_STORAGE_SETUP.sql

## Fluxo resumido

1. Login (`AuthService`)
2. Carregamento local dos stores
3. Render com cache + SWR
4. Sync assíncrono
5. Upload de imagem com URL persistente

## Próximos passos

- Aplicar SQL de storage no Supabase
- Gravar vídeo demo curto
- Fechar release de portfólio
