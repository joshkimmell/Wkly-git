import { useEffect, useState, useRef } from 'react';
import { fetchAllGoalsIndexed, deleteGoal, updateGoal, saveSummary, UserCategories, initializeUserCategories, addCategory, getWeekStartDate } from '../utils/functions';
import Pagination from './Pagination';
import GoalCard from '@components/GoalCard';
import GoalForm from '@components/GoalForm';
import Modal from 'react-modal';
import SummaryGenerator from '@components/SummaryGenerator';
import SummaryEditor from '@components/SummaryEditor';
import GoalEditor from '@components/GoalEditor';
import { modalClasses, overlayClasses } from '@styles/classes';
import { ARIA_HIDE_APP } from '@lib/modal';
import { Goal as GoalUtilsGoal } from '@utils/goalUtils';
import { mapPageForScope, loadPageByScope, savePageByScope } from '@utils/pagination';
import 'react-datepicker/dist/react-datepicker.css';
// import * as goalUtils from '@utils/goalUtils';
import 'react-datepicker/dist/react-datepicker.css';
import { PlusSquare as SquarePlus, X as CloseButton, Search as SearchIcon, Filter as FilterIcon, PlusIcon, ArrowBigUp, ArrowBigDown, ArrowUp, ArrowDown } from 'lucide-react';
import { useGoalsContext } from '@context/GoalsContext';
import { notifyError } from '@components/ToastyNotification';
import { TextField, InputAdornment, IconButton, Popover, Box, FormControl, InputLabel, Select, MenuItem, Tooltip } from '@mui/material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import type { Dayjs } from 'dayjs';
import type { ChangeEvent } from 'react';
type Goal = GoalUtilsGoal & {
  created_at?: string;
};

const GoalsComponent = () => {
    const [indexedGoals, setIndexedGoals] = useState<Record<string, Goal[]>>({});
    const [pages, setPages] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState<string>('');
    const currentPageRef = useRef<string>(currentPage);
    // Remember last selected page per scope so switching maintains context
    const [pageByScope, setPageByScope] = useState<Record<string, string>>({});
    const [scope, setScope] = useState<'week' | 'month' | 'year'>('week');
    const prevScopeRef = useRef<string>(scope);
    const pageByScopeRef = useRef<Record<string, string>>(pageByScope);
    const initializedRef = useRef<boolean>(false);
    const fetchIdRef = useRef(0);
    const lastSwitchFromRef = useRef<string | null>(null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const [isGoalModalOpen, setIsGoalModalOpen] = useState(false); // Modal state
    const [isEditorOpen, setIsEditorOpen] = useState(false); // Editor modal state
    const [newGoal, setNewGoal] = useState<Goal>({
        id: '',
        title: '',
        description: '',
        category: '',
        week_start: '',
        user_id: '',
        created_at: '',
        status: 'Not started',
        status_notes: '',
    });
    const [selectedGoal, setSelectedGoal] = useState<{
        id: string;
        user_id: string;
        title: string;
        description: string;
        category: string;
        week_start: string;
        created_at: string;
        status?: string | null;
        status_notes?: string | null;
        status_set_at?: string | null;
    } | null>(null);
    const [selectedSummary, setSelectedSummary] = useState<{
        id: string;
        user_id: string;
        content: string;
        type: string;
        title: string;
    } | null>(null); // State for selected summary
    const [filter, setFilter] = useState<string>('');
    const [filterFocused, setFilterFocused] = useState<boolean>(false);
    const [clearButtonFocused, setClearButtonFocused] = useState<boolean>(false);
    const filterInputRef = useRef<HTMLInputElement | null>(null);
    const blurTimeoutRef = useRef<number | null>(null);
    const showClear = filter.length > 0 || filterFocused || clearButtonFocused;
        // Filter popover state and criteria
        const [filterAnchorEl, setFilterAnchorEl] = useState<HTMLElement | null>(null);
        const [filterStatus, setFilterStatus] = useState<string>('');
        const [filterCategory, setFilterCategory] = useState<string>('');
    const [filterStartDate, setFilterStartDate] = useState<Dayjs | null>(null);
    const [filterEndDate, setFilterEndDate] = useState<Dayjs | null>(null);

        // filter popover anchor is controlled via `filterAnchorEl` and setFilterAnchorEl

        // derive category options from UserCategories
        const categoryOptions = (UserCategories || []).map((cat: any) => (typeof cat === 'string' ? cat : cat.name));
        // derive statuses from current goals if available
        const statusOptions = Array.from(new Set(Object.values(indexedGoals).flat().map((g) => (g.status || '').toString()).filter(Boolean)));

    // Set the default scope to the current week
            useEffect(() => {
                const today = new Date();
                const currentWeekStart = getWeekStartDate(today); // getWeekStartDate returns YYYY-MM-DD
                setScope('week'); // default scope
                // initialize per-scope page memory to persisted or current date equivalents
                const persisted = loadPageByScope() || {};
                const defaults = {
                    week: currentWeekStart,
                    month: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`,
                    year: `${today.getFullYear()}`,
                };
                setPageByScope((prev) => ({ ...defaults, ...persisted, ...prev }));
                setNewGoal((prevGoal) => ({ ...prevGoal, week_start: currentWeekStart }));
            }, []);

            useEffect(() => {
                const fetchGoalsAndCategories = async () => {
                    const id = ++fetchIdRef.current;
                    try {
                        // Fetch goals for the selected scope
                        const { indexedGoals, pages } = await fetchAllGoalsIndexed(scope);
                        // If another fetch started after this one, ignore these results
                        if (id !== fetchIdRef.current) return;
                        setIndexedGoals(indexedGoals);
                        setPages(pages);

                        // Decide which page to show for this scope
                        const prevScope = lastSwitchFromRef.current ?? prevScopeRef.current;
                        // Prefer the authoritative state value first (may have been set during mount),
                        // then fall back to the ref which is kept in sync.
                        const remembered = pageByScope[scope] || pageByScopeRef.current[scope];
                        let desiredPage: string | undefined = remembered;

                        // If we have a remembered page for this scope (the last selected), prefer it and do not overwrite.
                        const prevSelected = pageByScopeRef.current[prevScope as string];
                        if (!desiredPage) {
                            // If switching scopes, prefer mapping from the previous scope's selection (if present)
                            if (prevScope !== scope && prevSelected) {
                                const mapped = mapPageForScope(prevSelected, scope, pages);
                                if (mapped) desiredPage = mapped;
                            } else {
                                // If we don't have a remembered page for this scope, try to map from the previous scope's selection
                                desiredPage = mapPageForScope(prevSelected, scope, pages);
                            }
                        }

                        // If still no desired page, fall back to sensible defaults (current date)
                        if (!desiredPage) {
                            // Use computeDefaultForScope so defaults remain consistent across code paths
                            const { computeDefaultForScope } = await import('@utils/pagination');
                            desiredPage = computeDefaultForScope(scope as any);
                        }

                        // Scope-specific adjustments: prefer pages starting with the desired prefix
                        if (pages.length > 0) {
                            if (scope === 'week') {
                                if (desiredPage) {
                                    // Prefer an exact week match, then a page from the same month,
                                    // then the latest page <= today, then fallback to the first page.
                                    const exact = pages.find((p) => p === desiredPage);
                                    if (exact) desiredPage = exact;
                                    else {
                                        const monthPrefix = (desiredPage as string).slice(0, 7);
                                        const sameMonth = pages.find((p) => p.startsWith(monthPrefix));
                                        if (sameMonth) desiredPage = sameMonth;
                                        else {
                                            // find latest page <= today
                                            const today = new Date();
                                            let found: string | undefined;
                                            for (let i = pages.length - 1; i >= 0; i--) {
                                                const p = pages[i];
                                                const [y, m, d] = p.split('-').map(Number);
                                                const pageDate = new Date(y, (m || 1) - 1, d || 1);
                                                if (pageDate <= today) {
                                                    found = p;
                                                    break;
                                                }
                                            }
                                            desiredPage = found ?? pages[0];
                                        }
                                    }
                                } else {
                                    desiredPage = pages[0];
                                }
                            } else {
                                if (desiredPage) {
                                    const dp = desiredPage as string;
                                    const maybe = pages.find((p) => p.startsWith(dp));
                                    desiredPage = maybe || pages[0];
                                } else {
                                    desiredPage = pages[0];
                                }
                            }
                        }

                        // Only set the initial page on first successful fetch to avoid flip-flopping.
                        // On subsequent fetches, only update currentPage if the current value is missing
                        // from the newly-fetched pages (e.g., it was removed) to avoid switching views.
                        if (!initializedRef.current) {
                            const initial = desiredPage || (pages[0] ?? '');
                            setCurrentPage(initial);
                            currentPageRef.current = initial;
                            initializedRef.current = true;
                        } else {
                            const cp = currentPageRef.current || currentPage;
                            if (!cp || !pages.includes(cp)) {
                                const fallback = desiredPage || (pages[0] ?? '');
                                setCurrentPage(fallback);
                                currentPageRef.current = fallback;
                            }
                        }

                        // Keep track of the scope we just loaded so future mappings are correct
                        prevScopeRef.current = scope;
                        // Clear the last-switch marker now that we've handled the mapping
                        lastSwitchFromRef.current = null;

                        // Initialize user categories
                        await initializeUserCategories();
                    } catch (error) {
                        console.error('Error fetching goals or initializing categories:', error);
                    }
                };

                fetchGoalsAndCategories();
                // debug logs removed after fixing mapping race conditions
            }, [scope]);

            // Mirror pageByScope into a ref to avoid re-running the fetch effect on its changes
            useEffect(() => { pageByScopeRef.current = pageByScope; }, [pageByScope]);
    const openGoalModal = () => {
        if (!isGoalModalOpen) {
        setNewGoal((prev) => ({
            ...prev,
            // week_start: getWeekStartDate(),
        }));
        setIsGoalModalOpen(true);
        }
    };
  
    const closeGoalModal = () => {
      setIsGoalModalOpen(false);
    };

    // Sets the selected summary ID and opens the editor modal
    function setLocalSummaryId(id: string): void {
        setSelectedSummary((prev) => prev ? { ...prev, id } : prev);
        setIsEditorOpen(true);
    }
    const closeEditor = () => {
        if (!isEditorOpen) {
            console.warn('closeEditor called but editor is already closed.');
            return; // Prevent redundant calls
        }
        // console.log('closeEditor called');
        setIsEditorOpen(false);
    }

    // Function to refresh goals (keeps current selection where possible)
    const refreshGoals = async () : Promise<{indexedGoals: Record<string, Goal[]>, pages: string[]}> => {
        try {
    console.debug('[AllGoals] refreshGoals: called');
        const { indexedGoals, pages } = await fetchAllGoalsIndexed(scope);
    console.debug('[AllGoals] refreshGoals: fetched', { pages: pages.length, keys: Object.keys(indexedGoals).slice(0,5) });
        setIndexedGoals(indexedGoals);
        setPages(pages);
        // Keep the latest currentPage in a ref to avoid stale closures from async callers
        // If currentPage is not present in new pages, try to choose a sensible fallback
            if (pages.length > 0) {
            const cp = currentPageRef.current;
            if (!cp || !pages.includes(cp)) {
                setCurrentPage(pages[0]);
                currentPageRef.current = pages[0];
            }
        }
        return { indexedGoals, pages };
        } catch (error) {
        console.error('Error refreshing goals:', error);
        return { indexedGoals: {}, pages: [] };
        }
    };
  
// Add a new goal
    //const handleAddGoal = async (event: React.FormEvent, goal?: Goal) => {
    //    event.preventDefault(); // Prevent default form submission
//
    //    const goalToAdd = goal || newGoal; // Use the passed goal or fallback to newGoal state
//
    //    // Log the goal being validated
    //    console.log('Validating goal:', goalToAdd);
//
    //    // Validation: Ensure all required fields are populated
    //    if (!goalToAdd.title || !goalToAdd.description || !goalToAdd.category || !goalToAdd.week_start || !goalToAdd.user_id) {
                                // prevScopeRef.current = scope; // This line is now moved inside the fetch function
    //        return;
    //    }
//
    //    // Revalidate week_start before adding to the database
    //    if (goalToAdd.week_start) {
    //      goalToAdd.week_start = goalToAdd.week_start.split('T')[0]; // Ensure no timestamp
    //    }
    //    console.log('Validated week_start in AllGoals:', goalToAdd.week_start);
//
    //    try {
    //        console.log('Adding goal:', goalToAdd);
    //        await addGoal(goalToAdd); // Add the new goal
    //        await refreshGoals(); // Refresh the goals list
    //    } catch (error) {
    //        console.error('Error adding goal:', error);
    //    }
    //};
// Delete a goal
    const { refreshGoals: ctxRefresh, removeGoalFromCache, lastUpdated, lastAddedIds, setLastAddedIds } = useGoalsContext();

    // When the global goals cache is updated (via context), ensure this component refreshes
    useEffect(() => {
        try {
            console.debug('[AllGoals] GoalsContext.lastUpdated changed, syncing local indexed goals');
            const added = lastAddedIds && lastAddedIds.length > 0 ? [...lastAddedIds] : undefined;
            (async () => {
                const fresh = await refreshGoals();
                // if there were added ids, navigate to the page containing the first one using fresh data
                if (added && added.length > 0 && fresh.pages && fresh.pages.length > 0) {
                    for (const p of fresh.pages) {
                        const list = fresh.indexedGoals[p] || [];
                        if (list.some((g) => added.includes(g.id))) {
                            setCurrentPage(p);
                            currentPageRef.current = p;
                            break;
                        }
                    }
                }
                // clear the context marker
                try { if (typeof setLastAddedIds === 'function') setLastAddedIds(undefined); } catch (e) { /* ignore */ }
            })();
        } catch (e) {
            console.warn('[AllGoals] Failed to sync after context update (ignored):', e);
        }
    }, [lastUpdated]);

    const handleDeleteGoal = async (goalId: string) => {
        // Optimistic UI: remove from local indexedGoals immediately
        const previousIndexed = { ...indexedGoals };
        try {
        console.debug('[AllGoals] handleDeleteGoal: deleting (optimistic)', { goalId, currentPage });
        setIndexedGoals((prev) => {
            const copy: Record<string, Goal[]> = { ...prev };
            if (copy[currentPage]) copy[currentPage] = copy[currentPage].filter((g) => g.id !== goalId);
            return copy;
        });

        // Also remove from global cache so other components reflect change immediately
        try {
            if (removeGoalFromCache) removeGoalFromCache(goalId);
        } catch (e) {
            console.warn('[AllGoals] removeGoalFromCache failed (ignored):', e);
        }

        // Attempt server delete
        await deleteGoal(goalId);

        // After server reports success, ensure the local indexed state truly reflects deletion.
        // Retry fetching indexed goals a few times to avoid flicker caused by race conditions.
        const maxAttempts = 3;
        let attempt = 0;
        let foundStill = true;
        while (attempt < maxAttempts) {
            try {
                const { indexedGoals: freshIndexed, pages: freshPages } = await fetchAllGoalsIndexed(scope);
                // check whether goalId remains anywhere
                const exists = Object.values(freshIndexed).some((list) => list.some((g) => g.id === goalId));
                // update local state to the fresh snapshot
                setIndexedGoals(freshIndexed);
                setPages(freshPages);
                if (!exists) {
                    foundStill = false;
                    break;
                }
            } catch (e) {
                console.warn('[AllGoals] refresh attempt failed (ignored):', e);
            }
            // backoff before retrying
            await new Promise((res) => setTimeout(res, 250 * Math.pow(2, attempt)));
            attempt += 1;
        }

        if (foundStill) {
            // As a fallback, trigger a full context refresh and final reconcile
            try {
                if (ctxRefresh) { await ctxRefresh(); console.debug('[AllGoals] handleDeleteGoal: ctxRefresh finished'); }
                const { indexedGoals: finalIndexed, pages: finalPages } = await fetchAllGoalsIndexed(scope);
                setIndexedGoals(finalIndexed);
                setPages(finalPages);
                const stillExists = Object.values(finalIndexed).some((list) => list.some((g) => g.id === goalId));
                if (stillExists) {
                    // server did not remove the row or there's a deeper issue; rollback optimistic removal
                    setIndexedGoals(previousIndexed);
                    notifyError('Goal appeared to not be deleted (server still contains it). It has been restored locally.');
                    return;
                }
            } catch (e) {
                console.warn('[AllGoals] final reconcile after delete failed (ignored):', e);
            }
        }

        // If we reach here, deletion is confirmed and local state updated
        } catch (error) {
        console.error('Error deleting goal:', error);
        // rollback optimistic removal
        try {
            setIndexedGoals(previousIndexed);
            // best-effort: refresh from server to reconcile
            try { await refreshGoals(); } catch (e) { /* ignore */ }
        } catch (e) {
            console.warn('[AllGoals] rollback after delete failed (ignored):', e);
        }
        notifyError('Failed to delete goal.');
        }
    };

// Update a goal
    const handleUpdateGoal = async (goalId: string, updatedGoal: Goal) => {
        try {
        await updateGoal(goalId, updatedGoal);
        await refreshGoals(); // Refresh goals after deleting
        } catch (error) {
        console.error('Error updating goal:', error);
        }
    };

   // Filter goals based on the filter state
  const handleFilterChange = (filterValue: string) => {
    setFilter(filterValue);
    if (filterValue) {
      const filtered = (indexedGoals[currentPage] || []).filter((goal) =>
        goal.title.toLowerCase().includes(filterValue.toLowerCase()) ||
        goal.category.toLowerCase().includes(filterValue.toLowerCase()) ||
        goal.description.toLowerCase().includes(filterValue.toLowerCase()) ||
        goal.week_start.toLowerCase().includes(filterValue.toLowerCase())
      );
      setIndexedGoals((prev) => ({ ...prev, [currentPage]: filtered }));
    } else {
      refreshGoals(); // Reset to all goals if no filter
    }
  };

  const handlePageChange = (page: string) => {
      setCurrentPage(page);
      currentPageRef.current = page;
      const next = { ...pageByScopeRef.current, [scope]: page };
      setPageByScope(next);
      pageByScopeRef.current = next;
      try { savePageByScope(next); } catch (e) { /* ignore */ }
  };

    // persist pageByScope whenever it changes (e.g., scope switches)
    useEffect(() => {
        try {
            savePageByScope(pageByScope);
        } catch (e) {
            // ignore
        }
    }, [pageByScope]);

    // console.log('Indexed Goals:', indexedGoals);
    // console.log('Filtered Goals:', filteredGoals);
    // console.log('Formatted date:', formattedDate);

  // Update the Goals list rendering logic to apply filtering and sorting
  const sortedAndFilteredGoals = (indexedGoals[currentPage] || [])
    .filter((goal) => {
            // text filter
            const textMatch = !filter || (
                goal.title.toLowerCase().includes(filter.toLowerCase()) ||
                goal.category.toLowerCase().includes(filter.toLowerCase()) ||
                goal.description.toLowerCase().includes(filter.toLowerCase()) ||
                (goal.week_start || '').toLowerCase().includes(filter.toLowerCase())
            );

            if (!textMatch) return false;

            // status filter
            if (filterStatus && (goal.status || '') !== filterStatus) return false;

            // category filter
            if (filterCategory && (goal.category || '') !== filterCategory) return false;

                    // time range filter - compare week_start (YYYY-MM-DD)
                    const compareGoalDate = (dateStr: string | undefined): Date | null => {
                        if (!dateStr) return null;
                        const d = new Date(dateStr);
                        if (isNaN(d.getTime())) return null;
                        return d;
                    };

                    if (filterStartDate) {
                        try {
                            const goalDate = compareGoalDate(goal.week_start);
                            const start = filterStartDate instanceof Object && 'toDate' in filterStartDate ? (filterStartDate as any).toDate() : (filterStartDate as unknown as Date);
                            if (goalDate && start && goalDate < start) return false;
                        } catch (e) { /* ignore parse errors */ }
                    }
                    if (filterEndDate) {
                        try {
                            const goalDate = compareGoalDate(goal.week_start);
                            const end = filterEndDate instanceof Object && 'toDate' in filterEndDate ? (filterEndDate as any).toDate() : (filterEndDate as unknown as Date);
                            if (goalDate && end && goalDate > end) return false;
                        } catch (e) { /* ignore parse errors */ }
                    }

            return true;
    })
    .sort((a, b) => {
      if (sortDirection === 'asc') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    // Add a function to highlight filtered words
//   const applyHighlight = (text: string, filter: string) => {
//     if (!filter) return text;
//     // Escape special characters in the filter string
//     const escapedFilter = filter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
//     const regex = new RegExp(`(${escapedFilter})`, 'gi');
//     return text.replace(regex, '<span class="bg-brand-10 text-brand-90 inline-block">$1</span>');
//   };

  return (
    <div className={`space-y-6`}>
        <div className="flex justify-between items-center w-full">
            <h1 className="text-2xl font-bold text-gray-90 block sm:hidden">{scope.charAt(0).toUpperCase() + scope.slice(1)}ly goals</h1>
        </div>

        
        <div className="flex justify-between items-start sm:items-center w-full mb-4">
            <div className='flex flex-col md:flex-row'>
                {/* Pagination */}
                <Pagination
                    pages={pages}
                    currentPage={currentPage}
                    onPageChange={handlePageChange}
                    scope={scope}
                />
                {/* Scope Selector */}
                <div className='flex space-x-2 ml-4'>
                    {['week', 'month', 'year'].map((s) => (
                        <button
                            key={s}
                            title={`Select ${s}ly view`}
                                onClick={() => {
                                // persist the currently-viewed page for the active scope before switching
                                    const next = { ...pageByScopeRef.current, [scope]: currentPage || pageByScopeRef.current[scope] };
                                    setPageByScope(next);
                                    pageByScopeRef.current = next;
                                    try { savePageByScope(next); } catch (e) {}
                                    // Record which scope we're switching from so the next fetch can map correctly
                                    lastSwitchFromRef.current = scope;
                                    setScope(s as 'week' | 'month' | 'year');
                                }}
                            className={`btn-ghost ${scope === s ? 'text-brand-60 hover:text-brand-70 dark:text-brand-20 dark:hover:text-brand-10 font-bold underline' : ''}`}
                        >
                            <span className="hidden md:inline sm:inline">{s.charAt(0).toUpperCase() + s.slice(1)}</span>
                            <span className="md:hidden sm:hidden">{s.charAt(0).toUpperCase()}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
        <div className='flex flex-col 2xl:flex-row 2xl:space-x-8 items-start justify-start w-full mb-4'>
            <div id="allGoals" className="flex flex-col gap-4 2xl:w-2/3 w-full">
                {/* Filter and Sort Controls */}
                <div className="mt-4 h-10 flex items-center space-x-2">
                    
                        {/* Filter button + MUI TextField replacement for filter input */}
                        <>
                        <Tooltip title="Open filters" placement="top" arrow>
                        <IconButton
                            className="btn-ghost mr-2"
                            size="small"
                            aria-label="Open filters"
                            onClick={(e) => setFilterAnchorEl(e.currentTarget)}
                        >
                            <FilterIcon className="w-4 h-4" />
                        </IconButton>
                        </Tooltip>
                        <Popover
                            open={Boolean(filterAnchorEl)}
                            anchorEl={filterAnchorEl}
                            onClose={() => setFilterAnchorEl(null)}
                            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                        >
                            <Box sx={{ p: 2, width: 280 }}>
                                <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                                    <InputLabel id="filter-status-label">Status</InputLabel>
                                    <Select
                                        labelId="filter-status-label"
                                        value={filterStatus}
                                        label="Status"
                                        onChange={(e) => setFilterStatus((e.target as HTMLInputElement).value)}
                                    >
                                        <MenuItem value="">Any</MenuItem>
                                        {statusOptions.map((s) => (
                                            <MenuItem key={s} value={s}>{s}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                                <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                                    <InputLabel id="filter-category-label">Category</InputLabel>
                                    <Select
                                        labelId="filter-category-label"
                                        value={filterCategory}
                                        label="Category"
                                        onChange={(e) => setFilterCategory((e.target as HTMLInputElement).value)}
                                    >
                                        <MenuItem value="">Any</MenuItem>
                                        {categoryOptions.map((c) => (
                                            <MenuItem key={c} value={c}>{c}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                                {scope === 'year' && (
                                  <div className="flex flex-col space-y-2 mb-2">
                                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                                      <div>
                                          <label className="block text-sm text-gray-60 mb-1">Start</label>
                                          <DatePicker
                                              value={filterStartDate}
                                              onChange={(v: Dayjs | null) => setFilterStartDate(v)}
                                              slotProps={{ textField: { size: 'small' } }}
                                              maxDate={filterEndDate || undefined}
                                          />
                                      </div>
                                      <div>
                                          <label className="block text-sm text-gray-60 mb-1">End</label>
                                          <DatePicker
                                              value={filterEndDate}
                                              onChange={(v: Dayjs | null) => setFilterEndDate(v)}
                                              slotProps={{ textField: { size: 'small' } }}
                                              minDate={filterStartDate || undefined}
                                          />
                                      </div>
                                  </LocalizationProvider>
                                  </div>
                                )}
                                <div className="flex justify-end space-x-2">
                                    <button
                                        type="button"
                                        className="btn-ghost"
                                        onClick={() => {
                                            setFilterStatus('');
                                            setFilterCategory('');
                                            setFilterStartDate(null);
                                            setFilterEndDate(null);
                                        }}
                                    >
                                        Clear
                                    </button>
                                    <button
                                        type="button"
                                        className="btn-primary"
                                        onClick={() => setFilterAnchorEl(null)}
                                    >
                                        Apply
                                    </button>
                                </div>
                            </Box>
                        </Popover>
                        </>
                        <TextField
                            id="goal-filter"
                            size="small"
                            value={filter}
                            inputRef={(el) => { filterInputRef.current = el; }}
                            onFocus={() => {
                                if (blurTimeoutRef.current) window.clearTimeout(blurTimeoutRef.current);
                                setFilterFocused(true);
                            }}
                            onBlur={() => {
                                // delay clearing so clicks on the clear button register
                                blurTimeoutRef.current = window.setTimeout(() => {
                                    setFilterFocused(false);
                                    blurTimeoutRef.current = null;
                                }, 150);
                            }}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => handleFilterChange(e.target.value)}
                            placeholder="Filter by title, category, or impact"
                            
                            fullWidth
                            InputProps={{
                                    startAdornment: (
                                            <InputAdornment position="start">
                                                    <SearchIcon className='w-4 h-4' />
                                            </InputAdornment>
                                    ),
                                    endAdornment: showClear ? (
                                        <InputAdornment position="end">
                                            <IconButton
                                                size="small"
                                                aria-label="Clear filter"
                                                onMouseDown={(e) => e.preventDefault()} // prevent input blur
                                                onClick={() => {
                                                    handleFilterChange('');
                                                    // return focus to input
                                                    filterInputRef.current?.focus();
                                                }}
                                                onFocus={() => { if (blurTimeoutRef.current) window.clearTimeout(blurTimeoutRef.current); setClearButtonFocused(true); }}
                                                onBlur={() => { blurTimeoutRef.current = window.setTimeout(() => setClearButtonFocused(false), 150); }}
                                            >
                                                <CloseButton className="w-4 h-4" />
                                            </IconButton>
                                        </InputAdornment>
                                    ) : null,
                            }}
                    />
                    
                    <Tooltip title={`Sort by creation date (${sortDirection === 'asc' ? 'ascending' : 'descending'})`} placement="top" arrow>
                    <button
                    onClick={() => setSortDirection(dir => (dir === 'asc' ? 'desc' : 'asc'))}
                    className="btn-ghost px-3 py-2"
                    // title="Toggle sort direction"
                    >
                    {sortDirection === 'desc' ? <ArrowUp className='w-5 h-5' /> : <ArrowDown className='w-5 h-5' />}
                    </button>
                    </Tooltip>

                    {/* Add Goal Button */}
                    <Tooltip title={`Add a new goal`} placement="top" arrow>
                    <button
                        onClick={openGoalModal}
                        className="btn-primary gap-2 flex ml-auto sm:mt-0 md:pr-2 sm:pr-2 xs:pr-0"
                        // title={`Add a new goal for the current ${scope}`}
                        aria-label={`Add a new goal for the current ${scope}`}
                        >
                        <PlusIcon className="w-5 h-5" />
                        {/* <span className="block flex text-nowrap">Add Goal</span> */}
                    </button>
                    </Tooltip>
                </div> 

                {/* Goals List */}
                <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 3xl:grid-cols-5 gap-4 w-full'>
                    {sortedAndFilteredGoals.map((goal) => (
                    <GoalCard
                        key={goal.id}
                        goal={goal}
                        handleDelete={(goalId) => {
                            handleDeleteGoal(goalId);
                        }}
                        handleEdit={(goalId) => {
                            // console.log('handleEdit called with goalId:', goalId);
                            const goalToEdit = indexedGoals[currentPage]?.find((goal) => goal.id === goalId);
                            if (goalToEdit) {
                                // console.log('Editing goal:', goalToEdit);
                                setSelectedGoal(goalToEdit);
                                setIsEditorOpen(true);
                            }
                        }}
                        filter={filter} // Pass the filter prop
                    />
                    ))}
                </div>
                {sortedAndFilteredGoals.length === 0 && (
                    <div className="text-center text-gray-500 mt-4">
                        No goals found for this {scope}. Try adding one!
                    </div>
                )}
            </div>
            <div id="summary" className="p-4 mt-8 2xl:mt-4 gap-4 flex flex-col w-full 2xl:w-1/3 h-full justify-start items-start border-b border-gray-30 dark:border-gray-70 bg-gray-0 bg-opacity-70 dark:bg-gray-100 dark:bg-opacity-30 rounded-md">                                                                                         {/* Summary Generator and Editor */}
                {/* <div className="">
                    <h2 className="text-xl font-semibold text-gray-900">Summary</h2>
                    <p className="text-gray-60 dark:text-gray-30">Generate and edit your {scope}ly summary.</p>
                </div> */}
                <div id="summary_btn">
                    <SummaryGenerator 
                        summaryId={selectedSummary?.id || ''} 
                        summaryTitle={selectedSummary?.title || `Summary for ${scope}: ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`}                                                                                                                                                                                selectedRange={new Date()}
                        filteredGoals={indexedGoals[currentPage] || []} // Pass the goals for the current page
                        scope={scope}
                    />

                    <Modal
                        key={selectedSummary?.id || 'summary-editor'}
                        isOpen={!!selectedSummary && isEditorOpen}
                        onRequestClose={() => setSelectedSummary(null)}
                        ariaHideApp={ARIA_HIDE_APP}
                        className={`fixed inset-0 flex items-center justify-center z-50`}
                        overlayClassName={`${overlayClasses}`}
                    >
                        <div className={`${modalClasses}`}>
                        {selectedSummary && (
                          <SummaryEditor
                            id={selectedSummary.id}
                            content={selectedSummary.content}
                            type={selectedSummary.type === 'AI' || selectedSummary.type === 'User' ? selectedSummary.type : 'User'}
                            title={selectedSummary.title}
                            onRequestClose={() => setSelectedSummary(null)}
                            onSave={async (editedTitle, editedContent) => {
                            try {
                                await saveSummary(
                                  setLocalSummaryId,
                                  editedTitle || selectedSummary.title,
                                  editedContent,
                                  'User',
                                  new Date(),
                                  scope
                                );
                                closeEditor();
                            } catch (error) {
                                console.error('Error saving edited summary:', error);
                            }
                            }}
                          />
                        )}
                        </div>
                    </Modal>
                </div>
            </div>
        </div>
    <div>

        {/* Add Goal Modal */}
        <Modal
            isOpen={isGoalModalOpen}
            onRequestClose={closeGoalModal}
            ariaHideApp={ARIA_HIDE_APP}
            // parentSelector={() => document.getElementById('app')!}
            className={`fixed inset-0 flex md:items-center justify-center z-50`}
            overlayClassName={`${overlayClasses}`}
        >
        <div className={`${modalClasses}`}>
            {isGoalModalOpen && (
                <GoalForm
                    newGoal={newGoal}
                    setNewGoal={setNewGoal}
                                handleClose={closeGoalModal}
                                categories={UserCategories.map((cat: any) => typeof cat === 'string' ? cat : cat.name)}
                                refreshGoals={() => refreshGoals().then(() => {})}
                />
            )}
        </div>
        </Modal>
        {/* Goal Editor Modal */}
        <Modal
            isOpen={isEditorOpen}
            onRequestClose={closeEditor}
            ariaHideApp={ARIA_HIDE_APP}
            className={`fixed inset-0 flex items-center justify-center z-50`}
            overlayClassName={`${overlayClasses}`}
        >
            {isEditorOpen && (
                <GoalEditor
                    title={selectedGoal?.title || ''}
                    description={selectedGoal?.description || ''}
                    category={selectedGoal?.category || ''}
                    week_start={selectedGoal?.week_start || ''}
                    onAddCategory={async (newCategory: string) => {
                        try {
                            await addCategory(newCategory); // Ensure backend consistency
                            setSelectedGoal((prevGoal) =>
                                prevGoal ? { ...prevGoal, category: newCategory } : null
                            );
                        } catch (error) {
                            console.error('Error adding category:', error);
                        }
                    }}
                    onRequestClose={closeEditor}
                    onSave={async (updatedDescription, updatedTitle, updatedCategory, updatedWeekStart, status, status_notes) => {
                        try {
                            if (selectedGoal) {
                                await handleUpdateGoal(selectedGoal.id, {
                                    id: selectedGoal.id,
                                    user_id: selectedGoal.user_id,
                                    created_at: selectedGoal.created_at,
                                    title: updatedTitle,
                                    description: updatedDescription,
                                    category: updatedCategory,
                                    week_start: updatedWeekStart,
                                    status: (status as any) || selectedGoal?.status,
                                    status_notes: (status_notes as any) || selectedGoal?.status_notes,
                                });
                                await refreshGoals(); // Refetch goals after saving
                            }
                        } catch (error) {
                            console.error('Error saving goal:', error);
                        }
                    }}
                />
            )}
        </Modal>
        </div>
    </div>
  );
};

export default GoalsComponent;
