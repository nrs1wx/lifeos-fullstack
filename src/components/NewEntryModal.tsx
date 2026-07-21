import React, { useState } from 'react';
import { X, Target, CheckSquare, DollarSign, PenTool, Sparkles, Loader2 } from 'lucide-react';
import { useStore } from '../store';

const ENTRY_TYPES = [
  { id: 'goal', label: 'Goal', icon: Target, color: 'text-primary', bg: 'bg-primary-container' },
  { id: 'habit', label: 'Habit', icon: CheckSquare, color: 'text-secondary', bg: 'bg-secondary-container' },
  { id: 'transaction', label: 'Transaction', icon: DollarSign, color: 'text-green-500', bg: 'bg-green-500/10' },
  { id: 'note', label: 'Note', icon: PenTool, color: 'text-orange-500', bg: 'bg-orange-500/10' },
];

export function NewEntryModal() {
  const { isNewEntryModalOpen, setNewEntryModalOpen, addActivity, addToast, addEntity } = useStore();
  const [activeType, setActiveType] = useState('goal');
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isNewEntryModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setIsProcessing(true);
    try {
      const newId = Math.random().toString(36).substring(2, 9);
      if (activeType === 'goal') {
        await addEntity('goals', { id: newId, title: input, progress: 0, deadline: '2027-12-31', subgoals: [] });
      } else if (activeType === 'habit') {
        await addEntity('habits', { id: newId, title: input, category: 'General', streak: 0, bestStreak: 0, completedToday: false, done: [] });
      } else if (activeType === 'transaction') {
        const amountMatch = input.match(/(\d+(?:[.,]\d{1,2})?)/);
        const amount = amountMatch ? Number(amountMatch[1].replace(',', '.')) : 0;
        if (!Number.isFinite(amount) || amount <= 0) {
          addToast('Enter a transaction amount greater than zero.', 'error');
          return;
        }
        await addEntity('finances', { id: newId, name: input, amount, date: new Date().toISOString(), category: 'Misc', type: 'expense' });
      } else if (activeType === 'note') {
        await addEntity('notes', { id: newId, title: input, content: '', date: new Date().toISOString() });
      }

      addActivity(`Created new ${activeType}`, 'System');
      addToast(`${activeType.charAt(0).toUpperCase() + activeType.slice(1)} created successfully!`);
      setInput('');
      setNewEntryModalOpen(false);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface border border-outline-variant rounded-2xl overflow-hidden shadow-xl flex flex-col shrink-0 w-full animate-in fade-in zoom-in-95 duration-200" style={{ width: "calc(100vw - 2rem)", maxWidth: "32rem", maxHeight: "90vh" }}>
        <div className="flex justify-between items-center p-6 border-b border-outline-variant">
          <h2 className="text-[20px] font-heading font-bold text-on-surface">New Entry</h2>
          <button aria-label="Close" 
            onClick={() => setNewEntryModalOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-variant text-on-surface-variant transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6">
          <div className="flex gap-2 overflow-x-auto pb-4 hide-scrollbar">
            {ENTRY_TYPES.map(type => (
              <button
                key={type.id}
                onClick={() => setActiveType(type.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-medium transition-all shrink-0 border ${
                  activeType === type.id 
                    ? `border-outline-variant ${type.bg}` 
                    : 'border-transparent hover:bg-surface-variant text-on-surface-variant'
                }`}
              >
                <type.icon className={`w-4 h-4 ${activeType === type.id ? type.color : ''}`} />
                <span className={activeType === type.id ? 'text-on-surface' : ''}>{type.label}</span>
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="mt-4">
            <label className="block text-[12px] font-medium text-on-surface-variant mb-2 uppercase font-mono tracking-wider">
              {activeType === 'transaction' ? 'Describe transaction (e.g. Spent $12 on coffee)' : `What's the new ${activeType}?`}
            </label>
            <div className="relative">
              <input
                type="text"
                autoFocus
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={`Enter ${activeType} details...`}
                className="w-full bg-surface-container-low border border-outline-variant rounded-xl pl-4 pr-12 py-4 text-[15px] text-on-surface outline-none focus:border-primary transition-colors"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-primary opacity-50">
                <Sparkles className="w-5 h-5" />
              </div>
            </div>
            
            <div className="mt-6 flex justify-end gap-3">
              <button aria-label="Close" 
                type="button" 
                onClick={() => setNewEntryModalOpen(false)}
                className="px-5 py-2.5 rounded-xl text-[14px] font-medium text-on-surface hover:bg-surface-variant transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={!input.trim() || isProcessing}
                className="bg-primary text-on-primary px-6 py-2.5 rounded-xl text-[14px] font-medium hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50"
              >
                {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
                Create Entry
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
