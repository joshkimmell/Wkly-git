import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { fetchAllGoalsIndexed, fetchAllGoals, deleteGoal, updateGoal, saveSummary, UserCategories, initializeUserCategories, addCategory, getWeekStartDate, indexDataByScope, applyHighlight } from '../utils/functions';
import Pagination from './Pagination';
import GoalCard from '@components/GoalCard';
import GoalForm from '@components/GoalForm';
import Modal from 'react-modal';
import SummaryGenerator from '@components/SummaryGenerator';
import SummaryEditor from '@components/SummaryEditor';
import GoalEditor from '@components/GoalEditor';
import { cardClasses, modalClasses, overlayClasses } from '@styles/classes';
import { ARIA_HIDE_APP } from '@lib/modal';
import { Goal as GoalUtilsGoal } from '@utils/goalUtils';
import { mapPageForScope, loadPageByScope, savePageByScope } from '@utils/pagination';
import 'react-datepicker/dist/react-datepicker.css';
// import * as goalUtils from '@utils/goalUtils';
import 'react-datepicker/dist/react-datepicker.css';
import { X as CloseButton, Search as SearchIcon, Filter as FilterIcon, PlusIcon, ArrowUp, ArrowDown, CalendarIcon, Check, TagIcon, Table2Icon, LayoutGrid, Kanban, ChevronDown, ChevronUp, Edit, Trash } from 'lucide-react';
import { useGoalsContext } from '@context/GoalsContext';
// notify helpers imported where needed below
import { TextField, InputAdornment, IconButton, Popover, Box, FormControl, InputLabel, Select, MenuItem, Tooltip, Menu, Chip, Badge, Checkbox, ListItemText, ToggleButtonGroup, ToggleButton, Table, TableHead, TableBody, TableRow, TableCell, Paper, Typography, Switch, FormControlLabel, CircularProgress } from '@mui/material';
// dnd-kit was attempted but failed to install; use HTML5 drag/drop fallback
import { useTheme } from '@mui/material/styles';
import supabase from '@lib/supabase';
import { STATUSES, STATUS_COLORS, type Status } from '../constants/statuses';
import { notifyError, notifySuccess } from '@components/ToastyNotification';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import type { Dayjs } from 'dayjs';
import type { ChangeEvent } from 'react';
type Goal = GoalUtilsGoal & {
  created_at?: string;
};

// Inline per-goal status component (mirrors GoalCard behavior)
const InlineStatus: React.FC<{ goal: Goal; onUpdated?: () => void }> = ({ goal, onUpdated }) => {
    const [localStatus, setLocalStatus] = useState<string | undefined>(goal.status);
    const [statusAnchorEl, setStatusAnchorEl] = useState<null | HTMLElement>(null);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const statusColors = STATUS_COLORS;

    return (
        <div>
            <Chip
                label={localStatus}
                size="small"
                onClick={(e) => setStatusAnchorEl(e.currentTarget)}
                variant={localStatus === 'Not started' ? 'outlined' : 'filled'}
                sx={
                    localStatus === 'Not started'
                        ? { borderColor: statusColors[localStatus || 'Not started'], color: statusColors[localStatus || 'Not started'] }
                        : { bgcolor: statusColors[localStatus || 'Not started'], color: '#fff' }
                }
                className="cursor-pointer text-sm font-medium"
            />
            <Menu anchorEl={statusAnchorEl} open={Boolean(statusAnchorEl)} onClose={() => setStatusAnchorEl(null)}>
                {STATUSES.map((s: Status) => (
                    <MenuItem
                        key={s}
                        disabled={isUpdatingStatus}
                        className="text-xs"
                        selected={s === localStatus}
                        onClick={async () => {
                            setStatusAnchorEl(null);
                            if (s === localStatus) return;
                            const prev = localStatus;
                            setLocalStatus(s);
                            setIsUpdatingStatus(true);
                            try {
                                const { error } = await supabase
                                    .from('goals')
                                    .update({ status: s, status_set_at: new Date().toISOString() })
                                    .eq('id', goal.id);
                                if (error) throw error;
                                notifySuccess('Status updated');
                                try { if (onUpdated) await onUpdated(); } catch (e) { /* ignore */ }
                            } catch (err: any) {
                                console.error('Failed to update status:', err);
                                setLocalStatus(prev);
                                notifyError('Failed to update status');
                            } finally {
                                setIsUpdatingStatus(false);
                            }
                        }}
                    >
                        <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 6, background: statusColors[s], marginRight: 8 }} />
                        {s}
                    </MenuItem>
                ))}
            </Menu>
        </div>
    );
};

const GoalsComponent = () => {
    // helper to toggle table sorting from header clicks
    const toggleSort = (field: 'date' | 'category' | 'status') => {
        if (sortBy === field) {
            setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortBy(field);
            setSortDirection('asc');
        }
    };

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
    // Default: Date Descending
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [sortBy, setSortBy] = useState<'date' | 'category' | 'status'>('date');
    const [sortAnchorEl, setSortAnchorEl] = useState<HTMLElement | null>(null);
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
    const [filterStatus, setFilterStatus] = useState<string[]>([]);
    const [filterCategory, setFilterCategory] = useState<string[]>([]);
    const [filterStartDate, setFilterStartDate] = useState<Dayjs | null>(null);
    const [filterEndDate, setFilterEndDate] = useState<Dayjs | null>(null);
    const [summaryAnchorEl, setSummaryAnchorEl] = useState<HTMLElement | null>(null);

        // filter popover anchor is controlled via `filterAnchorEl` and setFilterAnchorEl

    // derive category options from UserCategories
    const categoryOptions = (UserCategories || []).map((cat) => (typeof cat === 'string' ? cat : (cat as { name?: string }).name || ''));
        // derive statuses from current goals if available
        const statusOptions = Array.from(new Set(Object.values(indexedGoals).flat().map((g) => (g.status || '').toString()).filter(Boolean)));

    // Count of active filters to display as a badge on the filter button
    const selectedFiltersCount =
        (filterStatus?.length || 0) +
        (filterCategory?.length || 0) +
        (filterStartDate && filterEndDate ? 1 : 0) +
        (filter && filter.trim().length > 0 ? 1 : 0);

    const theme = useTheme();
    // view mode: 'cards' (default), 'table', or 'kanban'
    const [viewMode, setViewMode] = useState<'cards' | 'table' | 'kanban'>(() => {
        try {
            const v = localStorage.getItem('goals_view_mode');
            if (v === 'cards' || v === 'table' || v === 'kanban') return v;
        } catch (e) {
            // ignore
        }
        return 'cards';
    });

    // Whether Kanban should show all goals (true) or only current scope (false).
    const [showAllInKanban, setShowAllInKanban] = useState<boolean>(() => {
        try {
            const v = localStorage.getItem('kanban_show_all');
            return v === null ? true : v === 'true';
        } catch (e) { return true; }
    });

    useEffect(() => {
        try {
            console.debug('[AllGoals] showAllInKanban persisted ->', showAllInKanban);
            localStorage.setItem('kanban_show_all', showAllInKanban ? 'true' : 'false');
        } catch {}
    }, [showAllInKanban]);

    // When user turns OFF 'Show all' ensure we drop the unscoped cache so the
    // UI and effects only operate on scoped `indexedGoals`. This avoids any
    // accidental usage of stale `fullGoals` when the toggle is disabled.
    useEffect(() => {
        if (!showAllInKanban) {
            console.debug('[AllGoals] showAllInKanban disabled — clearing fullGoals cache');
            setFullGoals(null);
        }
    }, [showAllInKanban]);

    const handleChangeView = (_: React.MouseEvent<HTMLElement>, value: 'cards' | 'table' | 'kanban' | null) => {
        if (!value) return;
        setViewMode(value);
        try { localStorage.setItem('goals_view_mode', value); } catch { /* ignore */ }
    };

    // Compute set of visible goal IDs based on active filters so Kanban can respect the same filter
    // NOTE: moved below after `sortedAndFilteredGoals` is declared to avoid TDZ errors

    // Drag & drop state for Kanban
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [isScopeLoading, setIsScopeLoading] = useState<boolean>(false);

    // Wrapper used to trace and centralize logging for scope-loading state.
    // This temporary debug helper assigns a short sequence id for each transition
    // and records timestamps and a short stack snippet so we can trace which
    // code path set/cleared the flag.
    // Debug logging was previously used here; keep minimal dev-only traces where
    // helpful. The detailed tracing wrapper has been removed to clean up the code.

    // Kanban columns mapping: status -> ordered array of goal ids
    const [kanbanColumns, setKanbanColumns] = useState<Record<string, string[]>>(() => {
        const statuses = ['Not started', 'In progress', 'Blocked', 'On hold', 'Done'];
        const out: Record<string, string[]> = {};
        for (const s of statuses) out[s] = [];
        return out;
    });

    // Cache full (unscoped) goals used by Kanban so board shows all goals by default
    const [fullGoals, setFullGoals] = useState<Goal[] | null>(null);

    // Column collapsed state for Kanban (allow user to hide/show a column)
    const [collapsedColumns, setCollapsedColumns] = useState<Record<string, boolean>>(() => {
        const statuses = ['Not started', 'In progress', 'Blocked', 'On hold', 'Done'];
        const out: Record<string, boolean> = {};
        for (const s of statuses) out[s] = false;
        return out;
    });

    // Keep kanbanColumns in sync when indexedGoals change
    useEffect(() => {
    // Choose source goals for Kanban depending on the user toggle
    const useFull = viewMode === 'kanban' && showAllInKanban && fullGoals && fullGoals.length > 0;
    console.debug('[AllGoals] kanbanColumns effect running. useFull=', useFull, { viewMode, showAllInKanban, fullGoalsCount: fullGoals ? fullGoals.length : 0, indexedPages: Object.keys(indexedGoals).length, isScopeLoading });
    // If we're loading a new scope, and the user hasn't requested "All", clear columns
    // to avoid rendering stale IDs from the previous scope.
    if (isScopeLoading && viewMode === 'kanban' && !showAllInKanban) {
    setKanbanColumns((_prev) => {
            const statuses = ['Not started', 'In progress', 'Blocked', 'On hold', 'Done'];
            const empty: Record<string, string[]> = {} as Record<string, string[]>;
            for (const s of statuses) empty[s] = [];
            return empty;
        });
        return;
    }
    const sourceGoals = useFull ? fullGoals : (indexedGoals[currentPage] || []);
        const statuses = ['Not started', 'In progress', 'Blocked', 'On hold', 'Done'];
        const cols: Record<string, string[]> = {} as Record<string, string[]>;
        for (const s of statuses) cols[s] = [];
        for (const g of sourceGoals.filter(goalMatchesFilters)) {
            const st = (g.status as string) || 'Not started';
            if (!cols[st]) cols[st] = [];
            cols[st].push(g.id);
        }
        setKanbanColumns(cols);
    }, [indexedGoals, viewMode, showAllInKanban, fullGoals, currentPage, filter, filterStatus, filterCategory, filterStartDate, filterEndDate, sortBy, sortDirection]);

    // Keep kanban columns updated when fullGoals or filters change
    useEffect(() => {
        if (viewMode !== 'kanban') return;
        if (!fullGoals) return;
        const statuses = ['Not started', 'In progress', 'Blocked', 'On hold', 'Done'];
        const cols: Record<string, string[]> = {} as Record<string, string[]>;
        for (const s of statuses) cols[s] = [];
        for (const g of fullGoals.filter(goalMatchesFilters)) {
            const st = (g.status as string) || 'Not started';
            if (!cols[st]) cols[st] = [];
            cols[st].push(g.id);
        }
        setKanbanColumns(cols);
    }, [fullGoals, filter, filterStatus, filterCategory, filterStartDate, filterEndDate, sortBy, sortDirection, viewMode]);

    // Fetch the full (unscoped) goals list when entering Kanban view AND the user
    // requested "Show all" so the board shows all goals by default only when needed.
    useEffect(() => {
        let mounted = true;
        const load = async () => {
            if (viewMode !== 'kanban' || !showAllInKanban) return;
            try {
                const all = await fetchAllGoals();
                if (mounted) setFullGoals(all);
            } catch (err) {
                console.error('Failed to fetch full goals for kanban:', err);
            }
        };
        load();
        return () => { mounted = false; };
    }, [viewMode, showAllInKanban]);

    // HTML5 Drag & Drop Kanban handlers (visual feedback + reorder)
    const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

    const handleDragStart = (e: React.DragEvent, id: string) => {
        setDraggingId(id);
        try { e.dataTransfer?.setData('text/plain', id); } catch { /* ignore */ }
        e.dataTransfer!.effectAllowed = 'move';
    };

    const handleDragEnd = () => {
        setDraggingId(null);
        setDragOverColumn(null);
        setDragOverIndex(null);
    };

    const getDropIndex = (e: React.DragEvent, columnEl: HTMLElement) => {
        const cards = Array.from(columnEl.querySelectorAll('.kanban-card')) as HTMLElement[];
        for (let i = 0; i < cards.length; i++) {
            const rect = cards[i].getBoundingClientRect();
            if (e.clientY < rect.top + rect.height / 2) return i;
        }
        return cards.length;
    };

    const handleDragOver = (e: React.DragEvent, status: string) => {
        e.preventDefault();
        const col = e.currentTarget as HTMLElement;
        const idx = getDropIndex(e, col);
        setDragOverColumn(status);
        setDragOverIndex(idx);
    };

    const handleDrop = async (e: React.DragEvent, status: string) => {
        e.preventDefault();
        const id = (() => { try { return e.dataTransfer?.getData('text/plain') || draggingId; } catch { return draggingId; } })();
        if (!id) { handleDragEnd(); return; }
        const prevColumns = { ...kanbanColumns };
        try {
            // remove from source
            let sourceCol: string | undefined;
            for (const k of Object.keys(prevColumns)) {
                if (prevColumns[k].includes(id)) { sourceCol = k; break; }
            }
            if (!sourceCol) { handleDragEnd(); return; }
            const newCols: Record<string, string[]> = {};
            for (const k of Object.keys(prevColumns)) newCols[k] = [...prevColumns[k]];
            // remove id
            newCols[sourceCol] = newCols[sourceCol].filter((v) => v !== id);
            // insert into dest
            const insertIndex = dragOverIndex != null ? dragOverIndex : newCols[status].length;
            newCols[status].splice(insertIndex, 0, id);
            setKanbanColumns(newCols);

            // Optimistically update indexedGoals statuses
            setIndexedGoals((prevIndexedState) => {
                const copy: Record<string, Goal[]> = {};
                for (const k of Object.keys(prevIndexedState)) copy[k] = [...prevIndexedState[k]];
                for (const p of Object.keys(copy)) {
                    const idx = copy[p].findIndex((g) => g.id === id);
                    if (idx !== -1) {
                        copy[p][idx] = { ...copy[p][idx], status: status as Goal['status'] };
                        break;
                    }
                }
                return copy;
            });

            const original = Object.values(indexedGoals).flat().find(g => g.id === id) as Goal | undefined;
            await updateGoal(id, { ...(original || { id, title: '', description: '', category: '', week_start: '', user_id: '' }), status: status as Goal['status'] });
        } catch (err) {
            setKanbanColumns(prevColumns);
            console.error('Failed to move goal:', err);
            notifyError('Failed to move goal.');
        } finally {
            handleDragEnd();
        }
    };

    // Old HTML5 drag/drop handlers removed in favor of dnd-kit sortable implementation.

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
                    // If we have a global in-memory goals cache (from GoalsContext), prefer
                    // building an indexed view from it and skip the network entirely. This
                    // avoids refetches when the user already loaded goals earlier in the session.
                    try {
                        if (ctxGoals && ctxGoals.length > 0) {
                            // ctxGoals items don't include `scope`, add it transiently for indexing
                            const withScope = (ctxGoals as unknown as Goal[]).map((g) => ({ ...g, scope }));
                            const clientIndexed = indexDataByScope(withScope, scope);
                            const clientPages = Object.keys(clientIndexed).sort((a, b) => (a > b ? -1 : 1));
                            if (Object.keys(clientIndexed).length > 0) {
                                // using client-indexed goals (no fetch)
                                setIndexedGoals(clientIndexed as Record<string, Goal[]>);
                                setPages(clientPages);

                                const cachedPage = pageByScopeRef.current[scope] || clientPages[0];
                                if (!initializedRef.current) {
                                    setCurrentPage(cachedPage);
                                    currentPageRef.current = cachedPage;
                                    initializedRef.current = true;
                                } else {
                                    const cp = currentPageRef.current || currentPage;
                                    if (!cp || !clientPages.includes(cp)) {
                                        setCurrentPage(clientPages[0]);
                                        currentPageRef.current = clientPages[0];
                                    }
                                }

                                prevScopeRef.current = scope;
                                lastSwitchFromRef.current = null;
                                await initializeUserCategories();
                                    // We used cached client goals to populate pages; clear loading state
                                    setIsScopeLoading(false);
                                return;
                            }
                        }
                    } catch {
                        // ignore and fall back to server fetch
                    }
                    try {
                        // Fetch goals for the selected scope
                        console.debug('[AllGoals] fetchAllGoalsIndexed called with scope=', scope);
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

                                                // Development debug: show mapping inputs so we can repro scope-switch flips quickly
                                                // mapping debug removed for production

                        // If still no desired page, fall back to sensible defaults (current date)
                        if (!desiredPage) {
                            // Use computeDefaultForScope so defaults remain consistent across code paths
                            const { computeDefaultForScope } = await import('@utils/pagination');
                            desiredPage = computeDefaultForScope(scope);
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
                                                        // set initial page
                                                        setCurrentPage(initial);
                                                        currentPageRef.current = initial;
                                                        initializedRef.current = true;
                                                        // after setting initial page
                                                } else {
                                                        const cp = currentPageRef.current || currentPage;
                                                        if (!cp || !pages.includes(cp)) {
                                                                const fallback = desiredPage || (pages[0] ?? '');
                                                                // set fallback page
                                                                setCurrentPage(fallback);
                                                                currentPageRef.current = fallback;
                                                                // after setting fallback page
                                                        }
                                                }
                        
                        // If we determined a desiredPage, ask the server for only that page
                        // using start/end (or legacy page for week) to reduce payload. This is
                        // backwards-compatible because initial fetch produced `pages` used
                        // for mapping; here we optionally replace the full indexedGoals with
                        // a server-filtered snapshot for the chosen page.
                        if (desiredPage) {
                            try {
                                let startParam: string | undefined;
                                let endParam: string | undefined;
                                // compute start/end based on scope and desiredPage
                                if (scope === 'week') {
                                    // week scope: use exact page (legacy equality) via `page`
                                    const resp = await fetchAllGoalsIndexed(scope, desiredPage);
                                    if (resp && resp.indexedGoals) {
                                        setIndexedGoals(resp.indexedGoals);
                                        setPages(resp.pages);
                                    }
                                } else if (scope === 'month') {
                                    const [y, m] = (desiredPage as string).split('-');
                                    startParam = `${y}-${m}-01`;
                                    const monthIndex = parseInt(m, 10);
                                    endParam = monthIndex === 12 ? `${parseInt(y, 10) + 1}-01-01` : `${y}-${String(monthIndex + 1).padStart(2, '0')}-01`;
                                    const resp = await fetchAllGoalsIndexed(scope, undefined, startParam, endParam);
                                    if (resp && resp.indexedGoals) {
                                        setIndexedGoals(resp.indexedGoals);
                                        setPages(resp.pages);
                                    }
                                } else if (scope === 'year') {
                                    const y = desiredPage as string;
                                    startParam = `${y}-01-01`;
                                    endParam = `${parseInt(y, 10) + 1}-01-01`;
                                    const resp = await fetchAllGoalsIndexed(scope, undefined, startParam, endParam);
                                    if (resp && resp.indexedGoals) {
                                        setIndexedGoals(resp.indexedGoals);
                                        setPages(resp.pages);
                                    }
                                }
                            } catch (err) {
                                console.warn('[AllGoals] server-filtered page fetch failed (falling back to full indexed):', err);
                            }
                        }

                // We've received scoped data — end the loading state.
                setIsScopeLoading(false);

                        // Keep track of the scope we just loaded so future mappings are correct
                        prevScopeRef.current = scope;
                        // Clear the last-switch marker now that we've handled the mapping
                        lastSwitchFromRef.current = null;

                        // Initialize user categories
                        await initializeUserCategories();
                    } catch (error) {
                        console.error('Error fetching goals or initializing categories:', error);
                            // Ensure we clear loading state on error so the UI doesn't stay blocked
                            try { setIsScopeLoading(false); } catch {}
                    }
                };

                fetchGoalsAndCategories();
                // debug logs removed after fixing mapping race conditions
            // The effect below intentionally only depends on `scope` to control when we fetch
            // goals. `ctxGoals`, `currentPage`, and `pageByScope` are accessed via refs or
            // handled in separate effects to avoid refetch loops. If that behavior needs
            // to change, remove the eslint-disable and add the dependencies.
            // eslint-disable-next-line react-hooks/exhaustive-deps
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
    const refreshGoals = useCallback(async () : Promise<{indexedGoals: Record<string, Goal[]>, pages: string[]}> => {
        try {
        const { indexedGoals, pages } = await fetchAllGoalsIndexed(scope);
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
        // If refresh failed, ensure we exit the loading state so the UI doesn't stay blocked
    setIsScopeLoading(false);
        return { indexedGoals: {}, pages: [] };
        }
    }, [scope]);
  
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
    const { refreshGoals: ctxRefresh, removeGoalFromCache, lastUpdated, lastAddedIds, setLastAddedIds, goals: ctxGoals } = useGoalsContext();

    // Periodic refresh of fullGoals and refresh on background signals while Kanban is active
    // Only refresh the unscoped list when the user has chosen to show all goals.
    useEffect(() => {
        let mounted = true;
        const reload = async () => {
            if (viewMode !== 'kanban' || !showAllInKanban) {
                console.debug('[AllGoals] reload skipped, viewMode or toggle not set', { viewMode, showAllInKanban });
                return;
            }
            try {
                console.debug('[AllGoals] reload: fetching fullGoals (showAllInKanban=true)');
                const all = await fetchAllGoals();
                if (mounted) setFullGoals(all);
            } catch (err) {
                console.error('Error refreshing fullGoals:', err);
            }
        };

        // Immediate refresh on background signals
        if (lastUpdated || (lastAddedIds && lastAddedIds.length > 0)) reload();

        const handle = setInterval(() => {
            reload();
        }, 60_000); // refresh every 60 seconds

        return () => { mounted = false; clearInterval(handle); };
    }, [viewMode, showAllInKanban, lastUpdated, lastAddedIds]);

    // When the global goals cache is updated (via context), ensure this component refreshes
    useEffect(() => {
                    try {
            const added = lastAddedIds && lastAddedIds.length > 0 ? [...lastAddedIds] : undefined;
            (async () => {
                const fresh = await refreshGoals();
                // if there were added ids, navigate to the page containing the first one using fresh data
                if (added && added.length > 0 && fresh.pages && fresh.pages.length > 0) {
                    for (const p of fresh.pages) {
                        const list = fresh.indexedGoals[p] || [];
                        if (list.some((g: Goal) => added.includes(g.id))) {
                            setCurrentPage(p);
                            currentPageRef.current = p;
                            break;
                        }
                    }
                }
                // clear the context marker
                try { if (typeof setLastAddedIds === 'function') setLastAddedIds(undefined); } catch { /* ignore */ }
            })();
        } catch (err) {
            console.warn('[AllGoals] Failed to sync after context update (ignored):', err);
        }
    }, [lastUpdated, lastAddedIds, refreshGoals, setLastAddedIds]);

    const handleDeleteGoal = async (goalId: string) => {
        // Optimistic UI: remove from local indexedGoals immediately
        const previousIndexed = { ...indexedGoals };
    try {
        setIndexedGoals((prev) => {
            const copy: Record<string, Goal[]> = { ...prev };
            if (copy[currentPage]) copy[currentPage] = copy[currentPage].filter((g) => g.id !== goalId);
            return copy;
        });

        // Also remove from global cache so other components reflect change immediately
        try {
            if (removeGoalFromCache) removeGoalFromCache(goalId);
        } catch (err) {
            console.warn('[AllGoals] removeGoalFromCache failed (ignored):', err);
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
            } catch (err) {
                console.warn('[AllGoals] refresh attempt failed (ignored):', err);
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
            } catch (err) {
                console.warn('[AllGoals] final reconcile after delete failed (ignored):', err);
            }
        }

        // If we reach here, deletion is confirmed and local state updated
    } catch (error) {
    console.error('Error deleting goal:', error);
        // rollback optimistic removal
            try {
            setIndexedGoals(previousIndexed);
            // best-effort: refresh from server to reconcile
            try { await refreshGoals(); } catch { /* ignore */ }
        } catch (err) {
            console.warn('[AllGoals] rollback after delete failed (ignored):', err);
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
        // Keep the filter as a separate piece of state. Don't mutate the source
        // `indexedGoals` — let the derived `sortedAndFilteredGoals` compute the
        // filtered list for each view. This avoids losing data for other pages and
        // prevents runtime errors when some fields are null.
        setFilter(filterValue);
  };

  const handlePageChange = (page: string) => {
      setCurrentPage(page);
      currentPageRef.current = page;
    const next = { ...pageByScopeRef.current, [scope]: page };
    setPageByScope(next);
    pageByScopeRef.current = next;
    try { savePageByScope(next); } catch { /* ignore */ }
        // Ensure any transient scope-loading state is cleared when the user explicitly
        // navigates pages. This avoids cases where a previous scope-switch left
        // `isScopeLoading` true and the UI would stay blocked after pagination.
    try { setIsScopeLoading(false); } catch {}
  };

    // persist pageByScope whenever it changes (e.g., scope switches)
    useEffect(() => {
        try {
            savePageByScope(pageByScope);
        } catch {
            // ignore
        }
    }, [pageByScope]);

    // Defensive effect: if we're showing a page that already exists in `pages`
    // or Kanban isn't restricted to scoped data, clear any lingering loading
    // indicator. This covers race conditions where a fetch returned early or
    // an error path didn't clear `isScopeLoading`.
    useEffect(() => {
        try {
            if (!isScopeLoading) return;
            // If we're not in scoped kanban mode, there's nothing to wait for
            if (viewMode !== 'kanban' || showAllInKanban) {
                setIsScopeLoading(false);
                return;
            }
            // If pages are populated and the current page is available, stop loading
            if (pages && pages.length > 0 && currentPage && pages.includes(currentPage)) {
                setIsScopeLoading(false);
                return;
            }
        } catch (err) {
            // best-effort only
            try { setIsScopeLoading(false); } catch {}
        }
    }, [currentPage, pages, viewMode, showAllInKanban, isScopeLoading]);

    // console.log('Indexed Goals:', indexedGoals);
    // console.log('Filtered Goals:', filteredGoals);
    // console.log('Formatted date:', formattedDate);

  // Filtering predicate to be shared across views
    const goalMatchesFilters = (goal: Goal) => {
        // text filter (defensive)
        const q = (filter || '').toString().trim();
        const qLower = q ? q.toLowerCase() : '';
        const safe = (v: unknown) => (typeof v === 'string' ? v : '') as string;
        const textMatch = !qLower || (
            safe(goal.title).toLowerCase().includes(qLower) ||
            safe(goal.category).toLowerCase().includes(qLower) ||
            safe(goal.description).toLowerCase().includes(qLower) ||
            safe(goal.week_start).toLowerCase().includes(qLower)
        );
        if (!textMatch) return false;

        // status filter (multi-select)
        if (filterStatus && filterStatus.length > 0 && !filterStatus.includes((goal.status || ''))) return false;

        // category filter (multi-select)
        if (filterCategory && filterCategory.length > 0 && !filterCategory.includes((goal.category || ''))) return false;

        // time range filter - compare week_start (YYYY-MM-DD)
        const compareGoalDate = (dateStr: string | undefined): Date | null => {
            if (!dateStr) return null;
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return null;
            return d;
        };

        const isDayjsLike = (v: unknown): v is { toDate: () => Date } => {
            return typeof v === 'object' && v !== null && 'toDate' in v && typeof (v as { toDate?: unknown }).toDate === 'function';
        };

        if (filterStartDate) {
            try {
                const goalDate = compareGoalDate(goal.week_start);
                let start: Date | undefined;
                if (isDayjsLike(filterStartDate)) {
                    start = filterStartDate.toDate();
                } else {
                    start = filterStartDate as unknown as Date;
                }
                if (goalDate && start && goalDate < start) return false;
            } catch { /* ignore parse errors */ }
        }
        if (filterEndDate) {
            try {
                const goalDate = compareGoalDate(goal.week_start);
                let end: Date | undefined;
                if (isDayjsLike(filterEndDate)) {
                    end = filterEndDate.toDate();
                } else {
                    end = filterEndDate as unknown as Date;
                }
                if (goalDate && end && goalDate > end) return false;
            } catch { /* ignore parse errors */ }
        }

        return true;
    };

    // Filtered & sorted list for the current page (cards/table)
    const sortedAndFilteredGoals = (indexedGoals[currentPage] || []).filter(goalMatchesFilters).sort((a, b) => {
        const dir = sortDirection === 'asc' ? 1 : -1;
        if (sortBy === 'date') {
            return dir * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        }
        if (sortBy === 'category') {
            const ca = (a.category || '').toLowerCase();
            const cb = (b.category || '').toLowerCase();
            if (ca < cb) return -1 * dir;
            if (ca > cb) return 1 * dir;
            return 0;
        }
        const sa = (a.status || '').toLowerCase();
        const sb = (b.status || '').toLowerCase();
        if (sa < sb) return -1 * dir;
        if (sa > sb) return 1 * dir;
        return 0;
    });

    // Filtered & sorted list across all indexed pages (for Kanban view)
    const sortedAndFilteredAllGoals = Object.values(indexedGoals).flat().filter(goalMatchesFilters).sort((a, b) => {
        const dir = sortDirection === 'asc' ? 1 : -1;
        if (sortBy === 'date') {
            return dir * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        }
        if (sortBy === 'category') {
            const ca = (a.category || '').toLowerCase();
            const cb = (b.category || '').toLowerCase();
            if (ca < cb) return -1 * dir;
            if (ca > cb) return 1 * dir;
            return 0;
        }
        const sa = (a.status || '').toLowerCase();
        const sb = (b.status || '').toLowerCase();
        if (sa < sb) return -1 * dir;
        if (sa > sb) return 1 * dir;
        return 0;
    });

    // Filtered & sorted list from the unscoped fullGoals cache (when available)
    const sortedAndFilteredFullGoals = (fullGoals || []).filter(goalMatchesFilters).sort((a, b) => {
        const dir = sortDirection === 'asc' ? 1 : -1;
        if (sortBy === 'date') {
            return dir * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        }
        if (sortBy === 'category') {
            const ca = (a.category || '').toLowerCase();
            const cb = (b.category || '').toLowerCase();
            if (ca < cb) return -1 * dir;
            if (ca > cb) return 1 * dir;
            return 0;
        }
        const sa = (a.status || '').toLowerCase();
        const sb = (b.status || '').toLowerCase();
        if (sa < sb) return -1 * dir;
        if (sa > sb) return 1 * dir;
        return 0;
    });

    // Compute visible IDs depending on viewMode (kanban wants all-goals filtering)
    const visibleGoalIds = useMemo(() => {
        let list: Goal[];
        if (viewMode === 'kanban') {
            if (showAllInKanban) {
                list = sortedAndFilteredFullGoals;
            } else {
                // When not showing all in kanban, respect the current page/scope
                // so the board displays only goals in the selected page.
                list = sortedAndFilteredGoals;
            }
        } else {
            list = sortedAndFilteredGoals;
        }
        return new Set(list.map((g) => g.id));
    }, [viewMode, showAllInKanban, sortedAndFilteredFullGoals, sortedAndFilteredAllGoals, sortedAndFilteredGoals]);

    // Add a function to highlight filtered words
//   const applyHighlight = (text: string, filter: string) => {
//     if (!filter) return text;
//     // Escape special characters in the filter string
//     const escapedFilter = filter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
//     const regex = new RegExp(`(${escapedFilter})`, 'gi');
//     return text.replace(regex, '<span class="bg-brand-10 text-brand-90 inline-block">$1</span>');
//   };

    // Use shared HTML-producing highlight helper and render via dangerouslySetInnerHTML
    const renderHTML = (text?: string | null) => ({ __html: applyHighlight(text ?? '', filter) });

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
                                    const persistedForOld = currentPage || pageByScopeRef.current[scope];
                                    const next = { ...pageByScopeRef.current, [scope]: persistedForOld };
                                    setPageByScope(next);
                                    pageByScopeRef.current = next;
                                    try { savePageByScope(next); } catch { /* ignore */ }

                                    // Compute a tentative page for the new scope so the UI doesn't flip to a default.
                                    // - week (YYYY-MM-DD) -> month (YYYY-MM)
                                    // - month (YYYY-MM) -> week (YYYY-MM-01) as a reasonable anchor
                                    // - preserve year where possible
                                    let tentative: string | undefined = pageByScopeRef.current[s];
                                    if (!tentative) {
                                        if (s === 'month') {
                                            if (currentPage && /^\d{4}-\d{2}-\d{2}$/.test(currentPage)) {
                                                tentative = currentPage.slice(0, 7); // YYYY-MM
                                            } else if (currentPage && /^\d{4}-\d{2}$/.test(currentPage)) {
                                                tentative = currentPage;
                                            }
                                        } else if (s === 'week') {
                                            if (currentPage && /^\d{4}-\d{2}$/.test(currentPage)) {
                                                tentative = `${currentPage}-01`; // first day of month as anchor week page
                                            } else if (currentPage && /^\d{4}-\d{2}-\d{2}$/.test(currentPage)) {
                                                tentative = currentPage;
                                            }
                                        } else if (s === 'year') {
                                            if (currentPage && /^\d{4}-\d{2}-\d{2}$/.test(currentPage)) tentative = currentPage.slice(0, 4);
                                            else if (currentPage && /^\d{4}-\d{2}$/.test(currentPage)) tentative = currentPage.slice(0, 4);
                                        }
                                    }

                                    if (tentative) {
                                        setCurrentPage(tentative);
                                        currentPageRef.current = tentative;
                                    }

                                                                        // Record which scope we're switching from so the next fetch can map correctly
                                                                        try {
                                                                            // debug removed in production
                                                                        } catch { /* ignore */ }

                                                                        console.debug('[AllGoals] scope switch requested', { from: scope, to: s, lastSwitchFromRef: lastSwitchFromRef.current });
                                                                                                            // We're about to switch scope; enter a short 'loading'
                                                                                                            // mode so views like Kanban don't read stale indexed data
                                                                                                            // while the new scoped fetch is in-flight.
                                                                                                            setIsScopeLoading(true);
                                                                                                            setIndexedGoals({});
                                                                                                            setPages([]);
                                                                                                            setCurrentPage('');
                                                                                                            currentPageRef.current = '';
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
                 {/* View mode toggle */}

                    <ToggleButtonGroup
                        value={viewMode}
                        exclusive
                        onChange={handleChangeView}
                        size="small"
                        aria-label="View mode"
                        className=""
                    >
                        <Tooltip title="View grid" placement="top" arrow><ToggleButton value="cards" aria-label="Cards view"><LayoutGrid /></ToggleButton></Tooltip>
                        <Tooltip title="View table" placement="top" arrow><ToggleButton value="table" aria-label="Table view"><Table2Icon /></ToggleButton></Tooltip>
                        <Tooltip title="View kanban board" placement="top" arrow><ToggleButton value="kanban" aria-label="Kanban view"><Kanban /></ToggleButton></Tooltip>
                    </ToggleButtonGroup>
                    {/* Kanban toggle: show all vs scope-only */}
                    {viewMode === 'kanban' && (
                        <FormControlLabel
                            control={<Switch checked={showAllInKanban} onChange={(_, v) => { console.debug('[AllGoals] Kanban switch toggled ->', v); setShowAllInKanban(v); }} size="small" />}
                            label={showAllInKanban ? 'All' : 'Scope'}
                            className="ml-2"
                        />
                    )}
                {/* Filter and Sort Controls */}
                <div className="mt-4 h-10 flex items-center space-x-2">
                    
                    {/* Filter button + MUI TextField replacement for filter input */}
                    <>
                    <Tooltip title="Open filters" placement="top" arrow>
                    <span>
                    <Badge badgeContent={selectedFiltersCount} color="primary" invisible={selectedFiltersCount === 0}>
                        <IconButton
                            className="btn-ghost mr-2"
                            size="small"
                            aria-label={`Open filters${selectedFiltersCount > 0 ? ` (${selectedFiltersCount} active)` : ''}`}
                            onClick={(e) => setFilterAnchorEl(e.currentTarget)}
                        >
                            <FilterIcon className="w-4 h-4" />
                        </IconButton>
                    </Badge>
                    </span>
                    </Tooltip>
                    <Popover
                        open={Boolean(filterAnchorEl)}
                        anchorEl={filterAnchorEl}
                        onClose={() => setFilterAnchorEl(null)}
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                    >
                        <Box sx={{ p: 2, width: 280, bgcolor: theme.palette.mode === 'dark' ? 'grey.900' : 'grey.100' }}>
                            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                                <InputLabel id="filter-status-label">Status</InputLabel>
                                    <Select
                                        labelId="filter-status-label"
                                        multiple
                                        value={filterStatus}
                                        label="Status"
                                        onChange={(e) => {
                                            const val = (e.target as HTMLInputElement).value;
                                            setFilterStatus(typeof val === 'string' ? val.split(',') : (val as string[]));
                                        }}
                                        renderValue={(selected) => (selected as string[]).join(', ')}
                                    >
                                        <MenuItem value="">
                                            <ListItemText primary="Any" />
                                        </MenuItem>
                                        {statusOptions.map((s) => (
                                            <MenuItem key={s} value={s}>
                                                <Checkbox size="small" checked={(filterStatus || []).indexOf(s) > -1} />
                                                <ListItemText primary={s} />
                                            </MenuItem>
                                        ))}
                                    </Select>
                            </FormControl>
                            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                                <InputLabel id="filter-category-label">Category</InputLabel>
                                    <Select
                                        labelId="filter-category-label"
                                        multiple
                                        value={filterCategory}
                                        label="Category"
                                        onChange={(e) => {
                                            const val = (e.target as HTMLInputElement).value;
                                            setFilterCategory(typeof val === 'string' ? val.split(',') : (val as string[]));
                                        }}
                                        renderValue={(selected) => (selected as string[]).join(', ')}
                                    >
                                        <MenuItem value="">
                                            <ListItemText primary="Any" />
                                        </MenuItem>
                                        {categoryOptions.map((c) => (
                                            <MenuItem key={c} value={c}>
                                                <Checkbox size="small" checked={(filterCategory || []).indexOf(c) > -1} />
                                                <ListItemText primary={c} />
                                            </MenuItem>
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
                                        setFilterStatus([]);
                                        setFilterCategory([]);
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
                                    Done
                                </button>
                            </div>
                        </Box>
                    </Popover>
                    </>
                   
                    {/* Selected filter tags (status, category, date range) */}
                    <div className="hidden sm:flex items-center space-x-2 ml-2">
                        {selectedFiltersCount >= 4 ? (
                            <>
                                <Chip
                                    label={`${selectedFiltersCount} filters`}
                                    size="small"
                                    onClick={(e) => setSummaryAnchorEl(e.currentTarget)}
                                    className="gap-2 bg-gray-30 dark:bg-gray-70 text-gray-70 dark:text-gray-30 cursor-pointer"
                                />
                                <Menu
                                    anchorEl={summaryAnchorEl}
                                    open={Boolean(summaryAnchorEl)}
                                    onClose={() => setSummaryAnchorEl(null)}
                                    anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                                    transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                                    PaperProps={{ sx: { bgcolor: theme.palette.mode === 'dark' ? 'grey.900' : 'grey.100', p: 1 } }}
                                >
                                    {/* build combined list of filters */}
                                    {[
                                        ...((filterStatus || []).map((s) => ({ key: `status:${s}`, type: 'status' as const, label: `Status: ${s}`, value: s }))),
                                        ...((filterCategory || []).map((c) => ({ key: `category:${c}`, type: 'category' as const, label: `Category: ${c}`, value: c }))),
                                        ...(filterStartDate && filterEndDate ? [{ key: 'range', type: 'range' as const, label: `Range: ${filterStartDate.format('YYYY-MM-DD')} → ${filterEndDate.format('YYYY-MM-DD')}`, value: `${filterStartDate.format('YYYY-MM-DD')}|${filterEndDate.format('YYYY-MM-DD')}` }] : []),
                                        ...(filter && filter.trim() ? [{ key: 'text', type: 'text' as const, label: `Search: ${filter}`, value: filter }] : []),
                                    ].map((item) => (
                                        <MenuItem
                                            key={item.key}
                                            onClick={() => {
                                                // deselect individual
                                                if (item.type === 'status') setFilterStatus((prev) => (prev || []).filter((v) => v !== item.value));
                                                else if (item.type === 'category') setFilterCategory((prev) => (prev || []).filter((v) => v !== item.value));
                                                else if (item.type === 'range') { setFilterStartDate(null); setFilterEndDate(null); }
                                                else if (item.type === 'text') { setFilter(''); }
                                            }}
                                        >
                                            <Checkbox size="small" checked={true} />
                                            <ListItemText primary={item.label} />
                                        </MenuItem>
                                    ))}
                                </Menu>
                                {/* Ghost clear-all button next to summary chip */}
                                
                                <button
                                    type="button"
                                    className="btn-ghost ml-1"
                                    title="Clear all filters"
                                    onClick={() => {
                                        setFilter('');
                                        setFilterStatus([]);
                                        setFilterCategory([]);
                                        setFilterStartDate(null);
                                        setFilterEndDate(null);
                                        filterInputRef.current?.focus();
                                    }}
                                >
                                    <Tooltip title="Clear all filters" placement="top" arrow>
                                        <CloseButton className="w-4 h-4" />
                                    </Tooltip>
                                </button>
                            </>
                        ) : (
                            <>
                                {filterStatus && filterStatus.length > 0 && (
                                    filterStatus.map((s) => (
                                        <Chip
                                            key={`status-${s}`}
                                            label={`Status: ${s}`}
                                            size="small"
                                            onDelete={() => setFilterStatus((prev) => (prev || []).filter((v) => v !== s))}
                                            deleteIcon={<Tooltip title="Remove filter" placement='top' arrow><CloseButton className="btn-ghost block ml-2 w-3 h-3 stroke-gray-90 dark:stroke-gray-10 " /></Tooltip>}
                                            className="gap-2 bg-gray-30 dark:bg-gray-70 text-gray-70 dark:text-gray-30"
                                        />
                                    ))
                                )}
                                {filterCategory && filterCategory.length > 0 && (
                                    filterCategory.map((c) => (
                                        <Chip
                                            key={`cat-${c}`}
                                            label={`Category: ${c}`}
                                            size="small"
                                            onDelete={() => setFilterCategory((prev) => (prev || []).filter((v) => v !== c))}
                                            deleteIcon={<Tooltip title="Remove filter" placement='top' arrow><CloseButton className="btn-ghost block ml-2 w-3 h-3 stroke-gray-90 dark:stroke-gray-10 " /></Tooltip>}
                                            className="gap-2 bg-gray-30 dark:bg-gray-70 text-gray-70 dark:text-gray-30"
                                        />
                                    ))
                                )}
                                {filterStartDate && filterEndDate && (
                                    <Chip
                                        label={`Range: ${filterStartDate?.format('YYYY-MM-DD')} → ${filterEndDate?.format('YYYY-MM-DD')}`}
                                        size="small"
                                        onDelete={() => { setFilterStartDate(null); setFilterEndDate(null); }}
                                        deleteIcon={<Tooltip title="Remove filter" placement='top' arrow><CloseButton className="btn-ghost block ml-2 w-3 h-3 stroke-gray-90 dark:stroke-gray-10 " /></Tooltip>}
                                        className="gap-2 bg-gray-30 dark:bg-gray-70 text-gray-70 dark:text-gray-30"
                                    />
                                )}
                                {/* Ghost clear-all button */}
                                {selectedFiltersCount > 0 && (
                                <button
                                    type="button"
                                    className="btn-ghost ml-1"
                                    title="Clear all filters"
                                    onClick={() => {
                                        setFilter('');
                                        setFilterStatus([]);
                                        setFilterCategory([]);
                                        setFilterStartDate(null);
                                        setFilterEndDate(null);
                                        filterInputRef.current?.focus();
                                    }}
                                    >
                                    <Tooltip title="Clear all filters" placement='top' arrow>
                                        <CloseButton className="w-4 h-4" />
                                    </Tooltip>
                                </button>
                                )}
                            </>
                        )}
                    </div>

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
                {viewMode === 'cards' && (
                    <>
                    <Tooltip title={`Sort: ${sortBy.charAt(0).toUpperCase() + sortBy.slice(1)} (${sortDirection === 'asc' ? 'ascending' : 'descending'})`} placement="top" arrow>
                        <span className="flex items-center space-x-2">
                            <IconButton
                                onClick={(e) => setSortAnchorEl(e.currentTarget)}
                                className="btn-ghost px-3 py-2"
                                aria-label={`Sort: ${sortBy} ${sortDirection === 'asc' ? 'ascending' : 'descending'}`}
                                aria-controls={sortAnchorEl ? 'sort-menu' : undefined}
                                aria-haspopup="true"
                                aria-expanded={sortAnchorEl ? 'true' : undefined}
                            >
                                {/* Visible sort label to indicate active sort field and direction */}
                                <span className="hidden sm:flex items-center space-x-3 text-gray-70 dark:text-gray-30">
                                    {sortBy === 'date' && ( 
                                        <span role="img" aria-label="Sort by date" title="Sort by date" className='text-brand-60 dark:text-brand-20'>
                                        <CalendarIcon className="w-4 h-4" />
                                    </span>
                                    )}
                                    {sortBy === 'status' && ( 
                                        <span role="img" aria-label="Sort by status" title="Sort by status" className='text-brand-60 dark:text-brand-20'>
                                        <Check className="w-4 h-4" />
                                    </span>
                                    )}
                                    {sortBy === 'category' && ( 
                                        <span role="img" aria-label="Sort by category" title="Sort by category" className='text-brand-60 dark:text-brand-20'>
                                        <TagIcon className="w-4 h-4" />
                                    </span>
                                    )}
                                </span>
                                {sortDirection === 'desc' ? <ArrowDown className='w-5 h-5' /> : <ArrowUp className='w-5 h-5' />}
                            </IconButton>
                        </span>
                    </Tooltip>
                    <Menu
                        id="sort-menu"
                        anchorEl={sortAnchorEl}
                        open={Boolean(sortAnchorEl)}
                        onClose={() => setSortAnchorEl(null)}
                        MenuListProps={{ 'aria-labelledby': 'sort-button' }}
                    >
                        <MenuItem
                            selected={sortBy === 'date' && sortDirection === 'asc'}
                            onClick={() => { setSortBy('date'); setSortDirection('asc'); setSortAnchorEl(null); }}
                        >
                            <CalendarIcon className="w-4 h-4" /><ArrowUp className="w-4 h-4 mr-8" /> Date Ascending 
                        </MenuItem>
                        <MenuItem
                            selected={sortBy === 'date' && sortDirection === 'desc'}
                            onClick={() => { setSortBy('date'); setSortDirection('desc'); setSortAnchorEl(null); }}
                        >
                            <CalendarIcon className="w-4 h-4" /><ArrowDown className="w-4 h-4 mr-8" /> Date Descending 
                        </MenuItem>
                        <MenuItem
                            selected={sortBy === 'category' && sortDirection === 'asc'}
                            onClick={() => { setSortBy('category'); setSortDirection('asc'); setSortAnchorEl(null); }}
                        >
                            <TagIcon className="w-4 h-4" /><ArrowUp className="w-4 h-4 mr-8" /> Category Ascending 
                        </MenuItem>
                        <MenuItem
                            selected={sortBy === 'category' && sortDirection === 'desc'}
                            onClick={() => { setSortBy('category'); setSortDirection('desc'); setSortAnchorEl(null); }}
                        >
                            <TagIcon className="w-4 h-4" /><ArrowDown className="w-4 h-4 mr-8" /> Category Descending 
                        </MenuItem>
                        <MenuItem
                            selected={sortBy === 'status' && sortDirection === 'asc'}
                            onClick={() => { setSortBy('status'); setSortDirection('asc'); setSortAnchorEl(null); }}
                        >
                            <Check className="w-4 h-4" /><ArrowUp className="w-4 h-4 mr-8" /> Status Ascending 
                        </MenuItem>
                        <MenuItem
                            selected={sortBy === 'status' && sortDirection === 'desc'}
                            onClick={() => { setSortBy('status'); setSortDirection('desc'); setSortAnchorEl(null); }}
                        >
                            <Check className="w-4 h-4" /><ArrowDown className="w-4 h-4 mr-8" /> Status Descending 
                        </MenuItem>
                    </Menu>
                    </>
                )}                  

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

                {/* Goals List - render by viewMode */}
                {viewMode === 'cards' && (
                    <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 3xl:grid-cols-5 gap-4 w-full'>
                        {sortedAndFilteredGoals.map((goal) => (
                        <GoalCard
                            key={goal.id}
                            goal={goal}
                            handleDelete={(goalId) => handleDeleteGoal(goalId)}
                            handleEdit={(goalId) => {
                                const goalToEdit = indexedGoals[currentPage]?.find((g) => g.id === goalId);
                                if (goalToEdit) {
                                    setSelectedGoal(goalToEdit);
                                    setIsEditorOpen(true);
                                }
                            }}
                            filter={filter}
                        />
                        ))}
                    </div>
                )}

                {viewMode === 'table' && (
                    <Paper elevation={0} className="w-full">
                        <Table>
                            <TableHead>
                                <TableRow>
                                        <TableCell>
                                            Title
                                        </TableCell>
                                        <TableCell onClick={() => toggleSort('category')} style={{ cursor: 'pointer' }}>
                                            <span className="flex items-center">
                                                Category
                                                {sortBy === 'category' && (sortDirection === 'asc' ? <ArrowUp className="w-4 h-4 ml-2" /> : <ArrowDown className="w-4 h-4 ml-2" />)}
                                            </span>
                                        </TableCell>
                                        
                                            <TableCell onClick={() => toggleSort('status')} style={{ cursor: 'pointer' }}>
                                                <span className="flex items-center">
                                                    Status
                                                    {sortBy === 'status' && (sortDirection === 'asc' ? <ArrowUp className="w-4 h-4 ml-2" /> : <ArrowDown className="w-4 h-4 ml-2" />)}
                                                </span>
                                            </TableCell>
                                        
                                        <TableCell onClick={() => toggleSort('date')} style={{ cursor: 'pointer' }}>
                                            <span className="flex items-center">
                                                Week
                                                {sortBy === 'date' && (sortDirection === 'asc' ? <ArrowUp className="w-4 h-4 ml-2" /> : <ArrowDown className="w-4 h-4 ml-2" />)}
                                            </span>
                                        </TableCell>
                                        <TableCell>Actions</TableCell>
                                    </TableRow>
                            </TableHead>
                            <TableBody>
                                {sortedAndFilteredGoals.map((goal) => (
                                    <TableRow key={goal.id}>
                                        <TableCell>
                                            <Typography variant="body1"><span dangerouslySetInnerHTML={renderHTML(goal.title)} /></Typography>
                                            {/* <Typography variant="body2" className="text-gray-500"><span dangerouslySetInnerHTML={renderHTML(goal.description)} /></Typography> */}
                                            <Typography variant="body2" className="text-gray-500">
                                                <span dangerouslySetInnerHTML={renderHTML(((goal.description || '').substring(0, 100) + ((goal.description || '').length > 200 ? '...' : '')))} />
                                            </Typography>
                                        </TableCell>
                                        
                                        <TableCell>
                                            <span className='card-category text-nowrap' dangerouslySetInnerHTML={renderHTML(goal.category)} /></TableCell>
                                        <TableCell>
                                            <InlineStatus goal={goal} onUpdated={() => refreshGoals().then(() => {})} />
                                        </TableCell>
                                        <TableCell><span className='text-xs' dangerouslySetInnerHTML={renderHTML(goal.week_start)} /></TableCell>
                                        <TableCell>
                                            <div className="flex gap-0 items-center">
                                            <IconButton className='btn-ghost' size="small" onClick={() => { setSelectedGoal(goal); setIsEditorOpen(true); }}><Edit /></IconButton>
                                            <IconButton className='btn-ghost' size="small" onClick={() => handleDeleteGoal(goal.id)}><Trash /></IconButton>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Paper>
                )}

                            {viewMode === 'kanban' && (
                                <div className="flex flex-col mt-2 md:flex-row gap-4 w-full">
                                    {isScopeLoading ? (
                                        <div className="w-full flex items-center justify-center p-8">
                                            <div className="flex items-center space-x-3">
                                                <CircularProgress size={20} />
                                                <span className="text-sm text-gray-600 dark:text-gray-300">Loading scope…</span>
                                            </div>
                                        </div>
                                    ) : (
                                    ['Not started', 'In progress', 'Blocked', 'On hold', 'Done'].map((status) => {
                                        const allIds = kanbanColumns[status] || [];
                                        const visibleIds = allIds.filter((id) => visibleGoalIds.has(id));
                                        const hiddenCount = allIds.length - visibleIds.length;
                                        const isCollapsed = !!collapsedColumns[status];

                                        return (
                                            <div
                                                key={status}
                                                className="flex-1 border border-gray-30 dark:border-gray-70 bg-gray-0 dark:bg-gray-100 p-3 rounded-md"
                                                onDragOver={(e) => handleDragOver(e, status)}
                                                onDrop={(e) => handleDrop(e, status)}
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <h3 className="font-semibold">{status}</h3>
                                                    <div className="flex items-center space-x-2">
                                                        {hiddenCount > 0 && (
                                                            <span className="text-sm text-gray-500 dark:text-gray-300">{hiddenCount} hidden</span>
                                                        )}
                                                        <button
                                                            aria-label={`${isCollapsed ? 'Expand' : 'Collapse'} ${status} column`}
                                                            onClick={() => setCollapsedColumns((prev) => ({ ...prev, [status]: !prev[status] }))}
                                                            className="btn-ghost p-1"
                                                        >
                                                            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                                                        </button>
                                                    </div>
                                                </div>

                                                {!isCollapsed && (
                                                    <div className="space-y-3">
                                                        {visibleIds.map((id, _idx) => {
                                                            // When showing all in kanban, prefer the `fullGoals` cache
                                                            // which contains unscoped results from the server. When
                                                            // showAllInKanban is false, fall back to the scoped
                                                            // `indexedGoals` map.
                                                            const goal = (showAllInKanban ? (fullGoals || []) : Object.values(indexedGoals).flat()).find((g) => g.id === id) as Goal | undefined;
                                                            if (!goal) return null;
                                                            return (
                                                                <div key={id} className={`${cardClasses} kanban-card p-2 bg-gray-10 dark:bg-gray-90 rounded shadow-md`} draggable onDragStart={(e) => handleDragStart(e, id)}>
                                                                    <div className="flex flex-col justify-between items-start">
                                                                        <div>
                                                                                <div className="font-medium"><span dangerouslySetInnerHTML={renderHTML(goal.title)} /></div>
                                                                                <div className="card-category text-nowrap"><span dangerouslySetInnerHTML={renderHTML(goal.category)} /></div>
                                                                        </div>
                                                                        <div className="flex flex-row items-end">
                                                                            <button onClick={() => { setSelectedGoal(goal); setIsEditorOpen(true); }} className="text-sm btn-ghost"><Edit /></button>
                                                                            <button onClick={() => handleDeleteGoal(goal.id)} className="text-sm btn-ghost"><Trash /></button>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}

                                                        {dragOverColumn === status && dragOverIndex === visibleIds.length && (
                                                            <div className="p-4 border border-dashed rounded bg-transparent">&nbsp;</div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                    )}
                                </div>
                            )}
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
            {/* </div> */}

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
                                        categories={UserCategories.map((cat: unknown) => typeof cat === 'string' ? (cat as string) : ((cat as { name?: string })?.name || ''))}
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
                            onSave={async (updatedDescription: string, updatedTitle: string, updatedCategory: string, updatedWeekStart: string, status?: string, status_notes?: string) => {
                                try {
                                    if (selectedGoal) {
                                        // Narrow status to the allowed Goal['status'] union safely
                                        const allowedStatuses = ['Not started', 'In progress', 'Blocked', 'Done', 'On hold'] as const;
                                        let narrowedStatus: Goal['status'] | undefined;
                                        if (typeof status === 'string' && (allowedStatuses as readonly string[]).includes(status)) {
                                            narrowedStatus = status as Goal['status'];
                                        }

                                        // compute final status ensuring it matches Goal['status'] union
                                        let finalStatus: Goal['status'] | undefined;
                                        if (narrowedStatus) {
                                            finalStatus = narrowedStatus;
                                        } else if (typeof selectedGoal.status === 'string' && (allowedStatuses as readonly string[]).includes(selectedGoal.status)) {
                                            finalStatus = selectedGoal.status as Goal['status'];
                                        } else {
                                            finalStatus = undefined;
                                        }

                                        await handleUpdateGoal(selectedGoal.id, {
                                            id: selectedGoal.id,
                                            user_id: selectedGoal.user_id,
                                            created_at: selectedGoal.created_at,
                                            title: updatedTitle,
                                            description: updatedDescription,
                                            category: updatedCategory,
                                            week_start: updatedWeekStart,
                                            status: finalStatus,
                                            status_notes: status_notes ?? selectedGoal?.status_notes,
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
    </div>
  );
};

export default GoalsComponent;
