import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDestructive?: boolean;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  isDestructive = true
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface border border-outline-variant rounded-2xl overflow-hidden shadow-xl flex flex-col shrink-0 w-full animate-in fade-in zoom-in-95 duration-200" style={{ width: "calc(100vw - 2rem)", maxWidth: "24rem", maxHeight: "90vh" }}>
        <div className="p-6">
          <div className="flex justify-center mb-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isDestructive ? 'bg-error/10 text-error' : 'bg-primary/10 text-primary'}`}>
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>
          <h2 className="text-[18px] font-heading font-bold text-on-surface text-center mb-2">{title}</h2>
          <p className="text-[14px] text-on-surface-variant text-center mb-6">{message}</p>
          
          <div className="flex gap-3">
            <button 
              onClick={onCancel} 
              className="flex-1 bg-surface border border-outline-variant text-on-surface py-2.5 rounded-xl text-[14px] font-medium hover:bg-surface-variant transition-colors"
            >
              {cancelLabel}
            </button>
            <button 
              onClick={() => {
                onConfirm();
              }} 
              className={`flex-1 py-2.5 rounded-xl text-[14px] font-medium transition-colors ${
                isDestructive 
                  ? 'bg-error text-on-error hover:opacity-90' 
                  : 'bg-primary text-on-primary hover:opacity-90'
              }`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
