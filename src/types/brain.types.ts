// ─── MindOS — Segunda Mente: Grafo de Conhecimento ───────────────────────────

export type NodeType =
  | 'thought'     // pensamento livre, captura rápida
  | 'note'        // nota estruturada
  | 'reflection'  // reflexão diária
  | 'learning'    // aprendizado / insight
  | 'person'      // pessoa (nome, relação)
  | 'concept'     // conceito, ideia abstrata
  | 'reference'   // livro, artigo, link
  | 'question'    // pergunta em aberto
  | 'goal_link'   // referência a meta SMARTER
  | 'task_link'   // referência a tarefa
  | 'habit_link'; // referência a hábito

export type RelationType =
  | 'related_to'      // relacionado a
  | 'transformed_into' // transformado em (ex: pensamento → tarefa)
  | 'mentions'        // menciona
  | 'contradicts'     // contradiz
  | 'supports'        // apoia / reforça
  | 'inspired_by'     // inspirado em
  | 'part_of'         // parte de
  | 'leads_to';       // leva a

export interface BrainNode {
  id: string;
  userId: string;
  type: NodeType;
  title: string;
  content?: string;
  tags: string[];
  // Referência externa (quando node aponta para outro módulo)
  linkedEntityId?: string;   // id da meta, tarefa ou hábito
  linkedEntityType?: 'smarter_goal' | 'task' | 'habit' | 'note';
  isPinned: boolean;
  color?: string;            // cor customizada do nó no grafo
  // Grafo — preenchido via join na query de vizinhos
  relations?: NodeRelation[];
  neighbors?: BrainNode[];
  createdAt: string;
  updatedAt: string;
}

export interface NodeRelation {
  id: string;
  userId: string;
  sourceId: string;
  targetId: string;
  relationType: RelationType;
  note?: string;     // nota opcional sobre a relação
  createdAt: string;
  // Preenchido via join
  sourceNode?: Pick<BrainNode, 'id' | 'title' | 'type'>;
  targetNode?: Pick<BrainNode, 'id' | 'title' | 'type'>;
}

// Sugestão de link ao criar um nó
export interface LinkSuggestion {
  node: BrainNode;
  score: number;        // relevância 0-1
  matchedTerms: string[];
}

// Resultado da busca semântica (full-text por palavras-chave)
export interface SearchResult {
  node: BrainNode;
  relevance: number;
  snippet: string;
}

// Configuração visual do grafo (para o renderer)
export interface GraphConfig {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface GraphNode {
  id: string;
  label: string;
  type: NodeType;
  color: string;
  size: number;      // proporcional ao número de relações
  isPinned: boolean;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  type: RelationType;
}
