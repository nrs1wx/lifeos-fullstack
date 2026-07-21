import React from 'react';
import { Plus, Settings, Moon, Sun, Brain, User } from 'lucide-react';
import { navigationGroups } from '../navigation';
import { View } from '../types';
import { useStore } from '../store';

interface SidebarProps {
  currentView: View;
  setCurrentView: (view: View) => void;
  isDarkMode?: boolean;
  toggleTheme?: () => void;
}

export function Sidebar({ currentView, setCurrentView, isDarkMode, toggleTheme }: SidebarProps) {
  const { setNewEntryModalOpen, userProfile } = useStore();
  
  return (
    <nav className="hidden lg:flex w-sidebar h-screen sticky left-0 bg-surface-container-low border-r border-outline-variant flex-col py-4 px-3 shrink-0 z-20">
      <div className="mb-6 px-2 pt-2">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-on-primary shadow-sm">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-[20px] font-heading font-bold text-on-surface leading-tight">LifeOS</h1>
            <p className="text-[11px] font-mono text-on-surface-variant uppercase tracking-widest mt-0.5">Digital Zen</p>
          </div>
        </div>
      </div>
      
      <button aria-label="New Entry" onClick={() => setNewEntryModalOpen(true)}
        className="w-full bg-primary text-on-primary rounded-lg py-2.5 px-4 text-[13px] font-medium flex items-center justify-center gap-2 mb-6 hover:opacity-90 transition-opacity"
      >
        <Plus className="w-4 h-4" />
        New Entry
      </button>

      <div className="flex-1 overflow-y-auto hide-scrollbar -mx-1 px-1 space-y-6">
        {navigationGroups.map((group, groupIdx) => (
          <div key={groupIdx}>
            <div className="px-3 mb-2 text-[11px] font-medium text-on-surface-variant uppercase tracking-wider">
              {group.title}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item, itemIdx) => {
                const isActive = currentView === item.id;
                return (
                  <button aria-label={item.label}
                    key={itemIdx}
                    onClick={() => setCurrentView(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 transition-colors duration-200 ease-in-out rounded-lg text-[13px] ${
                      isActive
                        ? 'bg-primary-container text-on-primary-container font-medium'
                        : 'text-on-surface-variant hover:bg-surface-variant hover:text-on-surface'
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-4 border-t border-outline-variant space-y-1">
        <button 
          onClick={() => setCurrentView('settings')}
          className={`w-full flex items-center gap-3 px-3 py-2 transition-colors duration-200 ease-in-out rounded-lg text-[13px] ${
            currentView === 'settings' 
              ? 'bg-primary-container text-on-primary-container font-medium' 
              : 'text-on-surface-variant hover:bg-surface-variant hover:text-on-surface'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>System Settings</span>
        </button>
        <button 
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 text-on-surface-variant px-3 py-2 hover:bg-surface-variant hover:text-on-surface transition-colors duration-200 ease-in-out rounded-lg text-[13px]"
        >
          {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
        </button>

        {/* Profile Block */}
        <div className="mt-4 pt-4 border-t border-outline-variant">
          <button className="w-full flex items-center gap-3 px-2 py-1.5 hover:bg-surface-variant transition-colors rounded-lg group text-left">
            <div className="w-8 h-8 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0">
              <User className="w-4 h-4" />
            </div>
            <div className="overflow-hidden">
              <div className="text-[13px] font-medium text-on-surface truncate group-hover:text-primary transition-colors">{userProfile.name || 'User'}</div>
              <div className="text-[11px] text-on-surface-variant truncate">{userProfile.email || ''}</div>
            </div>
          </button>
        </div>
      </div>
    </nav>
  );
}
