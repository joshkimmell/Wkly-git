import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGoalsContext } from '@context/GoalsContext';
import useAuth from '@hooks/useAuth';
import { getSessionToken, getWeekStartDate } from '@utils/functions';
import { Task, Goal } from '@utils/goalUtils';
import { STATUS_COLORS } from '../constants/statuses';
import LoadingSpinner from '@components/LoadingSpinner';
import GoalForm from '@components/GoalForm';
import ProfileManagement from '@components/ProfileManagement';
import Modal from 'react-modal';
import { ARIA_HIDE_APP } from '@lib/modal';
import { modalClasses, overlayClasses } from '@styles/classes';
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
  LayoutGrid,
  Award,
} from 'lucide-react';
import Logo from './Logo';
import { CircularProgress } from '@mui/material';

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
    default:             return <Circle       className="w-4 h-4 text-gray-40  dark:text-gray-50  shrink-0" />;
  }
};

// ─── mini goal card ──────────────────────────────────────────────────────────

function MiniGoalCard({ goal, onClick }: { goal: Goal; onClick: () => void }) {
  const status  = goal.status ?? 'Not started';
  const color   = STATUS_COLORS[status] ?? '#9CA3AF';

  return (
    <button
      onClick={onClick}
      className="group w-full text-left rounded-xl border border-gray-20 dark:border-gray-70 bg-white dark:bg-gray-80 p-4 hover:border-primary hover:shadow-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-sm text-primary-text truncate">{goal.title}</p>
          {goal.category && (
            <p className="text-xs text-gray-50 dark:text-gray-40 mt-0.5 truncate">{goal.category}</p>
          )}
        </div>
        <ChevronRight className="w-4 h-4 text-gray-40 group-hover:text-primary shrink-0 mt-0.5 transition-colors" />
      </div>
      <div className="mt-3 flex items-center gap-1.5">
        <span
          className="inline-block w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: color }}
        />
        <span className="text-xs text-gray-50 dark:text-gray-40">{status}</span>
      </div>
    </button>
  );
}

// ─── empty state ─────────────────────────────────────────────────────────────

function EmptyState({ onAddGoal, username }: { onAddGoal: () => void; username?: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center py-16 px-4 text-center max-w-7xl mx-auto">
      <div className="w-auto h-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
        {/* <Target className="w-8 h-8 text-primary" /> */}
        <Logo useTheme className="absolute z-0 -mt-48 fill-primary-text w-2/3 h-full text-primary-text opacity-30" />
      </div>
    <div className='relative z-10 max-w-xl'>
      <h2 className="text-4xl font-light mt-40 mb-3">Welcome{username ? `, ${username}` : ''}</h2>
      <p className="text-secondary-text mb-8 leading-relaxed">
        Wkly helps you stay focused week over week — track goals, manage tasks, log accomplishments, and generate AI-powered summaries of your progress.
      </p>

      {/* feature pills */}
      <div className="grid grid-cols-2 gap-3 w-full min-h-[20rem] mb-10">
        {[
          { icon: <LayoutGrid className="w-6 h-6" />,   label: 'Prioritized goals',       desc: 'Set focused goals each week'     },
          { icon: <CheckSquare className="w-6 h-6" />, label: 'Task tracking',    desc: 'Break goals into tasks'          },
          { icon: <Award className="w-6 h-6" />,   label: 'Accomplishments',     desc: 'Capture what you achieved'       },
          { icon: <Sparkles className="w-6 h-6" />, label: 'AI summaries',        desc: 'Auto-generate progress reports'  },
        ].map(({ icon, label, desc }) => (
          <div
            key={label}
            className="flex flex-col items-start gap-1 rounded-md bg-background-color border border-gray-20 dark:border-gray-70 p-3 text-left"
          >
            <div className="flex items-center gap-2 text-primary font-normal text-lg md:text-2xl">
              {icon}
              {label}
            </div>
            <p className="text-sm text-gray-50 dark:text-gray-40">{desc}</p>
          </div>
        ))}
      </div>
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
          : 'border-gray-20 dark:border-gray-70 bg-white dark:bg-gray-80 hover:border-primary hover:shadow-md'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
          variant === 'primary' ? 'bg-primary/20 text-primary' : 'bg-gray-100 dark:bg-gray-70 text-gray-60 dark:text-gray-30 group-hover:bg-primary/10 group-hover:text-primary transition-colors'
        }`}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-sm text-primary-text">{label}</p>
          <p className="text-xs text-gray-50 dark:text-gray-40 mt-0.5">{description}</p>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-40 group-hover:text-primary ml-auto shrink-0 transition-colors" />
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
  const { goals, isRefreshing, refreshGoals } = useGoalsContext();
  const { profile } = useAuth();
  const username: string | undefined = profile?.username || undefined;

  const [todayTasks, setTodayTasks]     = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);

  // ── modal state ───────────────────────────────────────────────────────────
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [newGoal, setNewGoal] = useState<Goal>({ ...EMPTY_GOAL, week_start: getWeekStartDate() });

  // ── first-login: auto-open profile modal once per session ─────────────────
  useEffect(() => {
    if (profile === null) return; // still loading
    if (!profile.username && !sessionStorage.getItem('wkly_profile_prompted')) {
      sessionStorage.setItem('wkly_profile_prompted', '1');
      setIsProfileOpen(true);
    }
  }, [profile]);

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
  const openGoalModal  = () => {
    setNewGoal({ ...EMPTY_GOAL, week_start: getWeekStartDate() });
    setIsGoalModalOpen(true);
  };
  const closeGoalModal = () => setIsGoalModalOpen(false);

  // ── loading ───────────────────────────────────────────────────────────────
  if (isRefreshing && goals.length === 0) {
    return (
      <div className="flex justify-center items-center py-20">
        <CircularProgress />
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
          {formatDisplayDate(today)}
        </p>
        <h1 className="text-2xl font-bold text-primary-text">{getGreeting()}{username ? `, ${username}` : ''}</h1>
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
              <p className="text-xs text-gray-50 dark:text-gray-40 text-center pt-1">
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
                <span className="text-xs font-normal text-gray-50 dark:text-gray-40">
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

          <div className="rounded-xl border border-gray-20 dark:border-gray-70 bg-white dark:bg-gray-80 overflow-hidden">
            {tasksLoading ? (
              <div className="flex justify-center items-center p-8">
                <LoadingSpinner />
              </div>
            ) : todayTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                <Zap className="w-7 h-7 text-gray-30 dark:text-gray-60 mb-2" />
                <p className="text-sm text-gray-40 dark:text-gray-50">No tasks scheduled for today</p>
                <button
                  onClick={goToGoals}
                  className="mt-3 text-xs text-primary hover:underline"
                >
                  Schedule a task →
                </button>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-70">
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
                        <p className="text-xs text-gray-40 dark:text-gray-50 mt-0.5 flex items-center gap-1">
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

    </div>
  );
}
