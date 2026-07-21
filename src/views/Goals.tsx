import React, { useEffect, useState } from 'react';
import { Plus, Check, MoreVertical, ListPlus, Target, X } from 'lucide-react';
import { TopBar } from '../components/TopBar';
import { useStore } from '../store';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { differenceInCalendarDays, format } from 'date-fns';

export function Goals() {
  const { goals, learningPlans, addGoal, addEntity, updateGoal, updateEntity, deleteEntity, addActivity, addToast } = useStore();
  const [goalToDelete, setGoalToDelete] = useState<string | null>(null);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(goals.length > 0 ? goals[0].id : null);
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDeadline, setNewDeadline] = useState('');
  const [newCategory, setNewCategory] = useState('Learning');
  

  const selectedGoal = goals.find(g => g.id === selectedGoalId) || goals[0] || null;
  const completedGoals = goals.filter(g => g.progress >= 100);
  const activeGoals = goals.filter(g => g.progress < 100);
  const selectedLearningPlan = selectedGoal
    ? learningPlans.find((plan: any) => plan.id === selectedGoal.linkedLearningPlanId || plan.linkedGoalId === selectedGoal.id)
    : null;
  const selectedRoadmap = selectedLearningPlan?.roadmap || selectedLearningPlan?.weeks?.map((week: any) => ({
    phaseNumber: week.weekNumber,
    title: week.title || `Phase ${week.weekNumber}`,
    startDate: selectedLearningPlan.startDate,
    endDate: selectedLearningPlan.endDate,
    outcome: week.outcome || '',
    tasks: week.tasks || [],
  })) || [];
  const roadmapTasks = selectedRoadmap.flatMap((phase: any) => phase.tasks || []);
  const totalVisibleTasks = selectedGoal?.subgoals?.length || roadmapTasks.length || 0;
  const completedVisibleTasks = selectedGoal?.subgoals?.length
    ? selectedGoal.subgoals.filter((s: any) => s.completed).length
    : roadmapTasks.filter((task: any) => task.done).length;

  useEffect(() => {
    if (!goals.length) return;
    if (!selectedGoalId || !goals.some((goal: any) => goal.id === selectedGoalId)) {
      setSelectedGoalId(goals[0].id);
    }
  }, [goals, selectedGoalId]);

  const splitMilestoneTitle = (title: string) => {
    const separatorIndex = title.indexOf(': ');
    if (separatorIndex <= 0) return { phase: '', task: title };
    return {
      phase: title.slice(0, separatorIndex),
      task: title.slice(separatorIndex + 2),
    };
  };

  const handleDeleteGoal = () => {
    if (goalToDelete) {
      deleteEntity('goals', goalToDelete);
      addToast('Goal deleted');
      setGoalToDelete(null);
      
    }
  };

  
  const getProbability = (goal: any) => {
    if (goal.progress >= 100) return "Completed";
    // Assuming we have deadline and createdAt
    if (!goal.deadline) return "Deadline not set";
    const start = goal.createdAt ? new Date(goal.createdAt).getTime() : new Date().getTime() - 86400000; // Mock start if missing
    const end = new Date(goal.deadline).getTime();
    const now = new Date().getTime();
    
    if (now > end) return "Missed deadline";
    
    const totalDuration = end - start;
    const elapsed = now - start;
    const elapsedPercent = (elapsed / totalDuration) * 100;
    
    if (goal.progress < elapsedPercent - 15) return "At current pace, likely to finish late";
    if (goal.progress > elapsedPercent + 10) return "Ahead of schedule";
    return "On track";
  };

  const handleAddGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) return;
    
    const goal = {
      id: Math.random().toString(),
      title: newTitle,
      progress: 0,
      deadline: newDeadline || new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0],
      category: newCategory,
      subgoals: []
    };
    
    addGoal(goal);
    setSelectedGoalId(goal.id);
    setIsAdding(false);
    setNewTitle('');
    addActivity(`Created new goal: ${newTitle}`, 'Goals');
    addToast('Goal created successfully');
  };

  const handleToggleSubgoal = (subgoalId: string) => {
    if (!selectedGoal) return;
    const newSubgoals = (selectedGoal.subgoals || []).map((sg: any) => 
      sg.id === subgoalId ? { ...sg, completed: !sg.completed } : sg
    );
    
    const completedCount = newSubgoals.filter((sg: any) => sg.completed).length;
    const progress = newSubgoals.length > 0 ? Math.round((completedCount / newSubgoals.length) * 100) : 0;
    
    updateGoal(selectedGoal.id, { subgoals: newSubgoals, progress });
    if (progress === 100 && selectedGoal.progress < 100) {
      addActivity(`Completed goal: ${selectedGoal.title}!`, 'Goals');
      addToast('Goal completed! 🎉');
    }
  };

  const handleToggleRoadmapTask = async (phaseIndex: number, taskId: string) => {
    if (!selectedGoal || !selectedLearningPlan) return;

    const nextRoadmap = selectedRoadmap.map((phase: any, index: number) => ({
      ...phase,
      tasks: (phase.tasks || []).map((task: any) =>
        index === phaseIndex && task.id === taskId ? { ...task, done: !task.done } : task
      ),
    }));
    const changedTask = nextRoadmap[phaseIndex]?.tasks?.find((task: any) => task.id === taskId);
    const allTasks = nextRoadmap.flatMap((phase: any) => phase.tasks || []);
    const doneCount = allTasks.filter((task: any) => task.done).length;
    const progress = allTasks.length ? Math.round((doneCount / allTasks.length) * 100) : 0;
    const nextSubgoals = (selectedGoal.subgoals || []).map((subgoal: any) =>
      subgoal.id === (changedTask?.goalSubgoalId || changedTask?.id)
        ? { ...subgoal, completed: Boolean(changedTask?.done) }
        : subgoal
    );

    await updateEntity('learningPlans', selectedLearningPlan.id, {
      roadmap: nextRoadmap,
      weeks: nextRoadmap.map((phase: any) => ({ weekNumber: phase.phaseNumber, title: phase.title, tasks: phase.tasks })),
      progress,
    });
    await updateGoal(selectedGoal.id, {
      subgoals: nextSubgoals.length ? nextSubgoals : allTasks.map((task: any) => ({
        id: task.goalSubgoalId || task.id,
        title: task.text,
        completed: Boolean(task.done),
        learningPlanId: selectedLearningPlan.id,
      })),
      progress,
    });
  };

  const handleGeneratePlan = () => {
    if (!selectedGoal) return;
    const subgoals = [
      { id: Math.random().toString(), title: `Define the desired outcome for ${selectedGoal.title}`, completed: false },
      { id: Math.random().toString(), title: 'Break the work into the first concrete milestone', completed: false },
      { id: Math.random().toString(), title: 'Complete the first milestone', completed: false },
      { id: Math.random().toString(), title: 'Review progress and choose the next milestone', completed: false },
    ];
    updateGoal(selectedGoal.id, {
      subgoals: [...(selectedGoal.subgoals || []), ...subgoals],
      progress: 0,
    });
    addActivity(`Added starter milestones for: ${selectedGoal.title}`, 'Goals');
    addToast('Starter milestones added');
  };

  const createLinkedHabit = async () => {
    if (!selectedGoal) return;
    await addEntity('habits', {
      id: Math.random().toString(36).slice(2, 10),
      title: `Work on ${selectedGoal.title}`,
      category: selectedGoal.category || 'Goal',
      linkedGoalId: selectedGoal.id,
      streak: 0,
      bestStreak: 0,
      completedToday: false,
      done: [],
    });
    addActivity(`Created habit linked to goal: ${selectedGoal.title}`, 'Goals');
    addToast('Linked habit created');
  };

  const scheduleFocusBlock = async () => {
    if (!selectedGoal) return;
    const start = new Date();
    start.setDate(start.getDate() + 1);
    start.setHours(10, 0, 0, 0);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    await addEntity('calendarEvents', {
      id: Math.random().toString(36).slice(2, 10),
      title: `Focus: ${selectedGoal.title}`,
      type: 'work',
      description: `Linked goal: ${selectedGoal.title}`,
      linkedGoalId: selectedGoal.id,
      start: start.toISOString(),
      end: end.toISOString(),
    });
    addActivity(`Scheduled focus block for goal: ${selectedGoal.title}`, 'Goals');
    addToast('Focus block scheduled for tomorrow');
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-surface overflow-y-auto lg:overflow-hidden relative pb-20 lg:pb-0 custom-scrollbar">
      <TopBar showMobileTitle={false} />
      
      <header className="hidden lg:flex justify-between items-center px-10 h-16 sticky top-0 bg-surface/80 backdrop-blur-md border-b border-outline-variant z-30">
        <h2 className="text-[32px] font-heading font-bold text-on-surface">Goals</h2>
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-primary text-on-primary px-4 py-2 rounded-lg text-[13px] font-medium hover:opacity-90 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> New Goal
        </button>
      </header>

      {/* Mobile action button */}
      <div className="lg:hidden absolute bottom-24 right-4 z-40">
        <button 
          onClick={() => setIsAdding(true)}
          className="w-14 h-14 bg-primary text-on-primary rounded-full shadow-lg flex items-center justify-center"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      <div className="flex-1 overflow-visible lg:overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-6 p-4 lg:p-8 max-w-[1280px] mx-auto w-full lg:min-h-0">
        
        {/* Left List */}
        <div className="col-span-1 lg:col-span-5 flex flex-col gap-4 overflow-visible lg:overflow-y-auto custom-scrollbar lg:pr-2 lg:h-full lg:min-h-0">
          
          {isAdding && (
            <form onSubmit={handleAddGoal} className="bg-surface-container-lowest border border-primary rounded-xl p-4 shadow-sm relative">
              <button type="button" onClick={() => setIsAdding(false)} className="absolute top-3 right-3 text-on-surface-variant hover:text-on-surface">
                <X className="w-4 h-4" />
              </button>
              <h4 className="font-medium text-on-surface text-[15px] mb-3">Create New Goal</h4>
              <input 
                type="text" 
                placeholder="Goal Title" 
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface mb-3 outline-none focus:border-primary"
                autoFocus
              />
              <div className="flex gap-2 mb-4">
                <input 
                  type="date" 
                  value={newDeadline}
                  onChange={(e) => setNewDeadline(e.target.value)}
                  className="flex-1 bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface outline-none focus:border-primary"
                />
                <select 
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="flex-1 bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface outline-none focus:border-primary"
                >
                  <option>Learning</option>
                  <option>Health</option>
                  <option>Career</option>
                  <option>Finance</option>
                </select>
              </div>
              <button type="submit" className="w-full bg-primary text-on-primary py-2 rounded-lg text-[13px] font-medium">Save Goal</button>
            </form>
          )}

          {activeGoals.map(g => (
            <div 
              key={g.id}
              onClick={() => setSelectedGoalId(g.id)}
              className={`bg-surface-container-lowest border rounded-xl p-4 shadow-sm cursor-pointer transition-colors ${selectedGoalId === g.id ? 'border-primary' : 'border-outline-variant hover:border-primary/40'}`}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary-container/30 flex items-center justify-center text-primary">
                    <Target className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-medium text-on-surface text-[15px]">{g.title}</h4>
                    <span className="inline-block mt-1 px-2 py-0.5 bg-surface-variant text-on-surface-variant text-[10px] uppercase font-mono tracking-wider rounded">{g.category || 'General'}</span>
                  </div>
                </div>
                <span className="font-heading font-bold text-[18px] text-on-surface">{g.progress}%</span>
              </div>
              <div className="h-1.5 w-full bg-outline-variant/45 rounded-full overflow-hidden mt-3 mb-2">
                <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${g.progress}%` }}></div>
              </div>
              <p className="font-mono text-[11px] text-on-surface-variant">Deadline: {g.deadline ? format(new Date(g.deadline), 'MMM d, yyyy') : 'No deadline'}</p>
            </div>
          ))}

          {completedGoals.length > 0 && (
            <div className="mt-4">
              <h3 className="text-[13px] font-medium text-on-surface-variant uppercase tracking-wider mb-3">Completed</h3>
              {completedGoals.map(g => (
                <div 
                  key={g.id}
                  onClick={() => setSelectedGoalId(g.id)}
                  className={`bg-surface-container-low opacity-70 border rounded-xl p-4 mb-3 shadow-sm cursor-pointer transition-colors ${selectedGoalId === g.id ? 'border-primary' : 'border-transparent hover:border-outline-variant'}`}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center text-secondary">
                        <Check className="w-4 h-4" />
                      </div>
                      <h4 className="font-medium text-on-surface text-[14px] line-through">{g.title}</h4>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Detail */}
        {selectedGoal ? (
          <div className="col-span-1 lg:col-span-7 bg-surface-container-lowest border border-outline-variant rounded-xl p-5 lg:p-6 flex flex-col shadow-sm lg:h-full lg:min-h-0 lg:overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-start mb-5 shrink-0">
              <div>
                <span className="inline-block mb-3 px-2.5 py-1 bg-surface-variant text-on-surface-variant text-[11px] uppercase font-mono tracking-wider rounded">{selectedGoal.category || 'General'}</span>
                <h2 className="text-[24px] lg:text-[32px] font-heading font-bold text-on-surface leading-tight mb-2">{selectedGoal.title}</h2>
                <div className="flex flex-wrap gap-2 mt-3">
                  <button onClick={createLinkedHabit} className="bg-primary/10 text-primary px-3 py-1.5 rounded-lg text-[12px] font-semibold hover:bg-primary/20">
                    Create Habit
                  </button>
                  <button onClick={scheduleFocusBlock} className="bg-surface border border-outline-variant text-on-surface px-3 py-1.5 rounded-lg text-[12px] font-semibold hover:bg-surface-container-low">
                    Schedule Focus
                  </button>
                </div>
              </div>
              <button aria-label="Options"  className="p-2 text-on-surface-variant hover:bg-surface-variant rounded-lg transition-colors">
<MoreVertical className="w-5 h-5" />
</button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6 shrink-0">
              <div className="bg-surface-container-low border border-outline-variant/50 p-4 rounded-xl">
                <p className="font-mono text-[11.5px] text-on-surface-variant uppercase tracking-wider mb-1">Progress</p>
                <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
                  <span className="text-[24px] lg:text-[32px] font-heading font-extrabold text-on-surface">{selectedGoal.progress}%</span>
                  <span className="text-[13px] sm:text-[14px] text-on-surface-variant whitespace-nowrap">
                    {completedVisibleTasks}/{totalVisibleTasks} done
                  </span>
                </div>
              </div>
              <div className="bg-surface-container-low border border-outline-variant/50 p-4 rounded-xl">
                <p className="font-mono text-[11.5px] text-on-surface-variant uppercase tracking-wider mb-1">Days Left</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-[24px] lg:text-[32px] font-heading font-extrabold text-on-surface">
                    {selectedGoal.deadline ? Math.max(0, differenceInCalendarDays(new Date(selectedGoal.deadline), new Date())) : '∞'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center mb-4 shrink-0">
              <h3 className="text-[18px] lg:text-[20px] font-heading font-semibold text-on-surface">
                {selectedRoadmap.length ? 'Learning Roadmap' : 'Milestones'}
              </h3>
              {(!selectedGoal.subgoals || selectedGoal.subgoals.length === 0) && !selectedRoadmap.length && (
                <button 
                  onClick={handleGeneratePlan}
                  className="text-[12px] font-medium text-primary hover:underline flex items-center gap-1 disabled:opacity-50"
                >
                  <ListPlus className="w-3 h-3" />
                  Add Starter Milestones
                </button>
              )}
            </div>
            
            <div className="space-y-3">
              {selectedRoadmap.length > 0 ? (
                selectedRoadmap.map((phase: any, phaseIndex: number) => (
                  <div key={`${phase.phaseNumber || phaseIndex}-${phase.title}`} className="rounded-xl border border-outline-variant bg-surface p-4">
                    <div className="mb-3">
                      <div className="font-mono text-[10.5px] uppercase tracking-wider text-primary mb-1">
                        {phase.startDate || selectedLearningPlan?.startDate || 'Start'} → {phase.endDate || selectedLearningPlan?.endDate || 'End'}
                      </div>
                      <h4 className="text-[15px] font-semibold text-on-surface leading-snug break-words">{phase.title || `Phase ${phaseIndex + 1}`}</h4>
                      {phase.outcome && (
                        <p className="text-[13px] text-on-surface-variant mt-1 leading-relaxed break-words">{phase.outcome}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      {(phase.tasks || []).map((task: any) => (
                        <button
                          key={task.id}
                          type="button"
                          onClick={() => handleToggleRoadmapTask(phaseIndex, task.id)}
                          className="w-full flex items-start gap-3 text-left rounded-lg border border-outline-variant/60 bg-surface-container-low px-3 py-3 hover:border-primary/40 transition-colors"
                        >
                          <span className={`mt-0.5 w-5 h-5 rounded-sm flex items-center justify-center shrink-0 border-2 ${
                            task.done ? 'bg-primary border-primary text-on-primary' : 'border-outline text-transparent'
                          }`}>
                            <Check className="w-3.5 h-3.5 font-bold" />
                          </span>
                          <span className={`min-w-0 text-[14px] leading-relaxed break-words ${task.done ? 'text-on-surface-variant line-through' : 'text-on-surface'}`}>
                            {task.text}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              ) : selectedGoal.subgoals?.map((sg: any) => {
                const milestone = splitMilestoneTitle(String(sg.title || 'Milestone'));
                return (
                  <div 
                    key={sg.id} 
                    className={`flex items-start gap-3 sm:gap-4 p-4 rounded-xl cursor-pointer transition-colors border ${
                      sg.completed ? 'bg-surface border-outline-variant opacity-70' : 'bg-surface-container-low border-primary/20 hover:border-primary/40'
                    }`}
                    onClick={() => handleToggleSubgoal(sg.id)}
                  >
                    <div className={`mt-0.5 w-5 h-5 rounded-sm flex items-center justify-center shrink-0 border-2 ${
                      sg.completed ? 'bg-primary border-primary text-on-primary' : 'border-outline text-transparent'
                    }`}>
                      <Check className="w-3.5 h-3.5 font-bold" />
                    </div>
                    <div className="flex-1 min-w-0">
                      {milestone.phase && (
                        <div className="font-mono text-[10.5px] uppercase tracking-wider text-primary mb-1 break-words">
                          {milestone.phase}
                        </div>
                      )}
                      <p className={`text-[14px] sm:text-[15px] leading-relaxed break-words ${sg.completed ? 'text-on-surface-variant line-through' : 'text-on-surface'}`}>
                        {milestone.task}
                      </p>
                    </div>
                  </div>
                );
              })}

              {(!selectedGoal.subgoals || selectedGoal.subgoals.length === 0) && !selectedRoadmap.length && (
                <div className="text-center py-8">
                  <p className="text-[14px] text-on-surface-variant mb-4">No milestones set yet.</p>
                  <button 
                    onClick={handleGeneratePlan}
                    className="mx-auto flex items-center justify-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-lg text-[13px] font-medium hover:bg-primary/20 transition-colors"
                  >
                    <ListPlus className="w-4 h-4" /> Add Starter Milestones
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="hidden lg:flex col-span-7 bg-surface-container-lowest border border-outline-variant rounded-xl p-8 items-center justify-center shadow-sm">
            <div className="text-center">
              <Target className="w-12 h-12 text-outline mx-auto mb-4" />
              <p className="text-on-surface-variant font-medium">Select a goal to view details</p>
            </div>
          </div>
        )}

      </div>
          <ConfirmDialog 
        isOpen={!!goalToDelete}
        title="Delete Goal"
        message="Are you sure you want to delete this goal?"
        confirmLabel="Delete"
        onConfirm={handleDeleteGoal}
        onCancel={() => setGoalToDelete(null)}
      />
    </div>
  );
}
