import type { AppState } from './types';

export let nextId = 1;
export function uid(): number { return nextId++; }

export const state: AppState = {
  title: 'Project Roadmap',
  dateStart: '2026-01-01',
  dateEnd: '2026-06-30',
  sprints: [],
  milestones: [],
  rows: [],
};

export function restoreState(loaded: Partial<AppState>): void {
  state.title     = loaded.title     ?? state.title;
  state.dateStart = loaded.dateStart ?? state.dateStart;
  state.dateEnd   = loaded.dateEnd   ?? state.dateEnd;
  state.sprints    = loaded.sprints    ?? [];
  state.milestones = loaded.milestones ?? [];
  state.rows       = loaded.rows       ?? [];

  let maxId = 0;
  const scanIds = (items: Array<{ id: number; deliverables?: Array<{ id: number }> }>) => {
    items.forEach(item => {
      maxId = Math.max(maxId, item.id ?? 0);
      if (item.deliverables) scanIds(item.deliverables);
    });
  };
  scanIds(state.sprints);
  scanIds(state.milestones);
  scanIds(state.rows);
  nextId = maxId + 1;
}

export function saveToLocalStorage(): void {
  try { localStorage.setItem('roadmap-state', JSON.stringify(state)); } catch (_) {}
}
