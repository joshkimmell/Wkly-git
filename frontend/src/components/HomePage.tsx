import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGoalsContext } from '@context/GoalsContext';
import { getSessionToken } from '@utils/functions';
import { Task, Goal } from '@utils/goalUtils';
import { STATUS_COLORS } from '../constants/statuses';
import LoadingSpinner from '@components/LoadingSpinner';
import {
  Target,
  CheckSquare,
  FileText,
  Trophy,
  Sparkles,
  ChevronRight,
  Plus,
  Calendar,
  Zap,
  Circle,
  CheckCircle2,
  Clock,
  PauseCircle,
  XCircle,
} from 'lucide-react';

// ─── helpers ────────────────────────────────────────────────────────────────

function getTodayIso(): string {
  return new Date().toISOString().split('T')[0];
}

function formatDisplayDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

const TaskStatusIcon = ({ status }: { status: Task['status'] }) => {
  switch (status) {
    case 'Done':         return <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />;
    case 'In progress':  return <Clock        className="w-4 h-4 text-blue-600  dark:text-blue-400  shrink-0" />;
    case 'Blocked':      return <XCircle      className="w-4 h-4 text-red-600   dark:text-red-400   shrink-0" />;
    case 'On hold':      return <PauseCircle  className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />;
    default:             return <Circle       className="w-4 h-4 text-gray-400  dark:text-gray-500  shrink-0" />;
  }
};

// ─── mini goal card ──────────────────────────────────────────────────────────

function MiniGoalCard({ goal, onClick }: { goal: Goal; onClick: () => void }) {
  const status  = goal.status ?? 'Not started';
  const color   = STATUS_COLORS[status] ?? '#9CA3AF';

  return (
    <button
      onClick={onClick}
      className="group w-full text-left rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 hover:border-primary hover:shadow-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-sm text-primary-text truncate">{goal.title}</p>
          {goal.category && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{goal.category}</p>
          )}
        </div>
        <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-primary shrink-0 mt-0.5 transition-colors" />
      </div>
      <div className="mt-3 flex items-center gap-1.5">
        <span
          className="inline-block w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: color }}
        />
        <span className="text-xs text-gray-500 dark:text-gray-400">{status}</span>
      </div>
    </button>
  );
}

// ─── empty state ─────────────────────────────────────────────────────────────

function EmptyState({ onAddGoal }: { onAddGoal: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center max-w-lg mx-auto">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
        <Target className="w-8 h-8 text-primary" />
      </div>

      <h2 className="text-2xl font-bold text-primary-text mb-3">Welcome to Wkly</h2>
      <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
        Wkly helps you stay focused week over week — track goals, manage tasks, log accomplishments, and generate AI-powered summaries of your progress.
      </p>

      {/* feature pills */}
      <div className="grid grid-cols-2 gap-3 w-full mb-10">
        {[
          { icon: <Target className="w-4 h-4" />,   label: 'Weekly goals',       desc: 'Set focused goals each week'     },
          { icon: <CheckSquare className="w-4 h-4" />, label: 'Task tracking',    desc: 'Break goals into tasks'          },
          { icon: <Trophy className="w-4 h-4" />,   label: 'Accomplishments',     desc: 'Capture what you achieved'       },
          { icon: <Sparkles className="w-4 h-4" />, label: 'AI summaries',        desc: 'Auto-generate progress reports'  },
        ].map(({ icon, label, desc }) => (
          <div
            key={label}
            className="flex flex-col items-start gap-1 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 text-left"
          >
            <div className="flex items-center gap-2 text-primary font-medium text-sm">
              {icon}
              {label}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">{desc}</p>
          </div>
        ))}
      </div>

      <button
        onClick={onAddGoal}
        className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white font-semibold px-6 py-3 rounded-xl transition-colors shadow-sm"
      >
        <Plus className="w-5 h-5" />
        Add your first goal
      </button>
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
      className={`group w-full text-left rounded-xl border p-4 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary ${
        variant === 'primary'
          ? 'border-primary/40 bg-primary/5 hover:bg-primary/10 dark:bg-primary/10 dark:hover:bg-primary/20'
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-primary hover:shadow-md'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
          variant === 'primary' ? 'bg-primary/20 text-primary' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 group-hover:bg-primary/10 group-hover:text-primary transition-colors'
        }`}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-sm text-primary-text">{label}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-primary ml-auto shrink-0 transition-colors" />
      </div>
    </button>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

export default function HomePage() {
  const navigate = useNavigate();
  const { goals, isRefreshing } = useGoalsContext();

  const [todayTasks, setTodayTasks]     = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);

  const today = getTodayIso();

  // Sort goals newest-first
  const sortedGoals = [...goals].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  const latestGoals   = sortedGoals.slice(0, 3);
  const hasGoals      = goals.length > 0;

  // ── fetch today's tasks ───────────────────────────────────────────────────
  const fetchTodayTasks = useCallback(async () => {
    setTasksLoading(true);
    try {
      const token = await getSessionToken();
      const res   = await fetch('/api/getAllTasks', {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) throw new Error(await res.text());

      const data: Task[] = await res.json();
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

  // ── handlers ──────────────────────────────────────────────────────────────
  const goToGoals      = () => navigate('/goals');
  const goToSummaries  = () => navigate('/summaries');

  // ── loading ───────────────────────────────────────────────────────────────
  if (isRefreshing && goals.length === 0) {
    return (
      <div className="flex justify-center items-center py-20">
        <LoadingSpinner />
      </div>
    );
  }

  // ── empty state ───────────────────────────────────────────────────────────
  if (!isRefreshing && !hasGoals) {
    return <EmptyState onAddGoal={goToGoals} />;
  }

  // ── dashboard ─────────────────────────────────────────────────────────────
  const doneTasks    = todayTasks.filter(t => t.status === 'Done').length;
  const totalTasks   = todayTasks.length;

  return (
    <div className="space-y-8">

      {/* header */}
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5" />
          {formatDisplayDate(today)}
        </p>
        <h1 className="text-2xl font-bold text-primary-text">{getGreeting()}</h1>
      </div>

      {/* two-column grid on md+ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* ── latest goals ─────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-primary-text flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              Latest goals
            </h2>
            <button
              onClick={goToGoals}
              className="text-xs text-primary hover:underline flex items-center gap-0.5"
            >
              View all <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-3">
            {latestGoals.map(goal => (
              <MiniGoalCard key={goal.id} goal={goal} onClick={goToGoals} />
            ))}
            {goals.length > 3 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center pt-1">
                +{goals.length - 3} more — <button onClick={goToGoals} className="text-primary hover:underline">view all</button>
              </p>
            )}
          </div>
        </section>

        {/* ── today's tasks ─────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-primary-text flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-primary" />
              Today's tasks
              {totalTasks > 0 && (
                <span className="text-xs font-normal text-gray-500 dark:text-gray-400">
                  {doneTasks}/{totalTasks} done
                </span>
              )}
            </h2>
            <button
              onClick={goToGoals}
              className="text-xs text-primary hover:underline flex items-center gap-0.5"
            >
              Manage <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
            {tasksLoading ? (
              <div className="flex justify-center items-center p-8">
                <LoadingSpinner />
              </div>
            ) : todayTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                <Zap className="w-7 h-7 text-gray-300 dark:text-gray-600 mb-2" />
                <p className="text-sm text-gray-400 dark:text-gray-500">No tasks scheduled for today</p>
                <button
                  onClick={goToGoals}
                  className="mt-3 text-xs text-primary hover:underline"
                >
                  Schedule a task →
                </button>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                {todayTasks.map(task => (
                  <li
                    key={task.id}
                    className={`flex items-center gap-3 px-4 py-3 ${task.status === 'Done' ? 'opacity-50' : ''}`}
                  >
                    <TaskStatusIcon status={task.status} />
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm text-primary-text truncate ${task.status === 'Done' ? 'line-through' : ''}`}>
                        {task.title}
                      </p>
                      {task.scheduled_time && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 flex items-center gap-1">
                          <Clock className="w-3 h-3" />{task.scheduled_time}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      {/* ── quick actions ─────────────────────────────────────────────────── */}
      <section>
        <h2 className="font-semibold text-primary-text mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />
          Quick actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <ActionCard
            icon={<Plus className="w-4 h-4" />}
            label="Add a goal"
            description="Plan your next objective"
            onClick={goToGoals}
          />
          <ActionCard
            icon={<FileText className="w-4 h-4" />}
            label="Add a note"
            description="Capture thoughts on a goal"
            onClick={goToGoals}
          />
          <ActionCard
            icon={<Trophy className="w-4 h-4" />}
            label="Log an accomplishment"
            description="Record something you achieved"
            onClick={goToGoals}
          />
          <ActionCard
            icon={<Sparkles className="w-4 h-4" />}
            label="Generate summary"
            description="AI recap of your progress"
            onClick={goToSummaries}
            variant="primary"
          />
        </div>
      </section>

    </div>
  );
}
