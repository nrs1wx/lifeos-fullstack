import React, { useState, useRef, useEffect } from 'react';
import { X, Bot, Send, MapPin, Target, CheckSquare, Wallet, HeartPulse, CalendarDays, NotebookText, GraduationCap, PlusCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useStore } from '../store';
import { format } from 'date-fns';
import { Skeleton } from '../components/ui/Skeleton';
import { api, AiSuggestedAction } from '../api';
import { getStoredTimeZone } from '../timezone';

type ChatAction = AiSuggestedAction & {
  applied?: boolean;
};

type Message = {
  id: string;
  role: 'user' | 'ai';
  text: string;
  time: Date;
  widget?: 'finance' | 'learning' | 'weather';
  actions?: ChatAction[];
};

export function AIAssistant() {
  const { goals, habits, finances, healthLogs, calendarEvents, notes, learningPlans, userProfile, aiDataAccess, addEntity, addActivity, addToast } = useStore();
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('lifeos-ai-messages') || '[]');
      if (Array.isArray(saved) && saved.length) {
        return saved.map((message: any) => ({ ...message, time: new Date(message.time) }));
      }
    } catch {
      // Ignore damaged chat history.
    }
    return [
      {
        id: '1',
        role: 'ai',
        text: "Good morning. I can plan your day, review your week, find blockers, or suggest the next habit from your LifeOS data.",
        time: new Date()
      }
    ];
  });
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [applyingActionId, setApplyingActionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeGoal = goals.length > 0 ? goals[0].title : null;
  const contextBadges = [
    { label: `${goals.length} goals`, icon: Target, show: goals.length > 0 },
    { label: `${habits.length} habits`, icon: CheckSquare, show: habits.length > 0 },
    { label: `${finances.length} finance`, icon: Wallet, show: finances.length > 0 },
    { label: `${healthLogs.length} health`, icon: HeartPulse, show: healthLogs.length > 0 },
    { label: `${calendarEvents.length} events`, icon: CalendarDays, show: calendarEvents.length > 0 },
    { label: `${notes.length} notes`, icon: NotebookText, show: notes.length > 0 },
    { label: `${learningPlans.length} plans`, icon: GraduationCap, show: learningPlans.length > 0 },
  ].filter((badge) => badge.show);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking]);

  useEffect(() => {
    localStorage.setItem('lifeos-ai-messages', JSON.stringify(messages.slice(-40)));
  }, [messages]);

  useEffect(() => {
    const pendingPrompt = localStorage.getItem('lifeos-ai-pending-prompt');
    if (pendingPrompt) {
      localStorage.removeItem('lifeos-ai-pending-prompt');
      window.setTimeout(() => handleSend(pendingPrompt), 100);
    }
  }, []);

  const fetchAIReply = async (question: string) => {
    try {
      const { reply, actions = [] } = await api.aiChat(question, {
        activeGoal,
        timezone: getStoredTimeZone(),
        localNow: new Date().toISOString(),
        aiDataAccess,
      });
      setMessages(prev => [...prev, {
        id: Math.random().toString(),
        role: 'ai',
        text: reply,
        time: new Date(),
        actions,
      }]);
    } catch (err: any) {
      setMessages(prev => [...prev, {
        id: Math.random().toString(),
        role: 'ai',
        text: err?.message || 'Could not get an AI response. Try again later.',
        time: new Date(),
      }]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleSend = (text: string = input) => {
    if (!text.trim()) return;
    
    setMessages(prev => [...prev, {
      id: Math.random().toString(),
      role: 'user',
      text: text.trim(),
      time: new Date()
    }]);
    
    setInput('');
    setIsThinking(true);
    fetchAIReply(text.trim());
  };

  const entityViewLabel: Record<string, string> = {
    goals: 'Goals',
    habits: 'Habits',
    calendarEvents: 'Calendar',
    finances: 'Finance',
    notes: 'Notes',
    learningPlans: 'Learning',
  };

  const entityView: Record<string, string> = {
    goals: 'goals',
    habits: 'habits',
    calendarEvents: 'calendar',
    finances: 'finance',
    notes: 'notes',
    learningPlans: 'learning',
  };

  const describeAction = (action: ChatAction) => {
    const entity = action.entity || {};
    if (action.entityType === 'calendarEvents') {
      const startDate = entity.start ? new Date(entity.start) : null;
      const start = startDate && !Number.isNaN(startDate.valueOf()) ? format(startDate, 'MMM d, HH:mm') : '';
      return [entity.title, start].filter(Boolean).join(' · ');
    }
    if (action.entityType === 'finances') {
      return [entity.name || entity.title, entity.amount ? `${entity.type === 'income' ? '+' : '-'}${entity.amount}` : ''].filter(Boolean).join(' · ');
    }
    return entity.title || entity.goal || entity.name || entity.content || action.entityType;
  };

  const markActionApplied = (actionId: string) => {
    setMessages((prev) => prev.map((message) => ({
      ...message,
      actions: message.actions?.map((action) => action.id === actionId ? { ...action, applied: true } : action),
    })));
  };

  const handleApplyAction = async (action: ChatAction) => {
    if (action.applied || applyingActionId) return;
    setApplyingActionId(action.id);
    try {
      await addEntity(action.entityType, action.entity);
      markActionApplied(action.id);
      addActivity(`Applied AI action: ${action.label}`, 'AI');
      const view = entityView[action.entityType];
      addToast('AI action applied', 'success', view ? {
        actionLabel: `Open ${entityViewLabel[action.entityType]}`,
        onAction: () => window.dispatchEvent(new CustomEvent('navigate', { detail: view })),
      } : undefined);
    } catch {
      // Store already shows an error toast.
    } finally {
      setApplyingActionId(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full relative overflow-hidden bg-background">
      <header className="flex flex-col w-full sticky top-0 z-50 bg-surface/90 backdrop-blur-sm border-b border-outline-variant shrink-0">
        <div className="flex justify-between items-center px-4 lg:px-10 h-16">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-primary relative shadow-sm border border-outline-variant/30">
              <Bot className="w-6 h-6" />
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-secondary rounded-full border-2 border-surface"></div>
            </div>
            <div>
              <h2 className="text-[16px] font-heading font-semibold text-on-surface leading-tight">LifeOS Assistant</h2>
              <p className="text-[12px] text-on-surface-variant">Always here to help</p>
            </div>
          </div>
          <button
            aria-label="Back to dashboard"
            onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'dashboard' }))}
            className="p-2 rounded-full text-on-surface-variant hover:bg-surface-variant transition-colors cursor-pointer active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Context Indicator */}
        <div className="px-4 lg:px-10 pb-2 flex items-center gap-2 overflow-x-auto hide-scrollbar">
          <span className="text-[11px] font-medium text-on-surface-variant uppercase tracking-wider shrink-0">Active Context:</span>
          {userProfile.city && (
            <div className="flex items-center gap-1 bg-surface-container-low border border-outline-variant px-2 py-1 rounded-md shrink-0">
              <MapPin className="w-3 h-3 text-primary" />
              <span className="text-[11px] text-on-surface">{userProfile.city}</span>
            </div>
          )}
          {activeGoal && (
            <div className="flex items-center gap-1 bg-surface-container-low border border-outline-variant px-2 py-1 rounded-md shrink-0">
              <Target className="w-3 h-3 text-secondary" />
              <span className="text-[11px] text-on-surface">{activeGoal}</span>
            </div>
          )}
          {contextBadges.map(({ label, icon: Icon }) => (
            <div key={label} className="flex items-center gap-1 bg-surface-container-low border border-outline-variant px-2 py-1 rounded-md shrink-0">
              <Icon className="w-3 h-3 text-tertiary" />
              <span className="text-[11px] text-on-surface">{label}</span>
            </div>
          ))}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 lg:px-10 py-6 flex flex-col gap-6 hide-scrollbar relative">
        <div className="flex items-center justify-center w-full my-2">
          <div className="bg-surface-container text-on-surface-variant font-mono text-[11.5px] px-3 py-1 rounded-full border border-outline-variant/50">
            Today
          </div>
        </div>

        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-4 max-w-3xl ${msg.role === 'user' ? 'ml-auto justify-end' : 'mr-auto'}`}>
            {msg.role === 'ai' && (
              <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-primary shrink-0 mt-1 shadow-sm border border-outline-variant/30">
                <Bot className="w-4 h-4" />
              </div>
            )}
            <div className={`flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : ''}`}>
              <div className={`${
                msg.role === 'user' 
                  ? 'bg-primary text-on-primary rounded-tr-sm' 
                  : 'bg-surface-container-high text-on-surface rounded-tl-sm border border-outline-variant/30'
                } p-4 rounded-2xl shadow-sm text-[14px] leading-relaxed whitespace-pre-wrap`}>
                {msg.text}
              </div>

              {msg.role === 'ai' && Boolean(msg.actions?.length) && (
                <div className="grid gap-2 w-full max-w-xl">
                  {msg.actions?.map((action) => {
                    const Icon = action.applied ? CheckCircle2 : PlusCircle;
                    const isApplying = applyingActionId === action.id;
                    return (
                      <div key={action.id} className="bg-surface border border-outline-variant rounded-lg p-3 shadow-sm flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-mono uppercase tracking-wider text-primary">
                              {entityViewLabel[action.entityType] || action.entityType}
                            </span>
                            {action.applied && (
                              <span className="text-[11px] text-secondary">Applied</span>
                            )}
                          </div>
                          <p className="text-[13px] font-medium text-on-surface mt-1 truncate">{action.label}</p>
                          <p className="text-[12px] text-on-surface-variant mt-1 line-clamp-2">{describeAction(action)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleApplyAction(action)}
                          disabled={action.applied || Boolean(applyingActionId)}
                          className="shrink-0 h-9 w-9 rounded-lg bg-primary text-on-primary flex items-center justify-center disabled:bg-surface-variant disabled:text-on-surface-variant transition-colors"
                          aria-label={action.applied ? 'Action applied' : action.label}
                          title={action.applied ? 'Applied' : action.label}
                        >
                          {isApplying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
              
              {/* Optional Widget Rendering */}
              {msg.widget === 'finance' && (
                <div className="bg-surface p-5 rounded-xl border border-outline-variant shadow-sm w-full max-w-sm mt-2">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-heading text-[14px] font-semibold text-on-surface">Weekly Budget</h4>
                    <span className="font-mono text-[11.5px] text-on-surface-variant">Active</span>
                  </div>
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-[28px] font-heading font-bold text-on-surface">$450</span>
                    <span className="text-[13px] text-on-surface-variant mb-1">/ $800</span>
                  </div>
                  <div className="w-full h-1.5 bg-surface-variant rounded-full overflow-hidden">
                    <div className="h-full bg-secondary rounded-full w-[56%]"></div>
                  </div>
                </div>
              )}

              <span className={`font-mono text-[11px] text-outline ${msg.role === 'user' ? 'mr-1' : 'ml-1'}`}>
                {format(msg.time, 'hh:mm a')}
              </span>
            </div>
          </div>
        ))}

        {isThinking && (
          <div className="flex gap-4 max-w-3xl mr-auto w-full">
            <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-primary shrink-0 mt-1 shadow-sm border border-outline-variant/30">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-surface-container-high text-on-surface px-5 py-4 rounded-2xl rounded-tl-sm border border-outline-variant/30 shadow-sm flex flex-col justify-center gap-2 w-48">
               <Skeleton className="h-3 w-full" />
               <Skeleton className="h-3 w-2/3" />
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} className="h-32 shrink-0"></div>
      </div>

      <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-background via-background to-transparent pt-6 pb-6 lg:pb-6 pb-[90px] px-4 lg:px-10 z-40">
        <div className="max-w-4xl mx-auto flex flex-col gap-3">
          <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
            {["Plan my day", "Review my week", "Find what blocks my main goal", "Suggest my next habit", "Summarize recent notes", "Make a calendar plan"].map((prompt, i) => (
              <button 
                key={i} 
                onClick={() => handleSend(prompt)}
                className="shrink-0 bg-surface border border-outline-variant hover:border-primary text-on-surface text-[13px] px-4 py-1.5 rounded-full shadow-sm transition-colors duration-200"
              >
                {prompt}
              </button>
            ))}
          </div>
          <div className="bg-surface border border-outline-variant focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 rounded-xl p-2 shadow-sm transition-all flex items-end gap-2">
            <textarea 
              className="w-full bg-transparent border-none focus:ring-0 resize-none text-[14px] text-on-surface py-2 outline-none hide-scrollbar max-h-32 min-h-[40px]" 
              placeholder="Ask LifeOS..." 
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <div className="flex items-center gap-1 shrink-0">
              <button 
                onClick={() => handleSend()}
                disabled={!input.trim() || isThinking}
                className="p-2 bg-primary text-on-primary rounded-lg hover:bg-surface-tint transition-colors shadow-sm disabled:opacity-50"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
