/**
 * WeeklyReflectionFlow
 *
 * 3-step full-screen interstitial shown at end-of-week (day before reset day):
 *  1. Celebrate wins from the past week
 *  2. Reframe incomplete goals with prompts
 *  3. Set an intention for next week
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Sparkles, ChevronRight, ChevronLeft, X, CheckCircle2, Circle, ArrowRight, BookOpen, Save } from 'lucide-react';
import { CircularProgress } from '@mui/material';
import { Goal, Task } from '@utils/goalUtils';
import { getSessionToken, generateSummary, createSummary, getWeekStartDate } from '@utils/functions';
import { markWeeklyReflectionSeen } from '@hooks/useWeeklyFlows';
import { notifySuccess, notifyError } from '@components/ToastyNotification';
import supabase from '@lib/supabase';

// ── Reframing prompts (rotated by goal index) ─────────────────────────────────

const REFRAME_PROMPTS = [
  "This goal is still worth your time. What's one small step you could take next week?",
  "Progress isn't always linear. What did you learn from working toward this?",
  "What made this goal challenging this week? Knowing that helps you plan better.",
  "Sometimes goals need more time than we expect. Is this still aligned with what matters to you?",
  "Missed goals aren't failures — they're information. What would make this easier next week?",
  "You didn't abandon this goal; you're still carrying it. What's one obstacle to remove?",
];

function reframePrompt(index: number): string {
  return REFRAME_PROMPTS[index % REFRAME_PROMPTS.length];
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

interface WeeklyReflectionFlowProps {
  onDismiss: () => void;
}

const TOTAL_STEPS = 4;

const WeeklyReflectionFlow: React.FC<WeeklyReflectionFlowProps> = ({ onDismiss }) => {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [intention, setIntention] = useState('');
  const [acknowledgedGoals, setAcknowledgedGoals] = useState<Set<string>>(new Set());
  const [summaryContent, setSummaryContent] = useState('');
  const [summaryGenerating, setSummaryGenerating] = useState(false);
  const [summarySaved, setSummarySaved] = useState(false);

  // Entrance animation
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Fetch goals + tasks
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getSessionToken();
      const [goalsRes, tasksRes] = await Promise.all([
        fetch('/.netlify/functions/getAllGoals', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/.netlify/functions/getAllTasks',  { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (goalsRes.ok) setGoals(await goalsRes.json());
      if (tasksRes.ok) setAllTasks(await tasksRes.json());
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Derived data ───────────────────────────────────────────────────────────

  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  const doneTasks = allTasks.filter(
    t => t.status === 'Done' && t.updated_at && new Date(t.updated_at).getTime() >= oneWeekAgo
  );

  const doneGoals = goals.filter(
    g => g.status === 'Done' && g.status_set_at && new Date(g.status_set_at).getTime() >= oneWeekAgo
  );

  const missedGoals = goals.filter(
    g => !g.is_archived && g.status !== 'Done' && g.status !== 'On hold'
  );

  // ── Handlers ───────────────────────────────────────────────────────────────

  const toggleAck = (id: string) => {
    setAcknowledgedGoals(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleGenerateSummary = async () => {
    setSummaryGenerating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const weekStart = getWeekStartDate();
      const title = `Weekly Reflection — ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;
      const goalsWithWins = goals
        .filter(g => !g.is_archived)
        .map(g => ({
          title: g.title,
          description: g.description || '',
          category: g.category || '',
          accomplishments: doneTasks
            .filter(t => t.goal_id === g.id)
            .map(t => ({ title: t.title, description: t.description || '', impact: '' })),
        }));
      const additionalCtx = intention ? `Intention for next week: ${intention}` : undefined;
      const content = await generateSummary('', 'week', title, user.id, weekStart, goalsWithWins, undefined, additionalCtx);
      setSummaryContent(content);
    } catch {
      notifyError('Failed to generate summary');
    } finally {
      setSummaryGenerating(false);
    }
  };

  const handleSaveSummary = async () => {
    if (!summaryContent) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const weekStart = getWeekStartDate();
      const title = `Weekly Reflection — ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;
      await createSummary({
        user_id: user.id,
        title,
        content: summaryContent,
        summary_type: 'AI',
        week_start: weekStart,
      });
      setSummarySaved(true);
      notifySuccess('Summary saved!');
    } catch {
      notifyError('Failed to save summary');
    }
  };

  const handleFinish = () => {
    markWeeklyReflectionSeen();
    notifySuccess('Reflection complete — enjoy your weekend!');
    onDismiss();
  };

  const dismiss = () => { markWeeklyReflectionSeen(); onDismiss(); };

  const nextDayName = new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { weekday: 'long' });

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
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="text-xs font-medium uppercase tracking-widest text-secondary-text">Weekly Reflection</span>
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
            {/* ── Step 0: Celebrate wins ───────────────────────────────── */}
            {step === 0 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-2xl font-serif font-normal text-primary-text">
                    Let's celebrate this week.
                  </h2>
                  <p className="text-secondary-text mt-1 text-sm">
                    Look at what you accomplished.
                  </p>
                </div>

                {(doneTasks.length === 0 && doneGoals.length === 0) ? (
                  <div className="rounded-lg border border-gray-20 dark:border-gray-70 p-5 text-center">
                    <p className="text-sm text-secondary-text italic">
                      Even a quiet week has value. Rest is productive.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {doneGoals.length > 0 && (
                      <div className="rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-4 space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-widest text-green-700 dark:text-green-400">
                          Goals completed
                        </p>
                        {doneGoals.map(g => (
                          <div key={g.id} className="flex items-center gap-2 text-sm text-primary-text">
                            <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
                            <span className="truncate">{g.title}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {doneTasks.length > 0 && (
                      <div className="rounded-lg border border-gray-20 dark:border-gray-70 p-4 space-y-1.5">
                        <p className="text-xs font-semibold uppercase tracking-widest text-secondary-text">
                          {doneTasks.length} task{doneTasks.length !== 1 ? 's' : ''} completed
                        </p>
                        <div className="max-h-40 overflow-y-auto space-y-1">
                          {doneTasks.slice(0, 8).map(t => (
                            <div key={t.id} className="flex items-center gap-2 text-sm text-primary-text">
                              <CheckCircle2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400 shrink-0" />
                              <span className="truncate">{t.title}</span>
                            </div>
                          ))}
                          {doneTasks.length > 8 && (
                            <p className="text-xs text-secondary-text pl-5">
                              +{doneTasks.length - 8} more
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── Step 1: Reframe missed goals ─────────────────────────── */}
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-serif font-normal text-primary-text">
                    What didn't get done?
                  </h2>
                  <p className="text-secondary-text mt-1 text-sm">
                    Incomplete goals aren't failures — they're still yours.
                  </p>
                </div>

                {missedGoals.length === 0 ? (
                  <div className="rounded-lg border border-gray-20 dark:border-gray-70 p-5 text-center">
                    <p className="text-sm text-secondary-text italic">
                      All active goals are on track. Well done!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[52vh] overflow-y-auto pr-1">
                    {missedGoals.map((goal, i) => {
                      const acked = acknowledgedGoals.has(goal.id);
                      return (
                        <div
                          key={goal.id}
                          className={`rounded-lg border p-4 space-y-2 transition-colors ${
                            acked
                              ? 'border-primary/40 bg-brand-10 dark:bg-brand-90'
                              : 'border-gray-20 dark:border-gray-70'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <button
                              type="button"
                              onClick={() => toggleAck(goal.id)}
                              className="mt-0.5 shrink-0"
                              aria-label={acked ? 'Unacknowledge' : 'Acknowledge'}
                            >
                              {acked
                                ? <CheckCircle2 className="w-4 h-4 text-primary" />
                                : <Circle className="w-4 h-4 text-secondary-text" />
                              }
                            </button>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-primary-text truncate">{goal.title}</p>
                              {goal.category && (
                                <p className="text-xs text-secondary-text">{goal.category}</p>
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-secondary-text italic pl-6 leading-relaxed">
                            {reframePrompt(i)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── Step 2: Set intention ─────────────────────────────────── */}
            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-serif font-normal text-primary-text">
                    Set an intention for {nextDayName}.
                  </h2>
                  <p className="text-secondary-text mt-1 text-sm">
                    What do you want to carry into next week? (optional)
                  </p>
                </div>

                <textarea
                  value={intention}
                  onChange={e => setIntention(e.target.value)}
                  placeholder="Next week I want to focus on…"
                  maxLength={280}
                  rows={4}
                  className="w-full rounded-lg border border-gray-20 dark:border-gray-70 bg-transparent px-4 py-3 text-sm text-primary-text placeholder-secondary-text resize-none focus:outline-none focus:border-primary transition-colors"
                />

                {intention.length > 0 && (
                  <p className="text-xs text-secondary-text text-right">{intention.length}/280</p>
                )}
              </div>
            )}

            {/* ── Step 3: Generate summary ──────────────────────────────── */}
            {step === 3 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-serif font-normal text-primary-text">
                    Generate a weekly summary?
                  </h2>
                  <p className="text-secondary-text mt-1 text-sm">
                    Capture this week in writing — saved to your Summaries.
                  </p>
                </div>

                {!summaryContent && (
                  <button
                    type="button"
                    onClick={handleGenerateSummary}
                    disabled={summaryGenerating}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                  >
                    {summaryGenerating
                      ? <><CircularProgress size={16} color="inherit" /> Generating…</>
                      : <><BookOpen className="w-4 h-4" /> Generate summary</>}
                  </button>
                )}

                {summaryContent && (
                  <div className="space-y-3">
                    <div className="rounded-lg border border-gray-20 dark:border-gray-70 bg-brand-10 dark:bg-brand-90 p-4 max-h-52 overflow-y-auto">
                      <p className="text-sm text-primary-text leading-relaxed whitespace-pre-wrap">{summaryContent}</p>
                    </div>
                    {!summarySaved ? (
                      <button
                        type="button"
                        onClick={handleSaveSummary}
                        className="btn-primary w-full flex items-center justify-center gap-2"
                      >
                        <Save className="w-4 h-4" /> Save summary
                      </button>
                    ) : (
                      <div className="flex items-center justify-center gap-2 text-sm text-green-600 dark:text-green-400 py-1">
                        <CheckCircle2 className="w-4 h-4" /> Summary saved
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => setSummaryContent('')}
                      className="btn-ghost w-full text-sm text-secondary-text"
                    >
                      Regenerate
                    </button>
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
                  className="btn-primary flex items-center gap-1.5"
                >
                  Done <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default WeeklyReflectionFlow;
