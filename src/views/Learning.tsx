import React, { useState } from 'react';
import { Target, Sparkles, Loader2, BookOpen, Calendar as CalendarIcon, CheckCircle2, Circle, Flag, Plus, X } from 'lucide-react';
import { TopBar } from '../components/TopBar';
import { useStore } from '../store';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { api } from '../api';
import { getStoredTimeZone } from '../timezone';

export function Learning() {
  const { learningPlans, goals, addEntity, updateEntity, deleteEntity, addActivity, addToast, aiDataAccess, replaceLearningSchedule } = useStore();
  
  const [isAddingPlan, setIsAddingPlan] = useState(false);
  const [newGoal, setNewGoal] = useState('');
  const todayIso = new Date().toISOString().split('T')[0];
  const defaultEndDate = new Date(Date.now() + 27 * 86400000).toISOString().split('T')[0];
  const [newStartDate, setNewStartDate] = useState(todayIso);
  const [newEndDate, setNewEndDate] = useState(defaultEndDate);
  const [newWeeklyHours, setNewWeeklyHours] = useState(3);
  const [newSessionLength, setNewSessionLength] = useState(60);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  
  const [activePlanId, setActivePlanId] = useState<string | null>(learningPlans?.[0]?.id || null);
  const [planToDelete, setPlanToDelete] = useState<string | null>(null);

  const activePlan = learningPlans?.find((p: any) => p.id === activePlanId) || learningPlans?.[0];
  const activeRoadmap = activePlan?.roadmap || activePlan?.weeks?.map((week: any) => ({
    phaseNumber: week.weekNumber,
    title: week.title || `Phase ${week.weekNumber}`,
    startDate: activePlan.startDate,
    endDate: activePlan.endDate,
    outcome: week.outcome || '',
    tasks: week.tasks || [],
  })) || [];
  const activeGoal = activePlan?.linkedGoalId ? goals.find((goal: any) => goal.id === activePlan.linkedGoalId) : null;

  const schedulePlan = async (plan: any) => {
    setIsScheduling(true);
    try {
      const result = await api.scheduleLearningPlan(String(plan.id), { timezone: getStoredTimeZone() });
      replaceLearningSchedule(String(plan.id), result.created);
      addToast(`Added ${result.count} study sessions to Calendar`, result.count < result.expected ? 'info' : 'success');
      if (result.count < result.expected) {
        addToast('Not enough free time: some sessions could not be scheduled. Free up slots manually.', 'info', { durationMs: 7000 });
      }
      addActivity(`Scheduled ${result.count} learning sessions for "${plan.goal || plan.subject || plan.title}"`, 'Learning');
      return result;
    } catch (err: any) {
      addToast(err?.message || 'Could not schedule learning sessions', 'error');
      throw err;
    } finally {
      setIsScheduling(false);
    }
  };

  const handleGeneratePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    const goal = newGoal.trim();
    if (!goal) return;
    
    setIsGenerating(true);
    try {
      if (!newStartDate || !newEndDate || new Date(newEndDate) <= new Date(newStartDate)) {
        addToast('Choose a valid date range.', 'error');
        return;
      }

      const { plan } = await api.generateLearningPlan(goal, newStartDate, newEndDate, {
        timezone: getStoredTimeZone(),
        aiDataAccess,
      });
      const planId = Math.random().toString(36).substring(2, 9);
      const goalId = `goal-${planId}`;
      const roadmap = (plan.roadmap || []).map((phase: any) => ({
        ...phase,
        tasks: (phase.tasks || []).map((task: any) => ({
          ...task,
          goalSubgoalId: task.goalSubgoalId || task.id,
          done: Boolean(task.done),
        })),
      }));
      const subgoals = roadmap.flatMap((phase: any) =>
        (phase.tasks || []).map((task: any) => ({
          id: task.goalSubgoalId || task.id,
          title: `${phase.title}: ${task.text}`,
          completed: Boolean(task.done),
          learningPlanId: planId,
        }))
      );
      
      const newPlan = {
        id: planId,
        ...plan,
        roadmap,
        weeks: roadmap.map((phase: any) => ({ weekNumber: phase.phaseNumber, title: phase.title, tasks: phase.tasks })),
        goal,
        subject: goal,
        weekly_hours: newWeeklyHours,
        session_length_minutes: newSessionLength,
        linkedGoalId: goalId,
      };

      await addEntity('goals', {
        id: goalId,
        title: goal,
        progress: 0,
        deadline: plan.endDate || newEndDate,
        category: 'Learning',
        linkedLearningPlanId: planId,
        subgoals,
      });
      
      const savedPlan = await addEntity('learningPlans', newPlan);
      setActivePlanId(savedPlan.id);
      await schedulePlan(savedPlan);
      setIsAddingPlan(false);
      setNewGoal('');
      setNewStartDate(todayIso);
      setNewEndDate(defaultEndDate);
      setNewWeeklyHours(3);
      setNewSessionLength(60);
      addActivity(`Groq generated roadmap for "${goal}"`, 'Learning');
      addToast('Roadmap created and linked to Goals');
    } catch (err: any) {
      addToast(err?.message || 'Could not create learning plan', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleTask = async (phaseIndex: number, taskId: string) => {
    if (!activePlan) return;
    
    const newRoadmap = activeRoadmap.map((phase: any, index: number) => ({
      ...phase,
      tasks: (phase.tasks || []).map((task: any) =>
        index === phaseIndex && task.id === taskId ? { ...task, done: !task.done } : task
      ),
    }));
    const changedTask = newRoadmap[phaseIndex]?.tasks?.find((task: any) => task.id === taskId);
    const total = newRoadmap.reduce((sum: number, phase: any) => sum + (phase.tasks || []).length, 0);
    const done = newRoadmap.reduce((sum: number, phase: any) => sum + (phase.tasks || []).filter((task: any) => task.done).length, 0);
    const progress = total ? Math.round((done / total) * 100) : 0;

    await updateEntity('learningPlans', activePlan.id, {
      roadmap: newRoadmap,
      weeks: newRoadmap.map((phase: any) => ({ weekNumber: phase.phaseNumber, title: phase.title, tasks: phase.tasks })),
      progress,
    });

    if (activeGoal) {
      const goalSubgoals = (activeGoal.subgoals || []).map((subgoal: any) =>
        subgoal.id === (changedTask?.goalSubgoalId || changedTask?.id)
          ? { ...subgoal, completed: Boolean(changedTask?.done) }
          : subgoal
      );
      await updateEntity('goals', activeGoal.id, { subgoals: goalSubgoals, progress });
    }
    addActivity(`${changedTask?.done ? 'Completed' : 'Reopened'} roadmap task: ${changedTask?.text || 'task'}`, 'Learning');
  };

  const handleRecalculate = () => {
    if (!activePlan) return;
    addActivity(`Roadmap review requested`, 'Learning');
    addToast('Ask AI Assistant to adjust this roadmap with your latest progress.');
  };

  const totalTasks = activeRoadmap.reduce((acc: number, phase: any) => acc + (phase.tasks || []).length, 0) || 0;
  const completedTasks = activeRoadmap.reduce((acc: number, phase: any) => acc + (phase.tasks || []).filter((task: any) => task.done).length, 0) || 0;
  const progressPercent = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  let nextTask = null;
  let nextOutcome = null;
  if (activePlan) {
    for (const phase of activeRoadmap) {
      const pending = (phase.tasks || []).find((task: any) => !task.done);
      if (pending) {
        nextTask = pending;
        nextOutcome = phase.outcome;
        break;
      }
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden relative pb-20 lg:pb-0">
      <TopBar showMobileTitle={false} />
      
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden h-full">
        
        {/* Left Col: Plans List */}
        <div className="hidden lg:flex lg:col-span-4 xl:col-span-3 border-r border-outline-variant bg-surface flex-col h-full z-10">
          <div className="p-6 border-b border-outline-variant flex justify-between items-center bg-surface/50 backdrop-blur-md sticky top-0">
            <h2 className="text-[24px] font-heading font-bold text-on-surface">Plans</h2>
            <button aria-label="Add Plan" onClick={() => setIsAddingPlan(true)} className="p-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors">
              <Plus className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
            {learningPlans?.map((plan: any) => (
              <div 
                key={plan.id}
                onClick={() => setActivePlanId(plan.id)}
                className={`p-4 rounded-xl cursor-pointer transition-colors ${activePlanId === plan.id ? 'bg-primary-container text-on-primary-container shadow-sm' : 'bg-surface hover:bg-surface-container-low border border-outline-variant text-on-surface'}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-heading font-semibold text-[16px] line-clamp-2">{plan.goal}</h3>
                </div>
                <p className={`font-mono text-[11px] uppercase tracking-wider ${activePlanId === plan.id ? 'opacity-80' : 'text-on-surface-variant'}`}>
                  {plan.startDate || 'No start'} → {plan.endDate || 'No end'}
                </p>
              </div>
            ))}
            {(!learningPlans || learningPlans.length === 0) && (
              <div className="text-center p-8 text-on-surface-variant text-sm">No learning plans active.</div>
            )}
          </div>
        </div>

        {/* Right Col: Plan Details */}
        <div className="lg:col-span-8 xl:col-span-9 bg-background flex flex-col h-full overflow-y-auto custom-scrollbar p-4 lg:p-10">
          {activePlan ? (
            <div className="max-w-4xl mx-auto w-full space-y-8">
              
              <div className="flex items-end justify-between">
                <div>
                  <span className="inline-block px-3 py-1 bg-surface-variant text-on-surface-variant text-[11px] font-mono uppercase tracking-wider rounded-full mb-3">Active Roadmap</span>
                  <h1 className="text-[32px] lg:text-[48px] font-heading font-extrabold text-on-surface leading-tight">{activePlan.goal}</h1>
                  <p className="text-[16px] text-on-surface-variant mt-2 flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4" /> {activePlan.startDate || 'No start'} → {activePlan.endDate || 'No end'}
                  </p>
                  <p className="text-[13px] text-on-surface-variant mt-2">
                    {activePlan.weekly_hours ?? 2} h/week · {activePlan.session_length_minutes ?? 60} min sessions
                  </p>
                </div>
                <button
                  onClick={() => schedulePlan(activePlan)}
                  disabled={isScheduling}
                  className="hidden sm:flex bg-primary text-on-primary px-4 py-2 rounded-lg text-[13px] font-semibold items-center gap-2 disabled:opacity-50"
                >
                  {isScheduling ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarIcon className="w-4 h-4" />}
                  Rebuild schedule
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-surface border border-outline-variant p-6 rounded-xl shadow-sm">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-[16px] font-semibold">Overall Progress</h3>
                    <span className="font-mono text-[14px] font-bold text-primary">{progressPercent}%</span>
                  </div>
                  <div className="h-2 w-full bg-surface-variant rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all duration-1000" style={{ width: `${progressPercent}%` }}></div>
                  </div>
                  <p className="text-[13px] text-on-surface-variant mt-3">{completedTasks} of {totalTasks} tasks completed</p>
                </div>

                <div className="bg-primary-container text-on-primary-container p-6 rounded-xl shadow-sm flex flex-col justify-between">
                  <div>
                    <h3 className="text-[14px] font-semibold opacity-90 mb-1 flex items-center gap-2">
                      <Flag className="w-4 h-4" /> Next Outcome
                    </h3>
                    <p className="text-[18px] font-bold mt-2">{nextOutcome || 'All roadmap tasks are complete.'}</p>
                    {nextTask && <p className="text-[13px] opacity-80 mt-3">{nextTask.text}</p>}
                  </div>
                  {progressPercent > 0 && progressPercent < 30 && activeRoadmap.length > 2 && (
                    <div className="mt-4 flex items-center justify-between bg-on-primary-container/10 p-3 rounded-lg">
                      <span className="text-[12px] flex items-center gap-2"><Target className="w-4 h-4"/> Linked goal: {activeGoal ? `${activeGoal.progress}%` : 'created'}</span>
                      <button onClick={handleRecalculate} className="text-[12px] font-bold bg-surface text-primary px-3 py-1 rounded">Recalculate Plan</button>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="text-[20px] font-heading font-bold text-on-surface">Roadmap</h3>
                {activeRoadmap.map((phase: any, phaseIndex: number) => (
                  <div key={phaseIndex} className="bg-surface border border-outline-variant rounded-xl p-6 shadow-sm">
                    <div className="mb-4">
                      <div className="font-mono text-[11px] text-on-surface-variant uppercase tracking-wider mb-2">{phase.startDate || activePlan.startDate} → {phase.endDate || activePlan.endDate}</div>
                      <h4 className="font-semibold text-[16px] text-on-surface">{phase.title}</h4>
                      {phase.outcome && <p className="text-[14px] text-on-surface-variant mt-2">{phase.outcome}</p>}
                    </div>
                    <div className="space-y-3">
                      {(phase.tasks || []).map((task: any) => (
                        <div key={task.id} className="flex items-center gap-3">
                          <button onClick={() => toggleTask(phaseIndex, task.id)} className="shrink-0 text-primary transition-colors">
                            {task.done ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                          </button>
                          <span className={`text-[15px] ${task.done ? 'text-on-surface-variant line-through' : 'text-on-surface'}`}>{task.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center h-full px-4">
              <div className="w-full max-w-md text-center border border-outline-variant bg-surface rounded-lg p-8 shadow-sm">
                <div className="w-14 h-14 bg-surface-variant rounded-lg flex items-center justify-center text-on-surface-variant mx-auto mb-5">
                  <BookOpen className="w-7 h-7" />
                </div>
                <h3 className="text-[20px] font-heading font-semibold text-on-surface mb-2">No learning plans yet</h3>
                <p className="text-[14px] text-on-surface-variant mb-6 leading-relaxed">
                  Set a goal and date range to generate a Groq roadmap linked to Goals and Analytics.
                </p>
                <button onClick={() => setIsAddingPlan(true)} className="bg-primary text-on-primary px-6 py-2.5 rounded-lg font-medium hover:opacity-90 transition-colors">Create Plan</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Plan Modal */}
      {isAddingPlan && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-outline-variant rounded-2xl overflow-hidden shadow-xl flex flex-col shrink-0 w-full animate-in fade-in zoom-in-95 duration-200" style={{ width: "calc(100vw - 2rem)", maxWidth: "28rem", maxHeight: "90vh" }}>
            <div className="flex justify-between items-center p-6 border-b border-outline-variant">
              <h2 className="text-[20px] font-heading font-bold text-on-surface">Generate Roadmap</h2>
              <button aria-label="Close" onClick={() => setIsAddingPlan(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-variant text-on-surface-variant">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleGeneratePlan} className="p-6 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
              <div>
                <label className="block text-[12px] font-medium text-on-surface-variant mb-1">Goal</label>
                <input 
                  type="text" 
                  value={newGoal} 
                  onChange={e => setNewGoal(e.target.value)}
                  placeholder="e.g. English B1, Learn React" 
                  className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-4 py-2 text-[14px] text-on-surface outline-none focus:border-primary"
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-on-surface-variant mb-1">Start Date</label>
                  <input
                    type="date"
                    value={newStartDate}
                    onChange={e => setNewStartDate(e.target.value)}
                    className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-4 py-2 text-[14px] text-on-surface outline-none focus:border-primary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-on-surface-variant mb-1">End Date</label>
                  <input
                    type="date"
                    value={newEndDate}
                    onChange={e => setNewEndDate(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-4 py-2 text-[14px] text-on-surface outline-none focus:border-primary"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-on-surface-variant mb-1">Hours per week</label>
                  <input
                    type="number"
                    min="0.5"
                    step="0.5"
                    value={newWeeklyHours}
                    onChange={e => setNewWeeklyHours(Number(e.target.value))}
                    className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-4 py-2 text-[14px] text-on-surface outline-none focus:border-primary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-on-surface-variant mb-1">Session length</label>
                  <select
                    value={newSessionLength}
                    onChange={e => setNewSessionLength(Number(e.target.value))}
                    className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-4 py-2 text-[14px] text-on-surface outline-none focus:border-primary"
                  >
                    <option value={30}>30 minutes</option>
                    <option value={45}>45 minutes</option>
                    <option value={60}>60 minutes</option>
                    <option value={90}>90 minutes</option>
                  </select>
                </div>
              </div>
              {isScheduling && (
                <p className="text-[13px] text-primary font-medium flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Finding free time in Calendar...
                </p>
              )}
              
              <div className="mt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsAddingPlan(false)} className="px-4 py-2 text-[14px] font-medium text-on-surface-variant hover:text-on-surface">Cancel</button>
                <button type="submit" disabled={isGenerating || isScheduling} className="bg-primary text-on-primary px-6 py-2 rounded-lg text-[14px] font-medium hover:opacity-90 flex items-center gap-2 disabled:opacity-50">
                  {isGenerating || isScheduling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  Generate Roadmap
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog 
        isOpen={!!planToDelete}
        title="Delete Plan"
        message="Are you sure you want to delete this learning plan?"
        confirmLabel="Delete"
        onConfirm={() => {
          if (planToDelete) {
            deleteEntity('learningPlans', planToDelete);
            setPlanToDelete(null);
            addToast('Plan deleted');
            if (activePlanId === planToDelete) {
              setActivePlanId(learningPlans?.find((p: any) => p.id !== planToDelete)?.id || null);
            }
          }
        }}
        onCancel={() => setPlanToDelete(null)}
      />
    </div>
  );
}
