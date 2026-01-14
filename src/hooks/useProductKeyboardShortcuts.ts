import { useEffect, useCallback } from "react";

interface ProductKeyboardShortcutsOptions {
  onNewProduct?: () => void;
  onSearch?: () => void;
  onSave?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onExport?: () => void;
  onImport?: () => void;
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
  onNextProduct?: () => void;
  onPrevProduct?: () => void;
  onToggleFeatured?: () => void;
  onToggleStock?: () => void;
  onEscape?: () => void;
  enabled?: boolean;
}

export function useProductKeyboardShortcuts({
  onNewProduct,
  onSearch,
  onSave,
  onDelete,
  onDuplicate,
  onExport,
  onImport,
  onSelectAll,
  onDeselectAll,
  onNextProduct,
  onPrevProduct,
  onToggleFeatured,
  onToggleStock,
  onEscape,
  enabled = true,
}: ProductKeyboardShortcutsOptions) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabled) return;

    // Check if user is typing in an input/textarea
    const target = e.target as HTMLElement;
    const isEditing = target.tagName === 'INPUT' || 
                      target.tagName === 'TEXTAREA' || 
                      target.isContentEditable;

    // Escape always works
    if (e.key === 'Escape') {
      onEscape?.();
      return;
    }

    // Other shortcuts only work when not editing
    if (isEditing) return;

    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

    // Ctrl/Cmd + N - New product
    if (cmdOrCtrl && e.key === 'n') {
      e.preventDefault();
      onNewProduct?.();
      return;
    }

    // Ctrl/Cmd + F or / - Search
    if ((cmdOrCtrl && e.key === 'f') || e.key === '/') {
      e.preventDefault();
      onSearch?.();
      return;
    }

    // Ctrl/Cmd + S - Save
    if (cmdOrCtrl && e.key === 's') {
      e.preventDefault();
      onSave?.();
      return;
    }

    // Ctrl/Cmd + D - Duplicate
    if (cmdOrCtrl && e.key === 'd') {
      e.preventDefault();
      onDuplicate?.();
      return;
    }

    // Ctrl/Cmd + A - Select all
    if (cmdOrCtrl && e.key === 'a') {
      e.preventDefault();
      onSelectAll?.();
      return;
    }

    // Ctrl/Cmd + Shift + A - Deselect all
    if (cmdOrCtrl && e.shiftKey && e.key === 'A') {
      e.preventDefault();
      onDeselectAll?.();
      return;
    }

    // Ctrl/Cmd + E - Export
    if (cmdOrCtrl && e.key === 'e') {
      e.preventDefault();
      onExport?.();
      return;
    }

    // Ctrl/Cmd + I - Import
    if (cmdOrCtrl && e.key === 'i') {
      e.preventDefault();
      onImport?.();
      return;
    }

    // Delete/Backspace - Delete selected
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      onDelete?.();
      return;
    }

    // Arrow keys for navigation
    if (e.key === 'ArrowDown' || e.key === 'j') {
      e.preventDefault();
      onNextProduct?.();
      return;
    }

    if (e.key === 'ArrowUp' || e.key === 'k') {
      e.preventDefault();
      onPrevProduct?.();
      return;
    }

    // F - Toggle featured
    if (e.key === 'f' && !cmdOrCtrl) {
      e.preventDefault();
      onToggleFeatured?.();
      return;
    }

    // S - Toggle stock
    if (e.key === 's' && !cmdOrCtrl) {
      e.preventDefault();
      onToggleStock?.();
      return;
    }
  }, [
    enabled,
    onNewProduct,
    onSearch,
    onSave,
    onDelete,
    onDuplicate,
    onExport,
    onImport,
    onSelectAll,
    onDeselectAll,
    onNextProduct,
    onPrevProduct,
    onToggleFeatured,
    onToggleStock,
    onEscape,
  ]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return {
    shortcuts: [
      { key: 'Ctrl+N', description: 'מוצר חדש' },
      { key: 'Ctrl+F / /', description: 'חיפוש' },
      { key: 'Ctrl+S', description: 'שמור' },
      { key: 'Ctrl+D', description: 'שכפל' },
      { key: 'Ctrl+A', description: 'בחר הכל' },
      { key: 'Ctrl+E', description: 'ייצוא' },
      { key: 'Ctrl+I', description: 'ייבוא' },
      { key: 'Delete', description: 'מחק נבחרים' },
      { key: '↑/↓ or j/k', description: 'ניווט' },
      { key: 'F', description: 'החלף קידום' },
      { key: 'S', description: 'החלף מלאי' },
      { key: 'Esc', description: 'ביטול' },
    ]
  };
}
