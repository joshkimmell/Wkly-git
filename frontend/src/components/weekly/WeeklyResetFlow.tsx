/**
 * WeeklyResetFlow
 *
 * 4-step full-screen interstitial:
 *  1. Last-week recap (tasks done, goals overview)
 *  2. Review / update goal statuses
 *  3. Pick up to 3 priorities for the coming week
 *  4. Done confirmation
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Target, CheckSquare, ChevronRight, ChevronLeft, X, Star, StarOff, RotateCcw, Check, Pause, Ban } from 'lucide-react';
import { CircularProgress } from '@mui/material';
import { Goal, Task } from '@utils/goalUtils';
import { getSessionToken } from '@utils/functions';
import { markWeeklyResetSeen } from '@hooks/useWeeklyFlows';
import { notifySuccess } from '@components/ToastyNotification';
import supabase from '@lib/supabase';

// ── Types ─────────────────────────────────────────────────────────────────────

type GoalStatus = Goal['status'];

const STATUS_OPTIONS: { value: GoalStatus; label: string; icon: React.ReactNode; cls: string }[] = [
  { value: 'In progress', label: 'Continue',  icon: <RotateCcw className="w-3.5 h-3.5" />, cls: 'border-blue-400 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' },
  { value: 'Done',        label: 'Done',       icon: <Check      className="w-3.5 h-3.5" />, cls: 'border-green-400 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300' },
  { value: 'On hold',     label: 'On hold',    icon: <Pause      className="w-3.5 h-3.5" />, cls: 'border-amber-400 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' },
  { value: 'Blocked',     label: 'Blocked',    icon: <Ban        className="w-3.5 h-3.5" />, cls: 'border-red-400 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300' },
];

const PRIORITIES_KEY = 'wkly:weekly_priorities';

function savePriorities(goalIds: string[]): void {
  const week = new Date().toISOString().slice(0, 10);
  try { localStorage.setItem(PRIORITIES_KEY, JSON.stringify({ week, goalIds })); } catch {}
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StepDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={`rounded-full transition-all duration-300 ${
            i === current ? 'w-4 h-2 bg-primary' : 'w-2 h-2 bg-gray-30 dark:bg-gray-60'
          }`}
        />
      ))}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

interface WeeklyResetFlowProps {
  onDismiss: () => void;
}

const TOTAL_STEPS = 4;

const WeeklyResetFlow: React.FC<WeeklyResetFlowProps> = ({ onDismiss }) => {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [statusOverrides, setStatusOverrides] = useState<Record<string, GoalStatus>>({});
  const [priorities, setPriorities] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  // Entrance animation
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Fetch active goals + tasks
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getSessionToken();
      const [goalsRes, tasksRes] = await Promise.all([
        fetch('/.netlify/functions/getAllGoals', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/.netlify/functions/getAllTasks',  { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (goalsRes.ok) {
        const data: Goal[] = await goalsRes.json();
        setGoals(data.filter(g => !g.is_archived && g.status !== 'Done'));
      }
      if (tasksRes.ok) {
        const data: Task[] = await tasksRes.json();
        setAllTasks(data);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Derived stats ──────────────────────────────────────────────────────────

  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const doneThisWeek = allTasks.filter(
    t => t.status === 'Done' && t.updated_at && new Date(t.updated_at).getTime() >= oneWeekAgo
  ).length;

  const activeGoals = goals.filter(g => g.status !== 'Done');

  // ── Handlers ───────────────────────────────────────────────────────────────

  const togglePriority = (id: string) => {
    setPriorities(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); return next; }
      if (next.size >= 3) return prev; // max 3
      next.add(id);
      return next;
    });
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      // 1. Persist any status changes to the backend
      const token = await getSessionToken();
      const changed = Object.entries(statusOverrides);
      await Promise.all(changed.map(([id, status]) =>
        fetch('/.netlify/functions/updateGoal', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, status }),
        }).catch(() => {})
      ));

      // 2. Persist priorities locally
      savePriorities([...priorities]);

      markWeeklyResetSeen();
      notifySuccess('Weekly reset complete — good luck this week!');
      onDismiss();
    } catch { /* silent */ }
    finally { setSaving(false); }
  };

  const dismiss = () => { markWeeklyResetSeen(); onDismiss(); };

  // ── Render ─────────────────────────────────────────────────────────────────

  const dayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm overflow-auto transition-opacity duration-500 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* Card */}
      <div
        className={`relative max-w-xl w-full mx-4 rounded-2xl border border-gray-20 dark:border-gray-70 bg-background-color shadow-2xl p-6 sm:p-8 transition-all duration-500 ${
          visible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            <span className="text-xs font-medium uppercase tracking-widest text-secondary-text">Weekly Reset</span>
          </div>
          <div className="flex items-center gap-3">
            <StepDots total={TOTAL_STEPS} current={step} />
            <button onClick={dismiss} className="btn-ghost p-1" aria-label="Dismiss">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <CircularProgress />
          </div>
        ) : (
          <>
            {/* ── Step 0: Last-week recap ──────────────────────────────── */}
            {step === 0 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-serif font-normal text-primary-text">
                    Happy {dayName}!
                  </h2>
                  <p className="text-secondary-text mt-1 text-sm">
                    Let's take a moment to reset before the week begins.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-gray-20 dark:border-gray-70 p-4 text-center">
                    <p className="text-3xl font-bold text-primary">{doneThisWeek}</p>
                    <p className="text-xs text-secondary-text mt-1">tasks completed last week</p>
                  </div>
                  <div className="rounded-lg border border-gray-20 dark:border-gray-70 p-4 text-center">
                    <p className="text-3xl font-bold text-primary">{activeGoals.length}</p>
                    <p className="text-xs text-secondary-text mt-1">active goals</p>
                  </div>
                </div>

                {doneThisWeek > 0 && (
                  <p className="text-sm text-center text-secondary-text italic">
                    {doneThisWeek === 1
                      ? 'You completed 1 task — every step counts.'
                      : `You completed ${doneThisWeek} tasks. That's real progress.`}
                  </p>
                )}
              </div>
            )}

            {/* ── Step 1: Update goal statuses ────────────────────────── */}
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-serif font-normal text-primary-text">
                    How are your goals going?
                  </h2>
                  <p className="text-secondary-text mt-1 text-sm">
                    Update the status of each active goal.
                  </p>
                </div>

                {activeGoals.length === 0 ? (
                  <p className="text-secondary-text text-sm py-4 text-center">No active goals — you're all clear!</p>
                ) : (
                  <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                    {activeGoals.map(goal => {
                      const current = statusOverrides[goal.id] ?? goal.status ?? 'In progress';
                      return (
                        <div key={goal.id} className="rounded-lg border border-gray-20 dark:border-gray-70 p-3 space-y-2">
                          <p className="text-sm font-semibold text-primary-text truncate">{goal.title}</p>
                          {goal.category && (
                            <p className="text-xs text-secondary-text">{goal.category}</p>
                          )}
                          <div className="flex flex-wrap gap-1.5">
                            {STATUS_OPTIONS.map(opt => (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => setStatusOverrides(prev => ({ ...prev, [goal.id]: opt.value }))}
                                className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border font-medium transition-all ${
                                  current === opt.value
                                    ? opt.cls
                                    : 'border-gray-20 dark:border-gray-70 text-secondary-text hover:border-primary'
                                }`}
                              >
                                {opt.icon}
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── Step 2: Set priorities ───────────────────────────────── */}
            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-serif font-normal text-primary-text">
                    What are your top 3 priorities?
                  </h2>
                  <p className="text-secondary-text mt-1 text-sm">
                    Select up to 3 goals to focus on this week.
                    {priorities.size > 0 && (
                      <span className="ml-1 font-medium text-primary">{priorities.size}/3 selected</span>
                    )}
                  </p>
                </div>

                {activeGoals.length === 0 ? (
                  <p className="text-secondary-text text-sm py-4 text-center">
                    No active goals to prioritise.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                    {activeGoals
                      .filter(g => (statusOverrides[g.id] ?? g.status) !== 'Done')
                      .map(goal => {
                        const isPriority = priorities.has(goal.id);
                        const disabled  = !isPriority && priorities.size >= 3;
                        return (
                          <button
                            key={goal.id}
                            type="button"
                            disabled={disabled}
                            onClick={() => togglePriority(goal.id)}
                            className={`w-full text-left rounded-lg border px-4 py-3 flex items-center gap-3 transition-all ${
                              isPriority
                                ? 'border-primary bg-brand-10 dark:bg-brand-90'
                                : disabled
                                  ? 'border-gray-20 dark:border-gray-70 opacity-40 cursor-not-allowed'
                                  : 'border-gray-20 dark:border-gray-70 hover:border-primary'
                            }`}
                          >
                            {isPriority
                              ? <Star className="w-4 h-4 text-primary shrink-0 fill-current" />
                              : <StarOff className="w-4 h-4 text-secondary-text shrink-0" />
                            }
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-primary-text truncate">{goal.title}</p>
                              {goal.category && (
                                <p className="text-xs text-secondary-text truncate">{goal.category}</p>
                              )}
                            </div>
                          </button>
                        );
                      })}
                  </div>
                )}
              </div>
            )}

            {/* ── Step 3: Done ─────────────────────────────────────────── */}
            {step === 3 && (
              <div className="space-y-6 text-center py-4">
                <div className="w-16 h-16 rounded-full bg-brand-10 dark:bg-brand-90 flex items-center justify-center mx-auto">
                  <CheckSquare className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-serif font-normal text-primary-text">You're set!</h2>
                  <p className="text-secondary-text mt-2 text-sm">
                    {priorities.size > 0
                      ? `You have ${priorities.size} priorit${priorities.size === 1 ? 'y' : 'ies'} lined up. Go make it happen.`
                      : "You've completed your weekly reset. Have a great week!"}
                  </p>
                </div>
                {priorities.size > 0 && (
                  <div className="text-left space-y-1.5">
                    <p className="text-xs font-semibold uppercase tracking-widest text-secondary-text">This week's priorities</p>
                    {[...priorities].map(id => {
                      const goal = activeGoals.find(g => g.id === id);
                      return goal ? (
                        <div key={id} className="flex items-center gap-2 text-sm text-primary-text">
                          <Star className="w-3.5 h-3.5 text-primary fill-current shrink-0" />
                          <span className="truncate">{goal.title}</span>
                        </div>
                      ) : null;
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── Navigation ───────────────────────────────────────────── */}
            <div className="flex items-center justify-between mt-8">
              {step > 0 ? (
                <button
                  type="button"
                  onClick={() => setStep(s => s - 1)}
                  className="btn-ghost flex items-center gap-1 text-sm"
                >
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
              ) : (
                <button type="button" onClick={dismiss} className="btn-ghost text-sm text-secondary-text">
                  Skip for now
                </button>
              )}

              {step < TOTAL_STEPS - 1 ? (
                <button
                  type="button"
                  onClick={() => setStep(s => s + 1)}
                  className="btn-primary flex items-center gap-1.5"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleFinish}
                  disabled={saving}
                  className="btn-primary flex items-center gap-1.5"
                >
                  {saving ? 'Saving…' : 'Finish reset'}
                  <CheckSquare className="w-4 h-4" />
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default WeeklyResetFlow;
