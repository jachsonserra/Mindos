import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Modal, TextInput, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../src/utils/constants';
import { useStudyStore } from '../../src/stores/useStudyStore';
import { useUserStore } from '../../src/stores/useUserStore';
import { PomodoroTimer } from '../../src/components/ui/PomodoroTimer';
import { StudyNote, StudySubject, SUBJECT_COLORS, POMODORO_WORK_MINUTES } from '../../src/types/study.types';
import { NotificationService } from '../../src/services/notifications/notificationService';
import { today } from '../../src/utils/dateHelpers';

export default function StudiesScreen() {
  const { user } = useUserStore();
  const {
    subjects, todaySessions, notes,
    pomodoro, pomodoroCompletedCount,
    loadData, createSubject, deleteSubject, loadNotesBySubject, createNote, deleteNote,
    startSession, pausePomodoro, resumePomodoro, stopSession, tickPomodoro,
  } = useStudyStore();

  const [selectedSubject, setSelectedSubject] = useState<StudySubject | null>(null);
  const [showNewSubject, setShowNewSubject] = useState(false);
  const [showNewNote, setShowNewNote] = useState(false);
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);
  const [showStopConfirm, setShowStopConfirm] = useState(false);

  // Forms
  const [subTitle, setSubTitle] = useState('');
  const [subDesc, setSubDesc] = useState('');
  const [subColor, setSubColor] = useState(SUBJECT_COLORS[0]);
  const [noteContent, setNoteContent] = useState('');
  const [noteTitle, setNoteTitle] = useState('');
  const [noteType, setNoteType] = useState<'note' | 'summary' | 'link'>('note');

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Recarregar ao focar
  useFocusEffect(
    useCallback(() => { if (user?.id) loadData(user.id); }, [user?.id])
  );

  // Timer tick
  useEffect(() => {
    if (pomodoro.status === 'running') {
      timerRef.current = setInterval(() => tickPomodoro(), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [pomodoro.status]);

  // Checar se pomodoro acabou
  useEffect(() => {
    const plannedSecs = POMODORO_WORK_MINUTES * 60;
    if (pomodoro.elapsedSeconds >= plannedSecs && pomodoro.status === 'running') {
      NotificationService.schedulePomodoroEnd(0).catch(() => {});
      stopSession();
    }
  }, [pomodoro.elapsedSeconds]);

  async function handleStartPomodoro() {
    if (!user || !selectedSubject) {
      // Sem assunto selecionado — não abre Alert, apenas retorna (UI já mostra a lista de assuntos)
      return;
    }
    await startSession(user.id, selectedSubject.id, POMODORO_WORK_MINUTES);
    NotificationService.schedulePomodoroEnd(POMODORO_WORK_MINUTES).catch(() => {});
  }

  async function handleCreateSubject() {
    if (!user || !subTitle.trim()) return;
    const created = await createSubject({
      userId: user.id, title: subTitle.trim(), description: subDesc.trim(),
      color: subColor, totalMinutes: 0, orderIndex: subjects.length, isActive: true,
    });
    setSelectedSubject(created);
    setSubTitle(''); setSubDesc(''); setSubColor(SUBJECT_COLORS[0]);
    setShowNewSubject(false);
  }

  async function handleCreateNote() {
    if (!user || !noteContent.trim() || !expandedSubject) return;
    await createNote({
      userId: user.id, subjectId: expandedSubject,
      title: noteTitle.trim() || undefined, content: noteContent.trim(),
      type: noteType, tags: [],
    });
    setNoteContent(''); setNoteTitle(''); setNoteType('note');
    setShowNewNote(false);
  }

  async function handleExpandSubject(id: string) {
    if (expandedSubject === id) {
      setExpandedSubject(null);
    } else {
      setExpandedSubject(id);
      await loadNotesBySubject(id);
    }
  }

  const todayMinutes = todaySessions.reduce((acc, s) => acc + (s.actualMinutes || 0), 0);

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <View style={s.header}>
        <View>
          <Text style={s.title}>Estudos</Text>
          <Text style={s.subtitle}>
            {todayMinutes > 0 ? `${todayMinutes} min estudados hoje` : 'Pronto para começar?'}
          </Text>
        </View>
        <TouchableOpacity style={s.addBtn} onPress={() => setShowNewSubject(true)}>
          <Ionicons name="add" size={24} color={COLORS.surface} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* ─── POMODORO ─── */}
        <View style={s.pomodoroCard}>
          {/* Seletor de assunto */}
          {subjects.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              <View style={s.subjectPicker}>
                {subjects.map((sub) => (
                  <TouchableOpacity
                    key={sub.id}
                    style={[s.subjectChip, selectedSubject?.id === sub.id && { backgroundColor: sub.color, borderColor: sub.color }]}
                    onPress={() => setSelectedSubject(sub)}
                  >
                    <View style={[s.subjectDot, { backgroundColor: sub.color }]} />
                    <Text style={[s.subjectChipText, selectedSubject?.id === sub.id && { color: COLORS.surface }]}>
                      {sub.title}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          )}

          <PomodoroTimer
            status={pomodoro.status}
            elapsedSeconds={pomodoro.elapsedSeconds}
            plannedMinutes={POMODORO_WORK_MINUTES}
            subjectTitle={selectedSubject?.title}
            pomodoroCount={pomodoroCompletedCount}
            onStart={handleStartPomodoro}
            onPause={pausePomodoro}
            onResume={resumePomodoro}
            onStop={() => setShowStopConfirm(true)}
          />
        </View>

        {/* ─── ASSUNTOS ─── */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Meus Assuntos</Text>
          <TouchableOpacity onPress={() => setShowNewSubject(true)}>
            <Text style={s.sectionLink}>+ Novo</Text>
          </TouchableOpacity>
        </View>

        {subjects.length === 0 && (
          <View style={s.empty}>
            <Ionicons name="book-outline" size={48} color={COLORS.textMuted} />
            <Text style={s.emptyTitle}>Nenhum assunto ainda</Text>
            <Text style={s.emptyText}>Crie tópicos de estudo e comece a acumular conhecimento.</Text>
          </View>
        )}

        {subjects.map((sub) => {
          const hours = Math.floor(sub.totalMinutes / 60);
          const mins = sub.totalMinutes % 60;
          const isOpen = expandedSubject === sub.id;
          const subNotes = isOpen ? notes.filter((n) => n.subjectId === sub.id) : [];

          return (
            <View key={sub.id} style={[s.subjectCard, { borderLeftColor: sub.color }]}>
              <TouchableOpacity style={s.subjectHeader} onPress={() => handleExpandSubject(sub.id)}>
                <View style={[s.subjectIcon, { backgroundColor: `${sub.color}18` }]}>
                  <Ionicons name="book" size={18} color={sub.color} />
                </View>
                <View style={s.subjectInfo}>
                  <Text style={s.subjectTitle}>{sub.title}</Text>
                  <Text style={s.subjectTime}>
                    {hours > 0 ? `${hours}h ` : ''}{mins}min acumulados
                  </Text>
                </View>
                <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color={COLORS.textMuted} />
              </TouchableOpacity>

              {isOpen && (
                <View style={s.subjectExpanded}>
                  {subNotes.length > 0 && (
                    <View style={s.notesList}>
                      {subNotes.map((note) => (
                        <NoteCard key={note.id} note={note} onDelete={() => deleteNote(note.id)} />
                      ))}
                    </View>
                  )}
                  <TouchableOpacity
                    style={s.addNoteBtn}
                    onPress={() => {
                      setExpandedSubject(sub.id);
                      setShowNewNote(true);
                    }}
                  >
                    <Ionicons name="add" size={16} color={COLORS.primary} />
                    <Text style={s.addNoteBtnText}>Adicionar anotação</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}
        {/* ─── SESSÕES DE HOJE ─── */}
        {todaySessions.length > 0 && (
          <View>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Sessões de Hoje</Text>
              <Text style={s.sectionLink}>{todayMinutes} min total</Text>
            </View>
            {todaySessions.map((session, i) => {
              const sub = subjects.find(s2 => s2.id === session.subjectId);
              const mins = session.actualMinutes ?? 0;
              const timeStr = session.startedAt
                ? new Date(session.startedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                : '--:--';
              return (
                <View key={session.id ?? i} style={[s.sessionRow, sub && { borderLeftColor: sub.color }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.sessionSubject}>{sub?.title ?? 'Assunto'}</Text>
                    <Text style={s.sessionMeta}>{timeStr} · {mins} min</Text>
                  </View>
                  {Array.from({ length: Math.min(mins / POMODORO_WORK_MINUTES, 5) }).map((_, j) => (
                    <Text key={j} style={s.sessionTomato}>🍅</Text>
                  ))}
                </View>
              );
            })}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Modal: Novo Assunto */}
      <Modal visible={showNewSubject} transparent animationType="slide">
        <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>Novo Assunto</Text>
            <TextInput style={s.input} placeholder="Nome do assunto (ex: Marketing Digital)" value={subTitle} onChangeText={setSubTitle} />
            <TextInput style={[s.input, s.inputMulti]} placeholder="Descrição (opcional)" value={subDesc} onChangeText={setSubDesc} multiline />
            <View style={s.colorRow}>
              {SUBJECT_COLORS.map((c) => (
                <TouchableOpacity key={c} style={[s.colorDot, { backgroundColor: c }, subColor === c && s.colorDotSelected]} onPress={() => setSubColor(c)} />
              ))}
            </View>
            <View style={s.modalActions}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setShowNewSubject(false)}><Text style={s.cancelText}>Cancelar</Text></TouchableOpacity>
              <TouchableOpacity style={[s.saveBtn, !subTitle.trim() && { opacity: 0.5 }]} onPress={handleCreateSubject}>
                <Text style={s.saveBtnText}>Criar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal: Nova Nota */}
      <Modal visible={showNewNote} transparent animationType="slide">
        <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>Nova Anotação</Text>
            <View style={s.noteTypeRow}>
              {(['note', 'summary', 'link'] as const).map((t) => (
                <TouchableOpacity key={t} style={[s.noteTypeChip, noteType === t && s.noteTypeChipActive]} onPress={() => setNoteType(t)}>
                  <Text style={[s.noteTypeText, noteType === t && { color: COLORS.surface }]}>
                    {t === 'note' ? '📝 Nota' : t === 'summary' ? '📄 Resumo' : '🔗 Link'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput style={s.input} placeholder="Título (opcional)" value={noteTitle} onChangeText={setNoteTitle} />
            <TextInput
              style={[s.input, s.inputMulti]}
              placeholder={noteType === 'link' ? 'Cole o link aqui' : 'Conteúdo da anotação...'}
              value={noteContent}
              onChangeText={setNoteContent}
              multiline
              autoFocus
            />
            <View style={s.modalActions}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setShowNewNote(false)}><Text style={s.cancelText}>Cancelar</Text></TouchableOpacity>
              <TouchableOpacity style={[s.saveBtn, !noteContent.trim() && { opacity: 0.5 }]} onPress={handleCreateNote}>
                <Text style={s.saveBtnText}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Modal: confirmar encerramento do Pomodoro ── */}
      <Modal visible={showStopConfirm} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 32 }}>
          <View style={{ backgroundColor: COLORS.surface, borderRadius: 20, padding: 24, width: '100%', maxWidth: 360, gap: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: COLORS.text, textAlign: 'center' }}>⏹ Encerrar sessão</Text>
            <Text style={{ fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20 }}>
              Deseja encerrar o Pomodoro atual? O tempo já registrado será salvo.
            </Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: COLORS.surfaceAlt, alignItems: 'center' }}
                onPress={() => setShowStopConfirm(false)}
              >
                <Text style={{ fontSize: 15, fontWeight: '600', color: COLORS.text }}>Continuar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#E05C45', alignItems: 'center' }}
                onPress={() => { stopSession(); setShowStopConfirm(false); }}
              >
                <Text style={{ fontSize: 15, fontWeight: '600', color: '#fff' }}>Encerrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function NoteCard({ note, onDelete }: { note: StudyNote; onDelete: () => void }) {
  const icons = { note: 'document-text', summary: 'reader', link: 'link', image: 'image' };
  return (
    <View style={nc.card}>
      <View style={nc.top}>
        <Ionicons name={icons[note.type] as any} size={14} color={COLORS.primary} />
        {note.title && <Text style={nc.title}>{note.title}</Text>}
        <TouchableOpacity onPress={onDelete}>
          <Ionicons name="trash-outline" size={14} color={COLORS.textMuted} />
        </TouchableOpacity>
      </View>
      <Text style={nc.content} numberOfLines={3}>{note.content}</Text>
      <Text style={nc.date}>{note.createdAt.split('T')[0]}</Text>
    </View>
  );
}

const nc = StyleSheet.create({
  card: {
    backgroundColor: COLORS.background, borderRadius: 10, padding: 12, gap: 4,
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { flex: 1, fontSize: 13, fontWeight: '600', color: COLORS.text },
  content: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },
  date: { fontSize: 10, color: COLORS.textMuted },
});

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 12, paddingHorizontal: 20, paddingBottom: 12,
  },
  title: { fontSize: 24, fontWeight: '700', color: COLORS.text },
  subtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 20, gap: 16 },
  pomodoroCard: {
    backgroundColor: COLORS.surface, borderRadius: 20, padding: 20,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
  },
  subjectPicker: { flexDirection: 'row', gap: 8 },
  subjectChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface,
  },
  subjectDot: { width: 8, height: 8, borderRadius: 4 },
  subjectChipText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  sectionLink: { fontSize: 14, color: COLORS.primary, fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  emptyText: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center' },
  subjectCard: {
    backgroundColor: COLORS.surface, borderRadius: 14, borderLeftWidth: 4, overflow: 'hidden',
  },
  subjectHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  subjectIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  subjectInfo: { flex: 1 },
  subjectTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  subjectTime: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  subjectExpanded: { paddingHorizontal: 14, paddingBottom: 14, gap: 10 },
  notesList: { gap: 8 },
  addNoteBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: COLORS.primary, borderRadius: 10,
    paddingVertical: 8, paddingHorizontal: 12, borderStyle: 'dashed',
  },
  addNoteBtnText: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modal: {
    backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, gap: 14,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  noteTypeRow: { flexDirection: 'row', gap: 8 },
  noteTypeChip: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface,
  },
  noteTypeChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  noteTypeText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
  input: {
    backgroundColor: COLORS.surfaceAlt, borderRadius: 12, padding: 14,
    fontSize: 14, color: COLORS.text, borderWidth: 1, borderColor: COLORS.border,
  },
  inputMulti: { minHeight: 100, textAlignVertical: 'top' },
  colorRow: { flexDirection: 'row', gap: 10 },
  colorDot: { width: 28, height: 28, borderRadius: 14 },
  colorDotSelected: { borderWidth: 3, borderColor: COLORS.text },
  modalActions: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  cancelText: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '600' },
  saveBtn: { flex: 2, padding: 14, borderRadius: 12, backgroundColor: COLORS.primary, alignItems: 'center' },
  saveBtnText: { fontSize: 14, color: COLORS.surface, fontWeight: '700' },

  // Sessões de hoje
  sessionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.surface, borderRadius: 12, padding: 12,
    marginBottom: 6, borderLeftWidth: 3, borderLeftColor: COLORS.primary,
  },
  sessionSubject: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  sessionMeta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  sessionTomato: { fontSize: 16 },
});
