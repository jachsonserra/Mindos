import { create } from 'zustand';
import {
  BrainRepository,
} from '../services/database/brainRepository';
import type {
  BrainNode, NodeRelation, NodeType, RelationType,
  LinkSuggestion, SearchResult, GraphConfig,
} from '../types/brain.types';

interface BrainState {
  nodes: BrainNode[];
  graph: GraphConfig;
  searchResults: SearchResult[];
  suggestions: LinkSuggestion[];
  selectedNode: BrainNode | null;  // nó em detalhe (com vizinhos)
  stats: {
    totalNodes: number;
    totalRelations: number;
    byType: Partial<Record<NodeType, number>>;
    mostConnected: { id: string; title: string; count: number }[];
  } | null;
  isLoading: boolean;
  isGraphLoading: boolean;

  // CRUD nós
  loadData: (userId: string) => Promise<void>;
  createNode: (data: Omit<BrainNode, 'id' | 'createdAt' | 'updatedAt' | 'relations' | 'neighbors'>) => Promise<BrainNode>;
  updateNode: (id: string, data: Partial<Pick<BrainNode, 'title' | 'content' | 'tags' | 'isPinned' | 'color' | 'type'>>) => Promise<void>;
  deleteNode: (id: string) => Promise<void>;

  // Relações
  createRelation: (data: Omit<NodeRelation, 'id' | 'createdAt' | 'sourceNode' | 'targetNode'>) => Promise<NodeRelation>;
  deleteRelation: (id: string) => Promise<void>;

  // Grafo
  loadGraph: (userId: string) => Promise<void>;
  selectNode: (nodeId: string) => Promise<void>;
  clearSelectedNode: () => void;

  // Busca e sugestões
  search: (userId: string, query: string) => Promise<void>;
  clearSearch: () => void;
  loadSuggestions: (userId: string, title: string, content?: string, excludeId?: string) => Promise<void>;
  clearSuggestions: () => void;

  // Estatísticas
  loadStats: (userId: string) => Promise<void>;

  // Conversão de outros módulos
  createFromTask: (userId: string, taskId: string, taskTitle: string) => Promise<BrainNode>;
  createFromGoal: (userId: string, goalId: string, goalTitle: string) => Promise<BrainNode>;
  createFromHabit: (userId: string, habitId: string, habitTitle: string) => Promise<BrainNode>;
}

const emptyGraph: GraphConfig = { nodes: [], edges: [] };

export const useBrainStore = create<BrainState>((set, get) => ({
  nodes: [],
  graph: emptyGraph,
  searchResults: [],
  suggestions: [],
  selectedNode: null,
  stats: null,
  isLoading: false,
  isGraphLoading: false,

  loadData: async (userId) => {
    set({ isLoading: true });
    try {
      const nodes = await BrainRepository.getByUser(userId);
      set({ nodes });
    } catch (e) {
      console.error('[BrainStore] loadData:', e);
    } finally {
      set({ isLoading: false });
    }
  },

  createNode: async (data) => {
    const node = await BrainRepository.createNode(data);
    set(s => ({ nodes: [node, ...s.nodes] }));

    // Atualiza grafo se já foi carregado
    if (get().graph.nodes.length > 0) {
      await get().loadGraph(data.userId);
    }
    return node;
  },

  updateNode: async (id, data) => {
    await BrainRepository.updateNode(id, data);
    set(s => ({
      nodes: s.nodes.map(n => n.id === id ? { ...n, ...data } : n),
      selectedNode: s.selectedNode?.id === id ? { ...s.selectedNode!, ...data } : s.selectedNode,
    }));
  },

  deleteNode: async (id) => {
    const node = get().nodes.find(n => n.id === id);
    await BrainRepository.deleteNode(id);
    set(s => ({
      nodes: s.nodes.filter(n => n.id !== id),
      selectedNode: s.selectedNode?.id === id ? null : s.selectedNode,
      graph: {
        nodes: s.graph.nodes.filter(n => n.id !== id),
        edges: s.graph.edges.filter(e => e.source !== id && e.target !== id),
      },
    }));
  },

  createRelation: async (data) => {
    const relation = await BrainRepository.createRelation(data);
    // Recarrega o nó selecionado se for um dos envolvidos
    const { selectedNode } = get();
    if (selectedNode && (selectedNode.id === data.sourceId || selectedNode.id === data.targetId)) {
      await get().selectNode(selectedNode.id);
    }
    // Atualiza grafo
    if (get().graph.nodes.length > 0) {
      await get().loadGraph(data.userId);
    }
    return relation;
  },

  deleteRelation: async (id) => {
    await BrainRepository.deleteRelation(id);
    if (get().selectedNode) {
      const { selectedNode } = get();
      set(s => ({
        selectedNode: s.selectedNode
          ? {
              ...s.selectedNode,
              relations: (s.selectedNode.relations ?? []).filter(r => r.id !== id),
            }
          : null,
      }));
    }
  },

  loadGraph: async (userId) => {
    set({ isGraphLoading: true });
    try {
      const graph = await BrainRepository.getFullGraph(userId);
      set({ graph });
    } catch (e) {
      console.error('[BrainStore] loadGraph:', e);
    } finally {
      set({ isGraphLoading: false });
    }
  },

  selectNode: async (nodeId) => {
    set({ isLoading: true });
    try {
      const node = await BrainRepository.getNodeWithNeighbors(nodeId);
      set({ selectedNode: node });
    } catch (e) {
      console.error('[BrainStore] selectNode:', e);
    } finally {
      set({ isLoading: false });
    }
  },

  clearSelectedNode: () => set({ selectedNode: null }),

  search: async (userId, query) => {
    if (!query.trim()) { set({ searchResults: [] }); return; }
    const results = await BrainRepository.search(userId, query);
    set({ searchResults: results });
  },

  clearSearch: () => set({ searchResults: [] }),

  loadSuggestions: async (userId, title, content, excludeId) => {
    const suggestions = await BrainRepository.suggestLinks(userId, title, content, excludeId);
    set({ suggestions });
  },

  clearSuggestions: () => set({ suggestions: [] }),

  loadStats: async (userId) => {
    const stats = await BrainRepository.getStats(userId);
    set({ stats });
  },

  createFromTask: async (userId, taskId, taskTitle) => {
    const node = await BrainRepository.createFromTask(userId, taskId, taskTitle);
    set(s => ({ nodes: [node, ...s.nodes] }));
    return node;
  },

  createFromGoal: async (userId, goalId, goalTitle) => {
    const node = await BrainRepository.createFromGoal(userId, goalId, goalTitle);
    set(s => ({ nodes: [node, ...s.nodes] }));
    return node;
  },

  createFromHabit: async (userId, habitId, habitTitle) => {
    const node = await BrainRepository.createFromHabit(userId, habitId, habitTitle);
    set(s => ({ nodes: [node, ...s.nodes] }));
    return node;
  },
}));
