import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGoalsContext } from '@context/GoalsContext';
import { useTimezone } from '@context/TimezoneContext';
import useAuth from '@hooks/useAuth';
import { getSessionToken, getWeekStartDate } from '@utils/functions';
import { getTodayInTimezone, formatDateInTimezone, convertToUTC } from '@utils/timezone';
import { Task, Goal, calculateGoalCompletion } from '@utils/goalUtils';
import LoadingSpinner from '@components/LoadingSpinner';
import GoalForm from '@components/GoalForm';
import TasksList from '@components/TasksList';
import ProfileManagement from '@components/ProfileManagement';
import Modal from 'react-modal';
import { ARIA_HIDE_APP } from '@lib/modal';
import { modalClasses, overlayClasses } from '@styles/classes';
import supabase from '@lib/supabase';
import {
  Target,
  CheckSquare,
  Sparkles,
  ChevronRight,
  Plus,
  Calendar,
  Zap,
  // Circle,
  // CheckCircle2,
  // Clock,
  Award,
  X,
  // ChevronUp,
  // ChevronDown,
  ListTodo,
  PlusIcon,
  Bell,
} from 'lucide-react';
import { CircularProgress, MenuItem, Button, TextField, FormControl, InputLabel, Select, IconButton, FormControlLabel, Switch } from '@mui/material';
import { DatePicker, TimePicker, DateTimePicker } from '@mui/x-date-pickers';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import type { Dayjs } from 'dayjs';
import GoalCompletionDonut from './GoalCompletionDonut';
import TaskCard from './TaskCard';

// ─── helpers ────────────────────────────────────────────────────────────────

function formatDisplayDate(iso: string, timezone: string = 'UTC'): string {
  const d = new Date(iso + 'T00:00:00');
  return formatDateInTimezone(d, timezone, { weekday: 'long', month: 'long', day: 'numeric' });
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

// ─── today task row ─────────────────────────────────────────────────────────

// const STATUS_DOT: Record<string, string> = {
//   'Done':        'bg-green-600 dark:bg-green-400',
//   'In progress': 'bg-blue-600 dark:bg-blue-400',
//   'Blocked':     'bg-red-600 dark:bg-red-400',
//   'On hold':     'bg-amber-500 dark:bg-amber-400',
//   'Not started': 'bg-gray-40 dark:bg-gray-50',
// };
// const STATUS_TEXT: Record<string, string> = {
//   'Done':        'text-green-600 dark:text-green-400',
//   'In progress': 'text-blue-600 dark:text-blue-400',
//   'Blocked':     'text-red-600 dark:text-red-400',
//   'On hold':     'text-amber-500 dark:text-amber-400',
//   'Not started': 'text-gray-50 dark:text-gray-40',
// };
// const ALL_STATUSES: Task['status'][] = ['Not started', 'In progress', 'On hold', 'Blocked', 'Done'];

function TodayTaskRow({
  task,
  onStatusChange,
  onUpdate,
  onDelete,
}: {
  task: Task;
  onStatusChange: (taskId: string, newStatus: Task['status'], closingRationale?: string) => void;
  onUpdate?: (taskId: string, updates: Partial<Task>) => void;
  onDelete?: (taskId: string) => void;
}) {
  return (
    <li className="flex flex-wrap w-full items-center gap-3 px-4 py-3">
      <TaskCard
        task={task}
        className='border-none'
        compact
        list
        hideCategory
        onStatusChange={onStatusChange}
        onUpdate={onUpdate}
        onDelete={onDelete}
        // allowInlineEdit
      />
    </li>
  );
}

// ─── mini goal card ──────────────────────────────────────────────────────────

function MiniGoalCard({ goal, tasks: propTasks, onClick }: { goal: Goal; tasks?: Task[]; onClick: () => void }) {
  const [tasks, setTasks] = useState<Task[]>(propTasks ?? []);

  useEffect(() => {
    if (propTasks !== undefined) {
      setTasks(propTasks);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const token = await getSessionToken();
        if (!token) return;
        const res = await fetch('/.netlify/functions/getAllTasks', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const all: Task[] = await res.json();
        if (!cancelled) setTasks(all.filter(t => t.goal_id === goal.id));
      } catch { /* silent */ }
    })();
    return () => { cancelled = true; };
  }, [goal.id, propTasks]);

  return (
    <button
      onClick={onClick}
      className="group w-full text-left rounded-md border border-gray-20 dark:border-gray-70 bg-background-color hover:bg-brand-20 dark:hover:bg-brand-80 p-4 hover:border-primary hover:shadow-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary"
    >
    <div className="flex w-full items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          {goal.category && (
            <p className="text-xs text-gray-50 dark:text-gray-40 mt-0.5 truncate" title={goal.category}>{goal.category}</p>
          )}
          <p className="font-semibold text-sm text-primary-text truncate" title={goal.title}>{goal.title}</p>
        </div>
        <div className="mt-3 mx-8 flex items-center gap-1.5">
            <div className="flex items-center gap-2">
              {tasks.length > 0 && (
                <GoalCompletionDonut percentage={calculateGoalCompletion(tasks)} size={60} strokeWidth={4} />
              )}
            </div>
        </div>
        <ChevronRight className="w-4 h-4 text-secondary-text group-hover:text-primary shrink-0 mt-0.5 transition-colors" />
      </div>
    </button>
  );
}

// ─── empty state ─────────────────────────────────────────────────────────────

function EmptyState({ onAddGoal, username }: { onAddGoal: () => void; username?: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center py-16 px-4 text-center max-w-7xl mx-auto">
      
        <div className='relative text-start z-10 max-w-7xl space-y-8'>
            <h2 className="text-4xl font-light mt-2 mb-3">Welcome{username ? `, ${username}` : ''}</h2>
            <p className="text-secondary-text mb-8 leading-relaxed max-w-2xl">
                Wkly helps you stay focused week over week — track goals, manage tasks, log wins, and generate AI-powered summaries of your progress.
            </p>

            {/* <button
                onClick={onAddGoal}
                className="btn-primary text-2xl p-3 mb-8 font-[300] inline-flex items-center gap-3 transition-colors shadow-sm"
            >
                Add your first goal
                <Target className="w-5 h-5" />
            </button> */}
            <Button
                onClick={onAddGoal}
                variant='contained'
                className="btn-primary gap-3 flex"
                // title={`Add a new goal for the current ${scope}`}
                aria-label={`Add a new goal`}
                >
                <span className="block flex text-nowrap">Add Your First Goal</span>
                <Target className="w-5 h-5" />
            </Button>
            {/* feature pills */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full min-h-[20rem] mb-10 ">
                {[
                    { icon: <Target className="w-8 h-8 lg:w-[10rem] lg:h-[10rem]" />,   label: 'Prioritized goals', desc: 'Set focused goals each week' },
                    { icon: <CheckSquare className="w-8 h-8 lg:w-[10rem] lg:h-[10rem]" />, label: 'Task tracking', desc: 'Break goals into tasks' },
                    { icon: <Award className="w-8 h-8 lg:w-[10rem] lg:h-[10rem]" />,   label: 'Wins', desc: 'Capture what you achieved' },
                    { icon: <Sparkles className="w-8 h-8 lg:w-[10rem] lg:h-[10rem]" />, label: 'AI summaries', desc: 'Auto-generate progress reports' },
                ].map(({ icon, label, desc }) => (
                <div
                    key={label}
                    className="flex flex-col items-start gap-1 rounded-md bg-background-color border border-brand-20 dark:border-brand-70 p-3 sm:p-8 text-left"
                    >
                    <div className="flex items-start gap-3 text-brand-50 dark:text-brand-70 font-normal text-lg md:text-2xl">
                        {icon}
                        <div className="flex flex-col text-brand-70 dark:text-brand-40">
                            {label}
                            <p className="text-sm text-gray-50 dark:text-gray-40">{desc}</p>
                        </div>
                    </div>
                </div>
                ))}
            </div>
        </div>
      
    </div>
  );
}

// ─── action prompt card ──────────────────────────────────────────────────────

function ActionCard({
  icon,
  label,
  description,
  onClick,
  variant = 'default',
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  onClick: () => void;
  variant?: 'default' | 'primary';
}) {
  return (
    <button
      onClick={onClick}
      className={`group w-auto text-left rounded-md border p-4 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary ${
        variant === 'primary'
          ? 'border-primary/40 bg-primary/5 group-hover:bg-brand-10 dark:bg-brand-90 dark:group-hover:bg-primary/20'
          : 'border-gray-20 dark:border-gray-70 bg-transparent hover:border-primary hover:shadow-md'
      }`}
    >
      <div className="flex w-auto pr-4 items-center justify-center gap-3">
        <div className={`w-9 h-9 rounded-md flex items-center justify-center shrink-0 ${
          variant === 'primary' ? 'text-primary' : 'bg-transparent text-gray-60 dark:text-gray-30 group-hover:bg-primary/10 group-hover:text-primary transition-colors'
        }`}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-base text-primary-text">{label}</p>
          <p className="text-xs text-gray-50 dark:text-gray-40 mt-0.5">{description}</p>
        </div>
        {/* <ChevronRight className="w-4 h-4 text-gray-40 group-hover:text-primary ml-auto shrink-0 transition-colors" /> */}
      </div>
    </button>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

const EMPTY_GOAL: Goal = {
  id: '', title: '', description: '', category: '',
  week_start: '', user_id: '', created_at: '', status: 'Not started', status_notes: '',
};

export default function HomePage() {
  const navigate = useNavigate();
  const { goals, isRefreshing, refreshGoals, lastUpdated } = useGoalsContext();
  const { profile, session } = useAuth();
  const { timezone } = useTimezone();
  const username: string | undefined = profile?.username || undefined;

  const [todayTasks, setTodayTasks]     = useState<Task[]>([]);
  const [allGoalTasks, setAllGoalTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [selectedTodayTask, setSelectedTodayTask] = useState<Task | null>(null);
  const [selectedTodayTaskKey, setSelectedTodayTaskKey] = useState(0);

  // ── modal state ───────────────────────────────────────────────────────────
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [newGoal, setNewGoal] = useState<Goal>({ ...EMPTY_GOAL, week_start: getWeekStartDate() });
  const [goalsExpanded, setGoalsExpanded] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [isTasksModalOpen, setIsTasksModalOpen] = useState(false);
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [standaloneNewTask, setStandaloneNewTask] = useState<Partial<Task>>({ title: '', description: '' });
  const [standaloneTaskGoalId, setStandaloneTaskGoalId] = useState('');
  const [standaloneCreateNewGoal, setStandaloneCreateNewGoal] = useState(false);
  const [standaloneNewGoalTitle, setStandaloneNewGoalTitle] = useState('');
  // Date/time picker + reminder state for standalone Add Task modal
  const [standaloneSelectedDate, setStandaloneSelectedDate] = useState<Dayjs | null>(null);
  const [standaloneSelectedTime, setStandaloneSelectedTime] = useState<Dayjs | null>(null);
  const [standaloneReminderEnabled, setStandaloneReminderEnabled] = useState(false);
  const [standaloneReminderOffset, setStandaloneReminderOffset] = useState('30');
  const [standaloneReminderDatetime, setStandaloneReminderDatetime] = useState('');
  const [standaloneSelectedReminderDatetime, setStandaloneSelectedReminderDatetime] = useState<Dayjs | null>(null);

  // ── first-login: auto-open profile modal once per session ─────────────────
  useEffect(() => {
    if (profile === null) return; // still loading
    if (!profile.username && !sessionStorage.getItem('wkly_profile_prompted')) {
      sessionStorage.setItem('wkly_profile_prompted', '1');
      setIsProfileOpen(true);
    }
  }, [profile]);

  const today = getTodayInTimezone(timezone);

  // Build per-goal task map from the all-tasks fetch
  const tasksByGoal = allGoalTasks.reduce<Record<string, Task[]>>((acc, t) => {
    if (t.goal_id) {
      (acc[t.goal_id] ??= []).push(t);
    }
    return acc;
  }, {});

  // Filter out 100%-complete goals; sort by completion % ascending (in-progress first)
  const sortedGoals = [...goals]
    .filter(goal => calculateGoalCompletion(tasksByGoal[goal.id] ?? []) < 100)
    .sort((a, b) => {
      const pa = calculateGoalCompletion(tasksByGoal[a.id] ?? []);
      const pb = calculateGoalCompletion(tasksByGoal[b.id] ?? []);
      return pb - pa;
    });
  const latestGoals   = sortedGoals.slice(0, goalsExpanded ? 10 : 3);
  const hasGoals      = goals.length > 0;

  // ── fetch today's tasks ───────────────────────────────────────────────────
  const fetchTodayTasks = useCallback(async () => {
    setTasksLoading(true);
    try {
      const token = await getSessionToken();
      const res   = await fetch('/.netlify/functions/getAllTasks', {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) throw new Error(await res.text());

      const data: Task[] = await res.json();
      setAllGoalTasks(data);
      const forToday = data.filter(t => t.scheduled_date === today);
      // Sort: not-done first, then done
      forToday.sort((a, b) => {
        if (a.status === 'Done' && b.status !== 'Done') return 1;
        if (b.status === 'Done' && a.status !== 'Done') return -1;
        return a.order_index - b.order_index;
      });
      setTodayTasks(forToday);
    } catch (err) {
      console.error('[HomePage] fetchTodayTasks error', err);
    } finally {
      setTasksLoading(false);
    }
  }, [today]);

  useEffect(() => {
    fetchTodayTasks();
  }, [fetchTodayTasks]);

  // ── task status update ─────────────────────────────────────────────────────
  const handleTaskStatusChange = async (taskId: string, newStatus: Task['status'], closingRationale?: string) => {
    setTodayTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    try {
      const token = await getSessionToken();
      await fetch('/.netlify/functions/updateTask', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, status: newStatus, ...(closingRationale ? { closing_rationale: closingRationale } : {}) }),
      });
    } catch (err) {
      console.error('[HomePage] handleTaskStatusChange error', err);
    }
  };

  // ── today task detail handlers ────────────────────────────────────────────
  const handleTodayTaskUpdate = (taskId: string, updates: Partial<Task>) => {
    setTodayTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));
    setAllGoalTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));
    setSelectedTodayTask(prev => prev?.id === taskId ? { ...prev, ...updates } : prev);
  };

  const handleTodayTaskDelete = (taskId: string) => {
    setTodayTasks(prev => prev.filter(t => t.id !== taskId));
    setAllGoalTasks(prev => prev.filter(t => t.id !== taskId));
    setSelectedTodayTask(null);
  };

  // ── handlers ──────────────────────────────────────────────────────────────
  const goToGoals     = () => navigate('/goals');
  const goToCalendar   = () => {
    try { localStorage.setItem('goals_view_mode', 'tasks-calendar'); } catch { /* ignore */ }
    navigate('/goals');
  };
  const openGoalModal  = () => {
    setNewGoal({ ...EMPTY_GOAL, week_start: getWeekStartDate() });
    setIsGoalModalOpen(true);
  };
  const closeGoalModal = () => setIsGoalModalOpen(false);

  const openTasksModal = (goal: Goal) => {
    setSelectedGoal(goal);
    setIsTasksModalOpen(true);
  };
  const closeTasksModal = () => {
    setIsTasksModalOpen(false);
    setSelectedGoal(null);
  };

  const closeAddTaskModal = () => {
    setIsAddTaskModalOpen(false);
    setStandaloneNewTask({ title: '', description: '' });
    setStandaloneTaskGoalId('');
    setStandaloneCreateNewGoal(false);
    setStandaloneNewGoalTitle('');
    setStandaloneSelectedDate(null);
    setStandaloneSelectedTime(null);
    setStandaloneReminderEnabled(false);
    setStandaloneReminderOffset('30');
    setStandaloneReminderDatetime('');
    setStandaloneSelectedReminderDatetime(null);
  };

  const createStandaloneTask = async () => {
    if (!standaloneNewTask.title?.trim()) { 
      alert('Task title is required');
      return; 
    }
    if (!standaloneCreateNewGoal && !standaloneTaskGoalId) { 
      alert('Please select a goal or choose to create a new one');
      return; 
    }
    if (standaloneCreateNewGoal && !standaloneNewGoalTitle.trim()) { 
      alert('New goal title is required');
      return; 
    }
    try {
      const token = await getSessionToken();
      if (!token) throw new Error('Not authenticated');
      
      let goalId = standaloneTaskGoalId;
      
      if (standaloneCreateNewGoal) {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: createdGoal, error: goalErr } = await supabase
          .from('goals')
          .insert({
            title: standaloneNewGoalTitle.trim(),
            week_start: getWeekStartDate(),
            user_id: user?.id,
            status: 'Not started',
            description: '',
            category: '',
          })
          .select()
          .single();
        if (goalErr || !createdGoal) throw new Error(goalErr?.message || 'Failed to create goal');
        goalId = createdGoal.id;
        await refreshGoals();
      }
      
      const dateStr = standaloneSelectedDate ? standaloneSelectedDate.format('YYYY-MM-DD') : null;
      const timeStr = standaloneSelectedTime ? standaloneSelectedTime.format('HH:mm') : null;
      // Compute reminder datetime in UTC
      let computedReminderDatetime: string | null = null;
      let finalReminderEnabled = standaloneReminderEnabled;
      if (standaloneReminderEnabled) {
        try {
          if (standaloneReminderOffset === 'custom') {
            computedReminderDatetime = standaloneReminderDatetime ? new Date(standaloneReminderDatetime).toISOString() : null;
          } else if (dateStr && timeStr) {
            const scheduledUTC = convertToUTC(dateStr, timeStr, timezone);
            const scheduledDate = new Date(scheduledUTC);
            scheduledDate.setMinutes(scheduledDate.getMinutes() - Number(standaloneReminderOffset));
            computedReminderDatetime = scheduledDate.toISOString();
          } else if (standaloneReminderDatetime) {
            computedReminderDatetime = new Date(standaloneReminderDatetime).toISOString();
          }
        } catch (e) {
          computedReminderDatetime = null;
        }
        if (!computedReminderDatetime) finalReminderEnabled = false;
      }
      const response = await fetch('/.netlify/functions/createTask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          goal_id: goalId,
          title: standaloneNewTask.title!.trim(),
          description: standaloneNewTask.description || null,
          status: 'Not started',
          scheduled_date: dateStr,
          scheduled_time: timeStr,
          reminder_enabled: finalReminderEnabled,
          reminder_datetime: computedReminderDatetime,
          order_index: 0,
        }),
      });
      if (!response.ok) throw new Error('Failed to create task');
      
      closeAddTaskModal();
      fetchTodayTasks();
    } catch (err) {
      console.error('[HomePage] createStandaloneTask error:', err);
      alert('Failed to create task');
    }
  };

  // ── loading ───────────────────────────────────────────────────────────────
  if (isRefreshing && goals.length === 0) {
    return (
      <div className="flex justify-center items-center py-20">
        <CircularProgress />
      </div>
    );
  }

  // ── loading state (initial load or refreshing after user change) ──────────
  if ((session?.user?.id && lastUpdated === undefined) || (isRefreshing && !hasGoals)) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-50">Loading your goals...</p>
        </div>
      </div>
    );
  }

  // ── empty state ───────────────────────────────────────────────────────────
  if (!isRefreshing && !hasGoals) {
    return (
      <>
        <EmptyState onAddGoal={openGoalModal} username={username} />

        {/* Profile setup modal */}
        <Modal
          isOpen={isProfileOpen}
          ariaHideApp={ARIA_HIDE_APP}
          className="fixed inset-0 flex items-center justify-center z-50"
          overlayClassName={overlayClasses}
        >
          {isProfileOpen && (
            <div className={modalClasses}>
              <ProfileManagement onClose={() => setIsProfileOpen(false)} />
            </div>
          )}
        </Modal>

        {/* Add first goal modal */}
        <Modal
          isOpen={isGoalModalOpen}
          onRequestClose={closeGoalModal}
          shouldCloseOnOverlayClick
          ariaHideApp={ARIA_HIDE_APP}
          className="fixed inset-0 flex md:items-center justify-center z-50"
          overlayClassName={overlayClasses}
        >
          <div className={modalClasses}>
            {isGoalModalOpen && (
              <GoalForm
                newGoal={newGoal}
                setNewGoal={setNewGoal}
                handleClose={closeGoalModal}
                categories={[]}
                refreshGoals={() => refreshGoals().then(() => {})}
              />
            )}
          </div>
        </Modal>
      </>
    );
  }

  // ── dashboard ─────────────────────────────────────────────────────────────
  const doneTasks    = todayTasks.filter(t => t.status === 'Done').length;
  const totalTasks   = todayTasks.length;

  return (
    <div className="space-y-8">

      {/* header */}
      <div>
        <p className="text-sm text-gray-50 dark:text-gray-40 mb-1 flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5" />
          {formatDisplayDate(today, timezone)}
        </p>
        <h1 className="text-2xl font-medium md:text-4xl md:font-normal text-primary-text tracking-tight">{getGreeting()}{username ? `, ${username}!` : ''}</h1>
      </div>

      {/* ── quick actions ─────────────────────────────────────────────────── */}
      <section>
        <h2 className="font-normal text-primary-text mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />
          Quick actions
        </h2>
        <div className="flex gap-3">
          <ActionCard
            icon={<Plus className="w-6 h-6" />}
            label="Create a goal with tasks"
            description="Plan your next objective"
            onClick={openGoalModal}
          />
        </div>
      </section>

      {/* two-column grid on md+ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* ── latest goals ─────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-normal text-primary-text flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              Latest goals
              {goalsExpanded && sortedGoals.length > 3 && (
                <span className="text-xs font-normal text-gray-50 dark:text-gray-40">
                  showing {latestGoals.length} of {sortedGoals.length}
                </span>
              )}
            </h2>
            <button
              onClick={goToGoals}
              className="btn-primary hover:underline flex items-center gap-0.5"
            >
              View all <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-3">
            {latestGoals.map(goal => (
              <MiniGoalCard key={goal.id} goal={goal} tasks={tasksByGoal[goal.id] ?? []} onClick={() => openTasksModal(goal)} />
            ))}
            {sortedGoals.length > 3 && (
              <button
                onClick={() => setGoalsExpanded(e => !e)}
                className="btn-ghost w-full text-xs text-primary-link underline text-center pt-1"
              >
                {goalsExpanded ? 'View less' : `+${sortedGoals.length - 3} more`}
              </button>
            )}
          </div>
        </section>

        {/* ── today's tasks ─────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-normal text-primary-text flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-primary" />
              Today's tasks
              {totalTasks > 0 && (
                <span className="text-xs font-normal text-gray-50 dark:text-gray-40">
                  {doneTasks}/{totalTasks} done
                </span>
              )}
            </h2>
            <button
              onClick={goToCalendar}
              className="btn-primary hover:underline flex items-center gap-0.5"
            >
              Manage <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          <div className="rounded-md border border-gray-20 dark:border-gray-70 bg-background-color">
            {tasksLoading ? (
              <div className="flex justify-center items-center p-8">
                <CircularProgress />
              </div>
            ) : todayTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                <Zap className="w-7 h-7 text-gray-30 dark:text-gray-60 mb-2" />
                <p className="text-sm text-gray-40 dark:text-gray-50">No tasks scheduled for today</p>
                <button
                  onClick={() => setIsAddTaskModalOpen(true)}
                  className="mt-3 btn-primary hover:underline"
                >
                  Add a task →
                </button>
              </div>
            ) : (
              <ul className="divide-y divide-gray-20 dark:divide-gray-70">
                {todayTasks.map(task => (
                  <TodayTaskRow
                    key={task.id}
                    task={task}
                    onStatusChange={handleTaskStatusChange}
                    onUpdate={handleTodayTaskUpdate}
                    onDelete={handleTodayTaskDelete}
                  />
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      {/* Profile modal (first-login auto-open) */}
      <Modal
        isOpen={isProfileOpen}
        ariaHideApp={ARIA_HIDE_APP}
        className="fixed inset-0 flex items-center justify-center z-50"
        overlayClassName={overlayClasses}
      >
        {isProfileOpen && (
          <div className={modalClasses}>
            <ProfileManagement onClose={() => setIsProfileOpen(false)} />
          </div>
        )}
      </Modal>

      {/* Tasks modal */}
      {isTasksModalOpen && selectedGoal && (
        <div
          className={`${overlayClasses} flex items-center justify-center`}
          onMouseDown={(e) => { if (e.target === e.currentTarget) closeTasksModal(); }}
        >
          <div className={`${modalClasses} w-full lg:w-[70vw]`}>
            <div className="flex flex-row w-full justify-between items-start mb-4">
              <h3 className="text-lg font-medium text-primary-text">
                Tasks for<br />"{selectedGoal.title}"
              </h3>
              <button className="btn-ghost" onClick={closeTasksModal}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto">
              <TasksList
                goalId={selectedGoal.id}
                goalTitle={selectedGoal.title}
                goalDescription={selectedGoal.description || ''}
                onBeforeFocusMode={closeTasksModal}
              />
            </div>
          </div>
        </div>
      )}

      {/* Today task detail modal — card is hidden; MUI Dialog portals to body */}
      {selectedTodayTask && (
        <div className="hidden" aria-hidden="true">
          <TaskCard
            key={`today-task-${selectedTodayTask.id}-${selectedTodayTaskKey}`}
            task={selectedTodayTask}
            allowInlineEdit
            autoOpenEditModal
            onUpdate={handleTodayTaskUpdate}
            onDelete={handleTodayTaskDelete}
            onStatusChange={(id, status) => handleTaskStatusChange(id, status)}
            onModalClose={() => setSelectedTodayTask(null)}
          />
        </div>
      )}

      {/* Add goal modal */}
      <Modal
        isOpen={isGoalModalOpen}
        onRequestClose={closeGoalModal}
        shouldCloseOnOverlayClick
        ariaHideApp={ARIA_HIDE_APP}
        className="fixed inset-0 flex md:items-center justify-center z-50"
        overlayClassName={overlayClasses}
      >
        <div className={modalClasses}>
          {isGoalModalOpen && (
            <GoalForm
              newGoal={newGoal}
              setNewGoal={setNewGoal}
              handleClose={closeGoalModal}
              categories={[]}
              refreshGoals={() => refreshGoals().then(() => {})}
            />
          )}
        </div>
      </Modal>

      {/* Add Task Modal */}
      <Modal
        isOpen={isAddTaskModalOpen}
        onRequestClose={closeAddTaskModal}
        shouldCloseOnOverlayClick={true}
        ariaHideApp={ARIA_HIDE_APP}
        className="fixed inset-0 flex md:items-center justify-center z-50"
        overlayClassName={overlayClasses}
      >
        <div className={`${modalClasses} max-w-lg w-full`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <ListTodo className="w-5 h-5 text-primary" />
              Add a task
            </h2>
            <IconButton size="small" onClick={closeAddTaskModal} aria-label="Close">
              <X className="w-4 h-4" />
            </IconButton>
          </div>

          <div className="space-y-4">
            {/* Goal selector */}
            {!standaloneCreateNewGoal ? (
              <FormControl fullWidth size="small">
                <InputLabel id="standalone-task-goal-label">Goal *</InputLabel>
                <Select
                  labelId="standalone-task-goal-label"
                  label="Goal *"
                  value={standaloneTaskGoalId}
                  onChange={(e) => setStandaloneTaskGoalId(e.target.value as string)}
                  displayEmpty
                >
                  {goals.map((g) => (
                    <MenuItem key={g.id} value={g.id}>
                      <span className="truncate max-w-[320px] block">{g.title}</span>
                    </MenuItem>
                  ))}
                  <MenuItem
                    value="__new__"
                    onClick={(e) => { e.stopPropagation(); setStandaloneCreateNewGoal(true); setStandaloneTaskGoalId(''); }}
                    className="text-primary font-medium"
                  >
                    <PlusIcon className="w-4 h-4 mr-1 inline" /> Create new goal…
                  </MenuItem>
                </Select>
              </FormControl>
            ) : (
              <div className="space-y-2">
                <TextField
                  label="New goal title *"
                  value={standaloneNewGoalTitle}
                  onChange={(e) => setStandaloneNewGoalTitle(e.target.value)}
                  size="small"
                  fullWidth
                  autoFocus
                  placeholder="Enter goal title"
                />
                <button
                  className="text-sm text-gray-50 underline"
                  onClick={() => { setStandaloneCreateNewGoal(false); setStandaloneNewGoalTitle(''); }}
                >
                  ← Pick an existing goal instead
                </button>
              </div>
            )}

            {/* Task fields */}
            <TextField
              label="Task title *"
              value={standaloneNewTask.title || ''}
              onChange={(e) => setStandaloneNewTask((p) => ({ ...p, title: e.target.value }))}
              size="small"
              fullWidth
              autoFocus={standaloneCreateNewGoal ? false : true}
              placeholder="What needs to be done?"
            />
            <TextField
              label="Description"
              value={standaloneNewTask.description || ''}
              onChange={(e) => setStandaloneNewTask((p) => ({ ...p, description: e.target.value }))}
              size="small"
              fullWidth
              multiline
              rows={2}
              placeholder="Optional details"
            />
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <div className="flex flex-col space-y-4 mt-2">
                <DatePicker
                  label="Date"
                  value={standaloneSelectedDate}
                  onChange={(newValue) => setStandaloneSelectedDate(newValue)}
                  slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                />
                <TimePicker
                  label="Time (optional)"
                  value={standaloneSelectedTime}
                  onChange={(newValue) => setStandaloneSelectedTime(newValue)}
                  slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                />

                {/* Alert / Reminder */}
                <div className="border border-gray-20 dark:border-gray-70 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4" />
                      <label className="text-sm font-semibold">Alert</label>
                    </div>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={standaloneReminderEnabled}
                          onChange={(e) => setStandaloneReminderEnabled(e.target.checked)}
                          size="small"
                        />
                      }
                      label={standaloneReminderEnabled ? 'On' : 'Off'}
                      labelPlacement="start"
                      sx={{ marginLeft: 0 }}
                    />
                  </div>

                  {standaloneReminderEnabled && (
                    <div className="space-y-2 gap-2">
                      {standaloneSelectedDate && standaloneSelectedTime ? (
                        <FormControl fullWidth size="small">
                          <InputLabel>Alert time</InputLabel>
                          <Select
                            value={standaloneReminderOffset}
                            onChange={(e) => setStandaloneReminderOffset(e.target.value)}
                            label="Alert time"
                          >
                            <MenuItem value="0">At time of task</MenuItem>
                            <MenuItem value="15">15 minutes before</MenuItem>
                            <MenuItem value="30">30 minutes before</MenuItem>
                            <MenuItem value="60">1 hour before</MenuItem>
                            <MenuItem value="1440">1 day before</MenuItem>
                            <MenuItem value="custom">Custom time</MenuItem>
                          </Select>
                        </FormControl>
                      ) : (
                        <p className="text-xs text-secondary-text">Set a scheduled date &amp; time above to use relative alerts, or pick a custom time.</p>
                      )}

                      {(standaloneReminderOffset === 'custom' || !standaloneSelectedDate || !standaloneSelectedTime) && (
                        <DateTimePicker
                          label="Custom alert date &amp; time"
                          value={standaloneSelectedReminderDatetime}
                          onChange={(newValue) => {
                            setStandaloneSelectedReminderDatetime(newValue);
                            setStandaloneReminderDatetime(newValue ? newValue.format('YYYY-MM-DDTHH:mm') : '');
                          }}
                          slotProps={{ textField: { size: 'small', fullWidth: true } }}
                        />
                      )}

                      {(() => {
                        const dateStr = standaloneSelectedDate?.format('YYYY-MM-DD');
                        const timeStr = standaloneSelectedTime?.format('HH:mm');
                        if (standaloneReminderOffset === 'custom' || !dateStr || !timeStr) {
                          if (!standaloneReminderDatetime) return null;
                          try {
                            const preview = new Date(standaloneReminderDatetime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
                            return <p className="text-xs text-brand-60 dark:text-brand-30">Alert at: {preview}</p>;
                          } catch { return null; }
                        }
                        try {
                          const scheduledUTC = convertToUTC(dateStr, timeStr, timezone);
                          const scheduledDate = new Date(scheduledUTC);
                          scheduledDate.setMinutes(scheduledDate.getMinutes() - Number(standaloneReminderOffset));
                          const preview = scheduledDate.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
                          return <p className="text-xs text-brand-60 dark:text-brand-30">Alert at: {preview}</p>;
                        } catch { return null; }
                      })()}
                    </div>
                  )}
                </div>
              </div>
            </LocalizationProvider>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button className="btn-secondary" onClick={closeAddTaskModal}>Cancel</button>
            <button className="btn-primary" onClick={createStandaloneTask}>Add task</button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
