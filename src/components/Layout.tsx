import React, { useEffect, useState } from 'react';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { View } from '../types';
import { useStore } from '../store';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { NewEntryModal } from './NewEntryModal';
import { MobileMenuDrawer } from './MobileMenuDrawer';

interface LayoutProps {
  currentView: View;
  setCurrentView: (view: View) => void;
  children: React.ReactNode;
  hideNav?: boolean;
  isDarkMode?: boolean;
  toggleTheme?: () => void;
}

export function Layout({ currentView, setCurrentView, children, hideNav = false, isDarkMode, toggleTheme }: LayoutProps) {
  const { toasts, removeToast } = useStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const openMenu = () => setIsMobileMenuOpen(true);
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsMobileMenuOpen(false);
    };
    window.addEventListener('open-mobile-menu', openMenu);
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      window.removeEventListener('open-mobile-menu', openMenu);
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  if (hideNav) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-[100dvh] lg:h-screen w-full bg-background text-on-background overflow-hidden relative">
      <Sidebar 
        currentView={currentView} 
        setCurrentView={setCurrentView} 
        isDarkMode={isDarkMode}
        toggleTheme={toggleTheme}
      />
      
      <main className="flex-1 flex flex-col min-w-0 w-full relative h-full">
        {children}
      </main>

      {/* Toast Container */}
      <div className="fixed bottom-24 lg:bottom-6 left-3 right-3 lg:left-auto lg:right-6 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div 
            key={toast.id} 
            className="pointer-events-auto bg-surface text-on-surface shadow-lg border border-outline-variant rounded-lg p-4 flex items-center gap-3 animate-in slide-in-from-right-8 fade-in duration-300 w-full min-w-0 lg:min-w-[280px] lg:max-w-sm"
          >
            {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-secondary shrink-0" />}
            {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-error shrink-0" />}
            {toast.type === 'info' && <Info className="w-5 h-5 text-primary shrink-0" />}
            
            <p className="text-[14px] font-medium flex-1">{toast.message}</p>

            {toast.actionLabel && toast.onAction && (
              <button
                onClick={() => {
                  toast.onAction?.();
                  removeToast(toast.id);
                }}
                className="text-[12px] font-semibold text-primary hover:underline shrink-0"
              >
                {toast.actionLabel}
              </button>
            )}
            
            <button onClick={() => removeToast(toast.id)} className="text-on-surface-variant hover:text-on-surface shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      <MobileNav currentView={currentView} setCurrentView={setCurrentView} />
      <MobileMenuDrawer
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        currentView={currentView}
        setCurrentView={setCurrentView}
        isDarkMode={isDarkMode}
        toggleTheme={toggleTheme}
      />
      <NewEntryModal />
    </div>
  );
}
