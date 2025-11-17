import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface ShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ShortcutsDialog: React.FC<ShortcutsDialogProps> = ({ open, onOpenChange }) => {
  const shortcuts = [
    { keys: 'Ctrl+S', description: 'Salvar alterações' },
    { keys: 'Ctrl+P', description: 'Toggle preview' },
    { keys: 'Ctrl+Shift+C', description: 'Inserir callout info' },
    { keys: 'Ctrl+Shift+W', description: 'Inserir callout warning' },
    { keys: 'Ctrl+Shift+D', description: 'Inserir diagrama' },
    { keys: 'Ctrl+/', description: 'Mostrar atalhos' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>⌨️ Atalhos de Teclado</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {shortcuts.map((shortcut, idx) => (
            <div key={idx} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <span className="text-sm text-muted-foreground">{shortcut.description}</span>
              <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">{shortcut.keys}</kbd>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
