import { create } from 'zustand';
import { TaskRepository } from '../services/database/taskRepository';
import { today } from '../utils/dateHelpers';
import { eventBus, EVENTS } from '../utils/eventBus';
import { showError } from '../utils/toast';
import type { Task } from '../types/task.types';

interface TaskState {
  tasks: Task[];
  todayTasks: Task[];
  isLoading: boolean;

  loadData: (userId: string) => Promise<void>;
  loadTasks: (userId: string) => Promise<void>;
  loadTodayTasks: (userId: string) => Promise<void>;
  createTask: (data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Task>;
  updateTask: (id: string, data: Partial<Task>) => Promise<void>;
  completeTask: (id: string) => Promise<Task | undefined>;
  unlockReward: (id: string) => Promise<void>;
  cancelTask: (id: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  todayTasks: [],
  isLoading: false,

  loadData: async (userId: string) => {
    set({ isLoading: true });
    try {
      const [all, todayList] = await Promise.all([
        TaskRepository.getByUser(userId),
        TaskRepository.getToday(userId),
      ]);
      set({ tasks: all, todayTasks: todayList });
    } finally {
      set({ isLoading: false });
    }
  },

  loadTasks: async (userId: string) => {
    const [all, todayList] = await Promise.all([
      TaskRepository.getByUser(userId),
      TaskRepository.getToday(userId),
    ]);
    set({ tasks: all, todayTasks: todayList });
  },

  loadTodayTasks: async (userId: string) => {
    const todayTasks = await TaskRepository.getToday(userId);
    set({ todayTasks });
  },

  createTask: async (data) => {
    try {
      const task = await TaskRepository.create(data);
      set(state => ({
        tasks: [task, ...state.tasks],
        todayTasks: task.scheduledDate === today()
          ? [task, ...state.todayTasks]
          : state.todayTasks,
      }));
      eventBus.emit(EVENTS.TASK_CHANGED);
      return task;
    } catch {
      showError('Não foi possível criar a tarefa. Tente novamente.');
      throw new Error('createTask failed');
    }
  },

  updateTask: async (id, data) => {
    await TaskRepository.update(id, data);
    set(state => ({
      tasks: state.tasks.map(t => t.id === id ? { ...t, ...data } : t),
      todayTasks: state.todayTasks.map(t => t.id === id ? { ...t, ...data } : t),
    }));
    eventBus.emit(EVENTS.TASK_CHANGED);
  },

  completeTask: async (id) => {
    await TaskRepository.complete(id);
    const now = new Date().toISOString();

    // CORREÇÃO: race condition resolvido.
    // Antes: "completed" era lido DENTRO do callback set(), que pode executar
    // em qualquer momento (síncrono, mas com o estado atual naquele instante).
    // Se dois set() concorrentes rodassem, "completed" poderia ser undefined
    // mesmo que a tarefa existisse, porque o estado pode ter mudado entre
    // a chamada e a execução do callback.
    //
    // SOLUÇÃO: ler o estado com get() ANTES do set() — get() sempre retorna
    // o estado atual no momento da chamada, de forma determinística.
    // Depois passamos o objeto já construído para o set(), que só precisa
    // fazer o mapeamento — sem leitura de estado dentro do callback.
    const currentTask = get().tasks.find(t => t.id === id);
    const completedTask = currentTask
      ? { ...currentTask, isCompleted: true, completedAt: now, status: 'completed' as const }
      : undefined;

    if (completedTask) {
      // Construímos o estado atualizado fora do set() — função pura, sem side effects.
      set(state => ({
        tasks: state.tasks.map(t => t.id === id ? completedTask : t),
        todayTasks: state.todayTasks.map(t => t.id === id ? completedTask : t),
      }));
    }

    eventBus.emit(EVENTS.TASK_CHANGED);
    return completedTask; // Agora garantidamente reflete o estado correto.
  },

  unlockReward: async (id) => {
    await TaskRepository.unlockReward(id);
    set(state => ({
      tasks: state.tasks.map(t => t.id === id ? { ...t, rewardUnlocked: true } : t),
      todayTasks: state.todayTasks.map(t => t.id === id ? { ...t, rewardUnlocked: true } : t),
    }));
  },

  cancelTask: async (id) => {
    await TaskRepository.cancel(id);
    set(state => ({
      tasks: state.tasks.filter(t => t.id !== id),
      todayTasks: state.todayTasks.filter(t => t.id !== id),
    }));
    eventBus.emit(EVENTS.TASK_CHANGED);
  },

  deleteTask: async (id) => {
    await TaskRepository.delete(id);
    set(state => ({
      tasks: state.tasks.filter(t => t.id !== id),
      todayTasks: state.todayTasks.filter(t => t.id !== id),
    }));
    eventBus.emit(EVENTS.TASK_CHANGED);
  },
}));
