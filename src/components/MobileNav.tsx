import React from 'react';
import { mobileNavItems } from '../navigation';
import { View } from '../types';

interface MobileNavProps {
  currentView: View;
  setCurrentView: (view: View) => void;
}

export function MobileNav({ currentView, setCurrentView }: MobileNavProps) {
  return (
    <nav className="lg:hidden fixed inset-x-0 bottom-0 grid grid-cols-5 gap-1 px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] bg-surface border-t border-outline-variant z-50 rounded-t-xl shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] transition-all duration-300 ease-out">
      {mobileNavItems.map((item, index) => {
        const isActive = currentView === item.id;
        return (
          <button aria-label={item.label}
            key={index}
            onClick={() => setCurrentView(item.id)}
            className={`min-w-0 h-14 flex flex-col items-center justify-center rounded-lg transition-all duration-300 ease-out ${
              isActive
                ? 'bg-secondary-container text-on-secondary-container px-1'
                : 'text-on-surface-variant hover:text-primary px-1'
            }`}
          >
            <item.icon className="w-5 h-5 shrink-0" />
            <span className={`mt-1 max-w-full truncate text-[10px] leading-none ${isActive ? 'font-medium' : ''}`}>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
