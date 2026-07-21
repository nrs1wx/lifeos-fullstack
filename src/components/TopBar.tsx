import React, { useState, useEffect, useMemo } from 'react';
import { Search, Bell, X, ChevronRight, Menu } from 'lucide-react';
import { useStore } from '../store';

interface TopBarProps {
  title?: string;
  showMobileTitle?: boolean;
}

export function TopBar({ title = "LifeOS", showMobileTitle = true }: TopBarProps) {
  const store = useStore();
  const { recentActivity } = store;
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
      if (e.key === 'Escape' && isSearchOpen) {
        setIsSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    
    const query = searchQuery.toLowerCase();
    const results: { type: string; title: string; subtitle: string; view: string }[] = [];
    
    const addResult = (type: string, title: string, subtitle: string, view: string) => {
      if (title?.toLowerCase().includes(query) || subtitle?.toLowerCase().includes(query)) {
        results.push({ type, title, subtitle, view });
      }
    };

    // Modules themselves
    ['Today', 'Calendar', 'Habits', 'Health', 'Finance', 'Goals', 'Learning', 'Notes', 'Analytics', 'Settings'].forEach(mod => {
      if (mod.toLowerCase().includes(query)) {
        results.push({ type: 'Module', title: mod, subtitle: 'Go to module', view: mod === 'Today' ? 'dashboard' : mod.toLowerCase() });
      }
    });

    [
      { title: 'New goal', subtitle: 'Open Goals and create a goal', view: 'goals' },
      { title: 'New habit', subtitle: 'Use Quick Add in Habits', view: 'habits' },
      { title: 'Log expense', subtitle: 'Open Finance entry form', view: 'finance' },
      { title: 'New calendar event', subtitle: 'Open Calendar', view: 'calendar' },
      { title: 'New note', subtitle: 'Open Notes', view: 'notes' },
      { title: 'Plan my day', subtitle: 'Ask the AI assistant', view: 'ai' },
      { title: 'Review my week', subtitle: 'Ask the AI assistant', view: 'ai' },
    ].forEach((command) => addResult('Command', command.title, command.subtitle, command.view));

    store.goals.forEach((g: any) => addResult('Goal', g.title, `Deadline: ${new Date(g.deadline).toLocaleDateString()}`, 'goals'));
    store.habits.forEach((h: any) => addResult('Habit', h.title, h.category, 'habits'));
    store.notes.forEach((n: any) => addResult('Note', n.title, n.content?.substring(0, 50) || '', 'notes'));

    return results;
  }, [searchQuery, store]);

  const groupedResults = useMemo(() => {
    const groups: Record<string, any[]> = {};
    searchResults.forEach(r => {
      if (!groups[r.type]) groups[r.type] = [];
      groups[r.type].push(r);
    });
    return groups;
  }, [searchResults]);

  const handleNavigate = (view: string) => {
    window.dispatchEvent(new CustomEvent('navigate', { detail: view }));
    setIsSearchOpen(false);
    setSearchQuery('');
  };

  const openMobileMenu = () => {
    window.dispatchEvent(new CustomEvent('open-mobile-menu'));
  };

  return (
    <>
      <header className="flex justify-between items-center w-full px-4 h-16 sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-outline-variant shrink-0">
        <div className="lg:hidden flex items-center gap-2 min-w-0">
          <button
            aria-label="Open menu"
            onClick={openMobileMenu}
            className="p-2 -ml-2 rounded-full text-on-surface-variant hover:bg-surface-variant hover:text-on-surface transition-colors shrink-0"
          >
            <Menu className="w-5 h-5" />
          </button>
          {showMobileTitle && (
            <h1 className="text-[20px] font-heading font-bold text-primary leading-none truncate">{title}</h1>
          )}
        </div>
        <div className="hidden lg:block" />
        
          <div className="flex items-center gap-1 sm:gap-2 ml-auto shrink-0">
          <button aria-label="Search" onClick={() => setIsSearchOpen(true)}
            className="p-2 text-on-surface-variant hover:bg-surface-variant hover:text-on-surface rounded-full transition-colors flex items-center gap-2"
            title="Search (Cmd/Ctrl + K)" 
          >
            <Search className="w-5 h-5" />
            <span className="hidden md:inline-block text-[12px] font-mono border border-outline-variant rounded px-1.5 py-0.5">⌘K</span>
          </button>
          
          <div className="relative">
            <button aria-label="Notifications" onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className="p-2 text-on-surface-variant hover:bg-surface-variant hover:text-on-surface rounded-full transition-colors relative"
            >
              <Bell className="w-5 h-5" />
              {recentActivity.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-primary rounded-full border-2 border-background"></span>
              )}
            </button>

            {isNotificationsOpen && (
              <div className="fixed sm:absolute top-16 sm:top-full left-3 right-3 sm:left-auto sm:right-0 sm:mt-2 sm:w-80 bg-surface border border-outline-variant rounded-xl shadow-xl overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-outline-variant flex justify-between items-center bg-surface-container-lowest">
                  <h3 className="text-[14px] font-semibold text-on-surface">Notifications</h3>
                  <button aria-label="Close Notifications"  onClick={() => setIsNotificationsOpen(!isNotificationsOpen)} className="text-on-surface-variant hover:text-on-surface">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                  {recentActivity.length > 0 ? (
                    recentActivity.slice(0, 10).map((act: any, i: number) => (
                      <div key={i} className="px-4 py-3 border-b border-outline-variant/50 hover:bg-surface-container-low transition-colors text-left last:border-0">
                        <p className="text-[13px] text-on-surface leading-snug">{act.message}</p>
                        <p className="text-[11px] text-on-surface-variant mt-1">{act.type}</p>
                      </div>
                    ))
                  ) : (
                    <div className="p-6 text-center text-[13px] text-on-surface-variant">No new notifications</div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="w-8 h-8 rounded-full ml-2 bg-primary/10 flex items-center justify-center text-primary font-bold text-[14px] lg:hidden border border-primary/20">
            {store.userProfile.name.charAt(0)}
          </div>
        </div>
      </header>

      {/* Global Search & Command Palette Modal */}
      {isSearchOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-start justify-center pt-[10vh] px-4">
          <div className="bg-surface border border-outline-variant rounded-2xl overflow-hidden shadow-xl flex flex-col shrink-0 w-full animate-in fade-in zoom-in-95 duration-200" style={{ width: "calc(100vw - 2rem)", maxWidth: "42rem", maxHeight: "90vh" }}>
            <div className="flex items-center px-4 border-b border-outline-variant">
              <Search className="w-5 h-5 text-on-surface-variant shrink-0" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search LifeOS or type a command..."
                className="w-full bg-transparent border-none px-4 py-4 text-[16px] text-on-surface outline-none placeholder:text-on-surface-variant/50"
              />
              <button aria-label="Close" 
                onClick={() => setIsSearchOpen(false)}
                className="p-2 text-on-surface-variant hover:bg-surface-variant rounded-full transition-colors shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="max-h-[60vh] overflow-y-auto bg-surface-container-lowest custom-scrollbar">
              {searchQuery ? (
                Object.keys(groupedResults).length === 0 ? (
                  <div className="text-[13px] text-on-surface-variant text-center py-8">
                    No results found for "{searchQuery}"
                  </div>
                ) : (
                  <div className="p-2">
                    {Object.entries(groupedResults).map(([type, items]) => (
                      <div key={type} className="mb-4">
                        <div className="px-3 py-1 text-[11px] font-mono uppercase text-on-surface-variant/70 tracking-wider">
                          {type}s
                        </div>
                        {(items as any[]).map((item, i) => (
                          <button 
                            key={i}
                            onClick={() => handleNavigate(item.view)}
                            className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-surface-container-low transition-colors text-left group"
                          >
                            <div>
                              <div className="text-[14px] font-medium text-on-surface">{item.title}</div>
                              {item.subtitle && <div className="text-[12px] text-on-surface-variant mt-0.5 line-clamp-1">{item.subtitle}</div>}
                            </div>
                            <ChevronRight className="w-4 h-4 text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                )
              ) : (
                <div className="text-[13px] text-on-surface-variant text-center py-8">
                  Start typing to search across your goals, habits, notes, and more...
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
