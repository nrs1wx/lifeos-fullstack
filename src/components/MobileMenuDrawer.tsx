import React from 'react';
import { Brain, Moon, Plus, Settings, Sun, User, X } from 'lucide-react';
import { navigationGroups } from '../navigation';
import { View } from '../types';
import { useStore } from '../store';

interface MobileMenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentView: View;
  setCurrentView: (view: View) => void;
  isDarkMode?: boolean;
  toggleTheme?: () => void;
}

export function MobileMenuDrawer({ isOpen, onClose, currentView, setCurrentView, isDarkMode, toggleTheme }: MobileMenuDrawerProps) {
  const { setNewEntryModalOpen, userProfile } = useStore();

  const navigate = (view: View) => {
    setCurrentView(view);
    onClose();
  };

  const openNewEntry = () => {
    setNewEntryModalOpen(true);
    onClose();
  };

  return (
    <div className={`lg:hidden fixed inset-0 z-[70] ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`} aria-hidden={!isOpen}>
      <button
        aria-label="Close menu"
        onClick={onClose}
        className={`absolute inset-0 bg-black/40 transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0'}`}
      />

      <nav
        className={`absolute left-0 top-0 h-full w-[min(86vw,22rem)] bg-surface-container-low border-r border-outline-variant shadow-2xl flex flex-col px-3 py-4 transition-transform duration-200 ease-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="mb-5 px-2 pt-1 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center text-on-primary shadow-sm shrink-0">
              <Brain className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-[20px] font-heading font-bold text-on-surface leading-tight">LifeOS</h1>
              <p className="text-[11px] font-mono text-on-surface-variant uppercase tracking-widest mt-0.5 truncate">Digital Zen</p>
            </div>
          </div>
          <button aria-label="Close menu" onClick={onClose} className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-variant">
            <X className="w-5 h-5" />
          </button>
        </div>

        <button
          aria-label="New Entry"
          onClick={openNewEntry}
          className="w-full bg-primary text-on-primary rounded-lg py-3 px-4 text-[14px] font-medium flex items-center justify-center gap-2 mb-5 hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          New Entry
        </button>

        <div className="flex-1 overflow-y-auto hide-scrollbar -mx-1 px-1 space-y-5 pb-4">
          {navigationGroups.map((group) => (
            <div key={group.title}>
              <div className="px-3 mb-2 text-[11px] font-medium text-on-surface-variant uppercase tracking-wider">
                {group.title}
              </div>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const isActive = currentView === item.id;
                  return (
                    <button
                      aria-label={item.label}
                      key={item.id}
                      onClick={() => navigate(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-3 transition-colors duration-200 ease-in-out rounded-lg text-[14px] ${
                        isActive
                          ? 'bg-primary-container text-on-primary-container font-medium'
                          : 'text-on-surface-variant hover:bg-surface-variant hover:text-on-surface'
                      }`}
                    >
                      <item.icon className="w-5 h-5 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t border-outline-variant space-y-1">
          <button
            onClick={() => navigate('settings')}
            className={`w-full flex items-center gap-3 px-3 py-3 transition-colors duration-200 ease-in-out rounded-lg text-[14px] ${
              currentView === 'settings'
                ? 'bg-primary-container text-on-primary-container font-medium'
                : 'text-on-surface-variant hover:bg-surface-variant hover:text-on-surface'
            }`}
          >
            <Settings className="w-5 h-5 shrink-0" />
            <span className="truncate">System Settings</span>
          </button>
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 text-on-surface-variant px-3 py-3 hover:bg-surface-variant hover:text-on-surface transition-colors duration-200 ease-in-out rounded-lg text-[14px]"
          >
            {isDarkMode ? <Sun className="w-5 h-5 shrink-0" /> : <Moon className="w-5 h-5 shrink-0" />}
            <span className="truncate">{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
          </button>

          <div className="mt-3 pt-3 border-t border-outline-variant">
            <div className="w-full flex items-center gap-3 px-2 py-1.5 text-left">
              <div className="w-9 h-9 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div className="overflow-hidden">
                <div className="text-[13px] font-medium text-on-surface truncate">{userProfile.name || 'User'}</div>
                <div className="text-[11px] text-on-surface-variant truncate">{userProfile.email || ''}</div>
              </div>
            </div>
          </div>
        </div>
      </nav>
    </div>
  );
}
