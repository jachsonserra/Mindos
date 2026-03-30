import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Modal, Alert, KeyboardAvoidingView, Platform,
  FlatList, ActivityIndicator, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { COLORS } from '../../src/utils/constants';
import { useBrainStore } from '../../src/stores/useBrainStore';
import { useUserStore } from '../../src/stores/useUserStore';
import { useTaskStore } from '../../src/stores/useTaskStore';
import { useSecondMindStore } from '../../src/stores/useSecondMindStore';
import {
  NODE_TYPE_COLOR, NODE_TYPE_LABEL, RELATION_TYPE_LABEL,
} from '../../src/services/database/brainRepository';
import type { BrainNode, NodeRelation, NodeType, RelationType } from '../../src/types/brain.types';

// ─── Tipos e constantes ───────────────────────────────────────────────────────

type MainTab = 'capture' | 'graph' | 'nodes' | 'priming';

const MAIN_TABS: { key: MainTab; label: string; icon: string }[] = [
  { key: 'capture', label: 'Captura', icon: 'flash' },
  { key: 'graph',   label: 'Grafo',   icon: 'git-network' },
  { key: 'nodes',   label: 'Nós',     icon: 'layers' },
  { key: 'priming', label: 'Priming', icon: 'images' },
];

const QUICK_TYPES: { type: NodeType; emoji: string }[] = [
  { type: 'thought',    emoji: '💭' },
  { type: 'note',       emoji: '📝' },
  { type: 'reflection', emoji: '🪞' },
  { type: 'learning',   emoji: '🧠' },
  { type: 'concept',    emoji: '💡' },
  { type: 'question',   emoji: '❓' },
  { type: 'person',     emoji: '👤' },
  { type: 'reference',  emoji: '📎' },
];

const TYPE_EMOJI: Partial<Record<NodeType, string>> = {
  thought: '💭', note: '📝', reflection: '🪞', learning: '🧠',
  concept: '💡', question: '❓', person: '👤', reference: '📎',
  goal_link: '🎯', task_link: '✅', habit_link: '🔁',
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

// ─── NodeCard ─────────────────────────────────────────────────────────────────

function NodeCard({
  node, onPress, compact = false,
}: { node: BrainNode; onPress: () => void; compact?: boolean }) {
  const color = NODE_TYPE_COLOR[node.type] ?? COLORS.primary;
  const emoji = TYPE_EMOJI[node.type] ?? '•';
  const label = NODE_TYPE_LABEL[node.type] ?? node.type;

  return (
    <TouchableOpacity style={[ndc.card, { borderLeftColor: color }]} onPress={onPress} activeOpacity={0.85}>
      <View style={ndc.topRow}>
        <View style={[ndc.typePill, { backgroundColor: `${color}20`, borderColor: `${color}40` }]}>
          <Text style={ndc.pillEmoji}>{emoji}</Text>
          <Text style={[ndc.pillLabel, { color }]}>{label}</Text>
        </View>
        {node.isPinned && <Ionicons name="pin" size={12} color={COLORS.textMuted} />}
      </View>
      <Text style={ndc.title} numberOfLines={2}>{node.title}</Text>
      {!compact && !!node.content && (
        <Text style={ndc.content} numberOfLines={2}>{node.content}</Text>
      )}
      <View style={ndc.footer}>
        {node.tags.length > 0 && (
          <Text style={ndc.tags} numberOfLines={1}>
            {node.tags.slice(0, 3).map(t => `#${t}`).join(' ')}
          </Text>
        )}
        <Text style={ndc.date}>{fmtDate(node.createdAt)}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── NodeModal (criar / editar) ───────────────────────────────────────────────

function NodeModal({
  visible, onClose, editNode,
}: { visible: boolean; onClose: () => void; editNode?: BrainNode | null }) {
  const { user } = useUserStore();
  const { createNode, updateNode, loadSuggestions, suggestions, clearSuggestions } = useBrainStore();

  const [type, setType]       = useState<NodeType>('thought');
  const [title, setTitle]     = useState('');
  const [content, setContent] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags]       = useState<string[]>([]);
  const [saving, setSaving]   = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (editNode) {
      setType(editNode.type);
      setTitle(editNode.title);
      setContent(editNode.content ?? '');
      setTags(editNode.tags);
    } else {
      setType('thought');
      setTitle('');
      setContent('');
      setTags([]);
    }
    clearSuggestions();
  }, [visible, editNode]);

  const debounceSuggestions = (t: string, c: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (!user?.id || (!t.trim() && !c.trim())) return;
      loadSuggestions(user.id, t, c, editNode?.id);
    }, 600);
  };

  const handleTitleChange = (v: string) => {
    setTitle(v);
    debounceSuggestions(v, content);
  };

  const handleContentChange = (v: string) => {
    setContent(v);
    debounceSuggestions(title, v);
  };

  const addTag = () => {
    const t = tagInput.trim().toLowerCase().replace(/\s+/g, '-');
    if (t && !tags.includes(t)) setTags(prev => [...prev, t]);
    setTagInput('');
  };

  const removeTag = (t: string) => setTags(prev => prev.filter(x => x !== t));

  const handleSave = async () => {
    if (!title.trim()) { Alert.alert('Atenção', 'O título é obrigatório.'); return; }
    if (!user?.id) return;
    setSaving(true);
    try {
      if (editNode) {
        await updateNode(editNode.id, { title: title.trim(), content: content.trim() || undefined, tags, type });
      } else {
        await createNode({ userId: user.id, type, title: title.trim(), content: content.trim() || undefined, tags, isPinned: false });
      }
      onClose();
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível salvar o nó.');
    } finally {
      setSaving(false);
    }
  };

  const accentColor = NODE_TYPE_COLOR[type] ?? COLORS.primary;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={nm.container} edges={['top', 'bottom']}>
          {/* Header */}
          <View style={[nm.header, { borderBottomColor: `${accentColor}30` }]}>
            <TouchableOpacity onPress={onClose}><Text style={nm.cancel}>Cancelar</Text></TouchableOpacity>
            <Text style={nm.headerTitle}>{editNode ? 'Editar Nó' : 'Novo Nó'}</Text>
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              {saving
                ? <ActivityIndicator size="small" color={accentColor} />
                : <Text style={[nm.save, { color: accentColor }]}>Salvar</Text>}
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={nm.form} keyboardShouldPersistTaps="handled">
            {/* Seletor de tipo */}
            <Text style={nm.sectionLabel}>TIPO</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {QUICK_TYPES.map(qt => {
                  const c = NODE_TYPE_COLOR[qt.type] ?? COLORS.primary;
                  const active = type === qt.type;
                  return (
                    <TouchableOpacity
                      key={qt.type}
                      style={[nm.typeChip, active && { backgroundColor: `${c}25`, borderColor: c }]}
                      onPress={() => setType(qt.type)}
                    >
                      <Text style={nm.typeEmoji}>{qt.emoji}</Text>
                      <Text style={[nm.typeLabel, active && { color: c }]}>
                        {NODE_TYPE_LABEL[qt.type]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            {/* Título */}
            <Text style={nm.sectionLabel}>TÍTULO *</Text>
            <TextInput
              style={nm.titleInput}
              placeholder="Nome do nó..."
              placeholderTextColor={COLORS.textMuted}
              value={title}
              onChangeText={handleTitleChange}
              autoFocus={!editNode}
            />

            {/* Conteúdo */}
            <Text style={nm.sectionLabel}>CONTEÚDO</Text>
            <TextInput
              style={nm.contentInput}
              placeholder="Descreva, anote, reflita..."
              placeholderTextColor={COLORS.textMuted}
              value={content}
              onChangeText={handleContentChange}
              multiline
            />

            {/* Tags */}
            <Text style={nm.sectionLabel}>TAGS</Text>
            <View style={nm.tagRow}>
              <TextInput
                style={nm.tagInput}
                placeholder="adicionar tag..."
                placeholderTextColor={COLORS.textMuted}
                value={tagInput}
                onChangeText={setTagInput}
                onSubmitEditing={addTag}
                returnKeyType="done"
              />
              <TouchableOpacity onPress={addTag} style={nm.tagAddBtn}>
                <Ionicons name="add" size={18} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
            {tags.length > 0 && (
              <View style={nm.tagsWrap}>
                {tags.map(t => (
                  <TouchableOpacity key={t} style={nm.tag} onPress={() => removeTag(t)}>
                    <Text style={nm.tagText}>#{t}</Text>
                    <Ionicons name="close" size={11} color={COLORS.primary} />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Sugestões de links */}
            {suggestions.length > 0 && (
              <View style={nm.suggestionsBox}>
                <Text style={nm.sectionLabel}>CONEXÕES SUGERIDAS</Text>
                {suggestions.slice(0, 4).map(s => {
                  const c = NODE_TYPE_COLOR[s.node.type] ?? COLORS.primary;
                  return (
                    <View key={s.node.id} style={nm.suggestion}>
                      <View style={[nm.suggDot, { backgroundColor: c }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={nm.suggTitle}>{s.node.title}</Text>
                        <Text style={nm.suggMeta}>
                          {s.matchedTerms.slice(0, 3).join(', ')} · {NODE_TYPE_LABEL[s.node.type]}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── RelationModal ────────────────────────────────────────────────────────────

function RelationModal({
  visible, onClose, sourceNode,
}: { visible: boolean; onClose: () => void; sourceNode: BrainNode | null }) {
  const { user } = useUserStore();
  const { nodes, createRelation } = useBrainStore();
  const [search, setSearch]             = useState('');
  const [targetNode, setTargetNode]     = useState<BrainNode | null>(null);
  const [relationType, setRelationType] = useState<RelationType>('related_to');
  const [note, setNote]                 = useState('');
  const [saving, setSaving]             = useState(false);

  const RELATION_TYPES: RelationType[] = [
    'related_to', 'supports', 'contradicts', 'inspired_by',
    'part_of', 'leads_to', 'mentions', 'transformed_into',
  ];

  const filteredNodes = nodes
    .filter(n => n.id !== sourceNode?.id)
    .filter(n => !search || n.title.toLowerCase().includes(search.toLowerCase()));

  const handleSave = async () => {
    if (!sourceNode || !targetNode || !user?.id) return;
    setSaving(true);
    try {
      await createRelation({
        userId: user.id,
        sourceId: sourceNode.id,
        targetId: targetNode.id,
        relationType,
        note: note.trim() || undefined,
      });
      onClose();
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível criar a relação.');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!visible) { setSearch(''); setTargetNode(null); setNote(''); setRelationType('related_to'); }
  }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={nm.container} edges={['top', 'bottom']}>
        <View style={nm.header}>
          <TouchableOpacity onPress={onClose}><Text style={nm.cancel}>Cancelar</Text></TouchableOpacity>
          <Text style={nm.headerTitle}>Nova Conexão</Text>
          <TouchableOpacity onPress={handleSave} disabled={!targetNode || saving}>
            {saving
              ? <ActivityIndicator size="small" color={COLORS.primary} />
              : <Text style={[nm.save, (!targetNode) && { opacity: 0.4 }]}>Conectar</Text>}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
          {/* Nó de origem */}
          {sourceNode && (
            <View style={rm.sourceBox}>
              <Text style={rm.sourceLabel}>DE</Text>
              <Text style={rm.sourceTitle}>{sourceNode.title}</Text>
            </View>
          )}

          {/* Tipo de relação */}
          <Text style={nm.sectionLabel}>TIPO DE RELAÇÃO</Text>
          <View style={rm.relWrap}>
            {RELATION_TYPES.map(rt => (
              <TouchableOpacity
                key={rt}
                style={[rm.relChip, relationType === rt && rm.relChipActive]}
                onPress={() => setRelationType(rt)}
              >
                <Text style={[rm.relText, relationType === rt && rm.relTextActive]}>
                  {RELATION_TYPE_LABEL[rt]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Nó de destino */}
          <Text style={nm.sectionLabel}>PARA</Text>
          {targetNode ? (
            <TouchableOpacity
              style={rm.targetSelected}
              onPress={() => setTargetNode(null)}
            >
              <View style={[rm.targetDot, { backgroundColor: NODE_TYPE_COLOR[targetNode.type] }]} />
              <Text style={rm.targetTitle}>{targetNode.title}</Text>
              <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          ) : (
            <>
              <View style={rm.searchBox}>
                <Ionicons name="search-outline" size={16} color={COLORS.textMuted} />
                <TextInput
                  style={rm.searchInput}
                  placeholder="Buscar nó de destino..."
                  placeholderTextColor={COLORS.textMuted}
                  value={search}
                  onChangeText={setSearch}
                />
              </View>
              {filteredNodes.slice(0, 6).map(n => (
                <TouchableOpacity
                  key={n.id}
                  style={rm.nodeOption}
                  onPress={() => setTargetNode(n)}
                >
                  <View style={[rm.optionDot, { backgroundColor: NODE_TYPE_COLOR[n.type] }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={rm.optionTitle}>{n.title}</Text>
                    <Text style={rm.optionType}>{NODE_TYPE_LABEL[n.type]}</Text>
                  </View>
                  <Ionicons name="add-circle-outline" size={20} color={COLORS.textMuted} />
                </TouchableOpacity>
              ))}
            </>
          )}

          {/* Nota opcional */}
          <Text style={nm.sectionLabel}>NOTA (opcional)</Text>
          <TextInput
            style={[nm.contentInput, { minHeight: 60 }]}
            placeholder="Por que esses nós estão conectados?"
            placeholderTextColor={COLORS.textMuted}
            value={note}
            onChangeText={setNote}
            multiline
          />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── NodeDetailModal ──────────────────────────────────────────────────────────

function NodeDetailModal({
  visible, onClose, nodeId, onEdit,
}: { visible: boolean; onClose: () => void; nodeId: string | null; onEdit: (n: BrainNode) => void }) {
  const { user } = useUserStore();
  const { selectNode, clearSelectedNode, selectedNode, deleteNode, deleteRelation, isLoading } = useBrainStore();
  const [showRelationModal, setShowRelationModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingRelId, setDeletingRelId] = useState<string | null>(null);
  const [convertDone, setConvertDone] = useState(false);

  useEffect(() => {
    if (visible && nodeId) {
      selectNode(nodeId);
    } else {
      clearSelectedNode();
    }
  }, [visible, nodeId]);

  if (!selectedNode) {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
        <SafeAreaView style={nm.container} edges={['top', 'bottom']}>
          <View style={nm.header}>
            <TouchableOpacity onPress={onClose}><Text style={nm.cancel}>Fechar</Text></TouchableOpacity>
            <Text style={nm.headerTitle}>Nó</Text>
            <View style={{ width: 60 }} />
          </View>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            {isLoading
              ? <ActivityIndicator size="large" color={COLORS.primary} />
              : <Text style={{ color: COLORS.textMuted }}>Nó não encontrado</Text>
            }
          </View>
        </SafeAreaView>
      </Modal>
    );
  }

  const node = selectedNode;
  const accentColor = NODE_TYPE_COLOR[node.type] ?? COLORS.primary;

  const handleDelete = () => setShowDeleteConfirm(true);

  const handleConvertToTask = async () => {
    if (!user?.id) return;
    try {
      const { createTask } = useTaskStore.getState();
      await createTask({
        userId: user.id,
        title: node.title,
        description: node.content,
        scheduledDate: new Date().toISOString().split('T')[0],
        isCompleted: false,
        rewardUnlocked: false,
        status: 'pending',
        orderIndex: 0,
        isPareto: false,
      });
      setConvertDone(true);
      setTimeout(() => setConvertDone(false), 2500);
    } catch {
      Alert.alert('Erro', 'Não foi possível criar a tarefa.');
    }
  };

  return (
    <>
    {/* ══ Modal: Confirmar exclusão do nó ══ */}
    <Modal visible={showDeleteConfirm} transparent animationType="fade">
      <TouchableOpacity style={detal.overlay} activeOpacity={1} onPress={() => setShowDeleteConfirm(false)}>
        <View style={detal.confirmSheet}>
          <Text style={detal.confirmTitle}>Excluir nó?</Text>
          <Text style={detal.confirmSub}>"{node.title}" e todas as suas conexões serão removidos.</Text>
          <TouchableOpacity
            style={detal.confirmDeleteBtn}
            onPress={async () => { setShowDeleteConfirm(false); await deleteNode(node.id); onClose(); }}
          >
            <Text style={detal.confirmDeleteText}>Excluir</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={detal.confirmCancelBtn}
            onPress={() => setShowDeleteConfirm(false)}
          >
            <Text style={detal.confirmCancelText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>

    {/* ══ Modal: Confirmar remoção de conexão ══ */}
    <Modal visible={!!deletingRelId} transparent animationType="fade">
      <TouchableOpacity style={detal.overlay} activeOpacity={1} onPress={() => setDeletingRelId(null)}>
        <View style={detal.confirmSheet}>
          <Text style={detal.confirmTitle}>Remover conexão?</Text>
          <TouchableOpacity
            style={detal.confirmDeleteBtn}
            onPress={() => { if (deletingRelId) deleteRelation(deletingRelId); setDeletingRelId(null); }}
          >
            <Text style={detal.confirmDeleteText}>Remover</Text>
          </TouchableOpacity>
          <TouchableOpacity style={detal.confirmCancelBtn} onPress={() => setDeletingRelId(null)}>
            <Text style={detal.confirmCancelText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>

    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={nm.container} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={[nm.header, { borderBottomColor: `${accentColor}30` }]}>
          <TouchableOpacity onPress={onClose}><Text style={nm.cancel}>Fechar</Text></TouchableOpacity>
          <Text style={nm.headerTitle} numberOfLines={1}>{node.title}</Text>
          <View style={{ flexDirection: 'row', gap: 16 }}>
            <TouchableOpacity onPress={() => onEdit(node)}>
              <Ionicons name="pencil-outline" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDelete}>
              <Ionicons name="trash-outline" size={20} color={COLORS.error} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }} showsVerticalScrollIndicator={false}>
          {/* Badge tipo */}
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <View style={[detal.typeBadge, { backgroundColor: `${accentColor}20`, borderColor: `${accentColor}50` }]}>
              <Text style={detal.typeBadgeEmoji}>{TYPE_EMOJI[node.type]}</Text>
              <Text style={[detal.typeBadgeLabel, { color: accentColor }]}>{NODE_TYPE_LABEL[node.type]}</Text>
            </View>
            {node.isPinned && (
              <View style={detal.pinnedBadge}>
                <Ionicons name="pin" size={11} color={COLORS.textMuted} />
                <Text style={detal.pinnedText}>Fixado</Text>
              </View>
            )}
          </View>

          {/* Conteúdo */}
          {node.content ? (
            <Text style={detal.content}>{node.content}</Text>
          ) : (
            <Text style={detal.emptyContent}>Sem descrição</Text>
          )}

          {/* Tags */}
          {node.tags.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {node.tags.map(t => (
                <View key={t} style={detal.tag}>
                  <Text style={detal.tagText}>#{t}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Converter em Tarefa — CTA proeminente */}
          <TouchableOpacity
            style={[detal.convertCTA, convertDone && detal.convertCTADone]}
            onPress={handleConvertToTask}
            activeOpacity={0.85}
          >
            <Ionicons
              name={convertDone ? 'checkmark-circle' : 'checkmark-circle-outline'}
              size={20}
              color={convertDone ? COLORS.success : COLORS.primary}
            />
            <Text style={[detal.convertCTAText, convertDone && { color: COLORS.success }]}>
              {convertDone ? '✅ Tarefa criada!' : '➕ Converter em Tarefa'}
            </Text>
          </TouchableOpacity>

          {/* Conexões */}
          <View>
            <View style={detal.sectionRow}>
              <Text style={nm.sectionLabel}>CONEXÕES ({(node.relations ?? []).length})</Text>
              <TouchableOpacity
                style={detal.addRelBtn}
                onPress={() => setShowRelationModal(true)}
              >
                <Ionicons name="add" size={14} color={COLORS.primary} />
                <Text style={detal.addRelText}>Conectar</Text>
              </TouchableOpacity>
            </View>

            {(node.relations ?? []).length === 0 ? (
              <Text style={detal.emptyContent}>Nenhuma conexão ainda. Conecte este nó a outros!</Text>
            ) : (
              (node.relations ?? []).map(rel => {
                const isSource = rel.sourceId === node.id;
                const neighbor = isSource ? rel.targetNode : rel.sourceNode;
                const neighborColor = neighbor ? (NODE_TYPE_COLOR[neighbor.type] ?? COLORS.primary) : COLORS.primary;
                return (
                  <View key={rel.id} style={detal.relRow}>
                    <View style={[detal.relDot, { backgroundColor: neighborColor }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={detal.relTitle}>{neighbor?.title ?? '—'}</Text>
                      <Text style={detal.relMeta}>
                        {isSource ? '→' : '←'} {RELATION_TYPE_LABEL[rel.relationType]}
                        {rel.note ? ` · ${rel.note}` : ''}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => setDeletingRelId(rel.id)}>
                      <Ionicons name="unlink-outline" size={16} color={COLORS.textMuted} />
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </View>

          {/* Vizinhos */}
          {(node.neighbors ?? []).length > 0 && (
            <View>
              <Text style={nm.sectionLabel}>NÓS VIZINHOS</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {(node.neighbors ?? []).map(nb => {
                    const c = NODE_TYPE_COLOR[nb.type] ?? COLORS.primary;
                    return (
                      <View key={nb.id} style={[detal.neighborChip, { borderColor: `${c}40`, backgroundColor: `${c}10` }]}>
                        <Text style={detal.neighborEmoji}>{TYPE_EMOJI[nb.type]}</Text>
                        <Text style={[detal.neighborTitle, { color: c }]} numberOfLines={2}>{nb.title}</Text>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          )}

          <Text style={detal.dateMeta}>
            Criado em {new Date(node.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
          </Text>
          <View style={{ height: 24 }} />
        </ScrollView>
      </SafeAreaView>

      <RelationModal
        visible={showRelationModal}
        onClose={() => setShowRelationModal(false)}
        sourceNode={node}
      />
    </Modal>
    </>
  );
}

// ─── CaptureTab ───────────────────────────────────────────────────────────────

function CaptureTab({ onOpenNode }: { onOpenNode: (id: string) => void }) {
  const { user } = useUserStore();
  const { nodes, createNode, isLoading } = useBrainStore();
  const [type, setType]       = useState<NodeType>('thought');
  const [text, setText]       = useState('');
  const [expanded, setExpanded] = useState(false);
  const [title, setTitle]     = useState('');
  const [saving, setSaving]   = useState(false);

  const recent = [...nodes]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);

  const handleCapture = async () => {
    if (!text.trim() || !user?.id) return;
    setSaving(true);
    try {
      await createNode({
        userId: user.id,
        type,
        title: (expanded && title.trim()) ? title.trim() : text.trim().substring(0, 80),
        content: (expanded && title.trim()) ? text.trim() : undefined,
        tags: [],
        isPinned: false,
      });
      setText('');
      setTitle('');
      setExpanded(false);
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Type selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={cap.typeScroll}>
        <View style={{ flexDirection: 'row', gap: 8, paddingBottom: 4 }}>
          {QUICK_TYPES.map(qt => {
            const active = type === qt.type;
            const c = NODE_TYPE_COLOR[qt.type] ?? COLORS.primary;
            return (
              <TouchableOpacity
                key={qt.type}
                style={[cap.typeChip, active && { backgroundColor: `${c}25`, borderColor: c }]}
                onPress={() => setType(qt.type)}
              >
                <Text style={cap.typeEmoji}>{qt.emoji}</Text>
                <Text style={[cap.typeLabel, active && { color: c }]}>
                  {NODE_TYPE_LABEL[qt.type]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Capture box */}
      <View style={cap.box}>
        {expanded && (
          <TextInput
            style={cap.titleInput}
            placeholder="Título do nó..."
            placeholderTextColor={COLORS.textMuted}
            value={title}
            onChangeText={setTitle}
          />
        )}
        <View style={cap.inputRow}>
          <TextInput
            style={cap.input}
            placeholder={type === 'thought' ? 'O que está na sua mente?' : type === 'question' ? 'Qual é a sua dúvida?' : 'Capture agora...'}
            placeholderTextColor="rgba(255,255,255,0.3)"
            value={text}
            onChangeText={setText}
            multiline={expanded}
            numberOfLines={expanded ? 4 : 1}
          />
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
            <TouchableOpacity onPress={() => setExpanded(e => !e)}>
              <Ionicons name={expanded ? 'contract-outline' : 'expand-outline'} size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[cap.sendBtn, (!text.trim() || saving) && { opacity: 0.4 }]}
              onPress={handleCapture}
              disabled={!text.trim() || saving}
            >
              {saving
                ? <ActivityIndicator size="small" color="#fff" />
                : <Ionicons name="arrow-up" size={16} color="#fff" />}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Recent nodes */}
      <Text style={cap.recentLabel}>CAPTURADOS RECENTEMENTE</Text>
      <ScrollView showsVerticalScrollIndicator={false}>
        {recent.length === 0 ? (
          <View style={cap.empty}>
            <Text style={{ fontSize: 36 }}>🧠</Text>
            <Text style={cap.emptyTitle}>Segundo Cérebro vazio</Text>
            <Text style={cap.emptyText}>Capture pensamentos, ideias e conexões para construir seu grafo de conhecimento.</Text>
          </View>
        ) : (
          recent.map(n => (
            <NodeCard key={n.id} node={n} onPress={() => onOpenNode(n.id)} compact />
          ))
        )}
        <View style={{ height: 80 }} />
      </ScrollView>
    </View>
  );
}

// ─── NeuralGraphCanvas — visualização neuronal ────────────────────────────────

function NeuralGraphCanvas({
  graphNodes,
  graphEdges,
  nodes,
  onOpenNode,
  filterType,
}: {
  graphNodes: import('../../src/types/brain.types').GraphNode[];
  graphEdges: import('../../src/types/brain.types').GraphEdge[];
  nodes: BrainNode[];
  onOpenNode: (id: string) => void;
  filterType: NodeType | null;
}) {
  const visNodes = filterType
    ? graphNodes.filter(gn => { const n = nodes.find(x => x.id === gn.id); return n?.type === filterType; })
    : graphNodes;

  const visEdges = graphEdges.filter(
    e => visNodes.some(n => n.id === e.source) && visNodes.some(n => n.id === e.target)
  );

  const N = visNodes.length;
  if (N === 0) return null;

  // Layout: nós em espiral/circular ao redor do centro
  const NODE_R = 26; // raio do nó
  // Raio da órbita — cresce com o número de nós
  const ORBIT = Math.max(120, N * 18);
  const CANVAS = ORBIT * 2 + NODE_R * 4;
  const CX = CANVAS / 2;
  const CY = CANVAS / 2;

  // Calcular posições em círculo
  const positions: Record<string, { x: number; y: number }> = {};
  visNodes.forEach((gn, i) => {
    const angle = (2 * Math.PI * i) / N - Math.PI / 2;
    positions[gn.id] = {
      x: CX + ORBIT * Math.cos(angle),
      y: CY + ORBIT * Math.sin(angle),
    };
  });

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ width: CANVAS, height: CANVAS }}>

          {/* Linhas de conexão (renderizadas antes dos nós) */}
          {visEdges.map(edge => {
            const from = positions[edge.source];
            const to = positions[edge.target];
            if (!from || !to) return null;

            const dx = to.x - from.x;
            const dy = to.y - from.y;
            const length = Math.sqrt(dx * dx + dy * dy);
            if (length < 1) return null;
            const angle = Math.atan2(dy, dx) * (180 / Math.PI);
            const midX = (from.x + to.x) / 2;
            const midY = (from.y + to.y) / 2;

            const sourceNode = nodes.find(n => n.id === edge.source);
            const edgeColor = NODE_TYPE_COLOR[sourceNode?.type ?? 'thought'] ?? COLORS.primary;

            return (
              <View
                key={edge.id}
                style={{
                  position: 'absolute',
                  left: midX - length / 2,
                  top: midY - 1,
                  width: length,
                  height: 2,
                  backgroundColor: `${edgeColor}60`,
                  transform: [{ rotate: `${angle}deg` }],
                }}
              />
            );
          })}

          {/* Nós como círculos */}
          {visNodes.map(gn => {
            const pos = positions[gn.id];
            if (!pos) return null;

            const fullNode = nodes.find(n => n.id === gn.id);
            const color = NODE_TYPE_COLOR[fullNode?.type ?? 'thought'] ?? COLORS.primary;
            const emoji = TYPE_EMOJI[fullNode?.type ?? 'thought'] ?? '•';
            const degree = visEdges.filter(e => e.source === gn.id || e.target === gn.id).length;
            const radius = NODE_R + Math.min(degree * 3, 14); // nós mais conectados = maiores

            return (
              <TouchableOpacity
                key={gn.id}
                style={{
                  position: 'absolute',
                  left: pos.x - radius,
                  top: pos.y - radius,
                  width: radius * 2,
                  height: radius * 2,
                  borderRadius: radius,
                  backgroundColor: `${color}22`,
                  borderWidth: 2.5,
                  borderColor: color,
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: color,
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.5,
                  shadowRadius: 6,
                  elevation: 4,
                }}
                onPress={() => onOpenNode(gn.id)}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: radius * 0.55, textAlign: 'center' }}>{emoji}</Text>
                {degree > 0 && (
                  <View style={{
                    position: 'absolute',
                    top: -4, right: -4,
                    width: 16, height: 16, borderRadius: 8,
                    backgroundColor: color,
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Text style={{ fontSize: 9, color: '#fff', fontWeight: '800' }}>{degree}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}

          {/* Labels flutuantes dos nós */}
          {visNodes.map(gn => {
            const pos = positions[gn.id];
            if (!pos) return null;
            const fullNode = nodes.find(n => n.id === gn.id);
            const color = NODE_TYPE_COLOR[fullNode?.type ?? 'thought'] ?? COLORS.primary;
            const degree = visEdges.filter(e => e.source === gn.id || e.target === gn.id).length;
            const radius = NODE_R + Math.min(degree * 3, 14);
            const labelW = 80;

            return (
              <View
                key={`lbl-${gn.id}`}
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  left: pos.x - labelW / 2,
                  top: pos.y + radius + 4,
                  width: labelW,
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 9, color, fontWeight: '700', textAlign: 'center' }} numberOfLines={2}>
                  {gn.label.substring(0, 18)}
                </Text>
              </View>
            );
          })}

        </View>
      </ScrollView>
    </ScrollView>
  );
}

// ─── GraphTab ─────────────────────────────────────────────────────────────────

function GraphTab({ onOpenNode }: { onOpenNode: (id: string) => void }) {
  const { user } = useUserStore();
  const { graph, nodes, loadGraph, isGraphLoading } = useBrainStore();
  const [filterType, setFilterType] = useState<NodeType | null>(null);
  const [viewMode, setViewMode] = useState<'neural' | 'list'>('neural');

  useEffect(() => {
    if (user?.id) loadGraph(user.id);
  }, [user?.id]);

  const allTypes = [...new Set(nodes.map(n => n.type))] as NodeType[];

  const stats = {
    nodes: nodes.length,
    edges: graph.edges.length,
    types: allTypes.length,
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Stats + Toggle de modo */}
      <View style={[grp.statsRow, { justifyContent: 'space-between' }]}>
        <View style={{ flexDirection: 'row', gap: 16 }}>
          <View style={grp.statBox}>
            <Text style={grp.statNum}>{stats.nodes}</Text>
            <Text style={grp.statLabel}>nós</Text>
          </View>
          <View style={grp.statDivider} />
          <View style={grp.statBox}>
            <Text style={grp.statNum}>{stats.edges}</Text>
            <Text style={grp.statLabel}>conexões</Text>
          </View>
          <View style={grp.statDivider} />
          <View style={grp.statBox}>
            <Text style={grp.statNum}>{stats.types}</Text>
            <Text style={grp.statLabel}>tipos</Text>
          </View>
        </View>
        {/* Toggle visual/lista */}
        <View style={{ flexDirection: 'row', borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border }}>
          <TouchableOpacity
            style={{ paddingHorizontal: 10, paddingVertical: 5, backgroundColor: viewMode === 'neural' ? COLORS.primary : 'transparent' }}
            onPress={() => setViewMode('neural')}
          >
            <Ionicons name="git-network" size={16} color={viewMode === 'neural' ? '#fff' : COLORS.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity
            style={{ paddingHorizontal: 10, paddingVertical: 5, backgroundColor: viewMode === 'list' ? COLORS.primary : 'transparent' }}
            onPress={() => setViewMode('list')}
          >
            <Ionicons name="list" size={16} color={viewMode === 'list' ? '#fff' : COLORS.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filtros tipo */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 42, marginBottom: 8 }}>
        <View style={{ flexDirection: 'row', gap: 6, paddingHorizontal: 2 }}>
          <TouchableOpacity
            style={[grp.filterChip, !filterType && grp.filterChipActive]}
            onPress={() => setFilterType(null)}
          >
            <Text style={[grp.filterText, !filterType && grp.filterTextActive]}>Todos</Text>
          </TouchableOpacity>
          {allTypes.map(t => {
            const c = NODE_TYPE_COLOR[t] ?? COLORS.primary;
            const active = filterType === t;
            return (
              <TouchableOpacity
                key={t}
                style={[grp.filterChip, active && { backgroundColor: `${c}25`, borderColor: c }]}
                onPress={() => setFilterType(active ? null : t)}
              >
                <Text style={grp.typeEmoji}>{TYPE_EMOJI[t]}</Text>
                <Text style={[grp.filterText, active && { color: c }]}>{NODE_TYPE_LABEL[t]}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {isGraphLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={{ color: COLORS.textMuted, marginTop: 12 }}>Carregando grafo...</Text>
        </View>
      ) : graph.nodes.length === 0 ? (
        <View style={cap.empty}>
          <Text style={{ fontSize: 36 }}>🕸️</Text>
          <Text style={cap.emptyTitle}>Grafo vazio</Text>
          <Text style={cap.emptyText}>Capture nós e crie conexões para visualizar seu grafo de conhecimento.</Text>
        </View>
      ) : viewMode === 'neural' ? (
        // ── MODO VISUAL NEURONAL ──
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, color: COLORS.textMuted, textAlign: 'center', marginBottom: 4 }}>
            Toque em um nó para abrir · Arraste para navegar
          </Text>
          <NeuralGraphCanvas
            graphNodes={graph.nodes}
            graphEdges={graph.edges}
            nodes={nodes}
            onOpenNode={onOpenNode}
            filterType={filterType}
          />
        </View>
      ) : (
        // ── MODO LISTA ──
        <ScrollView showsVerticalScrollIndicator={false}>
          {graph.nodes
            .filter(gn => !filterType || nodes.find(n => n.id === gn.id)?.type === filterType)
            .map(gn => {
              const fullNode = nodes.find(n => n.id === gn.id);
              if (!fullNode) return null;
              const color = NODE_TYPE_COLOR[fullNode.type] ?? COLORS.primary;
              const nodeEdges = graph.edges.filter(e => e.source === gn.id || e.target === gn.id);

              return (
                <TouchableOpacity
                  key={gn.id}
                  style={grp.nodeRow}
                  onPress={() => onOpenNode(gn.id)}
                  activeOpacity={0.85}
                >
                  <View style={[grp.nodeBar, { backgroundColor: color, height: Math.min(10 + (gn.size ?? 1) * 4, 44) }]} />
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <Text style={grp.nodeEmoji}>{TYPE_EMOJI[fullNode.type]}</Text>
                      <Text style={grp.nodeTitle} numberOfLines={1}>{fullNode.title}</Text>
                      {nodeEdges.length > 0 && (
                        <View style={[grp.edgeCountBadge, { backgroundColor: `${color}20` }]}>
                          <Text style={[grp.edgeCount, { color }]}>{nodeEdges.length} 🔗</Text>
                        </View>
                      )}
                    </View>
                    {nodeEdges.length > 0 && (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View style={{ flexDirection: 'row', gap: 4 }}>
                          {nodeEdges.slice(0, 4).map(e => {
                            const neighborId = e.source === gn.id ? e.target : e.source;
                            const neighbor = nodes.find(n => n.id === neighborId);
                            if (!neighbor) return null;
                            const nc = NODE_TYPE_COLOR[neighbor.type] ?? COLORS.primary;
                            return (
                              <View key={e.id} style={[grp.edgePill, { backgroundColor: `${nc}15`, borderColor: `${nc}30` }]}>
                                <Text style={grp.edgePillText}>{TYPE_EMOJI[neighbor.type]} {neighbor.title.substring(0, 20)}</Text>
                              </View>
                            );
                          })}
                        </View>
                      </ScrollView>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={14} color={COLORS.textMuted} />
                </TouchableOpacity>
              );
            })}
          <View style={grp.legend}>
            <Text style={grp.legendTitle}>LEGENDA</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {Object.entries(NODE_TYPE_LABEL).map(([t, label]) => {
                const c = NODE_TYPE_COLOR[t as NodeType] ?? COLORS.primary;
                return (
                  <View key={t} style={grp.legendItem}>
                    <View style={[grp.legendDot, { backgroundColor: c }]} />
                    <Text style={grp.legendLabel}>{TYPE_EMOJI[t as NodeType]} {label}</Text>
                  </View>
                );
              })}
            </View>
          </View>
          <View style={{ height: 80 }} />
        </ScrollView>
      )}
    </View>
  );
}

// ─── NodesTab ─────────────────────────────────────────────────────────────────

function NodesTab({ onOpenNode }: { onOpenNode: (id: string) => void }) {
  const { user } = useUserStore();
  const { nodes, searchResults, search, clearSearch } = useBrainStore();
  const [query, setQuery] = useState('');
  const [filterType, setFilterType] = useState<NodeType | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = (v: string) => {
    setQuery(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (!user?.id) return;
      if (v.trim()) {
        search(user.id, v.trim());
      } else {
        clearSearch();
      }
    }, 400);
  };

  const allTypes = [...new Set(nodes.map(n => n.type))] as NodeType[];

  const displayNodes = query.trim()
    ? searchResults.map(r => ({ ...r.node, _snippet: r.snippet }))
    : nodes.filter(n => !filterType || n.type === filterType)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <View style={{ flex: 1 }}>
      {/* Search */}
      <View style={ndt.searchBox}>
        <Ionicons name="search-outline" size={16} color={COLORS.textMuted} />
        <TextInput
          style={ndt.searchInput}
          placeholder="Busca semântica nos nós..."
          placeholderTextColor={COLORS.textMuted}
          value={query}
          onChangeText={handleSearch}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => { setQuery(''); clearSearch(); }}>
            <Ionicons name="close-circle" size={16} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filtros tipo (só quando não buscando) */}
      {!query && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 38, marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <TouchableOpacity
              style={[ndt.chip, !filterType && ndt.chipActive]}
              onPress={() => setFilterType(null)}
            >
              <Text style={[ndt.chipText, !filterType && ndt.chipTextActive]}>Todos</Text>
            </TouchableOpacity>
            {allTypes.map(t => {
              const c = NODE_TYPE_COLOR[t] ?? COLORS.primary;
              const active = filterType === t;
              return (
                <TouchableOpacity
                  key={t}
                  style={[ndt.chip, active && { backgroundColor: `${c}20`, borderColor: c }]}
                  onPress={() => setFilterType(active ? null : t)}
                >
                  <Text style={ndt.typeEmoji}>{TYPE_EMOJI[t]}</Text>
                  <Text style={[ndt.chipText, active && { color: c }]}>{NODE_TYPE_LABEL[t]}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      )}

      {/* Lista */}
      <FlatList
        data={displayNodes as any[]}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={cap.empty}>
            <Text style={{ fontSize: 36 }}>{query ? '🔍' : '📚'}</Text>
            <Text style={cap.emptyTitle}>{query ? 'Sem resultados' : 'Nenhum nó'}</Text>
            <Text style={cap.emptyText}>
              {query ? `Nenhum nó encontrado para "${query}".` : 'Capture seus primeiros pensamentos na aba Captura.'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <NodeCard node={item} onPress={() => onOpenNode(item.id)} />
        )}
        ListFooterComponent={<View style={{ height: 80 }} />}
      />
    </View>
  );
}

// ─── PrimingTab ───────────────────────────────────────────────────────────────

function PrimingTab() {
  const { primingItems, createPrimingItem, deletePrimingItem } = useSecondMindStore();
  const { user } = useUserStore();
  const [showModal, setShowModal] = useState(false);
  const [affirmation, setAffirmation] = useState('');
  const [category, setCategory] = useState<'goal' | 'motivation' | 'identity' | 'fear'>('goal');

  const CATEGORIES = [
    { key: 'goal' as const,       label: 'Meta',        emoji: '🎯' },
    { key: 'identity' as const,   label: 'Identidade',  emoji: '🌟' },
    { key: 'motivation' as const, label: 'Motivação',   emoji: '🔥' },
    { key: 'fear' as const,       label: 'Superar',     emoji: '💪' },
  ];

  const handleAdd = async () => {
    if (!affirmation.trim() || !user?.id) return;
    await createPrimingItem({
      userId: user.id,
      title: affirmation.trim(),
      imageUri: '',
      affirmation: affirmation.trim(),
      category,
      orderIndex: primingItems.length,
      isActive: true,
    });
    setAffirmation('');
    setShowModal(false);
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={prim.infoCard}>
        <Text style={prim.infoTitle}>🌅 Priming Mental</Text>
        <Text style={prim.infoText}>Afirmações e intenções que ativam o estado mental certo para atingir seus objetivos.</Text>
      </View>

      <TouchableOpacity style={prim.addBtn} onPress={() => setShowModal(true)}>
        <Ionicons name="add-circle-outline" size={18} color={COLORS.primary} />
        <Text style={prim.addBtnText}>Adicionar afirmação</Text>
      </TouchableOpacity>

      <ScrollView showsVerticalScrollIndicator={false}>
        {primingItems.length === 0 ? (
          <View style={cap.empty}>
            <Text style={{ fontSize: 40 }}>✨</Text>
            <Text style={cap.emptyTitle}>Mural vazio</Text>
            <Text style={cap.emptyText}>Adicione afirmações e intenções que fortalecem sua mente.</Text>
          </View>
        ) : (
          <View style={prim.grid}>
            {primingItems.map(item => {
              const cat = CATEGORIES.find(c => c.key === item.category);
              return (
                <TouchableOpacity
                  key={item.id}
                  style={prim.item}
                  onLongPress={() => deletePrimingItem(item.id)}
                  activeOpacity={0.85}
                >
                  <Text style={prim.catEmoji}>{cat?.emoji ?? '✨'}</Text>
                  <Text style={prim.itemText} numberOfLines={4}>{item.affirmation ?? item.title}</Text>
                  <View style={prim.catBadge}>
                    <Text style={prim.catLabel}>{cat?.label ?? 'Meta'}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
        <View style={{ height: 80 }} />
      </ScrollView>

      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowModal(false)}>
        <SafeAreaView style={nm.container} edges={['top', 'bottom']}>
          <View style={nm.header}>
            <TouchableOpacity onPress={() => setShowModal(false)}><Text style={nm.cancel}>Cancelar</Text></TouchableOpacity>
            <Text style={nm.headerTitle}>Nova Afirmação</Text>
            <TouchableOpacity onPress={handleAdd} disabled={!affirmation.trim()}>
              <Text style={[nm.save, !affirmation.trim() && { opacity: 0.4 }]}>Salvar</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }} keyboardShouldPersistTaps="handled">
            <Text style={nm.sectionLabel}>CATEGORIA</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {CATEGORIES.map(c => (
                <TouchableOpacity
                  key={c.key}
                  style={[prim.catChip, category === c.key && prim.catChipActive]}
                  onPress={() => setCategory(c.key)}
                >
                  <Text>{c.emoji}</Text>
                  <Text style={[prim.catChipText, category === c.key && prim.catChipTextActive]}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={nm.sectionLabel}>AFIRMAÇÃO</Text>
            <TextInput
              style={nm.contentInput}
              placeholder="Ex: Eu sou capaz de criar coisas incríveis..."
              placeholderTextColor={COLORS.textMuted}
              value={affirmation}
              onChangeText={setAffirmation}
              multiline
              autoFocus
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

// ─── Tela principal ────────────────────────────────────────────────────────────

export default function SecondMindScreen() {
  const [activeTab, setActiveTab] = useState<MainTab>('capture');
  const [showNodeModal, setShowNodeModal] = useState(false);
  const [editNode, setEditNode]     = useState<BrainNode | null>(null);
  const [detailNodeId, setDetailNodeId] = useState<string | null>(null);
  const { nodes } = useBrainStore();

  const openNode = useCallback((id: string) => {
    setDetailNodeId(id);
  }, []);

  const handleEditFromDetail = useCallback((node: BrainNode) => {
    setDetailNodeId(null);
    setTimeout(() => {
      setEditNode(node);
      setShowNodeModal(true);
    }, 300);
  }, []);

  const renderTab = () => {
    switch (activeTab) {
      case 'capture': return <CaptureTab onOpenNode={openNode} />;
      case 'graph':   return <GraphTab onOpenNode={openNode} />;
      case 'nodes':   return <NodesTab onOpenNode={openNode} />;
      case 'priming': return <PrimingTab />;
    }
  };

  return (
    <SafeAreaView style={s.safeArea} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <View style={s.headerDot} />
          <View>
            <Text style={s.headerEyebrow}>SEGUNDO CÉREBRO</Text>
            <Text style={s.headerTitle}>Grafo de conhecimento</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <View style={s.headerCount}>
            <Text style={s.headerCountNum}>{nodes.length}</Text>
            <Text style={s.headerCountLabel}>nós</Text>
          </View>
          <TouchableOpacity
            style={s.addBtn}
            onPress={() => { setEditNode(null); setShowNodeModal(true); }}
          >
            <Ionicons name="add" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={s.tabsRow}>
        {MAIN_TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[s.tab, activeTab === tab.key && s.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons name={tab.icon as any} size={15} color={activeTab === tab.key ? '#fff' : COLORS.textMuted} />
            <Text style={[s.tabLabel, activeTab === tab.key && s.tabLabelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <View style={s.content}>
        {renderTab()}
      </View>

      {/* Modals */}
      <NodeModal
        visible={showNodeModal}
        onClose={() => { setShowNodeModal(false); setEditNode(null); }}
        editNode={editNode}
      />
      <NodeDetailModal
        visible={!!detailNodeId}
        onClose={() => setDetailNodeId(null)}
        nodeId={detailNodeId}
        onEdit={handleEditFromDetail}
      />
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerDot: {
    width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 8,
  },
  headerEyebrow: { fontSize: 9, fontWeight: '800', color: COLORS.primary, letterSpacing: 2 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text, marginTop: 1 },
  headerCount: { alignItems: 'center' },
  headerCountNum: { fontSize: 20, fontWeight: '800', color: COLORS.primary },
  headerCountLabel: { fontSize: 9, color: COLORS.textMuted, textTransform: 'uppercase' },
  addBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
  },
  tabsRow: {
    flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8,
    gap: 6, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    paddingVertical: 7, borderRadius: 10,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: 'transparent',
  },
  tabActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tabLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted },
  tabLabelActive: { color: '#fff' },
  content: { flex: 1, paddingHorizontal: 14, paddingTop: 10 },
});

const ndc = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface, borderRadius: 14, padding: 13,
    marginBottom: 9, borderLeftWidth: 3,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  typePill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, borderWidth: 1,
  },
  pillEmoji: { fontSize: 10 },
  pillLabel: { fontSize: 10, fontWeight: '700' },
  title: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 4, lineHeight: 20 },
  content: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 19, marginBottom: 6 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  tags: { fontSize: 11, color: COLORS.primary, flex: 1 },
  date: { fontSize: 10, color: COLORS.textMuted },
});

const nm = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, flex: 1, textAlign: 'center', marginHorizontal: 8 },
  cancel: { fontSize: 16, color: COLORS.textSecondary, minWidth: 60 },
  save: { fontSize: 16, fontWeight: '700', color: COLORS.primary, minWidth: 60, textAlign: 'right' },
  form: { padding: 16, gap: 0 },
  sectionLabel: { fontSize: 10, fontWeight: '800', color: COLORS.textMuted, letterSpacing: 1.5, marginBottom: 8 },
  typeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: 'transparent',
  },
  typeEmoji: { fontSize: 14 },
  typeLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  titleInput: {
    fontSize: 18, fontWeight: '700', color: COLORS.text,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border, marginBottom: 16,
  },
  contentInput: {
    fontSize: 15, color: COLORS.text, lineHeight: 24, minHeight: 120,
    backgroundColor: COLORS.surface, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 16,
  },
  tagRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  tagInput: {
    flex: 1, fontSize: 14, color: COLORS.text,
    backgroundColor: COLORS.surface, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9,
    borderWidth: 1, borderColor: COLORS.border,
  },
  tagAddBtn: {
    width: 40, height: 40, borderRadius: 10, backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center',
  },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 },
  tag: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: `${COLORS.primary}15`, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: `${COLORS.primary}30`,
  },
  tagText: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
  suggestionsBox: { marginTop: 4 },
  suggestion: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.surface, borderRadius: 10, padding: 10, marginBottom: 6,
    borderWidth: 1, borderColor: COLORS.border,
  },
  suggDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  suggTitle: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  suggMeta: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
});

const rm = StyleSheet.create({
  sourceBox: {
    backgroundColor: `${COLORS.primary}12`, borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: `${COLORS.primary}30`,
  },
  sourceLabel: { fontSize: 9, fontWeight: '800', color: COLORS.primary, letterSpacing: 1.5, marginBottom: 4 },
  sourceTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  relWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  relChip: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
  },
  relChipActive: { backgroundColor: `${COLORS.primary}20`, borderColor: COLORS.primary },
  relText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  relTextActive: { color: COLORS.primary },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.surface, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.text },
  nodeOption: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.surface, borderRadius: 12, padding: 12, marginBottom: 6,
    borderWidth: 1, borderColor: COLORS.border,
  },
  optionDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  optionTitle: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  optionType: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  targetSelected: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: `${COLORS.primary}12`, borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: `${COLORS.primary}40`,
  },
  targetDot: { width: 10, height: 10, borderRadius: 5 },
  targetTitle: { flex: 1, fontSize: 14, fontWeight: '600', color: COLORS.text },
});

const detal = StyleSheet.create({
  // ── Modais de confirmação inline ──────────────────────────────────────────
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center', justifyContent: 'center',
  },
  confirmSheet: {
    backgroundColor: COLORS.surface, borderRadius: 18, padding: 24,
    width: '82%', gap: 12,
  },
  confirmTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text, textAlign: 'center' },
  confirmSub: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 18 },
  confirmDeleteBtn: {
    backgroundColor: COLORS.error, borderRadius: 12,
    paddingVertical: 13, alignItems: 'center',
  },
  confirmDeleteText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  confirmCancelBtn: {
    backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border,
    paddingVertical: 12, alignItems: 'center',
  },
  confirmCancelText: { color: COLORS.textSecondary, fontWeight: '600', fontSize: 15 },

  // ── Botão CTA "Converter em Tarefa" ───────────────────────────────────────
  convertCTA: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: `${COLORS.primary}15`,
    borderRadius: 14, paddingVertical: 14, paddingHorizontal: 18,
    borderWidth: 1.5, borderColor: `${COLORS.primary}40`,
    marginBottom: 4,
  },
  convertCTADone: {
    backgroundColor: `${COLORS.success}15`, borderColor: `${COLORS.success}40`,
  },
  convertCTAText: {
    fontSize: 15, fontWeight: '700', color: COLORS.primary, flex: 1,
  },

  typeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1,
    alignSelf: 'flex-start',
  },
  typeBadgeEmoji: { fontSize: 14 },
  typeBadgeLabel: { fontSize: 12, fontWeight: '700' },
  pinnedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.surface, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1, borderColor: COLORS.border,
  },
  pinnedText: { fontSize: 11, color: COLORS.textMuted },
  content: { fontSize: 15, color: COLORS.text, lineHeight: 24 },
  emptyContent: { fontSize: 14, color: COLORS.textMuted, fontStyle: 'italic' },
  tag: {
    backgroundColor: `${COLORS.primary}15`, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: `${COLORS.primary}30`,
  },
  tagText: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
  convertBox: { backgroundColor: COLORS.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: COLORS.border },
  convertRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  convertBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12,
    backgroundColor: `${COLORS.primary}15`, borderWidth: 1, borderColor: `${COLORS.primary}30`,
  },
  convertBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  addRelBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: `${COLORS.primary}15`, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: `${COLORS.primary}30`,
  },
  addRelText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  relRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.surface, borderRadius: 12, padding: 10, marginBottom: 6,
    borderWidth: 1, borderColor: COLORS.border,
  },
  relDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  relTitle: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  relMeta: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  neighborChip: {
    width: 100, borderRadius: 12, padding: 10, alignItems: 'center',
    borderWidth: 1,
  },
  neighborEmoji: { fontSize: 18, marginBottom: 4 },
  neighborTitle: { fontSize: 11, fontWeight: '600', textAlign: 'center', lineHeight: 15 },
  dateMeta: { fontSize: 11, color: COLORS.textMuted, textAlign: 'center' },
});

const cap = StyleSheet.create({
  typeScroll: { maxHeight: 44, marginBottom: 10 },
  typeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: 'transparent',
  },
  typeEmoji: { fontSize: 14 },
  typeLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  box: {
    backgroundColor: COLORS.surface, borderRadius: 16, padding: 14,
    marginBottom: 14, borderWidth: 1, borderColor: COLORS.border,
  },
  titleInput: {
    fontSize: 15, fontWeight: '700', color: COLORS.text,
    paddingBottom: 10, marginBottom: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  input: { flex: 1, fontSize: 15, color: COLORS.text, minHeight: 36, lineHeight: 22 },
  sendBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
  },
  recentLabel: { fontSize: 10, fontWeight: '800', color: COLORS.textMuted, letterSpacing: 1.5, marginBottom: 8 },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  emptyText: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', maxWidth: 270, lineHeight: 19 },
});

const grp = StyleSheet.create({
  statsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.surface, borderRadius: 14, padding: 14,
    marginBottom: 12, borderWidth: 1, borderColor: COLORS.border,
  },
  statBox: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 24, fontWeight: '800', color: COLORS.primary },
  statLabel: { fontSize: 10, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  statDivider: { width: 1, height: 30, backgroundColor: COLORS.border, marginHorizontal: 8 },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
  },
  filterChipActive: { backgroundColor: `${COLORS.primary}20`, borderColor: COLORS.primary },
  typeEmoji: { fontSize: 12 },
  filterText: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary },
  filterTextActive: { color: COLORS.primary },
  nodeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.surface, borderRadius: 14, padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: COLORS.border,
  },
  nodeBar: { width: 4, borderRadius: 2, alignSelf: 'stretch' },
  nodeEmoji: { fontSize: 16 },
  nodeTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: COLORS.text },
  edgeCountBadge: { borderRadius: 20, paddingHorizontal: 7, paddingVertical: 2 },
  edgeCount: { fontSize: 11, fontWeight: '700' },
  edgePill: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20,
    borderWidth: 1,
  },
  edgePillText: { fontSize: 10, color: COLORS.textSecondary },
  legend: {
    marginTop: 16, backgroundColor: COLORS.surface, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: COLORS.border,
  },
  legendTitle: { fontSize: 10, fontWeight: '800', color: COLORS.textMuted, letterSpacing: 1.5, marginBottom: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 7, height: 7, borderRadius: 4 },
  legendLabel: { fontSize: 11, color: COLORS.textSecondary },
});

const ndt = StyleSheet.create({
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.surface, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 10,
  },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.text },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
  },
  chipActive: { backgroundColor: `${COLORS.primary}20`, borderColor: COLORS.primary },
  typeEmoji: { fontSize: 12 },
  chipText: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary },
  chipTextActive: { color: COLORS.primary },
});

const prim = StyleSheet.create({
  infoCard: {
    backgroundColor: COLORS.surface, borderRadius: 14, padding: 14, marginBottom: 10,
    borderLeftWidth: 3, borderLeftColor: COLORS.primary,
  },
  infoTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  infoText: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, marginBottom: 10 },
  addBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.primary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  item: {
    width: '47%', backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, minHeight: 110,
    justifyContent: 'space-between', borderWidth: 1, borderColor: `${COLORS.primary}20`,
  },
  catEmoji: { fontSize: 22, marginBottom: 6 },
  itemText: { fontSize: 13, fontWeight: '600', color: COLORS.text, lineHeight: 18, flex: 1 },
  catBadge: {
    backgroundColor: `${COLORS.primary}15`, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3,
    alignSelf: 'flex-start', marginTop: 8,
  },
  catLabel: { fontSize: 10, fontWeight: '700', color: COLORS.primary },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
  },
  catChipActive: { backgroundColor: `${COLORS.primary}20`, borderColor: COLORS.primary },
  catChipText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  catChipTextActive: { color: COLORS.primary },
});
