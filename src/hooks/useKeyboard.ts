import { useEffect } from 'react';

export interface KeyHandlers {
  onLeft?: () => void;
  onRight?: () => void;
  onSkip?: () => void;
  onUndo?: () => void;
  onResults?: () => void;
  onTheme?: () => void;
  enabled?: boolean;
}

export function useKeyboard(handlers: KeyHandlers) {
  useEffect(() => {
    if (handlers.enabled === false) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

      switch (e.key) {
        case 'ArrowLeft':
          if (handlers.onLeft) {
            e.preventDefault();
            handlers.onLeft();
          }
          break;
        case 'ArrowRight':
          if (handlers.onRight) {
            e.preventDefault();
            handlers.onRight();
          }
          break;
        case 's':
        case 'S':
          if (handlers.onSkip) {
            e.preventDefault();
            handlers.onSkip();
          }
          break;
        case 'u':
        case 'U':
          if (handlers.onUndo) {
            e.preventDefault();
            handlers.onUndo();
          }
          break;
        case 'r':
        case 'R':
          if (handlers.onResults) {
            e.preventDefault();
            handlers.onResults();
          }
          break;
        case 't':
        case 'T':
          if (handlers.onTheme) {
            e.preventDefault();
            handlers.onTheme();
          }
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handlers]);
}
