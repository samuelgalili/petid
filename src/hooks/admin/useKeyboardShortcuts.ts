import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

interface Shortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  description: string;
}

export const useKeyboardShortcuts = () => {
  const navigate = useNavigate();

  const shortcuts: Shortcut[] = [
    { key: 'd', ctrl: true, action: () => navigate('/admin/growo'), description: 'דשבורד' },
    { key: 'o', ctrl: true, action: () => navigate('/admin/orders'), description: 'הזמנות' },
    { key: 'p', ctrl: true, action: () => navigate('/admin/products'), description: 'מוצרים' },
    { key: 'u', ctrl: true, action: () => navigate('/admin/users'), description: 'משתמשים' },
    { key: 't', ctrl: true, action: () => navigate('/admin/tasks'), description: 'משימות' },
    { key: 'l', ctrl: true, action: () => navigate('/admin/leads'), description: 'לידים' },
    { key: 'a', ctrl: true, action: () => navigate('/admin/analytics'), description: 'אנליטיקות' },
    { key: 's', ctrl: true, shift: true, action: () => navigate('/admin/settings'), description: 'הגדרות' },
  ];

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Ignore when typing in inputs
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }

    for (const shortcut of shortcuts) {
      const ctrlMatch = shortcut.ctrl ? (e.ctrlKey || e.metaKey) : true;
      const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey;
      const altMatch = shortcut.alt ? e.altKey : !e.altKey;

      if (e.key.toLowerCase() === shortcut.key && ctrlMatch && shiftMatch && altMatch) {
        e.preventDefault();
        shortcut.action();
        break;
      }
    }
  }, [shortcuts]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return { shortcuts };
};
