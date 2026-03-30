import { create } from 'zustand';
import { DailyCheckIn, PeriodEntry, CheckInPeriod, getCurrentPeriod } from '../types/checkin.types';
import { CheckInRepository } from '../services/database/checkinRepository';
import { today, getLast30Days } from '../utils/dateHelpers';
import { showError } from '../utils/toast';

// Flag de sessão: evita re-abrir automaticamente na mesma sessão
let _sessionAutoOpened = false;

interface CheckInState {
  today: DailyCheckIn | null;
  history: DailyCheckIn[];
  isLoading: boolean;

  // Controle do modal global
  modalOpen: boolean;
  modalPeriod: CheckInPeriod | null;

  loadData: (userId: string) => Promise<void>;
  savePeriod: (userId: string, period: CheckInPeriod, entry: PeriodEntry) => Promise<void>;

  openModal: (period?: CheckInPeriod) => void;
  closeModal: () => void;

  hasPendingCheckIn: () => boolean;
}

export const useCheckInStore = create<CheckInState>((set, get) => ({
  today:       null,
  history:     [],
  isLoading:   false,
  modalOpen:   false,
  modalPeriod: null,

  loadData: async (userId) => {
    set({ isLoading: true });
    try {
      const days = getLast30Days();
      const [todayEntry, history] = await Promise.all([
        CheckInRepository.getByDate(userId, today()),
        CheckInRepository.getByDateRange(userId, days[0], today()),
      ]);
      set({ today: todayEntry, history });

      // Auto-abre o modal uma vez por sessão se houver período pendente
      if (!_sessionAutoOpened) {
        const period = getCurrentPeriod();
        if (period && !todayEntry?.[period]) {
          _sessionAutoOpened = true;
          // Pequeno delay para o app terminar de renderizar antes de abrir
          setTimeout(() => {
            set({ modalOpen: true, modalPeriod: period });
          }, 800);
        }
      }
    } catch (e) {
      console.error('[CheckInStore] loadData:', e);
    } finally {
      set({ isLoading: false });
    }
  },

  savePeriod: async (userId, period, entry) => {
    try {
      const saved = await CheckInRepository.savePeriod(userId, today(), period, entry);
      set((s) => ({
        today: saved,
        history: s.history.some(h => h.date === today())
          ? s.history.map(h => h.date === today() ? saved : h)
          : [saved, ...s.history],
      }));
    } catch {
      showError('Não foi possível salvar o check-in. Tente novamente.');
    }
  },

  openModal: (period) => {
    const p = period ?? getCurrentPeriod();
    if (!p) return;
    set({ modalOpen: true, modalPeriod: p });
  },

  closeModal: () => set({ modalOpen: false, modalPeriod: null }),

  hasPendingCheckIn: () => {
    const period = getCurrentPeriod();
    if (!period) return false;
    const t = get().today;
    if (!t) return true;
    return !t[period];
  },
}));
