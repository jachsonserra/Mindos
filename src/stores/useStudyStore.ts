import { create } from 'zustand';
import { AppState } from 'react-native';
import { StudySubject, StudySession, StudyNote, PomodoroState, POMODORO_WORK_MINUTES } from '../types/study.types';
import {
  StudySubjectRepository,
  StudySessionRepository,
  StudyNoteRepository,
} from '../services/database/studyRepository';
import { today } from '../utils/dateHelpers';

interface StudyState {
  subjects: StudySubject[];
  todaySessions: StudySession[];
  notes: StudyNote[];
  activeSession: StudySession | null;
  pomodoro: PomodoroState;
  pomodoroCompletedCount: number;
  isLoading: boolean;
  loadData: (userId: string) => Promise<void>;
  createSubject: (data: Omit<StudySubject, 'id' | 'createdAt' | 'updatedAt'>) => Promise<StudySubject>;
  updateSubject: (id: string, data: Partial<StudySubject>) => Promise<void>;
  deleteSubject: (id: string) => Promise<void>;
  loadNotesBySubject: (subjectId: string) => Promise<void>;
  createNote: (data: Omit<StudyNote, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  startSession: (userId: string, subjectId: string, plannedMinutes?: number) => Promise<void>;
  pausePomodoro: () => void;
  resumePomodoro: () => void;
  stopSession: () => Promise<void>;
  tickPomodoro: () => void;
}

export const useStudyStore = create<StudyState>((set, get) => ({
  subjects: [],
  todaySessions: [],
  notes: [],
  activeSession: null,
  pomodoro: { status: 'idle', elapsedSeconds: 0 },
  pomodoroCompletedCount: 0,
  isLoading: false,

  loadData: async (userId) => {
    set({ isLoading: true });
    try {
      const [subjects, sessions] = await Promise.all([
        StudySubjectRepository.getByUser(userId),
        StudySessionRepository.getByDate(userId, today()),
      ]);
      set({ subjects, todaySessions: sessions });
    } catch (e) {
      console.error('[StudyStore] loadData:', e);
    } finally {
      set({ isLoading: false });
    }
  },

  createSubject: async (data) => {
    const created = await StudySubjectRepository.create(data);
    set((s) => ({ subjects: [...s.subjects, created] }));
    return created;
  },

  updateSubject: async (id, data) => {
    await StudySubjectRepository.update(id, data);
    set((s) => ({
      subjects: s.subjects.map((sub) => (sub.id === id ? { ...sub, ...data } : sub)),
    }));
  },

  deleteSubject: async (id) => {
    await StudySubjectRepository.delete(id);
    set((s) => ({ subjects: s.subjects.filter((sub) => sub.id !== id) }));
  },

  loadNotesBySubject: async (subjectId) => {
    const notes = await StudyNoteRepository.getBySubject(subjectId);
    set({ notes });
  },

  createNote: async (data) => {
    const created = await StudyNoteRepository.create(data);
    set((s) => ({ notes: [created, ...s.notes] }));
  },

  deleteNote: async (id) => {
    await StudyNoteRepository.delete(id);
    set((s) => ({ notes: s.notes.filter((n) => n.id !== id) }));
  },

  startSession: async (userId, subjectId, plannedMinutes = POMODORO_WORK_MINUTES) => {
    const now = new Date().toISOString();
    const session = await StudySessionRepository.create({
      userId, subjectId, plannedMinutes,
      actualMinutes: 0, pomodoroCount: 0,
      date: today(), startedAt: now,
    });
    set({
      activeSession: session,
      pomodoro: {
        status: 'running',
        elapsedSeconds: 0,
        sessionId: session.id,
        subjectId,
        startedAt: Date.now(),
      },
    });
  },

  pausePomodoro: () => {
    set((s) => ({ pomodoro: { ...s.pomodoro, status: 'paused' } }));
  },

  resumePomodoro: () => {
    set((s) => ({
      pomodoro: { ...s.pomodoro, status: 'running', startedAt: Date.now() },
    }));
  },

  stopSession: async () => {
    const { activeSession, pomodoro, pomodoroCompletedCount } = get();
    if (!activeSession) return;
    const actualMinutes = Math.round(pomodoro.elapsedSeconds / 60);
    await StudySessionRepository.complete(activeSession.id, actualMinutes, pomodoroCompletedCount);
    await StudySubjectRepository.addTime(activeSession.subjectId, actualMinutes);
    set((s) => ({
      activeSession: null,
      pomodoro: { status: 'idle', elapsedSeconds: 0 },
      pomodoroCompletedCount: 0,
      subjects: s.subjects.map((sub) =>
        sub.id === activeSession.subjectId
          ? { ...sub, totalMinutes: sub.totalMinutes + actualMinutes }
          : sub
      ),
    }));
  },

  tickPomodoro: () => {
    const { pomodoro } = get();
    if (pomodoro.status !== 'running') return;
    set((s) => ({
      pomodoro: {
        ...s.pomodoro,
        elapsedSeconds: s.pomodoro.elapsedSeconds + 1,
      },
    }));
  },
}));
