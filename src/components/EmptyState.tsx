import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}

export function EmptyState({ icon: Icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 bg-surface-variant text-on-surface-variant rounded-full flex items-center justify-center mb-6">
        <Icon className="w-8 h-8" />
      </div>
      <h3 className="text-[18px] font-heading font-semibold text-on-surface mb-2">{title}</h3>
      <p className="text-[14px] text-on-surface-variant max-w-md mx-auto mb-6 leading-relaxed">
        {description}
      </p>
      <button 
        onClick={onAction}
        className="bg-primary text-on-primary px-6 py-2.5 rounded-xl text-[14px] font-medium hover:opacity-90 transition-opacity shadow-sm"
      >
        {actionLabel}
      </button>
    </div>
  );
}
