import { useEffect, useState, useCallback } from 'react';

interface OfflineStatus {
  isOnline: boolean;
  wasOffline: boolean;
}

interface QueuedAction {
  id: string;
  action: string;
  payload: any;
  timestamp: number;
}

const QUEUE_KEY = 'petid-offline-queue';

/**
 * Hook for managing offline state and syncing queued actions
 */
export const useOfflineSupport = () => {
  const [status, setStatus] = useState<OfflineStatus>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    wasOffline: false,
  });
  const [queuedActions, setQueuedActions] = useState<QueuedAction[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Load queued actions from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem(QUEUE_KEY);
    if (saved) {
      try {
        setQueuedActions(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse offline queue:', e);
      }
    }
  }, []);

  // Save queued actions to localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queuedActions));
  }, [queuedActions]);

  // Listen for online/offline events
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      setStatus(prev => ({ isOnline: true, wasOffline: prev.wasOffline || !prev.isOnline }));
    };

    const handleOffline = () => {
      setStatus({ isOnline: false, wasOffline: true });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Queue an action for later execution
  const queueAction = useCallback((action: string, payload: any) => {
    const newAction: QueuedAction = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      action,
      payload,
      timestamp: Date.now(),
    };

    setQueuedActions(prev => [...prev, newAction]);
    return newAction.id;
  }, []);

  // Remove an action from the queue
  const removeFromQueue = useCallback((id: string) => {
    setQueuedActions(prev => prev.filter(a => a.id !== id));
  }, []);

  // Clear the entire queue
  const clearQueue = useCallback(() => {
    setQueuedActions([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(QUEUE_KEY);
    }
  }, []);

  // Process queued actions
  const processQueue = useCallback(async (
    processor: (action: QueuedAction) => Promise<boolean>
  ) => {
    if (!status.isOnline || queuedActions.length === 0 || isSyncing) {
      return { success: 0, failed: 0 };
    }

    setIsSyncing(true);
    let success = 0;
    let failed = 0;

    for (const action of queuedActions) {
      try {
        const result = await processor(action);
        if (result) {
          removeFromQueue(action.id);
          success++;
        } else {
          failed++;
        }
      } catch (error) {
        console.error('Failed to process queued action:', error);
        failed++;
      }
    }

    setIsSyncing(false);
    return { success, failed };
  }, [status.isOnline, queuedActions, isSyncing, removeFromQueue]);

  // Reset wasOffline flag
  const acknowledgeReconnection = useCallback(() => {
    setStatus(prev => ({ ...prev, wasOffline: false }));
  }, []);

  return {
    isOnline: status.isOnline,
    wasOffline: status.wasOffline,
    queuedActions,
    queuedCount: queuedActions.length,
    isSyncing,
    queueAction,
    removeFromQueue,
    clearQueue,
    processQueue,
    acknowledgeReconnection,
  };
};

export default useOfflineSupport;
