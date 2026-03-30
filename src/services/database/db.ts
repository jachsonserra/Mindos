// Este arquivo é o fallback para plataformas não cobertas por db.native.ts ou db.web.ts
// Na prática, o Metro bundler escolhe:
//   db.native.ts → iOS/Android
//   db.web.ts    → Web
// Este arquivo não deve ser usado diretamente.

export { getDatabase, type DatabaseAdapter } from './db.web';
