import { getDatabase } from './db';
import { generateId } from '../../utils/dateHelpers';
import type {
  BrainNode, NodeRelation, NodeType, RelationType,
  LinkSuggestion, SearchResult, GraphConfig,
} from '../../types/brain.types';

// ─── Cores padrão por tipo de nó ─────────────────────────────────────────────
export const NODE_TYPE_COLOR: Record<NodeType, string> = {
  thought:    '#8B6F47', // marrom — captura livre
  note:       '#4A7A9B', // azul   — nota estruturada
  reflection: '#7B5EA7', // roxo   — reflexão
  learning:   '#4A9B6F', // verde  — aprendizado
  person:     '#C4882A', // laranja — pessoa
  concept:    '#B85C45', // vermelho — conceito
  reference:  '#5A8A5A', // verde escuro — referência
  question:   '#D4A843', // dourado — pergunta
  goal_link:  '#9400D3', // violeta — meta
  task_link:  '#1E90FF', // azul — tarefa
  habit_link: '#DC143C', // vermelho — hábito
};

export const NODE_TYPE_LABEL: Record<NodeType, string> = {
  thought:    'Pensamento',
  note:       'Nota',
  reflection: 'Reflexão',
  learning:   'Aprendizado',
  person:     'Pessoa',
  concept:    'Conceito',
  reference:  'Referência',
  question:   'Pergunta',
  goal_link:  'Meta',
  task_link:  'Tarefa',
  habit_link: 'Hábito',
};

export const RELATION_TYPE_LABEL: Record<RelationType, string> = {
  related_to:       'Relacionado a',
  transformed_into: 'Transformado em',
  mentions:         'Menciona',
  contradicts:      'Contradiz',
  supports:         'Apoia',
  inspired_by:      'Inspirado em',
  part_of:          'Parte de',
  leads_to:         'Leva a',
};

// ─── Parsers ──────────────────────────────────────────────────────────────────
function parseNode(r: any): BrainNode {
  return {
    id: r.id,
    userId: r.user_id,
    type: r.type as NodeType,
    title: r.title,
    content: r.content ?? undefined,
    tags: JSON.parse(r.tags ?? '[]'),
    linkedEntityId: r.linked_entity_id ?? undefined,
    linkedEntityType: r.linked_entity_type ?? undefined,
    isPinned: Boolean(r.is_pinned),
    color: r.color ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function parseRelation(r: any): NodeRelation {
  return {
    id: r.id,
    userId: r.user_id,
    sourceId: r.source_id,
    targetId: r.target_id,
    relationType: r.relation_type as RelationType,
    note: r.note ?? undefined,
    createdAt: r.created_at,
  };
}

// ─── Repositório ──────────────────────────────────────────────────────────────
export const BrainRepository = {

  // ── CRUD Nós ──────────────────────────────────────────────────────────────

  async createNode(data: Omit<BrainNode, 'id' | 'createdAt' | 'updatedAt' | 'relations' | 'neighbors'>): Promise<BrainNode> {
    const db = await getDatabase();
    const id = generateId();
    const now = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO brain_nodes
         (id, user_id, type, title, content, tags, linked_entity_id, linked_entity_type, is_pinned, color, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, data.userId, data.type, data.title,
        data.content ?? null,
        JSON.stringify(data.tags ?? []),
        data.linkedEntityId ?? null,
        data.linkedEntityType ?? null,
        data.isPinned ? 1 : 0,
        data.color ?? null,
        now, now,
      ]
    );

    return { ...data, id, createdAt: now, updatedAt: now };
  },

  async getByUser(userId: string, type?: NodeType, limit = 100): Promise<BrainNode[]> {
    const db = await getDatabase();
    const params: any[] = [userId];
    let q = 'SELECT * FROM brain_nodes WHERE user_id = ?';
    if (type) { q += ' AND type = ?'; params.push(type); }
    q += ' ORDER BY is_pinned DESC, updated_at DESC LIMIT ?';
    params.push(limit);
    const rows = await db.getAllAsync<any>(q, params);
    return rows.map(parseNode);
  },

  async getById(id: string): Promise<BrainNode | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<any>('SELECT * FROM brain_nodes WHERE id = ?', [id]);
    return row ? parseNode(row) : null;
  },

  async updateNode(id: string, data: Partial<Pick<BrainNode, 'title' | 'content' | 'tags' | 'isPinned' | 'color' | 'type'>>): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    const updates: string[] = [];
    const values: any[] = [];

    if (data.title !== undefined) { updates.push('title = ?'); values.push(data.title); }
    if (data.content !== undefined) { updates.push('content = ?'); values.push(data.content); }
    if (data.tags !== undefined) { updates.push('tags = ?'); values.push(JSON.stringify(data.tags)); }
    if (data.isPinned !== undefined) { updates.push('is_pinned = ?'); values.push(data.isPinned ? 1 : 0); }
    if (data.color !== undefined) { updates.push('color = ?'); values.push(data.color); }
    if (data.type !== undefined) { updates.push('type = ?'); values.push(data.type); }

    if (updates.length === 0) return;
    updates.push('updated_at = ?');
    values.push(now, id);

    await db.runAsync(`UPDATE brain_nodes SET ${updates.join(', ')} WHERE id = ?`, values);
  },

  async deleteNode(id: string): Promise<void> {
    const db = await getDatabase();
    // ON DELETE CASCADE cuida das relações
    await db.runAsync('DELETE FROM brain_nodes WHERE id = ?', [id]);
  },

  // ── Relações ──────────────────────────────────────────────────────────────

  async createRelation(data: Omit<NodeRelation, 'id' | 'createdAt' | 'sourceNode' | 'targetNode'>): Promise<NodeRelation> {
    const db = await getDatabase();
    const id = generateId();
    const now = new Date().toISOString();

    await db.runAsync(
      `INSERT OR IGNORE INTO node_relations
         (id, user_id, source_id, target_id, relation_type, note, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, data.userId, data.sourceId, data.targetId, data.relationType, data.note ?? null, now]
    );

    return { ...data, id, createdAt: now };
  },

  async deleteRelation(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM node_relations WHERE id = ?', [id]);
  },

  async getRelationsOfNode(nodeId: string): Promise<NodeRelation[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      `SELECT * FROM node_relations WHERE source_id = ? OR target_id = ? ORDER BY created_at DESC`,
      [nodeId, nodeId]
    );
    return rows.map(parseRelation);
  },

  // ── Grafo: nó + vizinhos de 1 grau ───────────────────────────────────────

  async getNodeWithNeighbors(nodeId: string): Promise<BrainNode | null> {
    const db = await getDatabase();
    const node = await BrainRepository.getById(nodeId);
    if (!node) return null;

    const relations = await BrainRepository.getRelationsOfNode(nodeId);

    // Coleta ids únicos de vizinhos
    const neighborIds = [...new Set(
      relations.flatMap(r => [r.sourceId, r.targetId]).filter(id => id !== nodeId)
    )];

    const neighbors: BrainNode[] = [];
    for (const nid of neighborIds) {
      const n = await BrainRepository.getById(nid);
      if (n) neighbors.push(n);
    }

    // Enriquece relações com nós resumidos
    const enrichedRelations: NodeRelation[] = relations.map(r => ({
      ...r,
      sourceNode: neighbors.find(n => n.id === r.sourceId) ?? { id: node.id, title: node.title, type: node.type },
      targetNode: neighbors.find(n => n.id === r.targetId) ?? { id: node.id, title: node.title, type: node.type },
    }));

    return { ...node, relations: enrichedRelations, neighbors };
  },

  // ── Grafo completo do usuário ─────────────────────────────────────────────

  async getFullGraph(userId: string, limit = 60): Promise<GraphConfig> {
    const db = await getDatabase();

    const nodeRows = await db.getAllAsync<any>(
      `SELECT n.*, COUNT(r.id) as relation_count
       FROM brain_nodes n
       LEFT JOIN node_relations r ON r.source_id = n.id OR r.target_id = n.id
       WHERE n.user_id = ?
       GROUP BY n.id
       ORDER BY relation_count DESC, n.updated_at DESC
       LIMIT ?`,
      [userId, limit]
    );

    const relRows = await db.getAllAsync<any>(
      `SELECT r.* FROM node_relations r
       INNER JOIN brain_nodes n ON n.id = r.source_id
       WHERE n.user_id = ?`,
      [userId]
    );

    const nodeIds = new Set(nodeRows.map((r: any) => r.id));

    const graphNodes: GraphConfig['nodes'] = nodeRows.map((r: any) => ({
      id: r.id,
      label: r.title.length > 30 ? r.title.substring(0, 30) + '…' : r.title,
      type: r.type as NodeType,
      color: r.color ?? NODE_TYPE_COLOR[r.type as NodeType] ?? '#8B6F47',
      size: Math.min(3 + (r.relation_count ?? 0) * 2, 20),
      isPinned: Boolean(r.is_pinned),
    }));

    // Filtra edges para incluir apenas nós presentes no grafo
    const graphEdges: GraphConfig['edges'] = relRows
      .filter((r: any) => nodeIds.has(r.source_id) && nodeIds.has(r.target_id))
      .map((r: any) => ({
        id: r.id,
        source: r.source_id,
        target: r.target_id,
        label: RELATION_TYPE_LABEL[r.relation_type as RelationType] ?? r.relation_type,
        type: r.relation_type as RelationType,
      }));

    return { nodes: graphNodes, edges: graphEdges };
  },

  // ── Busca semântica (full-text por palavras-chave) ────────────────────────

  async search(userId: string, query: string, limit = 20): Promise<SearchResult[]> {
    const db = await getDatabase();
    const terms = query.trim().toLowerCase().split(/\s+/).filter(t => t.length > 1);
    if (terms.length === 0) return [];

    // Busca por cada termo (OR) — ordena por relevância (quantos termos bate)
    const likeClauses = terms.map(() => `(LOWER(title) LIKE ? OR LOWER(content) LIKE ? OR LOWER(tags) LIKE ?)`).join(' OR ');
    const params: any[] = [];
    for (const t of terms) { params.push(`%${t}%`, `%${t}%`, `%${t}%`); }
    params.push(userId, limit * 3);

    const rows = await db.getAllAsync<any>(
      `SELECT * FROM brain_nodes WHERE (${likeClauses}) AND user_id = ?
       ORDER BY is_pinned DESC, updated_at DESC LIMIT ?`,
      params
    );

    // Calcula relevância e snippet
    const results: SearchResult[] = rows.map((r: any) => {
      const node = parseNode(r);
      const text = `${r.title} ${r.content ?? ''} ${r.tags}`.toLowerCase();
      const matchedTerms = terms.filter(t => text.includes(t));
      const relevance = matchedTerms.length / terms.length;

      // Extrai snippet ao redor do primeiro match
      const content = r.content ?? r.title;
      const firstMatchIdx = Math.max(0, content.toLowerCase().indexOf(matchedTerms[0] ?? '') - 40);
      const snippet = content.substring(firstMatchIdx, firstMatchIdx + 120).trim();

      return { node, relevance, snippet: firstMatchIdx > 0 ? '...' + snippet : snippet };
    });

    // Ordena por relevância decrescente
    return results.sort((a, b) => b.relevance - a.relevance).slice(0, limit);
  },

  // ── Sugestões de link ao criar um nó ─────────────────────────────────────

  async suggestLinks(userId: string, title: string, content?: string, excludeId?: string): Promise<LinkSuggestion[]> {
    const db = await getDatabase();
    const text = `${title} ${content ?? ''}`.toLowerCase();
    const words = text
      .split(/\s+/)
      .filter(w => w.length > 3)
      .map(w => w.replace(/[^a-záàâãéèêíóôõúüç]/g, ''));

    if (words.length === 0) return [];

    // Busca nós existentes que contenham palavras do novo nó
    const uniqueWords = [...new Set(words)].slice(0, 10);
    const likeClauses = uniqueWords.map(() => `(LOWER(title) LIKE ? OR LOWER(content) LIKE ?)`).join(' OR ');
    const params: any[] = [];
    for (const w of uniqueWords) { params.push(`%${w}%`, `%${w}%`); }
    params.push(userId);

    let q = `SELECT * FROM brain_nodes WHERE (${likeClauses}) AND user_id = ?`;
    if (excludeId) { q += ' AND id != ?'; params.push(excludeId); }
    q += ' ORDER BY updated_at DESC LIMIT 10';

    const rows = await db.getAllAsync<any>(q, params);

    return rows
      .map((r: any) => {
        const node = parseNode(r);
        const nodeText = `${r.title} ${r.content ?? ''}`.toLowerCase();
        const matchedTerms = uniqueWords.filter(w => nodeText.includes(w));
        const score = matchedTerms.length / uniqueWords.length;
        return { node, score, matchedTerms };
      })
      .filter(s => s.score > 0.1)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  },

  // ── Criação automática de nó a partir de outros módulos ──────────────────

  async createFromTask(userId: string, taskId: string, taskTitle: string): Promise<BrainNode> {
    return BrainRepository.createNode({
      userId,
      type: 'task_link',
      title: taskTitle,
      content: `Tarefa criada no sistema de tarefas.`,
      tags: ['tarefa'],
      linkedEntityId: taskId,
      linkedEntityType: 'task',
      isPinned: false,
    });
  },

  async createFromGoal(userId: string, goalId: string, goalTitle: string): Promise<BrainNode> {
    return BrainRepository.createNode({
      userId,
      type: 'goal_link',
      title: goalTitle,
      content: `Meta SMARTER vinculada ao grafo.`,
      tags: ['meta'],
      linkedEntityId: goalId,
      linkedEntityType: 'smarter_goal',
      isPinned: false,
    });
  },

  async createFromHabit(userId: string, habitId: string, habitTitle: string): Promise<BrainNode> {
    return BrainRepository.createNode({
      userId,
      type: 'habit_link',
      title: habitTitle,
      content: `Hábito vinculado ao grafo.`,
      tags: ['hábito'],
      linkedEntityId: habitId,
      linkedEntityType: 'habit',
      isPinned: false,
    });
  },

  // ── Estatísticas ──────────────────────────────────────────────────────────

  async getStats(userId: string): Promise<{
    totalNodes: number;
    totalRelations: number;
    byType: Partial<Record<NodeType, number>>;
    mostConnected: { id: string; title: string; count: number }[];
  }> {
    const db = await getDatabase();

    const total = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM brain_nodes WHERE user_id = ?', [userId]
    );
    const relations = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM node_relations r
       INNER JOIN brain_nodes n ON n.id = r.source_id WHERE n.user_id = ?`, [userId]
    );
    const byTypeRows = await db.getAllAsync<{ type: string; count: number }>(
      'SELECT type, COUNT(*) as count FROM brain_nodes WHERE user_id = ? GROUP BY type', [userId]
    );
    const mostConnectedRows = await db.getAllAsync<{ id: string; title: string; count: number }>(
      `SELECT n.id, n.title, COUNT(r.id) as count
       FROM brain_nodes n
       LEFT JOIN node_relations r ON r.source_id = n.id OR r.target_id = n.id
       WHERE n.user_id = ?
       GROUP BY n.id ORDER BY count DESC LIMIT 5`,
      [userId]
    );

    const byType: Partial<Record<NodeType, number>> = {};
    for (const row of byTypeRows) { byType[row.type as NodeType] = row.count; }

    return {
      totalNodes: total?.count ?? 0,
      totalRelations: relations?.count ?? 0,
      byType,
      mostConnected: mostConnectedRows,
    };
  },
};
