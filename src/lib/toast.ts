import { useSyncExternalStore } from 'react';

export interface ToastItem {
  id: number;
  message: string;
  kind: 'info' | 'success' | 'error';
  action?: { label: string; onClick: () => void };
}

/**
 * Module-level toast store so any code (contexts, event handlers, audio callbacks) can
 * raise a notification without needing to be under a particular provider.
 */
let items: ToastItem[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
const timers = new Map<number, number>();

function emit() {
  items = items.slice();
  listeners.forEach((l) => l());
}

export function dismissToast(id: number): void {
  const t = timers.get(id);
  if (t) window.clearTimeout(t);
  timers.delete(id);
  items = items.filter((i) => i.id !== id);
  emit();
}

export function toast(message: string, kind: ToastItem['kind'] = 'info', action?: ToastItem['action']): void {
  // Collapse identical consecutive messages instead of stacking them.
  const dup = items.find((i) => i.message === message && i.kind === kind);
  if (dup) dismissToast(dup.id);
  const id = nextId++;
  items = [...items.slice(-3), { id, message, kind, action }];
  emit();
  timers.set(id, window.setTimeout(() => dismissToast(id), action ? 6000 : 3200));
}

export const toastSuccess = (m: string, action?: ToastItem['action']) => toast(m, 'success', action);
export const toastError = (m: string) => toast(m, 'error');

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function useToasts(): ToastItem[] {
  return useSyncExternalStore(subscribe, () => items);
}
