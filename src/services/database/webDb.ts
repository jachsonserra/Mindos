/**
 * MindOS — Web Database Adapter (IndexedDB)
 *
 * Substituiu localStorage (limite ~5–10 MB) por IndexedDB (sem limite prático).
 * Estratégia: "Memory-first with async persistence"
 *   1. Na inicialização, carrega TODAS as tabelas do IndexedDB para memória.
 *   2. Leituras são síncronas em memória (rápidas).
 *   3. Escritas atualizam a memória + agendam um flush assíncrono para IndexedDB (debounced 400ms).
 *
 * Implementado com IndexedDB nativo (sem dependências externas).
 * Sistema de migrations versionadas com paridade ao db.native.ts.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

type Row   = Record<string, any>;
type Tables = Record<string, Row[]>;

// ─── IndexedDB Helpers ────────────────────────────────────────────────────────

const DB_NAME    = 'mindos_idb';
const DB_VERSION = 1;
const STORE_NAME = 'tables';
const META_KEY   = '__meta__';

let _idb: IDBDatabase | null = null;

async function openIDB(): Promise<IDBDatabase> {
  if (_idb) return _idb;
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not available'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = (e) => {
      _idb = (e.target as IDBOpenDBRequest).result;
      resolve(_idb!);
    };
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(key: string): Promise<any> {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(key);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror   = () => reject(req.error);
  });
}

async function idbPut(key: string, value: any): Promise<void> {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const req = tx.objectStore(STORE_NAME).put(value, key);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

// ─── In-Memory Tables ─────────────────────────────────────────────────────────

let memoryTables: Tables = {};
let isLoaded = false;

// Debounced flush — persiste alterações no IndexedDB 400ms após a última escrita
let flushTimer: ReturnType<typeof setTimeout> | null = null;
function schedulePersist(tableName: string): void {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => persistTable(tableName), 400);
}

async function persistTable(tableName: string): Promise<void> {
  try {
    await idbPut(`table:${tableName}`, memoryTables[tableName] ?? []);
  } catch (e) {
    console.warn('[WebDB] Persist error:', tableName, e);
  }
}

async function persistMeta(meta: object): Promise<void> {
  try { await idbPut(META_KEY, meta); } catch { /* ignora */ }
}

/** Carrega todas as tabelas do IndexedDB para memória (chamado uma vez na inicialização) */
async function loadAllTables(): Promise<void> {
  if (isLoaded) return;
  try {
    const db = await openIDB();
    const allKeys: string[] = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).getAllKeys();
      req.onsuccess = () => resolve(req.result as string[]);
      req.onerror   = () => reject(req.error);
    });

    const tableKeys = allKeys.filter(k => (k as string).startsWith('table:'));
    await Promise.all(tableKeys.map(async (key) => {
      const tableName = (key as string).replace('table:', '');
      const rows = await idbGet(key);
      if (Array.isArray(rows)) memoryTables[tableName] = rows;
    }));
  } catch (e) {
    console.warn('[WebDB] Failed to load from IndexedDB, starting fresh:', e);
    memoryTables = {};
  }
  isLoaded = true;
}

// ─── Storage accessors (síncronos — operam na memória) ────────────────────────

function getStorage(): Tables {
  return memoryTables;
}

function saveStorage(tables: Tables): void {
  memoryTables = tables;
  // Persiste todas as tabelas modificadas de forma assíncrona
  for (const tableName of Object.keys(tables)) {
    schedulePersistTable(tableName);
  }
}

let pendingPersist = new Set<string>();
let batchTimer: ReturnType<typeof setTimeout> | null = null;

function schedulePersistTable(tableName: string): void {
  pendingPersist.add(tableName);
  if (batchTimer) clearTimeout(batchTimer);
  batchTimer = setTimeout(async () => {
    const toFlush = [...pendingPersist];
    pendingPersist.clear();
    for (const name of toFlush) {
      await persistTable(name);
    }
  }, 400);
}

function getTable(tableName: string): Row[] {
  return memoryTables[tableName] ?? [];
}

function saveTable(tableName: string, rows: Row[]): void {
  memoryTables[tableName] = rows;
  schedulePersistTable(tableName);
}

// ─── Migration versioning ─────────────────────────────────────────────────────

const META_MIGRATION_KEY = '__migrations__';

async function getAppliedVersion(): Promise<number> {
  try {
    const meta = await idbGet(META_MIGRATION_KEY);
    return (meta as any)?.version ?? 0;
  } catch { return 0; }
}

async function setAppliedVersion(version: number): Promise<void> {
  try { await idbPut(META_MIGRATION_KEY, { version }); } catch { /* ignora */ }
}

// ─── Simple SQL Parser ────────────────────────────────────────────────────────

interface ColumnDef {
  name: string;
  type: string;
  primaryKey: boolean;
  defaultValue: any;
  notNull: boolean;
}

function sqliteDefaultValue(expr: string): any {
  if (!expr) return null;
  const e = expr.trim();
  if (e === "(datetime('now'))") return new Date().toISOString();
  if (e.startsWith("'") && e.endsWith("'")) return e.slice(1, -1);
  const n = Number(e);
  if (!isNaN(n)) return n;
  return null;
}

function parseCreateTable(sql: string): { tableName: string; columns: ColumnDef[] } | null {
  const tableMatch = sql.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)\s*\(([\s\S]+)\)/i);
  if (!tableMatch) return null;
  const tableName = tableMatch[1];
  const columnDefs = tableMatch[2];
  const columns: ColumnDef[] = [];
  const lines = columnDefs.split(',').map(l => l.trim()).filter(l => l);

  for (const line of lines) {
    if (/^(PRIMARY\s+KEY|UNIQUE|FOREIGN\s+KEY|CHECK|INDEX|CONSTRAINT)/i.test(line)) continue;
    const colMatch = line.match(/^(\w+)\s+(\w+)(.*)/i);
    if (!colMatch) continue;
    const name = colMatch[1];
    const type = colMatch[2].toUpperCase();
    const rest = colMatch[3] || '';
    const primaryKey = /PRIMARY\s+KEY/i.test(rest) || /PRIMARY\s+KEY/i.test(line);
    const notNull = /NOT\s+NULL/i.test(rest);
    let defaultValue: any = null;
    const defaultMatch = rest.match(/DEFAULT\s+(.+?)(?:\s+(?:NOT\s+NULL|PRIMARY|UNIQUE|REFERENCES|CHECK)|$)/i);
    if (defaultMatch) defaultValue = sqliteDefaultValue(defaultMatch[1].trim());
    columns.push({ name, type, primaryKey, defaultValue, notNull });
  }
  return { tableName, columns };
}

function applyWhere(rows: Row[], whereClause: string, params: any[]): Row[] {
  if (!whereClause.trim()) return rows;
  let paramIndex = 0;
  const resolved = whereClause.replace(/\?/g, () => {
    const val = params[paramIndex++];
    if (val === null || val === undefined) return 'NULL';
    if (typeof val === 'number') return String(val);
    return `'${String(val).replace(/'/g, "\\'")}'`;
  });
  return rows.filter(row => evaluateWhere(resolved, row));
}

function evaluateWhere(expr: string, row: Row): boolean {
  const andParts = splitByLogical(expr, 'AND');
  if (andParts.length > 1) return andParts.every(p => evaluateWhere(p.trim(), row));
  const orParts = splitByLogical(expr, 'OR');
  if (orParts.length > 1) return orParts.some(p => evaluateWhere(p.trim(), row));

  const notInMatch = expr.match(/^(\w+)\s+NOT\s+IN\s*\((.+)\)$/i);
  if (notInMatch) {
    const vals = parseValueList(notInMatch[2]);
    const rowVal = String(row[notInMatch[1]] ?? '').toLowerCase();
    return !vals.some(v => String(v).toLowerCase() === rowVal);
  }

  const inMatch = expr.match(/^(\w+)\s+IN\s*\((.+)\)$/i);
  if (inMatch) {
    const vals = parseValueList(inMatch[2]);
    const rowVal = String(row[inMatch[1]] ?? '').toLowerCase();
    return vals.some(v => String(v).toLowerCase() === rowVal);
  }

  const likeMatch = expr.match(/^(\w+)\s+LIKE\s+'(.+)'$/i);
  if (likeMatch) {
    const pattern = likeMatch[2].replace(/%/g, '.*').replace(/_/g, '.');
    return new RegExp(`^${pattern}$`, 'i').test(String(row[likeMatch[1]] ?? ''));
  }

  const isNullMatch = expr.match(/^(\w+)\s+IS\s+(NOT\s+)?NULL$/i);
  if (isNullMatch) {
    const isNot = Boolean(isNullMatch[2]);
    const isNull = row[isNullMatch[1]] === null || row[isNullMatch[1]] === undefined;
    return isNot ? !isNull : isNull;
  }

  const betweenMatch = expr.match(/^(\w+)\s+(?:NOT\s+)?BETWEEN\s+(.+?)\s+AND\s+(.+)$/i);
  if (betweenMatch) {
    const isNot = /NOT\s+BETWEEN/i.test(expr);
    const lo = parseValue(betweenMatch[2].trim());
    const hi = parseValue(betweenMatch[3].trim());
    const rowVal = row[betweenMatch[1]];
    const inRange = String(rowVal ?? '') >= String(lo ?? '') && String(rowVal ?? '') <= String(hi ?? '');
    return isNot ? !inRange : inRange;
  }

  const compMatch = expr.match(/^(\w+)\s*(=|!=|<>|>=|<=|>|<)\s*(.+)$/);
  if (compMatch) {
    const col = compMatch[1];
    const op  = compMatch[2];
    const val = parseValue(compMatch[3].trim());
    const rowVal = row[col];
    switch (op) {
      case '=':  return String(rowVal ?? '') === String(val ?? '');
      case '!=': case '<>': return String(rowVal ?? '') !== String(val ?? '');
      case '>':  return String(rowVal ?? '') > String(val ?? '');
      case '<':  return String(rowVal ?? '') < String(val ?? '');
      case '>=': return String(rowVal ?? '') >= String(val ?? '');
      case '<=': return String(rowVal ?? '') <= String(val ?? '');
    }
  }
  return true;
}

function splitByLogical(expr: string, op: 'AND' | 'OR'): string[] {
  const parts: string[] = [];
  let depth = 0, current = '';
  const pattern = new RegExp(`^\\s+${op}\\s+`, 'i');
  for (let i = 0; i < expr.length; i++) {
    if (expr[i] === '(') depth++;
    else if (expr[i] === ')') depth--;
    if (depth === 0 && expr.substring(i).match(pattern)) {
      parts.push(current.trim());
      const m = expr.substring(i).match(pattern)!;
      i += m[0].length - 1;
      current = '';
    } else { current += expr[i]; }
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

function parseValueList(str: string): any[] {
  return str.split(',').map(s => parseValue(s.trim()));
}

function parseValue(raw: string): any {
  if (raw === 'NULL') return null;
  if (raw.startsWith("'") && raw.endsWith("'")) return raw.slice(1, -1);
  const n = Number(raw);
  if (!isNaN(n)) return n;
  return raw;
}

// ─── Schema Registry ──────────────────────────────────────────────────────────

const schemaRegistry: Record<string, ColumnDef[]> = {};

// ─── Statement Executor ───────────────────────────────────────────────────────

function executeStatement(sql: string, params: any[] = []): Row[] {
  const trimmed = sql.trim();
  if (/^PRAGMA/i.test(trimmed)) return [];
  if (/^CREATE\s+(?:UNIQUE\s+)?INDEX/i.test(trimmed)) return [];
  if (/^ALTER\s+TABLE/i.test(trimmed)) {
    handleAlterTable(trimmed);
    return [];
  }

  if (/^CREATE\s+TABLE/i.test(trimmed)) {
    const parsed = parseCreateTable(trimmed);
    if (parsed) {
      if (!schemaRegistry[parsed.tableName]) schemaRegistry[parsed.tableName] = parsed.columns;
      if (!memoryTables[parsed.tableName]) memoryTables[parsed.tableName] = [];
    }
    return [];
  }

  if (/^INSERT/i.test(trimmed)) {
    const ignoreMode = /^INSERT\s+OR\s+IGNORE/i.test(trimmed);
    const insertMatch = trimmed.match(/INSERT\s+(?:OR\s+\w+\s+)?INTO\s+(\w+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i);
    if (insertMatch) {
      const tableName = insertMatch[1];
      const colNames  = insertMatch[2].split(',').map(c => c.trim());
      const rawVals   = splitValueList(insertMatch[3]);
      let paramIdx = 0;
      const row: Row = {};
      colNames.forEach((col, i) => {
        const raw = rawVals[i]?.trim() ?? 'NULL';
        row[col] = raw === '?' ? (params[paramIdx++] ?? null) : parseValue(raw);
      });
      const rows = getTable(tableName);
      if (ignoreMode) {
        const pkCols = (schemaRegistry[tableName] ?? []).filter(c => c.primaryKey).map(c => c.name);
        const isDuplicate = rows.some(r => pkCols.some(pk => r[pk] !== undefined && r[pk] === row[pk]));
        if (isDuplicate) return [];
      }
      rows.push(row);
      saveTable(tableName, rows);
    }
    return [];
  }

  if (/^UPDATE/i.test(trimmed)) {
    const updateMatch = trimmed.match(/UPDATE\s+(\w+)\s+SET\s+(.+?)\s+WHERE\s+(.+)/is);
    if (updateMatch) {
      const tableName  = updateMatch[1];
      const setClause  = updateMatch[2];
      const whereClause = updateMatch[3];
      const setParts   = parseSetClause(setClause);
      let paramIdx = 0;

      interface SetEntry { col: string; value: string; paramVal?: any; isCoalesce?: boolean; coalesceCol?: string; }
      const resolvedParts: SetEntry[] = [];
      for (const { col, value } of setParts) {
        const coalMatch = value.match(/^COALESCE\s*\(\s*\?\s*,\s*(\w+)\s*\)$/i);
        if (coalMatch) {
          resolvedParts.push({ col, value, isCoalesce: true, coalesceCol: coalMatch[1], paramVal: params[paramIdx++] ?? null });
        } else if (value === '?') {
          resolvedParts.push({ col, value, paramVal: params[paramIdx++] ?? null });
        } else {
          resolvedParts.push({ col, value });
        }
      }

      const whereParams = params.slice(paramIdx);
      let rows = getTable(tableName);
      const matchedRows = applyWhere(rows, whereClause, whereParams);

      rows = rows.map(row => {
        if (!matchedRows.includes(row)) return row;
        const updated = { ...row };
        for (const part of resolvedParts) {
          const { col, value } = part;
          if (/streak_count\s*\+\s*1/.test(value)) {
            updated[col] = (Number(row[col] ?? 0)) + 1;
          } else if (/best_streak\s*=\s*MAX/.test(value)) {
            updated[col] = Math.max(Number(row['best_streak'] ?? 0), Number(row['streak_count'] ?? 0) + 1);
          } else if (part.isCoalesce) {
            updated[col] = (part.paramVal !== null && part.paramVal !== undefined)
              ? part.paramVal : row[part.coalesceCol ?? col];
          } else if ('paramVal' in part) {
            updated[col] = part.paramVal;
          } else {
            updated[col] = parseValue(value);
          }
        }
        return updated;
      });
      saveTable(tableName, rows);
    }
    return [];
  }

  if (/^DELETE/i.test(trimmed)) {
    const deleteMatch = trimmed.match(/DELETE\s+FROM\s+(\w+)(?:\s+WHERE\s+(.+))?/is);
    if (deleteMatch) {
      const tableName   = deleteMatch[1];
      const whereClause = deleteMatch[2] ?? '';
      let rows = getTable(tableName);
      if (whereClause) {
        const toRemove = applyWhere(rows, whereClause, params);
        rows = rows.filter(r => !toRemove.includes(r));
      } else {
        rows = [];
      }
      saveTable(tableName, rows);
    }
    return [];
  }

  if (/^SELECT/i.test(trimmed)) return executeSelect(trimmed, params);
  return [];
}

function handleAlterTable(sql: string): void {
  // ALTER TABLE table ADD COLUMN col TYPE [constraints]
  const addColMatch = sql.match(/ALTER\s+TABLE\s+(\w+)\s+ADD\s+(?:COLUMN\s+)?(\w+)\s+(\w+)(.*)/i);
  if (!addColMatch) return;
  const tableName = addColMatch[1];
  const colName   = addColMatch[2];
  const rest      = addColMatch[4] || '';

  // Atualiza schema registry
  let defaultValue: any = null;
  const defMatch = rest.match(/DEFAULT\s+(.+?)(?:\s+(?:NOT\s+NULL|REFERENCES|CHECK)|$)/i);
  if (defMatch) defaultValue = sqliteDefaultValue(defMatch[1].trim());

  if (!schemaRegistry[tableName]) schemaRegistry[tableName] = [];
  const alreadyExists = schemaRegistry[tableName].some(c => c.name === colName);
  if (!alreadyExists) {
    schemaRegistry[tableName].push({
      name: colName, type: addColMatch[3].toUpperCase(),
      primaryKey: false, defaultValue, notNull: /NOT\s+NULL/i.test(rest),
    });
  }

  // Adiciona coluna às linhas existentes
  const rows = getTable(tableName);
  const updated = rows.map(row => ({
    ...row,
    ...(colName in row ? {} : { [colName]: defaultValue }),
  }));
  saveTable(tableName, updated);
}

function splitValueList(str: string): string[] {
  const result: string[] = [];
  let depth = 0, current = '';
  for (const ch of str) {
    if (ch === '(' || ch === '[') depth++;
    else if (ch === ')' || ch === ']') depth--;
    if (ch === ',' && depth === 0) { result.push(current.trim()); current = ''; }
    else current += ch;
  }
  if (current.trim()) result.push(current.trim());
  return result;
}

function parseSetClause(setClause: string): Array<{ col: string; value: string }> {
  return splitValueList(setClause).map(part => {
    const eqIdx = part.indexOf('=');
    if (eqIdx === -1) return null;
    return { col: part.substring(0, eqIdx).trim(), value: part.substring(eqIdx + 1).trim() };
  }).filter(Boolean) as Array<{ col: string; value: string }>;
}

function executeSelect(sql: string, params: any[]): Row[] {
  // MAX aggregate
  const maxMatch = sql.match(/SELECT\s+MAX\((\w+)\)\s+as\s+(\w+)\s+FROM\s+(\w+)/i);
  if (maxMatch) {
    const rows = getTable(maxMatch[3]);
    const maxVal = rows.reduce((m, r) => {
      const v = r[maxMatch[1]];
      return (v !== null && v !== undefined && Number(v) > Number(m)) ? v : m;
    }, null as any);
    return [{ [maxMatch[2]]: maxVal }];
  }

  // COALESCE(SUM(col), fallback) AS alias FROM table [WHERE]
  const coalSumMatch = sql.match(/SELECT\s+COALESCE\s*\(\s*SUM\s*\(\s*(\w+)\s*\)\s*,\s*(\d+)\s*\)\s+as\s+(\w+)\s+FROM\s+(\w+)(.*)/is);
  if (coalSumMatch) {
    let rows = getTable(coalSumMatch[4]);
    const whereM = coalSumMatch[5]?.match(/WHERE\s+(.+?)(?:\s+ORDER\s+BY|\s+LIMIT|\s*$)/is);
    if (whereM) rows = applyWhere(rows, whereM[1], params);
    const total = rows.reduce((s, r) => s + (Number(r[coalSumMatch[1]]) || 0), 0);
    return [{ [coalSumMatch[3]]: total || Number(coalSumMatch[2]) }];
  }

  // COUNT(*) AS alias FROM table [WHERE]
  const countMatch = sql.match(/SELECT\s+COUNT\s*\(\s*\*\s*\)\s+as\s+(\w+)\s+FROM\s+(\w+)(.*)/is);
  if (countMatch) {
    let rows = getTable(countMatch[2]);
    const whereM = countMatch[3]?.match(/WHERE\s+(.+?)(?:\s+ORDER\s+BY|\s+LIMIT|\s*$)/is);
    if (whereM) rows = applyWhere(rows, whereM[1], params);
    return [{ [countMatch[1]]: rows.length }];
  }

  // GROUP BY with SUM
  const groupSumMatch = sql.match(/SELECT\s+(\w+)\s*,\s*SUM\s*\(\s*(\w+)\s*\)\s+as\s+(\w+)\s+FROM\s+(\w+)(.*)/is);
  if (groupSumMatch) {
    let rows = getTable(groupSumMatch[4]);
    const whereM = groupSumMatch[5]?.match(/WHERE\s+(.+?)(?:\s+GROUP|\s+ORDER|\s+LIMIT|\s*$)/is);
    if (whereM) rows = applyWhere(rows, whereM[1], params);
    const groups: Record<string, number> = {};
    for (const row of rows) {
      const k = String(row[groupSumMatch[1]] ?? '');
      groups[k] = (groups[k] ?? 0) + (Number(row[groupSumMatch[2]]) || 0);
    }
    return Object.entries(groups).map(([k, v]) => ({ [groupSumMatch[1]]: k, [groupSumMatch[3]]: v }));
  }

  // GROUP BY with COUNT
  const groupCountMatch = sql.match(/SELECT\s+(\w+)\s*,\s*COUNT\s*\(\s*(?:\*|\w+)\s*\)\s+as\s+(\w+)\s+FROM\s+(\w+)(.*)/is);
  if (groupCountMatch) {
    let rows = getTable(groupCountMatch[3]);
    const whereM = groupCountMatch[4]?.match(/WHERE\s+(.+?)(?:\s+GROUP|\s+ORDER|\s+LIMIT|\s*$)/is);
    if (whereM) rows = applyWhere(rows, whereM[1], params);
    const groups: Record<string, number> = {};
    for (const row of rows) {
      const k = String(row[groupCountMatch[1]] ?? '');
      groups[k] = (groups[k] ?? 0) + 1;
    }
    return Object.entries(groups).map(([k, v]) => ({ [groupCountMatch[1]]: k, [groupCountMatch[2]]: v }));
  }

  // Standard SELECT
  const fromMatch = sql.match(/FROM\s+(\w+)(?:\s+(\w+))?\s*/i);
  if (!fromMatch) return [];

  const mainTable = fromMatch[1];
  const mainAlias = fromMatch[2] ?? mainTable;
  let rows = getTable(mainTable).map(r => prefixRow(r, mainAlias));

  // JOINs
  const joinMatches = [...sql.matchAll(/(LEFT\s+|INNER\s+)?JOIN\s+(\w+)(?:\s+(\w+))?\s+ON\s+([\w.]+)\s*=\s*([\w.]+)/gi)];
  let joinParamIdx = 0;
  for (const jm of joinMatches) {
    const isLeft    = /LEFT/i.test(jm[1] ?? '');
    const joinTable = jm[2];
    const joinAlias = jm[3] ?? joinTable;
    const leftKey   = jm[4];
    const rightKey  = jm[5];
    const joinRows  = getTable(joinTable).map(r => prefixRow(r, joinAlias));

    if (isLeft) {
      rows = rows.map(lr => {
        const matches = joinRows.filter(jr =>
          String(resolveDotKey(lr, leftKey)) === String(resolveDotKey(jr, rightKey))
        );
        if (matches.length === 0) {
          const nullRight: Row = {};
          const sampleKeys = Object.keys(getTable(joinTable)[0] ?? {});
          for (const k of sampleKeys) { nullRight[k] = null; nullRight[`${joinAlias}.${k}`] = null; }
          return { ...lr, ...nullRight };
        }
        return { ...lr, ...matches[0] };
      });
    } else {
      rows = rows.flatMap(lr => {
        const matches = joinRows.filter(jr =>
          String(resolveDotKey(lr, leftKey)) === String(resolveDotKey(jr, rightKey))
        );
        return matches.map(jr => ({ ...lr, ...jr }));
      });
    }
  }

  // WHERE
  const whereMatch = sql.match(/WHERE\s+(.+?)(?:\s+ORDER\s+BY|\s+GROUP\s+BY|\s+LIMIT|\s*$)/is);
  if (whereMatch) rows = applyWhere(rows, whereMatch[1], params.slice(joinParamIdx));

  // ORDER BY
  const orderMatch = sql.match(/ORDER\s+BY\s+(.+?)(?:\s+LIMIT|\s*$)/is);
  if (orderMatch) {
    const orderParts = orderMatch[1].split(',').map(p => p.trim());
    rows = [...rows].sort((a, b) => {
      for (const part of orderParts) {
        const [col, dir] = part.split(/\s+/);
        const av = a[col] ?? a[`${mainAlias}.${col}`];
        const bv = b[col] ?? b[`${mainAlias}.${col}`];
        const cmp = String(av ?? '') < String(bv ?? '') ? -1 : String(av ?? '') > String(bv ?? '') ? 1 : 0;
        if (cmp !== 0) return dir?.toUpperCase() === 'DESC' ? -cmp : cmp;
      }
      return 0;
    });
  }

  // LIMIT
  const limitMatch = sql.match(/LIMIT\s+(\d+)/i);
  if (limitMatch) rows = rows.slice(0, Number(limitMatch[1]));

  // SELECT columns
  const colsMatch = sql.match(/^SELECT\s+([\s\S]+?)\s+FROM/i);
  if (colsMatch && colsMatch[1].trim() !== '*') {
    const cols = colsMatch[1].split(',').map(c => c.trim());
    rows = rows.map(row => {
      const result: Row = {};
      for (const col of cols) {
        if (col === '*') { Object.assign(result, stripPrefixes(row)); continue; }
        if (col.includes('.*')) {
          const alias = col.replace('.*', '');
          for (const [k, v] of Object.entries(row)) {
            if (k.startsWith(alias + '.') || !k.includes('.')) result[k.replace(alias + '.', '')] = v;
          }
          continue;
        }
        const asMatch = col.match(/^(.+?)\s+(?:as|AS)\s+(\w+)$/);
        if (asMatch) {
          result[asMatch[2].trim()] = resolveDotKey(row, asMatch[1].trim()) ?? row[asMatch[1].trim()];
        } else {
          result[col.split('.').pop()!] = resolveDotKey(row, col) ?? row[col];
        }
      }
      return result;
    });
  } else {
    rows = rows.map(stripPrefixes);
  }

  if (/SELECT\s+DISTINCT/i.test(sql)) {
    const seen = new Set<string>();
    rows = rows.filter(row => {
      const key = JSON.stringify(row);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  return rows;
}

function prefixRow(row: Row, prefix: string): Row {
  const result: Row = {};
  for (const [k, v] of Object.entries(row)) {
    result[`${prefix}.${k}`] = v;
    result[k] = v;
  }
  return result;
}

function stripPrefixes(row: Row): Row {
  const result: Row = {};
  for (const [k, v] of Object.entries(row)) {
    const shortKey = k.includes('.') ? k.split('.').pop()! : k;
    if (!(shortKey in result)) result[shortKey] = v;
  }
  return result;
}

function resolveDotKey(row: Row, key: string): any {
  if (key in row) return row[key];
  if (key.includes('.')) {
    const [, col] = key.split('.');
    return row[key] ?? row[col];
  }
  return undefined;
}

function executeMultiple(sql: string, params: any[] = []): void {
  const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);
  for (const stmt of statements) {
    try { executeStatement(stmt, params); }
    catch (e) { console.warn('[WebDB] Statement error:', stmt.substring(0, 80), e); }
  }
}

// ─── Migrations versionadas (paridade com db.native.ts) ──────────────────────

async function runMigrationsWeb(currentVersion: number): Promise<void> {
  if (currentVersion < 1) {
    executeMultiple(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, why_anchor TEXT NOT NULL,
        why_anchor_image_uri TEXT, current_phase INTEGER DEFAULT 1,
        onboarding_completed INTEGER DEFAULT 0, created_at TEXT, updated_at TEXT
      );
      CREATE TABLE IF NOT EXISTS habits (
        id TEXT PRIMARY KEY, user_id TEXT NOT NULL, title TEXT NOT NULL,
        description TEXT, category TEXT DEFAULT 'custom', phase INTEGER DEFAULT 1,
        tool_type TEXT DEFAULT 'custom', xp_reward INTEGER DEFAULT 10,
        streak_count INTEGER DEFAULT 0, best_streak INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1, duration_minutes INTEGER, order_index INTEGER DEFAULT 0,
        created_at TEXT, updated_at TEXT
      );
      CREATE TABLE IF NOT EXISTS routines (
        id TEXT PRIMARY KEY, user_id TEXT NOT NULL, title TEXT NOT NULL,
        description TEXT, type TEXT DEFAULT 'custom', phase INTEGER DEFAULT 1,
        trigger_time TEXT, days_of_week TEXT DEFAULT '[1,2,3,4,5,6,7]',
        is_active INTEGER DEFAULT 1, xp_bonus INTEGER DEFAULT 20,
        order_index INTEGER DEFAULT 0, created_at TEXT, updated_at TEXT
      );
      CREATE TABLE IF NOT EXISTS routine_habits (
        id TEXT PRIMARY KEY, routine_id TEXT NOT NULL, habit_id TEXT NOT NULL,
        order_index INTEGER DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS habit_logs (
        id TEXT PRIMARY KEY, habit_id TEXT NOT NULL, user_id TEXT NOT NULL,
        completed_at TEXT, date TEXT NOT NULL, duration_actual INTEGER,
        mood_after INTEGER, note TEXT, xp_earned INTEGER DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS time_entries (
        id TEXT PRIMARY KEY, user_id TEXT NOT NULL, habit_id TEXT,
        title TEXT NOT NULL, category TEXT DEFAULT 'productive',
        started_at TEXT NOT NULL, ended_at TEXT, duration_seconds INTEGER,
        date TEXT NOT NULL, notes TEXT
      );
    `);
  }

  if (currentVersion < 2) {
    executeMultiple(`
      CREATE TABLE IF NOT EXISTS user_xp (
        id TEXT PRIMARY KEY, user_id TEXT NOT NULL,
        total_xp INTEGER DEFAULT 0, level INTEGER DEFAULT 1,
        current_level_xp INTEGER DEFAULT 0, momentum_score REAL DEFAULT 0.0,
        longest_streak INTEGER DEFAULT 0, current_overall_streak INTEGER DEFAULT 0,
        updated_at TEXT
      );
      CREATE TABLE IF NOT EXISTS xp_history (
        id TEXT PRIMARY KEY, user_id TEXT NOT NULL, xp_amount INTEGER NOT NULL,
        source TEXT NOT NULL, source_id TEXT, description TEXT,
        date TEXT NOT NULL, created_at TEXT
      );
      CREATE TABLE IF NOT EXISTS missions (
        id TEXT PRIMARY KEY, user_id TEXT NOT NULL, title TEXT NOT NULL,
        description TEXT NOT NULL, type TEXT NOT NULL, status TEXT DEFAULT 'active',
        xp_reward INTEGER NOT NULL, requirement_type TEXT NOT NULL,
        requirement_value INTEGER NOT NULL, requirement_current INTEGER DEFAULT 0,
        phase_required INTEGER DEFAULT 1, expires_at TEXT, completed_at TEXT, created_at TEXT
      );
      CREATE TABLE IF NOT EXISTS rewards (
        id TEXT PRIMARY KEY, user_id TEXT NOT NULL, title TEXT NOT NULL,
        description TEXT, image_uri TEXT, xp_cost INTEGER,
        is_unlocked INTEGER DEFAULT 0, unlocked_at TEXT, type TEXT DEFAULT 'custom', created_at TEXT
      );
    `);
  }

  if (currentVersion < 3) {
    executeMultiple(`
      CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY, user_id TEXT NOT NULL, title TEXT, content TEXT NOT NULL,
        type TEXT DEFAULT 'note', tags TEXT DEFAULT '[]', phase INTEGER,
        is_pinned INTEGER DEFAULT 0, image_uris TEXT DEFAULT '[]', created_at TEXT, updated_at TEXT
      );
      CREATE TABLE IF NOT EXISTS priming_items (
        id TEXT PRIMARY KEY, user_id TEXT NOT NULL, title TEXT NOT NULL,
        image_uri TEXT NOT NULL, affirmation TEXT, category TEXT DEFAULT 'goal',
        order_index INTEGER DEFAULT 0, is_active INTEGER DEFAULT 1, created_at TEXT
      );
      CREATE TABLE IF NOT EXISTS personal_metrics (
        id TEXT PRIMARY KEY, user_id TEXT NOT NULL, metric_name TEXT NOT NULL,
        metric_type TEXT DEFAULT 'scale', unit TEXT,
        is_active INTEGER DEFAULT 1, order_index INTEGER DEFAULT 0, created_at TEXT
      );
      CREATE TABLE IF NOT EXISTS metric_entries (
        id TEXT PRIMARY KEY, metric_id TEXT NOT NULL, user_id TEXT NOT NULL,
        value TEXT NOT NULL, date TEXT NOT NULL, notes TEXT, created_at TEXT
      );
    `);
  }

  if (currentVersion < 4) {
    executeMultiple(`
      CREATE TABLE IF NOT EXISTS goals (
        id TEXT PRIMARY KEY, user_id TEXT NOT NULL, title TEXT NOT NULL,
        why TEXT DEFAULT '', deadline TEXT, status TEXT DEFAULT 'active',
        color TEXT, order_index INTEGER DEFAULT 0, completed_at TEXT,
        created_at TEXT, updated_at TEXT
      );
      CREATE TABLE IF NOT EXISTS sub_goals (
        id TEXT PRIMARY KEY, goal_id TEXT NOT NULL, user_id TEXT NOT NULL,
        title TEXT NOT NULL, is_completed INTEGER DEFAULT 0,
        completed_at TEXT, order_index INTEGER DEFAULT 0, created_at TEXT
      );
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY, user_id TEXT NOT NULL, goal_id TEXT,
        title TEXT NOT NULL, description TEXT, reward TEXT, reward_unlocked INTEGER DEFAULT 0,
        scheduled_date TEXT, scheduled_hour TEXT, is_completed INTEGER DEFAULT 0,
        completed_at TEXT, status TEXT DEFAULT 'pending', order_index INTEGER DEFAULT 0,
        created_at TEXT, updated_at TEXT
      );
      CREATE TABLE IF NOT EXISTS agenda_events (
        id TEXT PRIMARY KEY, user_id TEXT NOT NULL, task_id TEXT, routine_id TEXT,
        title TEXT NOT NULL, description TEXT, start_time TEXT NOT NULL,
        end_time TEXT, date TEXT NOT NULL, type TEXT DEFAULT 'custom',
        color TEXT, is_completed INTEGER DEFAULT 0, created_at TEXT, updated_at TEXT
      );
    `);
    executeMultiple(`
      ALTER TABLE notes ADD COLUMN linked_goal_id TEXT;
      ALTER TABLE notes ADD COLUMN linked_task_id TEXT;
      ALTER TABLE notes ADD COLUMN linked_event_id TEXT;
      ALTER TABLE users ADD COLUMN profile_image_uri TEXT;
      ALTER TABLE users ADD COLUMN dream_board_image_uri TEXT;
    `);
  }

  if (currentVersion < 5) {
    executeMultiple(`
      CREATE TABLE IF NOT EXISTS objectives (
        id TEXT PRIMARY KEY, user_id TEXT NOT NULL, title TEXT NOT NULL,
        description TEXT, why TEXT DEFAULT '', status TEXT DEFAULT 'active',
        color TEXT, order_index INTEGER DEFAULT 0, completed_at TEXT,
        created_at TEXT, updated_at TEXT
      );
      CREATE TABLE IF NOT EXISTS smarter_goals (
        id TEXT PRIMARY KEY, user_id TEXT NOT NULL, objective_id TEXT,
        title TEXT NOT NULL, specific TEXT DEFAULT '', metric TEXT DEFAULT '',
        baseline REAL DEFAULT 0, target REAL DEFAULT 0, metric_unit TEXT DEFAULT '',
        achievable TEXT DEFAULT '', relevant TEXT DEFAULT '',
        deadline TEXT NOT NULL, emotional TEXT DEFAULT '',
        review_frequency TEXT DEFAULT 'weekly', current_value REAL DEFAULT 0,
        status TEXT DEFAULT 'active', color TEXT, order_index INTEGER DEFAULT 0,
        completed_at TEXT, next_review_at TEXT, created_at TEXT, updated_at TEXT
      );
      CREATE TABLE IF NOT EXISTS goal_checkpoints (
        id TEXT PRIMARY KEY, goal_id TEXT NOT NULL, user_id TEXT NOT NULL,
        scheduled_date TEXT NOT NULL, notes TEXT, value_at_checkpoint REAL,
        is_completed INTEGER DEFAULT 0, completed_at TEXT, created_at TEXT
      );
      CREATE TABLE IF NOT EXISTS finance_accounts (
        id TEXT PRIMARY KEY, user_id TEXT NOT NULL, name TEXT NOT NULL,
        type TEXT DEFAULT 'checking', balance REAL DEFAULT 0,
        currency TEXT DEFAULT 'BRL', color TEXT,
        is_active INTEGER DEFAULT 1, created_at TEXT, updated_at TEXT
      );
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY, user_id TEXT NOT NULL, account_id TEXT,
        title TEXT NOT NULL, amount REAL NOT NULL, type TEXT NOT NULL,
        category TEXT DEFAULT 'outros', payment_method TEXT,
        date TEXT NOT NULL, due_date TEXT, status TEXT DEFAULT 'paid',
        description TEXT, is_recurring INTEGER DEFAULT 0,
        recurring_frequency TEXT, tags TEXT DEFAULT '[]',
        created_at TEXT, updated_at TEXT
      );
      CREATE TABLE IF NOT EXISTS finance_categories (
        id TEXT PRIMARY KEY, user_id TEXT NOT NULL, name TEXT NOT NULL,
        type TEXT NOT NULL, color TEXT DEFAULT '#8B6F47',
        icon TEXT DEFAULT 'cash', is_default INTEGER DEFAULT 0, created_at TEXT
      );
      CREATE TABLE IF NOT EXISTS study_subjects (
        id TEXT PRIMARY KEY, user_id TEXT NOT NULL, title TEXT NOT NULL,
        description TEXT, color TEXT DEFAULT '#4A7A9B',
        total_minutes INTEGER DEFAULT 0, order_index INTEGER DEFAULT 0,
        linked_goal_id TEXT, is_active INTEGER DEFAULT 1, created_at TEXT, updated_at TEXT
      );
      CREATE TABLE IF NOT EXISTS study_sessions (
        id TEXT PRIMARY KEY, user_id TEXT NOT NULL, subject_id TEXT NOT NULL,
        title TEXT, planned_minutes INTEGER DEFAULT 25, actual_minutes INTEGER DEFAULT 0,
        pomodoro_count INTEGER DEFAULT 0, date TEXT NOT NULL,
        started_at TEXT, ended_at TEXT, notes TEXT, linked_note_id TEXT, created_at TEXT
      );
      CREATE TABLE IF NOT EXISTS study_notes (
        id TEXT PRIMARY KEY, user_id TEXT NOT NULL, subject_id TEXT NOT NULL,
        session_id TEXT, title TEXT, content TEXT NOT NULL,
        type TEXT DEFAULT 'note', media_uri TEXT, tags TEXT DEFAULT '[]',
        created_at TEXT, updated_at TEXT
      );
      CREATE TABLE IF NOT EXISTS gratitude_entries (
        id TEXT PRIMARY KEY, user_id TEXT NOT NULL, date TEXT NOT NULL,
        gratitudes TEXT DEFAULT '[]', emotion TEXT, highlight TEXT,
        linked_note_id TEXT, created_at TEXT, updated_at TEXT
      );
      CREATE TABLE IF NOT EXISTS cookie_jar (
        id TEXT PRIMARY KEY, user_id TEXT NOT NULL, title TEXT NOT NULL,
        description TEXT NOT NULL, date TEXT NOT NULL, emotion_score INTEGER,
        image_uri TEXT, tags TEXT DEFAULT '[]', is_pinned INTEGER DEFAULT 0,
        created_at TEXT, updated_at TEXT
      );
    `);
    executeMultiple(`
      ALTER TABLE habits ADD COLUMN trigger TEXT;
      ALTER TABLE habits ADD COLUMN cue TEXT;
      ALTER TABLE habits ADD COLUMN desire TEXT;
      ALTER TABLE habits ADD COLUMN implementation TEXT;
      ALTER TABLE habits ADD COLUMN two_minute_version TEXT;
      ALTER TABLE habits ADD COLUMN reward TEXT;
      ALTER TABLE habits ADD COLUMN related_goal_id TEXT;
      ALTER TABLE habits ADD COLUMN never_miss_count INTEGER DEFAULT 0;
      ALTER TABLE habits ADD COLUMN notification_id TEXT;
      ALTER TABLE habits ADD COLUMN notification_hour TEXT;
      ALTER TABLE tasks ADD COLUMN is_pareto INTEGER DEFAULT 0;
      ALTER TABLE tasks ADD COLUMN difficulty_level INTEGER;
      ALTER TABLE tasks ADD COLUMN energy_required TEXT;
      ALTER TABLE tasks ADD COLUMN smarter_goal_id TEXT;
      ALTER TABLE tasks ADD COLUMN reward_points INTEGER;
      ALTER TABLE tasks ADD COLUMN reward_type TEXT;
      ALTER TABLE habit_logs ADD COLUMN is_missed INTEGER DEFAULT 0;
      ALTER TABLE habit_logs ADD COLUMN missed_reason TEXT;
      ALTER TABLE notes ADD COLUMN linked_study_subject_id TEXT;
      ALTER TABLE notes ADD COLUMN linked_gratitude_id TEXT;
    `);
  }

  if (currentVersion < 6) {
    executeMultiple(`
      CREATE TABLE IF NOT EXISTS brain_nodes (
        id TEXT PRIMARY KEY, user_id TEXT NOT NULL,
        type TEXT DEFAULT 'thought', title TEXT NOT NULL,
        content TEXT, tags TEXT DEFAULT '[]',
        linked_entity_id TEXT, linked_entity_type TEXT,
        is_pinned INTEGER DEFAULT 0, color TEXT,
        created_at TEXT, updated_at TEXT
      );
      CREATE TABLE IF NOT EXISTS node_relations (
        id TEXT PRIMARY KEY, user_id TEXT NOT NULL,
        source_id TEXT NOT NULL, target_id TEXT NOT NULL,
        relation_type TEXT DEFAULT 'related_to', note TEXT, created_at TEXT
      );
    `);
  }

  if (currentVersion < 7) {
    executeMultiple(`ALTER TABLE tasks ADD COLUMN routine_id TEXT;`);
  }

  if (currentVersion < 8) {
    executeMultiple(`ALTER TABLE tasks ADD COLUMN habit_id TEXT;`);
  }
}

// ─── Web Database Adapter ─────────────────────────────────────────────────────

export interface WebDatabaseAdapter {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, params?: any[]): Promise<void>;
  getAllAsync<T = Row>(sql: string, params?: any[]): Promise<T[]>;
  getFirstAsync<T = Row>(sql: string, params?: any[]): Promise<T | null>;
}

let _dbInitialized = false;
let _initPromise: Promise<void> | null = null;

async function initializeWebDb(): Promise<void> {
  if (_dbInitialized) return;
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    await loadAllTables();

    // Verifica versão atual das migrations e aplica as pendentes
    const currentVersion = await getAppliedVersion();
    await runMigrationsWeb(currentVersion);

    // Determina a versão máxima aplicada
    const MAX_VERSION = 8;
    if (currentVersion < MAX_VERSION) {
      await setAppliedVersion(MAX_VERSION);
    }

    _dbInitialized = true;
  })();

  return _initPromise;
}

export function createWebDatabase(): WebDatabaseAdapter {
  return {
    async execAsync(sql: string): Promise<void> {
      await initializeWebDb();
      executeMultiple(sql);
    },

    async runAsync(sql: string, params: any[] = []): Promise<void> {
      await initializeWebDb();
      executeStatement(sql, params);
    },

    async getAllAsync<T = Row>(sql: string, params: any[] = []): Promise<T[]> {
      await initializeWebDb();
      return executeSelect(sql, params) as T[];
    },

    async getFirstAsync<T = Row>(sql: string, params: any[] = []): Promise<T | null> {
      await initializeWebDb();
      const rows = executeSelect(sql, params);
      return (rows[0] as T) ?? null;
    },
  };
}
