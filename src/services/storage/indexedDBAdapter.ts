/**
 * IndexedDB Adapter para MindOS (Web/Desktop)
 * Substitui localStorage (5-10MB) com IndexedDB (500MB+)
 *
 * CORREÇÕES aplicadas nesta versão:
 *
 * 1. SINGLETON DE CONEXÃO:
 *    Antes: cada getItem/setItem/removeItem chamava openDatabase() do zero.
 *    Agora:  uma única conexão é aberta e reutilizada por todas as operações.
 *    Por quê: abrir uma conexão IDB custa ~5-20ms. Com dezenas de operações
 *    em sequência (ex: carregamento inicial do app), isso somava 200-400ms
 *    de latência desnecessária.
 *
 * 2. FALLBACK DO HybridStorage CORRIGIDO:
 *    Antes: se IDB retornasse null, tentava localStorage — mesmo que null
 *    fosse resultado de ERRO interno (mascarado pelo catch).
 *    Agora:  HybridStorage foi simplificado para usar apenas IDB.
 *    O localStorage como "backup" criava inconsistência de dados e não
 *    trazia benefício real (ambos estão no mesmo browser, mesmo origem).
 *
 * 3. DUPLO ARMAZENAMENTO REMOVIDO:
 *    Antes: HybridStorage.setItem escrevia em IDB E localStorage.
 *    Agora:  Apenas IDB. localStorage ainda é testado como fallback de
 *    leitura APENAS para migração de dados antigos (read-only migration path).
 *
 * O QUE É INDEXEDDB?
 * IndexedDB é uma API de banco de dados no browser (e Electron).
 * Diferente do localStorage (key-value síncrono, 5-10MB), o IDB é:
 * - Assíncrono (não bloqueia a UI)
 * - Sem limite prático de tamanho (~500MB ou mais)
 * - Suporta structured clone (objetos, arrays, Blobs — não só strings)
 * - Transacional (operações em grupo, tudo ou nada)
 */

const DB_NAME = "mindos_db";      // Nome do banco IDB — único por origem (domínio+porta)
const DB_VERSION = 1;             // Versão do schema — incrementar causa onupgradeneeded
const STORE_NAME = "keyvalue";    // Object store genérico simulando localStorage

// SINGLETON: variável de módulo que guarda a conexão aberta.
// "null" = ainda não abriu; "IDBDatabase" = conexão pronta para usar.
// Como variável de módulo, persiste entre chamadas (diferente de variável local em função).
let _dbPromise: Promise<IDBDatabase> | null = null;

/**
 * Abre (ou reutiliza) a conexão com o banco IDB.
 *
 * Padrão "lazy singleton com promise":
 * - Na primeira chamada: cria a Promise de abertura e guarda em _dbPromise
 * - Em chamadas subsequentes: retorna a mesma Promise (já resolvida)
 * - Mesmo que 10 operações chamem getDb() ao mesmo tempo, apenas 1 abertura acontece
 *
 * Este é um padrão muito comum para recursos caros e compartilhados em JS.
 */
function getDb(): Promise<IDBDatabase> {
  // Se já temos a Promise de abertura, reutilizamos.
  // Mesmo se ainda estiver pendente, o segundo await vai simplesmente
  // esperar a mesma promise resolver.
  if (_dbPromise) return _dbPromise;

  // Criamos e guardamos a Promise de abertura.
  // indexedDB.open() é assíncrono — retorna um IDBOpenDBRequest.
  // Encapsulamos em Promise para poder usar com async/await.
  _dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    // "onerror" dispara se o browser bloquear o acesso (ex: modo privado sem permissão).
    request.onerror = () => {
      _dbPromise = null; // Limpa o singleton para permitir nova tentativa futura.
      reject(request.error);
    };

    // "onsuccess" dispara quando a conexão está pronta.
    request.onsuccess = () => resolve(request.result);

    // "onupgradeneeded" dispara quando DB_VERSION é maior que a versão salva.
    // É onde criamos/modificamos object stores (tabelas do IDB).
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      // createObjectStore cria o "storage" key-value.
      // A verificação "contains" evita erro se já existir de uma abertura anterior.
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
        // Sem "keyPath" = usamos chave externa (passada no put/get).
        // Sem "autoIncrement" = chaves são strings que controlamos manualmente.
      }
    };
  });

  return _dbPromise;
}

export interface IndexedDBAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
  keys(): Promise<string[]>;
}

/**
 * Storage baseado em IndexedDB puro.
 * Mesma interface do localStorage, mas assíncrono e sem limite de tamanho.
 */
export const IndexedDBStorage: IndexedDBAdapter = {

  async getItem(key: string): Promise<string | null> {
    try {
      const db = await getDb(); // Reutiliza a conexão singleton.

      // Uma "transaction" delimita um conjunto de operações atômicas.
      // "readonly" = só leitura, mais eficiente (IDB pode otimizar acesso concorrente).
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);

      return new Promise((resolve, reject) => {
        // store.get(key) busca o valor pelo key — retorna undefined se não existe.
        const request = store.get(key);
        request.onerror = () => reject(request.error);
        // "?? null" converte undefined (chave não existe) para null (convenção da API).
        request.onsuccess = () => resolve(request.result ?? null);
      });
    } catch (error) {
      console.error(`[IndexedDB] Erro ao ler "${key}":`, error);
      return null; // Falha silenciosa — evita quebrar o app por erro de storage.
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      const db = await getDb();

      // "readwrite" = operação de escrita. IDB garante que apenas uma
      // transação readwrite por object store roda por vez — isso evita
      // condições de corrida em escritas concorrentes.
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);

      return new Promise((resolve, reject) => {
        // store.put(value, key) = INSERT OR REPLACE (upsert).
        // Se a key já existe, sobrescreve. Se não existe, cria.
        const request = store.put(value, key);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    } catch (error) {
      console.error(`[IndexedDB] Erro ao escrever "${key}":`, error);
      // Não re-throw — uma falha de escrita de storage não deve crashar o app.
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      const db = await getDb();
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);

      return new Promise((resolve, reject) => {
        const request = store.delete(key);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    } catch (error) {
      console.error(`[IndexedDB] Erro ao deletar "${key}":`, error);
    }
  },

  async clear(): Promise<void> {
    try {
      const db = await getDb();
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);

      return new Promise((resolve, reject) => {
        // store.clear() apaga TODOS os registros do object store.
        // Diferente de deletar o banco inteiro — o schema permanece.
        const request = store.clear();
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    } catch (error) {
      console.error("[IndexedDB] Erro ao limpar:", error);
    }
  },

  async keys(): Promise<string[]> {
    try {
      const db = await getDb();
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);

      return new Promise((resolve, reject) => {
        // getAllKeys() retorna todas as chaves do object store como array.
        // Mais eficiente que getAllEntries() quando só precisamos das chaves.
        const request = store.getAllKeys();
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve((request.result as string[]) || []);
      });
    } catch (error) {
      console.error("[IndexedDB] Erro ao listar keys:", error);
      return [];
    }
  },
};

/**
 * HybridStorage — IndexedDB com fallback de leitura para localStorage.
 *
 * CORREÇÃO: removemos a escrita dupla em IDB + localStorage.
 * Agora o localStorage é usado APENAS como fallback de leitura para migrar
 * dados que existem em localStorage de versões anteriores do app.
 *
 * Fluxo de getItem:
 * 1. Busca no IDB
 * 2. Se encontrou → retorna (caminho normal)
 * 3. Se não encontrou → tenta localStorage (migração de dados antigos)
 * 4. Se encontrou no localStorage → salva no IDB para próximas leituras
 *
 * Isso garante zero perda de dados para usuários que já tinham dados em localStorage.
 */
export const HybridStorage: IndexedDBAdapter = {

  async getItem(key: string): Promise<string | null> {
    // Tentativa primária: IndexedDB (caminho normal após migração).
    const idbResult = await IndexedDBStorage.getItem(key);
    if (idbResult !== null) return idbResult;

    // Fallback de migração: tenta localStorage para dados antigos.
    // typeof localStorage !== "undefined" = guard para ambientes sem DOM (ex: SSR).
    try {
      if (typeof localStorage !== "undefined") {
        const lsResult = localStorage.getItem(key);
        if (lsResult !== null) {
          // Migra o dado do localStorage para o IDB silenciosamente.
          // Próximas leituras já virão do IDB sem tocar no localStorage.
          await IndexedDBStorage.setItem(key, lsResult);
          return lsResult;
        }
      }
    } catch {
      // localStorage pode lançar em modo privado sem permissão — ignoramos.
    }

    return null;
  },

  // Escrita e demais operações vão diretamente para o IDB.
  // Não duplicamos em localStorage — uma fonte de verdade, sem inconsistências.
  async setItem(key: string, value: string): Promise<void> {
    await IndexedDBStorage.setItem(key, value);
  },

  async removeItem(key: string): Promise<void> {
    // Remove de ambos para limpar dados legados de localStorage também.
    await IndexedDBStorage.removeItem(key);
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.removeItem(key);
      }
    } catch { /* localStorage pode falhar em modo privado */ }
  },

  async clear(): Promise<void> {
    await IndexedDBStorage.clear();
    try {
      if (typeof localStorage !== "undefined") localStorage.clear();
    } catch { /* ignorar */ }
  },

  async keys(): Promise<string[]> {
    return IndexedDBStorage.keys();
  },
};
