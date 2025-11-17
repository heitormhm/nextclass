import { useEffect } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  handler: () => void;
  description: string;
}

export const useKeyboardShortcuts = (
  shortcuts: KeyboardShortcut[],
  enabled: boolean = true
) => {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const matchingShortcut = shortcuts.find((shortcut) => {
        const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = shortcut.ctrl ? (e.ctrlKey || e.metaKey) : !e.ctrlKey && !e.metaKey;
        const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey;
        const altMatch = shortcut.alt ? e.altKey : !e.altKey;

        return keyMatch && ctrlMatch && shiftMatch && altMatch;
      });

      if (matchingShortcut) {
        e.preventDefault();
        matchingShortcut.handler();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [shortcuts, enabled]);
};

// Common shortcuts for annotation editor
export const getAnnotationEditorShortcuts = (handlers: {
  onSave: () => void;
  onTogglePreview: () => void;
  onInsertCalloutInfo: () => void;
  onInsertCalloutWarning: () => void;
  onInsertDiagram: () => void;
  onShowHelp: () => void;
}): KeyboardShortcut[] => [
  {
    key: 's',
    ctrl: true,
    handler: handlers.onSave,
    description: 'Save annotation',
  },
  {
    key: 'p',
    ctrl: true,
    handler: handlers.onTogglePreview,
    description: 'Toggle preview',
  },
  {
    key: 'c',
    ctrl: true,
    shift: true,
    handler: handlers.onInsertCalloutInfo,
    description: 'Insert info callout',
  },
  {
    key: 'w',
    ctrl: true,
    shift: true,
    handler: handlers.onInsertCalloutWarning,
    description: 'Insert warning callout',
  },
  {
    key: 'd',
    ctrl: true,
    shift: true,
    handler: handlers.onInsertDiagram,
    description: 'Insert diagram placeholder',
  },
  {
    key: '/',
    ctrl: true,
    handler: handlers.onShowHelp,
    description: 'Show keyboard shortcuts',
  },
];
