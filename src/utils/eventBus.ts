/**
 * MindOS EventBus — single source of truth for domain events.
 * After any create/update/delete, emit the relevant event so
 * all interested stores can reload only what's needed.
 */

type Listener = () => void;

class EventBus {
  private listeners: Record<string, Listener[]> = {};

  on(event: string, fn: Listener) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(fn);
    // Return unsubscribe function
    return () => this.off(event, fn);
  }

  off(event: string, fn: Listener) {
    this.listeners[event] = (this.listeners[event] ?? []).filter(l => l !== fn);
  }

  emit(event: string) {
    // Aciona apenas listeners do evento específico
    // refresh:all deve ser emitido explicitamente quando necessário
    (this.listeners[event] ?? []).forEach(fn => fn());
  }
}

export const eventBus = new EventBus();

// ── Domain event names ────────────────────────────────────────
export const EVENTS = {
  OBJECTIVE_CHANGED: 'objective:changed',
  GOAL_CHANGED:      'goal:changed',
  TASK_CHANGED:      'task:changed',
  HABIT_CHANGED:     'habit:changed',
  AGENDA_CHANGED:    'agenda:changed',
  FINANCE_CHANGED:   'finance:changed',
  MIND_CHANGED:      'mind:changed',
  REFRESH_ALL:       'refresh:all',
} as const;
