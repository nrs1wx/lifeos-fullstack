import React, { useMemo } from 'react';
import { TopBar } from '../components/TopBar';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Sparkles } from 'lucide-react';
import { useStore } from '../store';

export function Analytics() {
  const { goals, habits, healthLogs, finances, calendarEvents, learningPlans, recentActivity } = useStore();

  const learningStats = useMemo(() => {
    const tasks = learningPlans.flatMap((plan: any) => {
      const roadmap = plan.roadmap || plan.weeks || [];
      return roadmap.flatMap((phase: any) => phase.tasks || []);
    });
    const completed = tasks.filter((task: any) => task.done).length;
    return {
      plans: learningPlans.length,
      tasks: tasks.length,
      completed,
      progress: tasks.length ? Math.round((completed / tasks.length) * 100) : 0,
    };
  }, [learningPlans]);

  const goalStats = useMemo(() => {
    const active = goals.filter((goal: any) => Number(goal.progress || 0) < 100);
    const progress = goals.length
      ? Math.round(goals.reduce((sum: number, goal: any) => sum + Number(goal.progress || 0), 0) / goals.length)
      : 0;
    return { active: active.length, total: goals.length, progress };
  }, [goals]);

  const weeklyData = useMemo(() => {
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - index));
      date.setHours(0, 0, 0, 0);
      const dateKey = date.toISOString().split('T')[0];
      const sameDay = (value: string) => {
        const parsed = new Date(value);
        return !Number.isNaN(parsed.valueOf()) && parsed.toDateString() === date.toDateString();
      };

      return {
        name: date.toLocaleDateString(undefined, { weekday: 'short' }),
        habits: habits.reduce((count: number, habit: any) => count + ((habit.done || []).includes(dateKey) ? 1 : 0), 0),
        health: healthLogs.filter((log: any) => sameDay(log.date)).length,
        finance: finances.filter((tx: any) => sameDay(tx.date)).length,
        calendar: calendarEvents.filter((event: any) => sameDay(event.start)).length,
        learning: learningPlans.filter((plan: any) => sameDay(plan.startDate)).length +
          recentActivity.filter((item: any) => item.type === 'Learning' && sameDay(item.timestamp)).length,
        activity: recentActivity.filter((item: any) => sameDay(item.timestamp)).length,
      };
    });
  }, [habits, healthLogs, finances, calendarEvents, learningPlans, recentActivity]);

  const hasData = weeklyData.some(day => day.habits || day.health || day.finance || day.calendar || day.learning || day.activity);
  const totalHabitCompletions = weeklyData.reduce((sum, day) => sum + day.habits, 0);
  const totalHealthLogs = weeklyData.reduce((sum, day) => sum + day.health, 0);
  const totalTransactions = weeklyData.reduce((sum, day) => sum + day.finance, 0);
  const totalEvents = weeklyData.reduce((sum, day) => sum + day.calendar, 0);
  const totalLearningActivity = weeklyData.reduce((sum, day) => sum + day.learning, 0);
  const insight = hasData
    ? `This week: ${totalHabitCompletions} habit completions, ${totalHealthLogs} health logs, ${totalTransactions} finance entries, ${totalEvents} calendar events, and ${totalLearningActivity} learning updates. Learning progress is ${learningStats.progress}%; average goal progress is ${goalStats.progress}%.`
    : 'Add real entries in habits, health, finance, learning, or calendar to see analytics here.';

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden relative pb-20 lg:pb-0">
      <TopBar showMobileTitle={false} />
      
      <div className="p-4 lg:p-10 max-w-[1280px] mx-auto w-full flex-1 flex flex-col overflow-y-auto custom-scrollbar gap-6">
        <header className="flex justify-between items-end shrink-0 mb-4">
          <div>
            <h2 className="text-[32px] font-heading font-bold text-on-surface">Analytics</h2>
            <p className="text-[14px] text-on-surface-variant mt-1">Cross-module insights and trends.</p>
          </div>
        </header>

        <div className="bg-primary-container/20 border border-primary/30 rounded-xl p-6 shadow-sm flex flex-col sm:flex-row gap-4 sm:items-center min-h-[100px]">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-on-primary shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-[16px] font-heading font-semibold text-on-surface mb-1">Insight</h3>
            <p className="text-[14px] text-on-surface-variant leading-relaxed animate-in fade-in">{insight}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-surface border border-outline-variant rounded-xl p-5 shadow-sm">
            <p className="font-mono text-[11px] text-on-surface-variant uppercase tracking-wider">Goal Progress</p>
            <div className="text-[30px] font-heading font-bold text-on-surface mt-2">{goalStats.progress}%</div>
            <p className="text-[13px] text-on-surface-variant mt-1">{goalStats.active} active of {goalStats.total} goals</p>
          </div>
          <div className="bg-surface border border-outline-variant rounded-xl p-5 shadow-sm">
            <p className="font-mono text-[11px] text-on-surface-variant uppercase tracking-wider">Learning Progress</p>
            <div className="text-[30px] font-heading font-bold text-on-surface mt-2">{learningStats.progress}%</div>
            <p className="text-[13px] text-on-surface-variant mt-1">{learningStats.completed}/{learningStats.tasks} roadmap tasks</p>
          </div>
          <div className="bg-surface border border-outline-variant rounded-xl p-5 shadow-sm">
            <p className="font-mono text-[11px] text-on-surface-variant uppercase tracking-wider">Learning Plans</p>
            <div className="text-[30px] font-heading font-bold text-on-surface mt-2">{learningStats.plans}</div>
            <p className="text-[13px] text-on-surface-variant mt-1">Groq roadmaps linked to goals</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          <div className="bg-surface border border-outline-variant rounded-xl p-6 shadow-sm">
            <h3 className="text-[18px] font-heading font-semibold text-on-surface mb-6">Productivity Output</h3>
            <div className="h-[250px] w-full">
              {!hasData ? (
                <div className="h-full flex items-center justify-center text-[14px] text-on-surface-variant text-center">No activity data for the last 7 days.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-outline-variant)" vertical={false} opacity={0.5} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--color-on-surface-variant)', fontFamily: 'var(--font-mono)' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--color-on-surface-variant)', fontFamily: 'var(--font-mono)' }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-outline-variant)', borderRadius: '8px', fontSize: '13px' }}
                      itemStyle={{ color: 'var(--color-on-surface)' }}
                    />
                    <Line type="monotone" dataKey="habits" stroke="var(--color-secondary)" strokeWidth={3} dot={{ r: 4, fill: 'var(--color-secondary)' }} />
                    <Line type="monotone" dataKey="activity" stroke="var(--color-primary)" strokeWidth={3} dot={{ r: 4, fill: 'var(--color-primary)' }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="learning" stroke="var(--color-tertiary)" strokeWidth={3} dot={{ r: 4, fill: 'var(--color-tertiary)' }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
            {hasData && (
              <div className="flex items-center justify-center gap-6 mt-4">
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-primary"></div><span className="text-[13px] text-on-surface-variant">Recent Activity</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-secondary"></div><span className="text-[13px] text-on-surface-variant">Habits Complete</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-tertiary"></div><span className="text-[13px] text-on-surface-variant">Learning</span></div>
              </div>
            )}
          </div>

          <div className="bg-surface border border-outline-variant rounded-xl p-6 shadow-sm">
            <h3 className="text-[18px] font-heading font-semibold text-on-surface mb-6">Weekly Module Activity</h3>
            <div className="h-[250px] w-full">
              {!hasData ? (
                <div className="h-full flex items-center justify-center text-[14px] text-on-surface-variant text-center">No module activity to chart yet.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-outline-variant)" vertical={false} opacity={0.5} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--color-on-surface-variant)', fontFamily: 'var(--font-mono)' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--color-on-surface-variant)', fontFamily: 'var(--font-mono)' }} />
                    <Tooltip 
                      cursor={{ fill: 'var(--color-surface-container-low)' }}
                      contentStyle={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-outline-variant)', borderRadius: '8px', fontSize: '13px' }}
                    />
                    <Bar dataKey="health" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="finance" fill="var(--color-secondary)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="calendar" fill="var(--color-tertiary)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="learning" fill="var(--color-warning)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
