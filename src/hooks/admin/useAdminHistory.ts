import { useState, useCallback } from 'react';

export interface HistoryAction {
  id: string;
  type: string;
  description: string;
  timestamp: number;
  undo?: () => Promise<void>;
  redo?: () => Promise<void>;
  data?: any;
}

const MAX_HISTORY = 50;

export const useAdminHistory = () => {
  const [history, setHistory] = useState<HistoryAction[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);

  const addAction = useCallback((action: Omit<HistoryAction, 'id' | 'timestamp'>) => {
    const newAction: HistoryAction = {
      ...action,
      id: `action_${Date.now()}`,
      timestamp: Date.now(),
    };

    setHistory(prev => {
      // Remove any actions after current index (when adding after undo)
      const truncated = prev.slice(0, currentIndex + 1);
      const updated = [...truncated, newAction].slice(-MAX_HISTORY);
      return updated;
    });
    setCurrentIndex(prev => Math.min(prev + 1, MAX_HISTORY - 1));
  }, [currentIndex]);

  const canUndo = currentIndex >= 0;
  const canRedo = currentIndex < history.length - 1;

  const undo = useCallback(async () => {
    if (!canUndo) return;
    
    const action = history[currentIndex];
    if (action?.undo) {
      await action.undo();
    }
    setCurrentIndex(prev => prev - 1);
  }, [canUndo, history, currentIndex]);

  const redo = useCallback(async () => {
    if (!canRedo) return;
    
    const action = history[currentIndex + 1];
    if (action?.redo) {
      await action.redo();
    }
    setCurrentIndex(prev => prev + 1);
  }, [canRedo, history, currentIndex]);

  const clearHistory = useCallback(() => {
    setHistory([]);
    setCurrentIndex(-1);
  }, []);

  return {
    history,
    currentAction: history[currentIndex],
    canUndo,
    canRedo,
    addAction,
    undo,
    redo,
    clearHistory,
  };
};
