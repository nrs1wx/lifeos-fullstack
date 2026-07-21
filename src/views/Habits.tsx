import React, { useState, useEffect } from 'react';
import { Search, Plus, Check, MoreVertical, Flame, Trophy, X, Calendar as CalendarIcon, AlertCircle } from 'lucide-react';
import { TopBar } from '../components/TopBar';
import { useStore } from '../store';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';

type Habit = {
  id: string;
  title: string;
  category: string;
  streak: number;
  bestStreak: number;
  completedToday: boolean;
  done?: string[];
};

export function Habits() {
  const { habits, updateEntity, deleteEntity, addActivity, addToast, setNewEntryModalOpen } = useStore();
  const [habitToDelete, setHabitToDelete] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [selectedHabit, setSelectedHabit] = useState<Habit | null>(null);
  const [isLate, setIsLate] = useState(false);

  useEffect(() => {
    // Check if it's past 20:00 to trigger "Time to review"
    const hour = new Date().getHours();
    if (hour >= 20) {
      setIsLate(true);
    }
  }, []);

  const handleDeleteHabit = () => {
    if (habitToDelete) {
      deleteEntity('habits', habitToDelete);
      addToast('Habit deleted');
      setHabitToDelete(null);
    }
  };

  
  const getAiInsight = (habit: any) => {
    if (!habit || !habit.done || habit.done.length < 3) return null;
    
    // Convert done dates to days of week (0 = Sunday, 6 = Saturday)
    const daysDone = habit.done.map((d: string) => new Date(d).getDay());
    
    // Count frequencies
    const counts = [0, 0, 0, 0, 0, 0, 0];
    daysDone.forEach((d: number) => counts[d]++);
    
    // Find the day with the lowest completion (simplistic heuristic)
    // To do this properly, we'd look at total past days, but let's just find the max and min from done.
    const max = Math.max(...counts);
    const min = Math.min(...counts);
    
    const dayNames = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'];
    
    if (min === 0 && max > 2) {
       const worstDayIndex = counts.indexOf(min);
       return `You tend to skip this habit on ${dayNames[worstDayIndex]}.`;
    }
    
    if (max > 2) {
       const bestDayIndex = counts.indexOf(max);
       return `You are most consistent on ${dayNames[bestDayIndex]}!`;
    }
    
    return null;
  };

  const toggleHabit = (id: string) => {
    const habit = habits.find((h: Habit) => h.id === id);
    if (!habit) return;
    
    const newlyCompleted = !habit.completedToday;
    if (newlyCompleted) {
      addActivity(`Completed habit: ${habit.title}`, 'Habits');
    }
    
    const today = new Date().toISOString().split('T')[0];
    const newDone = newlyCompleted 
      ? [...(habit.done || []), today]
      : (habit.done || []).filter((d: string) => d !== today);

    updateEntity('habits', id, {
      completedToday: newlyCompleted,
      streak: newlyCompleted ? habit.streak + 1 : Math.max(0, habit.streak - 1),
      done: newDone
    });
    
    // Update selected habit if it's the one we're toggling
    if (selectedHabit?.id === id) {
      setSelectedHabit(prev => prev ? { ...prev, completedToday: newlyCompleted, streak: newlyCompleted ? habit.streak + 1 : Math.max(0, habit.streak - 1), done: newDone } : null);
    }
  };

  const today = new Date().toISOString().split('T')[0];
  const isCompletedOn = (habit: Habit, date: string) => (habit.done || []).includes(date) || (date === today && habit.completedToday);
  const filteredHabits = habits.filter((habit: Habit) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return `${habit.title || ''} ${habit.category || ''}`.toLowerCase().includes(query);
  });
  const completedCount = habits.filter((habit: Habit) => isCompletedOn(habit, today)).length;
  const progressPercent = habits.length > 0 ? Math.round((completedCount / habits.length) * 100) : 0;
  const weeklyCompletionData = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const dateString = date.toISOString().split('T')[0];
    const completion = habits.length > 0
      ? Math.round((habits.filter((habit: Habit) => isCompletedOn(habit, dateString)).length / habits.length) * 100)
      : 0;
    return { name: format(date, 'EEE'), completion };
  });
  return (
    <div className="flex-1 flex flex-col h-full bg-surface overflow-hidden relative pb-20 lg:pb-0">
      <TopBar showMobileTitle={false} />

      <header className="hidden lg:flex justify-between items-center px-10 h-16 sticky top-0 bg-surface/80 backdrop-blur-md border-b border-outline-variant z-30">
        <h2 className="text-[32px] font-heading font-bold text-on-surface">Habits</h2>
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-surface-container-low border border-outline-variant rounded-full px-4 py-1.5 focus-within:border-primary transition-all">
            <Search className="w-5 h-5 text-on-surface-variant mr-2" />
            <input 
              type="text" 
              placeholder="Search habits..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent border-none outline-none text-[13px] w-48 text-on-surface"
            />
          </div>
          <button onClick={() => setNewEntryModalOpen(true)} className="bg-primary text-on-primary px-4 py-2 rounded-lg text-[13px] font-medium hover:opacity-90 flex items-center gap-2">
            <Plus className="w-4 h-4" /> Quick Add
          </button>
        </div>
      </header>

      <div className="p-4 lg:p-10 max-w-[1280px] mx-auto w-full flex-1 flex flex-col gap-6 overflow-y-auto custom-scrollbar">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 h-full">
          
          {/* Left Column */}
          <div className="xl:col-span-8 flex flex-col gap-6">
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm flex flex-col gap-4">
              <div className="flex justify-between items-end">
                <div>
                  <h3 className="text-[24px] font-heading font-semibold text-on-surface mb-1">Today's Progress</h3>
                  <p className="text-[13px] text-on-surface-variant">{completedCount} of {habits.length} habits completed</p>
                </div>
                <span className="text-[48px] font-heading font-extrabold text-primary leading-none">{progressPercent}%</span>
              </div>
              <div className="w-full h-2 bg-surface-variant rounded-full overflow-hidden">
                <div className="h-full bg-secondary-container rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between mt-4 mb-2">
                <h4 className="text-[24px] font-heading font-semibold text-on-surface">Daily Routines</h4>
                {isLate && completedCount < habits.length && (
                  <div className="flex items-center gap-2 text-warning bg-warning/10 px-3 py-1 rounded-full text-[12px] font-medium">
                    <AlertCircle className="w-4 h-4" /> Time to review
                  </div>
                )}
              </div>
              
              {filteredHabits.length === 0 ? (
                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 text-center text-[14px] text-on-surface-variant">
                  {habits.length === 0 ? 'No habits yet. Use Quick Add to create one.' : 'No habits match your search.'}
                </div>
              ) : filteredHabits.map((habit) => (
                <div 
                  key={habit.id} 
                  className={`bg-surface-container-lowest border rounded-xl p-4 shadow-sm flex items-center justify-between transition-colors cursor-pointer hover:border-outline ${
                    isLate && !habit.completedToday ? 'border-warning/50' : 'border-outline-variant'
                  }`}
                  onClick={() => setSelectedHabit(habit)}
                >
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={(e) => { e.stopPropagation(); toggleHabit(habit.id); }}
                      className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                        habit.completedToday ? 'bg-secondary-container text-on-secondary-container' : 'border-2 border-outline-variant hover:border-primary'
                      }`}
                    >
                      {habit.completedToday && <Check className="w-4 h-4" />}
                    </button>
                    <div>
                      <h5 className={`text-[16px] font-medium ${habit.completedToday ? 'line-through text-on-surface-variant' : 'text-on-surface'}`}>
                        {habit.title}
                      </h5>
                      <p className="font-mono text-[11px] text-on-surface-variant mt-0.5">{habit.category}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`flex items-center gap-1 px-2 py-1 font-mono text-[11.5px] rounded ${
                      habit.streak > 0 ? 'bg-tertiary-container/10 text-tertiary' : 'bg-surface-variant text-on-surface-variant'
                    }`}>
                      <Flame className="w-3.5 h-3.5" /> {habit.streak}
                    </div>
                    <MoreVertical className="w-5 h-5 text-on-surface-variant" />
                  </div>
                </div>
                ))}
            </div>
          </div>

          {/* Right Column */}
          <div className="xl:col-span-4 flex flex-col gap-6">
            
            {/* Completion Chart */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm">
              <h3 className="text-[18px] font-heading font-semibold text-on-surface mb-4">Weekly Completion</h3>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={weeklyCompletionData}>
                    <defs>
                      <linearGradient id="colorCompletion" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-primary, #6366f1)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="var(--color-primary, #6366f1)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-outline-variant, #e2e8f0)" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--color-on-surface-variant, #64748b)' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--color-on-surface-variant, #64748b)' }} dx={-10} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'var(--color-surface, #fff)', borderRadius: '8px', border: '1px solid var(--color-outline-variant, #e2e8f0)' }}
                      itemStyle={{ color: 'var(--color-on-surface, #0f172a)', fontWeight: 'bold' }}
                    />
                    <Area type="monotone" dataKey="completion" stroke="var(--color-primary, #6366f1)" strokeWidth={2} fillOpacity={1} fill="url(#colorCompletion)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
          
        </div>
      </div>

      {/* Habit Details Modal */}
      {selectedHabit && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-outline-variant rounded-2xl overflow-hidden shadow-xl flex flex-col shrink-0 w-full animate-in fade-in zoom-in-95 duration-200" style={{ width: "calc(100vw - 2rem)", maxWidth: "42rem", maxHeight: "90vh" }}>
            <div className="flex justify-between items-center p-6 border-b border-outline-variant">
              <div>
                <span className="font-mono text-[11px] text-on-surface-variant uppercase tracking-wider">{selectedHabit.category}</span>
                <h2 className="text-[24px] font-heading font-bold text-on-surface mt-1">{selectedHabit.title}</h2>
              </div>
              <button aria-label="Close" 
                onClick={() => setSelectedHabit(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-variant text-on-surface-variant transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-surface-container-low rounded-xl p-4 border border-outline-variant/50">
                  <p className="font-mono text-[11px] text-on-surface-variant uppercase mb-1">Current Streak</p>
                  <p className="text-[24px] font-heading font-bold text-on-surface flex items-center gap-2">
                    <Flame className="w-5 h-5 text-tertiary" /> {selectedHabit.streak} Days
                  </p>
                </div>
                <div className="bg-surface-container-low rounded-xl p-4 border border-outline-variant/50">
                  <p className="font-mono text-[11px] text-on-surface-variant uppercase mb-1">Best Streak</p>
                  <p className="text-[24px] font-heading font-bold text-on-surface flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-secondary" /> {selectedHabit.bestStreak} Days
                  </p>
                </div>
              </div>

              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5">
                <h3 className="text-[14px] font-heading font-semibold text-on-surface mb-4">Activity Heatmap (12 Weeks)</h3>
                <div className="flex gap-1 overflow-x-auto pb-2">
                  {/* Real Heatmap from habit.done */}
                  {Array.from({ length: 84 }).map((_, i) => {
                    const date = new Date();
                    date.setDate(date.getDate() - (83 - i));
                    const dateString = date.toISOString().split('T')[0];
                    const isDone = selectedHabit.done?.includes(dateString);
                    return (
                      <div 
                        key={i} 
                        className={`w-3 h-3 rounded-sm shrink-0 ${isDone ? 'bg-primary' : 'bg-surface-variant'}`}
                        title={dateString}
                      />
                    );
                  })}
                </div>
                <div className="flex justify-end gap-2 mt-2 items-center">
                  <span className="text-[10px] text-on-surface-variant">Less</span>
                  <div className="w-3 h-3 rounded-sm bg-surface-variant"></div>
                  <div className="w-3 h-3 rounded-sm bg-primary/40"></div>
                  <div className="w-3 h-3 rounded-sm bg-primary/70"></div>
                  <div className="w-3 h-3 rounded-sm bg-primary"></div>
                  <span className="text-[10px] text-on-surface-variant">More</span>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-surface-container-low border-t border-outline-variant flex justify-end">
              <button 
                onClick={() => toggleHabit(selectedHabit.id)}
                className="bg-primary text-on-primary px-4 py-2 rounded-lg text-[13px] font-medium hover:opacity-90 transition-opacity"
              >
                {selectedHabit.completedToday ? 'Mark as Undone' : 'Mark as Done'}
              </button>
            </div>
          </div>
        </div>
      )}
          <ConfirmDialog 
        isOpen={!!habitToDelete}
        title="Delete Habit"
        message="Are you sure you want to delete this habit?"
        confirmLabel="Delete"
        onConfirm={handleDeleteHabit}
        onCancel={() => setHabitToDelete(null)}
      />
    </div>
  );
}
