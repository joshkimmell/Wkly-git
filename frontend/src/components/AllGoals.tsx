import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { fetchAllGoalsIndexed, fetchAllGoals, deleteGoal, updateGoal, saveSummary, UserCategories, initializeUserCategories, addCategory, getWeekStartDate, indexDataByScope, applyHighlight } from '../utils/functions';
import Pagination from '@components/Pagination';
import GoalCard from '@components/GoalCard';
import GoalKanbanCard from '@components/GoalKanbanCard';
import GoalForm from '@components/GoalForm';
import Modal from 'react-modal';
import ConfirmModal from './ConfirmModal';
import AccomplishmentsModal from './AccomplishmentsModal';
import SummaryGenerator from '@components/SummaryGenerator';
import AccomplishmentEditor from './AccomplishmentEditor';
import SummaryEditor from '@components/SummaryEditor';
import GoalEditor from '@components/GoalEditor';
import { modalClasses, overlayClasses } from '@styles/classes';
import { ARIA_HIDE_APP } from '@lib/modal';
import { Goal as GoalUtilsGoal } from '@utils/goalUtils';
import { mapPageForScope, loadPageByScope, savePageByScope } from '@utils/pagination';
import 'react-datepicker/dist/react-datepicker.css';
// import * as goalUtils from '@utils/goalUtils';
import 'react-datepicker/dist/react-datepicker.css';
import { X as CloseButton, Search as SearchIcon, Filter as FilterIcon, PlusIcon, ArrowUp, ArrowDown, CalendarIcon, Check, TagIcon, Table2Icon, LayoutGrid, Kanban, Eye, Edit, Trash, EyeOff, ChevronRight, Award, FileText as NotesIcon, Save as SaveIcon, CheckSquare2, SquareSlash } from 'lucide-react';
import { useGoalsContext } from '@context/GoalsContext';
import useGoalExtras from '@hooks/useGoalExtras';
// notify helpers imported where needed below
import { TextField, InputAdornment, IconButton, Popover, Box, FormControl, FormGroup, FormLabel, InputLabel, Select, MenuItem, Tooltip, Menu, Chip, Badge, Checkbox, ListItemText, ToggleButtonGroup, ToggleButton, Table, TableHead, TableBody, TableRow, TableCell, Paper, Typography, Switch, FormControlLabel, useMediaQuery } from '@mui/material';
// dnd-kit was attempted but failed to install; use HTML5 drag/drop fallback
import { useTheme } from '@mui/material/styles';
import supabase from '@lib/supabase';
import { STATUSES, STATUS_COLORS, type Status } from '../constants/statuses';
import { notifyError, notifySuccess } from '@components/ToastyNotification';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import type { Dayjs } from 'dayjs';
import type { ChangeEvent } from 'react';
import LoadingSpinner from './LoadingSpinner';
// import { Tab } from '@headlessui/react';
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
                onClick={(e) => setStatusAnchorEl(e.currentTarget)}
                variant='outlined'
                sx={
                    localStatus === 'Not started'
                        ? { borderColor: statusColors[localStatus || 'Not started'], color: statusColors[localStatus || 'Not started'] }
                        : { bgcolor: statusColors[localStatus || 'Not started'], color: '#fff' }
                }
                className="cursor-pointer text-sm font-medium card-status"
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
    const toggleSort = (field: 'date' | 'category' | 'status' | 'title') => {
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
    const [sortBy, setSortBy] = useState<'date' | 'category' | 'status' | 'title'>('date');
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
    } | null>(null);
    const [filter, setFilter] = useState<string>('');
    const [filterFocused, setFilterFocused] = useState<boolean>(false);
    const [clearButtonFocused, setClearButtonFocused] = useState<boolean>(false);
    // Per-row actions menu state (used in table view)
    const [rowActionsAnchorEl, setRowActionsAnchorEl] = useState<HTMLElement | null>(null);
    const [rowActionsTargetId, setRowActionsTargetId] = useState<string | null>(null);
    // Delete confirm modal state
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState<boolean>(false);
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
    // shared accomplishments/notes hook
    const goalExtras = useGoalExtras();
    const {
    accomplishments,
    accomplishmentCountMap,
    isAccomplishmentLoading,
    isAccomplishmentModalOpen,
    isEditAccomplishmentModalOpen,
    selectedAccomplishment,
    setSelectedAccomplishment,
    setIsEditAccomplishmentModalOpen,
    deleteAccomplishment,
    createAccomplishment,
    saveEditedAccomplishment,
    openAccomplishments,
    closeAccomplishments,
    notes,
    notesCountMap,
    isNotesLoading,
    isNotesModalOpen,
    newNoteContent,
    setNewNoteContent,
    editingNoteId,
    setEditingNoteId,
    editingNoteContent,
    setEditingNoteContent,
        openNotes,
        closeNotes,
        createNote,
        updateNote,
        deleteNote,
        fetchNotesCount,
        fetchAccomplishmentsCount,
    } = goalExtras;
    const [selectedSummary, setSelectedSummary] = useState<{ id: string; content?: string; type?: string; title?: string } | null>(null);
    const [noteDeleteTarget, setNoteDeleteTarget] = useState<string | null>(null);
    // simple caches
    
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
    // Bulk action UI state
    const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);
    const [bulkActionLoading, setBulkActionLoading] = useState(false);
    const [bulkStatusAnchorEl, setBulkStatusAnchorEl] = useState<HTMLElement | null>(null);
    const [bulkCategoryAnchorEl, setBulkCategoryAnchorEl] = useState<HTMLElement | null>(null);
    // Fallback anchor positions (used when the clicked element isn't attached to the document)
    const [bulkStatusAnchorPos, setBulkStatusAnchorPos] = useState<{ top: number; left: number } | null>(null);
    const [bulkCategoryAnchorPos, setBulkCategoryAnchorPos] = useState<{ top: number; left: number } | null>(null);
    // Always remember the last click position so we can fallback to it if the
    // anchorEl is removed from the DOM (e.g. when switching views quickly).
    const [bulkStatusLastClickPos, setBulkStatusLastClickPos] = useState<{ top: number; left: number } | null>(null);
    const [bulkCategoryLastClickPos, setBulkCategoryLastClickPos] = useState<{ top: number; left: number } | null>(null);
    // Refs for the buttons that open the bulk menus. We restore focus to these
    // when the menu closes to avoid aria-hidden being applied while a focused
    // element remains inside the menu (which triggers accessibility warnings).
    const bulkStatusTriggerRef = useRef<HTMLButtonElement | null>(null);
    const bulkCategoryTriggerRef = useRef<HTMLButtonElement | null>(null);

    const handleCloseBulkStatus = () => {
        try { bulkStatusTriggerRef.current?.focus(); } catch (e) { /* ignore */ }
        setBulkStatusAnchorEl(null);
        setBulkStatusAnchorPos(null);
    };

    const handleCloseBulkCategory = () => {
        try { bulkCategoryTriggerRef.current?.focus(); } catch (e) { /* ignore */ }
        setBulkCategoryAnchorEl(null);
        setBulkCategoryAnchorPos(null);
    };

    // If an anchorEl becomes detached while the menu is open (happens when switching views),
    // fallback to the last click position so the menu remains visible instead of throwing MUI warnings.
    useEffect(() => {
        if (bulkStatusAnchorEl && !document.body.contains(bulkStatusAnchorEl)) {
            if (bulkStatusLastClickPos) {
                setBulkStatusAnchorPos(bulkStatusLastClickPos);
                setBulkStatusAnchorEl(null);
            }
        }
    }, [bulkStatusAnchorEl, bulkStatusLastClickPos]);

    useEffect(() => {
        if (bulkCategoryAnchorEl && !document.body.contains(bulkCategoryAnchorEl)) {
            if (bulkCategoryLastClickPos) {
                setBulkCategoryAnchorPos(bulkCategoryLastClickPos);
                setBulkCategoryAnchorEl(null);
            }
        }
    }, [bulkCategoryAnchorEl, bulkCategoryLastClickPos]);

    // Bulk action helpers
    const applyBulkStatus = async (status: string) => {
        setBulkActionLoading(true);
        try {
            const ids = Array.from(selectedIds).filter((id) => !id?.toString()?.startsWith?.('temp-'));
            if (ids.length === 0) {
                notifySuccess('No persisted goals selected');
            } else {
                // Run updates in parallel for speed; collect results so we can refresh after all complete
                const promises = ids.map((id) => updateGoal(id, { status: status as any }).then(() => ({ id, ok: true })).catch((err) => ({ id, ok: false, err })));
                const results = await Promise.all(promises);
                const successCount = results.filter((r) => r && (r as any).ok).length;
                const failCount = results.length - successCount;
                if (successCount > 0) notifySuccess(`Updated status for ${successCount} goals`);
                if (failCount > 0) notifyError(`Failed to update ${failCount} goals`);
            }
        } catch (err) {
            console.error('Bulk status update failed', err);
            notifyError('Failed to update some goals');
        } finally {
            setBulkActionLoading(false);
            setBulkStatusAnchorEl(null);
            clearSelection();
            // Ensure both the global cache and this component's indexed state are refreshed
            // Awaiting here makes the refresh consistent; keep it quick by letting the
            // context refresh run first (it may be cached) and then refetch the indexed goals.
            (async () => {
                try {
                    if (typeof ctxRefresh === 'function') await ctxRefresh();
                } catch (e) {
                    console.warn('[AllGoals] ctxRefresh after bulk status failed (ignored):', e);
                }
                try {
                    await refreshGoals();
                } catch (e) {
                    console.warn('[AllGoals] refreshGoals after bulk status failed (ignored):', e);
                }
            })();
        }
    };

    const applyBulkCategory = async (category: string) => {
        setBulkActionLoading(true);
        try {
            const ids = Array.from(selectedIds).filter((id) => !id?.toString()?.startsWith?.('temp-'));
            if (ids.length === 0) {
                notifySuccess('No persisted goals selected');
            } else {
                const promises = ids.map((id) => updateGoal(id, { category } as any).then(() => ({ id, ok: true })).catch((err) => ({ id, ok: false, err })));
                const results = await Promise.all(promises);
                const successCount = results.filter((r) => r && (r as any).ok).length;
                const failCount = results.length - successCount;
                if (successCount > 0) notifySuccess(`Updated category for ${successCount} goals`);
                if (failCount > 0) notifyError(`Failed to update ${failCount} goals`);
            }
        } catch (err) {
            console.error('Bulk category update failed', err);
            notifyError('Failed to update some goals');
        } finally {
            setBulkActionLoading(false);
            setBulkCategoryAnchorEl(null);
            clearSelection();
            (async () => {
                try {
                    if (typeof ctxRefresh === 'function') await ctxRefresh();
                } catch (e) {
                    console.warn('[AllGoals] ctxRefresh after bulk category failed (ignored):', e);
                }
                try {
                    await refreshGoals();
                } catch (e) {
                    console.warn('[AllGoals] refreshGoals after bulk category failed (ignored):', e);
                }
            })();
        }
    };



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
    const isSmall = useMediaQuery(theme.breakpoints.down('sm'));
    // const isMedium = useMediaQuery(theme.breakpoints.between('sm', 'md'));
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
    const [showAllGoals, setshowAllGoals] = useState<boolean>(() => {
        try {
            const v = localStorage.getItem('kanban_show_all');
            // Default to false to ensure pagination and scoped views render in tests
            return v === null ? false : v === 'true';
        } catch (e) { return false; }
    });

    useEffect(() => {
        try {
            console.debug('[AllGoals] showAllGoals persisted ->', showAllGoals);
            localStorage.setItem('kanban_show_all', showAllGoals ? 'true' : 'false');
        } catch {}
    }, [showAllGoals]);

    // When user turns OFF 'Show all' ensure we drop the unscoped cache so the
    // UI and effects only operate on scoped `indexedGoals`. This avoids any
    // accidental usage of stale `fullGoals` when the toggle is disabled.
    useEffect(() => {
        if (!showAllGoals) {
            console.debug('[AllGoals] showAllGoals disabled — clearing fullGoals cache');
            setFullGoals(null);
        }
    }, [showAllGoals]);

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
    // Choose whether to use the unscoped fullGoals collection depending on the
    // global 'Show all' toggle. This now applies to all views.
    const useFull = showAllGoals && !!fullGoals && fullGoals.length > 0;
    console.debug('[AllGoals] kanbanColumns effect running. useFull=', useFull, { viewMode, showAllGoals, fullGoalsCount: fullGoals ? fullGoals.length : 0, indexedPages: Object.keys(indexedGoals).length, isScopeLoading });
    // If we're loading a new scope, and the user hasn't requested "All", clear columns
    // to avoid rendering stale IDs from the previous scope.
    if (isScopeLoading && viewMode === 'kanban' && !showAllGoals) {
    setKanbanColumns((_prev) => {
            const statuses = ['Not started', 'In progress', 'Blocked', 'On hold', 'Done'];
            const empty: Record<string, string[]> = {} as Record<string, string[]>;
            for (const s of statuses) empty[s] = [];
            return empty;
        });
        return;
    }
    const sourceGoals = showAllGoals ? (fullGoals || Object.values(indexedGoals).flat()) : (indexedGoals[currentPage] || []);
        const statuses = ['Not started', 'In progress', 'Blocked', 'On hold', 'Done'];
        const cols: Record<string, string[]> = {} as Record<string, string[]>;
        for (const s of statuses) cols[s] = [];
        for (const g of sourceGoals.filter(goalMatchesFilters)) {
            const st = (g.status as string) || 'Not started';
            if (!cols[st]) cols[st] = [];
            cols[st].push(g.id);
        }
        setKanbanColumns(cols);
    }, [indexedGoals, viewMode, showAllGoals, fullGoals, currentPage, filter, filterStatus, filterCategory, filterStartDate, filterEndDate, sortBy, sortDirection]);

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
            if (viewMode !== 'kanban' || !showAllGoals) return;
            try {
                const all = await fetchAllGoals();
                if (mounted) setFullGoals(all);
            } catch (err) {
                console.error('Failed to fetch full goals for kanban:', err);
            }
        };
        load();
        return () => { mounted = false; };
    }, [viewMode, showAllGoals]);

    // HTML5 Drag & Drop Kanban handlers (visual feedback + reorder)
    const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

    const handleDragStart = (e: React.DragEvent, goalId: string) => {
        setDraggingId(goalId);
        try { e.dataTransfer?.setData('text/plain', goalId); } catch { /* ignore */ }
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
        // Prepare rollback snapshots outside try so they are available in catch
        let prevIndexedSnapshot: Record<string, Goal[]> | null = null;
        let prevFullGoals: Goal[] | null = null;
        try {
            // Snapshot current indexed and full goals so we can rollback on failure
            prevIndexedSnapshot = {};
            for (const k of Object.keys(indexedGoals)) prevIndexedSnapshot[k] = [...(indexedGoals[k] || [])];
            prevFullGoals = fullGoals ? [...fullGoals] : null;
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

            // If we're showing all goals in Kanban, make the same optimistic
            // update to the `fullGoals` cache so the board moves immediately.
            if (fullGoals) {
                setFullGoals((prev) => prev ? prev.map((g) => (g.id === id ? { ...(g as Goal), status: status as Goal['status'] } : g)) : prev);
            }
            const original = Object.values(indexedGoals).flat().find(g => g.id === id) as Goal | undefined;
            await updateGoal(id, { ...(original || { id, title: '', description: '', category: '', week_start: '', user_id: '' }), status: status as Goal['status'] });
        } catch (err) {
            // rollback optimistic updates
            try { setKanbanColumns(prevColumns); } catch (e) { /* ignore */ }
            try { if (prevIndexedSnapshot) setIndexedGoals(prevIndexedSnapshot); } catch (e) { /* ignore */ }
            try { if (prevFullGoals) setFullGoals(prevFullGoals); } catch (e) { /* ignore */ }
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
    
//
    //    try {
    
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
            if (viewMode !== 'kanban' || !showAllGoals) {
                console.debug('[AllGoals] reload skipped, viewMode or toggle not set', { viewMode, showAllGoals });
                return;
            }
            try {
                console.debug('[AllGoals] reload: fetching fullGoals (showAllGoals=true)');
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
    }, [viewMode, showAllGoals, lastUpdated, lastAddedIds]);

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
        const prevFullSnapshot = fullGoals ? [...fullGoals] : null;
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

        // Also optimistically remove from fullGoals if present (Show All mode relies on this)
        if (fullGoals) {
            setFullGoals((prev) => prev ? prev.filter((g) => g.id !== goalId) : prev);
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
            if (prevFullSnapshot) setFullGoals(prevFullSnapshot);
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
        // Snapshot for rollback
        const prevIndexedSnapshot: Record<string, Goal[]> = {};
        for (const k of Object.keys(indexedGoals)) prevIndexedSnapshot[k] = [...(indexedGoals[k] || [])];
        const prevFullSnapshot = fullGoals ? [...fullGoals] : null;
        try {
        // Optimistically update indexedGoals (scoped view)
        setIndexedGoals((prev) => {
            const copy: Record<string, Goal[]> = {};
            for (const k of Object.keys(prev)) copy[k] = [...prev[k]];
            for (const p of Object.keys(copy)) {
                const idx = copy[p].findIndex((g) => g.id === goalId);
                if (idx !== -1) {
                    copy[p][idx] = { ...copy[p][idx], ...(updatedGoal as Partial<Goal>) } as Goal;
                    break;
                }
            }
            return copy;
        });

        // Optimistically update fullGoals if present
        if (fullGoals) {
            setFullGoals((prev) => prev ? prev.map((g) => (g.id === goalId ? { ...(g as Goal), ...(updatedGoal as Partial<Goal>) } : g)) : prev);
        }

        await updateGoal(goalId, updatedGoal);
        // best-effort refresh to reconcile any server-side transforms
        try { await refreshGoals(); } catch { /* ignore */ }
        } catch (error) {
        console.error('Error updating goal:', error);
        // rollback
        try { setIndexedGoals(prevIndexedSnapshot); } catch (e) { /* ignore */ }
        try { if (prevFullSnapshot) setFullGoals(prevFullSnapshot); } catch (e) { /* ignore */ }
        notifyError('Failed to update goal.');
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
            if (viewMode !== 'kanban' || showAllGoals) {
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
    }, [currentPage, pages, viewMode, showAllGoals, isScopeLoading]);

    

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
    // If the global "Show all" toggle is enabled, present the unscoped fullGoals
    // list instead of the current page's indexed goals so the toggle applies
    // consistently across all views.
    const allIndexedFlattened = Object.values(indexedGoals).flat();
    const sortedAndFilteredGoals = useMemo(() => {
        const source = showAllGoals ? (fullGoals || allIndexedFlattened) : (indexedGoals[currentPage] || []);
        return source.filter(goalMatchesFilters).sort((a, b) => {
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
    }, [showAllGoals, fullGoals, indexedGoals, currentPage, filter, filterStatus, filterCategory, filterStartDate, filterEndDate, sortBy, sortDirection]);
    

    // Proactively fetch counts for visible goals (limit and sequential to avoid spamming)
    const visibleIdsMemo = useMemo(() => sortedAndFilteredGoals.slice(0, 10).map((g) => g.id), [sortedAndFilteredGoals]);
    useEffect(() => {
        if (!visibleIdsMemo || visibleIdsMemo.length === 0) return;
        let mounted = true;
        (async () => {
            for (const id of visibleIdsMemo) {
                if (!mounted) break;
                try {
                    // fetch notes count first, then accomplishments count
                    await fetchNotesCount(id).catch(() => null);
                } catch { /* ignore */ }
                if (!mounted) break;
                try {
                    if (fetchAccomplishmentsCount) await fetchAccomplishmentsCount(id).catch(() => null);
                } catch { /* ignore */ }
                // small delay to avoid burst (non-blocking)
                await new Promise((res) => setTimeout(res, 50));
            }
        })();
        return () => { mounted = false; };
    }, [visibleIdsMemo, fetchNotesCount, fetchAccomplishmentsCount]);

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
            if (showAllGoals) {
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
    }, [viewMode, showAllGoals, sortedAndFilteredFullGoals, sortedAndFilteredAllGoals, sortedAndFilteredGoals]);

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

    // Selection state for bulk actions
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const selectedCount = selectedIds.size;
    const visibleIdsArray = useMemo(() => Array.from(visibleGoalIds), [visibleGoalIds]);
    const toggleSelect = (id: string) => {
        setSelectedIds((prev) => {
            const copy = new Set(prev);
            if (copy.has(id)) copy.delete(id);
            else copy.add(id);
            return copy;
        });
    };
    const clearSelection = () => setSelectedIds(new Set());
    const selectAllVisible = () => setSelectedIds(new Set(visibleIdsArray));
    const deselectAll = () => setSelectedIds(new Set());

    

  return (
  
    <div className={`space-y-6`}>
        <div className="flex justify-between items-center w-full">
            {/* <h1 className="text-2xl font-bold text-gray-90 block sm:hidden">{scope.charAt(0).toUpperCase() + scope.slice(1)}ly goals</h1> */}
            <h1 className="mt-4 block sm:hidden">Goals</h1>
        </div>

        
        <div className="flex justify-between items-start sm:items-center w-full mb-4">
            <div className='flex flex-col'>
                
                
                <FormControl component="fieldset" variant="standard" className="ml-2">
                    <FormLabel component="legend" className="sr-only">Goal view options</FormLabel>
                    <FormGroup row>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={showAllGoals}
                                    onChange={(_, v) => { console.debug('[AllGoals] Kanban switch toggled ->', v); setshowAllGoals(v); }}
                                    size="small"
                                    color='primary'
                                />
                            }
                            label={'All goals'}
                            className="ml-0 text-sm h-16"
                            
                        />

                        {!showAllGoals && (
                            <div className='flex space-x-2'>
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
                        )}
                    </FormGroup>
                </FormControl>
                {/* Pagination */}
                {!showAllGoals && (
                <Pagination
                    pages={pages}
                    currentPage={currentPage}
                    onPageChange={handlePageChange}
                    scope={scope}
                />
                )}
                
            </div>
            <div className="flex space-x-2 items-center">
            </div>
        </div>
        <div className='flex flex-col 2xl:flex-row 2xl:space-x-8 items-start justify-start w-full mb-4'>
            <div id="allGoals" className="flex flex-col gap-4 w-full">
                <div className="flex flex-row items-center gap-4 space-x-4">
                 {/* View mode toggle */}

                    <ToggleButtonGroup
                        value={viewMode}
                        exclusive
                        onChange={handleChangeView}
                        size="small"
                        aria-label="View mode"
                        className=""
                    >
                        <Tooltip title="View grid" placement="top" arrow><ToggleButton value="cards" aria-label="Cards view" className='btn-ghost'><LayoutGrid /></ToggleButton></Tooltip>
                        { !isSmall && (
                        <Tooltip title="View table" placement="top" arrow><ToggleButton value="table" aria-label="Table view" className='btn-ghost'><Table2Icon /></ToggleButton></Tooltip>
                        )}
                        <Tooltip title="View kanban board" placement="top" arrow><ToggleButton value="kanban" aria-label="Kanban view" className='btn-ghost'><Kanban /></ToggleButton></Tooltip>
                    </ToggleButtonGroup>
                    {/* Scope Selector */}
                
                </div>
                    
                {/* Filter and Sort Controls */}
                <div className="relative mt-4 h-10 flex items-center space-x-2">
                    
                    {/* Filter button + MUI TextField replacement for filter input */}
                    <>
                        <Tooltip title="Open filters" placement="top" arrow>
                        <span>
                        <Badge badgeContent={selectedFiltersCount} color="primary" invisible={selectedFiltersCount === 0}>
                                        {/* <Button
                                            aria-label={
                                                selectedIds.size > 0 ? `Set category (${selectedIds.size})` : 'Set category'
                                            }
                                            onClick={(e) => {
                                                setBulkCategoryAnchorEl(e.currentTarget);
                                                setBulkCategoryAnchorPos(undefined);
                                                setBulkCategoryLastClickPos({ x: e.clientX, y: e.clientY });
                                            }}
                                            {...(process.env.NODE_ENV === 'test' ? { 'data-testid': 'bulk-set-category-btn' } : {})}
                                        >
                                            <TagIcon />
                                        </Button> */}
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
                                {(showAllGoals || scope === 'year') && (
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
                    {/* Floating compact bulk toolbar - appears at bottom-right on all views when items are selected */}
                    <div className="selectAll">
                        {viewMode !== 'table' && (
                            <>
                        <div className={`floating-bulk${selectedCount > 0 ? '-toolbar flex-row align-start justify-start items-start sm:flex-row' : ''}`} role="toolbar" aria-label="Bulk actions">
                            <Tooltip title={selectedCount === visibleIdsArray.length ? 'Deselect all' : 'Select all'} placement="top" arrow>
                                <Badge badgeContent={selectedCount} color="primary">
                                    <span className="sr-only">{selectedCount} selected</span>
                                    <button
                                        className={`btn-ghost fb-btn ${selectedCount > 0 ? 'dark:[&>.lucide]:stroke-brand-30 [&>.lucide]:stroke-brand-70' : ''}`}
                                        onClick={() => { if (selectedCount === visibleIdsArray.length) deselectAll(); else selectAllVisible(); }}
                                        aria-label={selectedCount === visibleIdsArray.length ? 'Deselect all' : 'Select all'}
                                    >
                                        {selectedCount === visibleIdsArray.length ? <SquareSlash /> : <CheckSquare2 />}
                                    </button>
                                </Badge>
                            </Tooltip>
                            {selectedCount > 0 && (
                                
                                    <div className="flex flex-col items-start justify-start sm:flex-row ">
                                        <button className="btn-ghost fb-btn" onClick={() => setIsBulkDeleteConfirmOpen(true)} disabled={bulkActionLoading} title="Delete selected" aria-label="Delete selected">Delete</button>
                                        <button
                                            className="btn-ghost fb-btn"
                                            onClick={(e) => {
                                                const el = e.currentTarget as HTMLElement;
                                                // if element is not attached to document, record click coords as fallback
                                                const pos = { top: e.clientY, left: e.clientX };
                                                setBulkStatusLastClickPos(pos);
                                                if (!document.body.contains(el)) {
                                                    setBulkStatusAnchorPos(pos);
                                                    setBulkStatusAnchorEl(null);
                                                } else {
                                                    setBulkStatusAnchorEl(el);
                                                    setBulkStatusAnchorPos(null);
                                                }
                                            }}
                                            disabled={bulkActionLoading}
                                            title="Set status"
                                            aria-label="Set status"
                                            ref={bulkStatusTriggerRef}
                                        >
                                            Status
                                        </button>
                                        <button
                                            className="btn-ghost fb-btn"
                                            onClick={(e) => {
                                                const el = e.currentTarget as HTMLElement;
                                                const pos = { top: e.clientY, left: e.clientX };
                                                setBulkCategoryLastClickPos(pos);
                                                if (!document.body.contains(el)) {
                                                    setBulkCategoryAnchorPos(pos);
                                                    setBulkCategoryAnchorEl(null);
                                                } else {
                                                    setBulkCategoryAnchorEl(el);
                                                    setBulkCategoryAnchorPos(null);
                                                }
                                            }}
                                            disabled={bulkActionLoading}
                                            title="Set category"
                                            aria-label="Set category"
                                            ref={bulkCategoryTriggerRef}
                                        >
                                            Category
                                        </button>
                                    </div>
                                
                            )}
                        {/* Bulk status menu */}
                           <span>
                            <Menu
                                id="bulk-status-menu"
                                anchorEl={bulkStatusAnchorEl}
                                open={Boolean(bulkStatusAnchorEl) || Boolean(bulkStatusAnchorPos)}
                                onClose={handleCloseBulkStatus}
                                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                                anchorReference={bulkStatusAnchorPos ? 'anchorPosition' : 'anchorEl'}
                                anchorPosition={bulkStatusAnchorPos ? { top: Math.round(bulkStatusAnchorPos.top), left: Math.round(bulkStatusAnchorPos.left) } : undefined}
                                PaperProps={{ sx: { bgcolor: theme.palette.mode === 'dark' ? 'grey.90' : 'grey.10', p: 1 } }}
                            >
                                {statusOptions.map((s) => (
                                    <MenuItem
                                        key={s}
                                        onClick={() => applyBulkStatus(s)}
                                        // disabled={isUpdatingStatus}
                                        className='text-xs'
                                        // selected={s === localStatus}

                                    >
                                        <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 6, background: STATUS_COLORS[s], marginRight: 8 }} />
                                        {s}
                                    </MenuItem>
                                ))}
                            </Menu>
                                </span>
                            {/* Bulk category menu */}
                            <span>
                            <Menu
                                id="bulk-category-menu"
                                anchorEl={bulkCategoryAnchorEl}
                                open={Boolean(bulkCategoryAnchorEl) || Boolean(bulkCategoryAnchorPos)}
                                onClose={handleCloseBulkCategory}
                                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                                anchorReference={bulkCategoryAnchorPos ? 'anchorPosition' : 'anchorEl'}
                                anchorPosition={bulkCategoryAnchorPos ? { top: Math.round(bulkCategoryAnchorPos.top), left: Math.round(bulkCategoryAnchorPos.left) } : undefined}
                                PaperProps={{ sx: { bgcolor: theme.palette.mode === 'dark' ? 'grey.90' : 'grey.100', p: 1, maxHeight: '300px', } }}
                            >
                                {categoryOptions.map((c) => (
                                    c === categoryOptions[0] ? (
                                        <span key={`wrap-${c}`}>
                                            {/* Render the search input as a non-menu element so typing doesn't trigger
                                                the menu's type-to-select behavior. We also stop keydown propagation
                                                from the input and prevent blur when clicking the Add button so the
                                                onClick reliably fires. */}
                                            <div key="bulk-category-search" role="presentation">
                                                <div style={{ width: 260, padding: '4px 0' }}>
                                                    <TextField
                                                        id="bulk-category-search"
                                                        size="small"
                                                        placeholder="Filter or add category"
                                                        sx={{ position: 'sticky', top: 0, bgcolor: theme.palette.mode === 'dark' ? 'grey.900' : 'grey.100', zIndex: 1 }}
                                                        fullWidth
                                                        onChange={(e: ChangeEvent<HTMLInputElement>) => {
                                                            const q = (e.target.value || '').toLowerCase();
                                                            // Filter visible MenuItem entries in this menu by role="menuitem"
                                                            const items = document.querySelectorAll('#bulk-category-menu [role="menuitem"]');
                                                            items.forEach((it) => {
                                                                const txt = (it.textContent || '').toLowerCase();
                                                                (it as HTMLElement).style.display = q && txt.indexOf(q) === -1 ? 'none' : '';
                                                            });
                                                        }}
                                                        onKeyDown={(e) => {
                                                            // Stop the Menu/List from handling type-to-select while typing in the input
                                                            e.stopPropagation();
                                                        }}
                                                        InputProps={{
                                                            endAdornment: (
                                                                <InputAdornment position="end">
                                                                    <Tooltip title="Add category" placement="top" arrow>
                                                                    <IconButton
                                                                        size="small"
                                                                        aria-label="Add category"
                                                                        onMouseDown={(e) => e.preventDefault()}
                                                                        onClick={async () => {
                                                                                const el = document.getElementById('bulk-category-search') as HTMLInputElement | null;
                                                                                const val = el?.value?.trim();
                                                                                if (!val) return;
                                                                                try {
                                                                                    // Try to add the category. On success, apply it to selected goals.
                                                                                    await addCategory(val);
                                                                                    await applyBulkCategory(val);
                                                                                } catch (err: any) {
                                                                                    // If the category already exists, still apply it.
                                                                                    const msg = (err && err.message) || '';
                                                                                    if (msg.toLowerCase().includes('category already exists') || msg.toLowerCase().includes('duplicate')) {
                                                                                        try {
                                                                                            await applyBulkCategory(val);
                                                                                        } catch (innerErr) {
                                                                                            console.error('Failed to apply existing category', innerErr);
                                                                                            notifyError('Failed to apply category');
                                                                                        }
                                                                                    } else {
                                                                                        console.error('Failed to add category', err);
                                                                                        notifyError('Failed to add category');
                                                                                    }
                                                                                }
                                                                            }}
                                                                        type="button"
                                                                    >
                                                                        <PlusIcon className="w-4 h-4" />
                                                                    </IconButton>
                                                                    </Tooltip>
                                                                </InputAdornment>
                                                            ),
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                            <MenuItem
                                                key={c}
                                                onClick={() => applyBulkCategory(c)}
                                            >
                                                {c}
                                            </MenuItem>
                                        </span>
                                    ) : (
                                        <MenuItem
                                            key={c}
                                            onClick={() => applyBulkCategory(c)}
                                        >
                                            {c}
                                        </MenuItem>
                                    )
                                ))}
                            </Menu>
                        </span>
                        </div>
                            </>
                        )}
                        {(selectedCount === 0 || viewMode === 'table') && (
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
                        )}
                        
                        {/* Edit Accomplishment Modal (reuses AccomplishmentEditor) */}
                        {isEditAccomplishmentModalOpen && selectedAccomplishment && (
                            <div
                                className="fixed inset-0 bg-gray-100 bg-opacity-75 flex items-center justify-center z-50"
                                role="presentation"
                                onMouseDown={(e) => {
                                    // close when clicking the backdrop (only trigger when clicking the overlay itself)
                                    if (e.target === e.currentTarget) {
                                        setSelectedAccomplishment(null);
                                        setIsEditAccomplishmentModalOpen(false);
                                    }
                                }}
                            >
                                <div className={`${modalClasses}`}>
                                    <h3 className="text-lg font-medium text-gray-90 mb-4">Edit Accomplishment</h3>
                                    <AccomplishmentEditor
                                        accomplishment={selectedAccomplishment}
                                        onSave={async (updatedDescription?: string, updatedTitle?: string, updatedImpact?: string) => {
                                            if (!selectedAccomplishment) return;
                                            await saveEditedAccomplishment(selectedAccomplishment.id, { title: updatedTitle, description: updatedDescription, impact: updatedImpact }, (selectedGoal as any)?.id);
                                        }}
                                        onRequestClose={() => { setSelectedAccomplishment(null); setIsEditAccomplishmentModalOpen(false); }}
                                    />
                                </div>
                            </div>
                        )}
                        {viewMode !== 'kanban' && (
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
                                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
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
                        <div id="summary_btn">
                            <SummaryGenerator 
                            summaryId={selectedSummary?.id || ''} 
                            summaryTitle={selectedSummary?.title || `Summary for ${scope}: ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`}                                                                                                                                                                                selectedRange={new Date()}
                            filteredGoals={showAllGoals ? (fullGoals || Object.values(indexedGoals).flat()) : (indexedGoals[currentPage] || [])} // Pass the goals for the current page or full list
                            scope={scope}
                            />
                        </div>
                    
                </div>
            </div> 

                

                {/* Goals List - render by viewMode */}
                {viewMode === 'cards' && (
                        <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 3xl:grid-cols-5 gap-4 w-full'>
                            {sortedAndFilteredGoals.map((goal) => (
                            <GoalCard
                                key={goal.id}
                                goal={goal}
                                showAllGoals={showAllGoals}
                                handleDelete={(goalId) => handleDeleteGoal(goalId)}
                                handleEdit={(goalId) => {
                                    const goalSourceForEdit = showAllGoals ? (fullGoals || Object.values(indexedGoals).flat()) : (indexedGoals[currentPage] || []);
                                    const goalToEdit = goalSourceForEdit.find((g) => g.id === goalId);
                                    if (goalToEdit) {
                                        setSelectedGoal(goalToEdit);
                                        setIsEditorOpen(true);
                                    }
                                }}
                                filter={filter}
                                selectable={true}
                                isSelected={selectedIds.has(goal.id)}
                                onToggleSelect={toggleSelect}
                            />
                            ))}
                        </div>
                )}

                {viewMode === 'table' && (
                    isSmall ? (
                        setViewMode('cards'), <div></div>
                    ) : (
                        <Paper elevation={6}>
                            <Table aria-label="Goals Table">
                                <TableHead className='border-none'>
                                    <TableRow className='bg-gray-10 dark:bg-gray-90 border-none'>
                                        <TableCell colSpan={selectedCount > 0 ?  5 : 1} className="px-4 py-2"   >
                                            <div className="flex items-center space-x-4">
                                            <div className={`floating-bulk${selectedCount > 0 ? '-toolbar flex-row align-start justify-start items-start sm:flex-row' : ''}`} role="toolbar" aria-label="Bulk actions">
                                                <Tooltip title={selectedCount === visibleIdsArray.length ? 'Deselect all' : 'Select all'} placement="top" arrow>
                                                        <Badge badgeContent={selectedCount} color="primary">
                                                        <span className="sr-only">{selectedCount} selected</span>
                                                        <button
                                                            className={`btn-ghost fb-btn ${selectedCount > 0 ? 'dark:[&>.lucide]:stroke-brand-30 [&>.lucide]:stroke-brand-70' : ''}`}
                                                            onClick={() => { if (selectedCount === visibleIdsArray.length) deselectAll(); else selectAllVisible(); }}
                                                            aria-label={selectedCount === visibleIdsArray.length ? 'Deselect all' : 'Select all'}
                                                        >
                                                            {selectedCount === visibleIdsArray.length ? <SquareSlash /> : <CheckSquare2 />}
                                                        </button>
                                                    </Badge>
                                                </Tooltip>
                                                
                                                {selectedCount > 0 && (
                                                    <div className="flex flex-col items-start justify-start sm:flex-row ">
                                                        <button className="btn-ghost fb-btn" onClick={() => setIsBulkDeleteConfirmOpen(true)} disabled={bulkActionLoading} title="Delete selected" aria-label="Delete selected">Delete</button>
                                                        <button
                                                            className="btn-ghost fb-btn"
                                                            onClick={(e) => {
                                                                const el = e.currentTarget as HTMLElement;
                                                                if (!document.body.contains(el)) {
                                                                    setBulkStatusAnchorPos({ top: e.clientY, left: e.clientX });
                                                                    setBulkStatusAnchorEl(null);
                                                                } else {
                                                                    setBulkStatusAnchorEl(el);
                                                                    setBulkStatusAnchorPos(null);
                                                                }
                                                            }}
                                                            disabled={bulkActionLoading}
                                                            title="Set status"
                                                            aria-label="Set status"
                                                            ref={bulkStatusTriggerRef}
                                                        >
                                                            Status
                                                        </button>
                                                        <button
                                                            className="btn-ghost fb-btn"
                                                            onClick={(e) => {
                                                                const el = e.currentTarget as HTMLElement;
                                                                if (!document.body.contains(el)) {
                                                                    setBulkCategoryAnchorPos({ top: e.clientY, left: e.clientX });
                                                                    setBulkCategoryAnchorEl(null);
                                                                } else {
                                                                    setBulkCategoryAnchorEl(el);
                                                                    setBulkCategoryAnchorPos(null);
                                                                }
                                                            }}
                                                            disabled={bulkActionLoading}
                                                            title="Set category"
                                                            aria-label="Set category"
                                                            ref={bulkCategoryTriggerRef}
                                                        >
                                                            Category
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                            {selectedCount === 0 && (
                                                <span className='flex items-center' onClick={() => toggleSort('title')} style={{ cursor: 'pointer' }}>
                                                    Goal
                                                    {sortBy === 'title' && (sortDirection === 'asc' ? <ArrowUp className="w-4 h-4 ml-2" /> : <ArrowDown className="w-4 h-4 ml-2" />)}
                                                </span>
                                            )}
                                            </div>
                                            {/* Bulk status menu */}
                                            <span>
                                                <Menu
                                                    id="bulk-status-menu"
                                                    anchorEl={bulkStatusAnchorEl}
                                                    open={Boolean(bulkStatusAnchorEl) || Boolean(bulkStatusAnchorPos)}
                                                    onClose={handleCloseBulkStatus}
                                                    anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                                                    anchorReference={bulkStatusAnchorPos ? 'anchorPosition' : 'anchorEl'}
                                                    anchorPosition={bulkStatusAnchorPos ? { top: Math.round(bulkStatusAnchorPos.top), left: Math.round(bulkStatusAnchorPos.left) } : undefined}
                                                    PaperProps={{ sx: { bgcolor: theme.palette.mode === 'dark' ? 'grey.90' : 'grey.10', p: 1 } }}
                                                >
                                                    {statusOptions.map((s) => (
                                                        <MenuItem
                                                            key={s}
                                                            onClick={() => applyBulkStatus(s)}
                                                            // disabled={isUpdatingStatus}
                                                            className='text-xs'
                                                            // selected={s === localStatus}

                                                        >
                                                            <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 6, background: STATUS_COLORS[s], marginRight: 8 }} />
                                                            {s}
                                                        </MenuItem>
                                                    ))}
                                                </Menu>
                                                    </span>
                                                {/* Bulk category menu */}
                                                <span>
                                                <Menu
                                                    id="bulk-category-menu"
                                                    anchorEl={bulkCategoryAnchorEl}
                                                    open={Boolean(bulkCategoryAnchorEl) || Boolean(bulkCategoryAnchorPos)}
                                                    onClose={handleCloseBulkCategory}
                                                    anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                                                    anchorReference={bulkCategoryAnchorPos ? 'anchorPosition' : 'anchorEl'}
                                                    anchorPosition={bulkCategoryAnchorPos ? { top: Math.round(bulkCategoryAnchorPos.top), left: Math.round(bulkCategoryAnchorPos.left) } : undefined}
                                                    PaperProps={{ sx: { bgcolor: theme.palette.mode === 'dark' ? 'grey.90' : 'grey.100', p: 1, height: '500px', } }}
                                                >
                                                    {categoryOptions.map((c) => (
                                                        c === categoryOptions[0] ? (
                                                            <span key={`wrap-${c}`}>
                                                                {/* Render the search input as a non-menu element so typing doesn't trigger
                                                                    the menu's type-to-select behavior. We also stop keydown propagation
                                                                    from the input and prevent blur when clicking the Add button so the
                                                                    onClick reliably fires. */}
                                                                <div key="bulk-category-search" role="presentation">
                                                                    <div style={{ width: 260, padding: '4px 0' }}>
                                                                        <TextField
                                                                            id="bulk-category-search"
                                                                            size="small"
                                                                            placeholder="Filter or add category"
                                                                            sx={{ position: 'sticky', top: 0, bgcolor: theme.palette.mode === 'dark' ? 'grey.900' : 'grey.100', zIndex: 1 }}
                                                                            fullWidth
                                                                            onChange={(e: ChangeEvent<HTMLInputElement>) => {
                                                                                const q = (e.target.value || '').toLowerCase();
                                                                                // Filter visible MenuItem entries in this menu by role="menuitem"
                                                                                const items = document.querySelectorAll('#bulk-category-menu [role="menuitem"]');
                                                                                items.forEach((it) => {
                                                                                    const txt = (it.textContent || '').toLowerCase();
                                                                                    (it as HTMLElement).style.display = q && txt.indexOf(q) === -1 ? 'none' : '';
                                                                                });
                                                                            }}
                                                                            onKeyDown={(e) => {
                                                                                // Stop the Menu/List from handling type-to-select while typing in the input
                                                                                e.stopPropagation();
                                                                            }}
                                                                            InputProps={{
                                                                                endAdornment: (
                                                                                    <InputAdornment position="end">
                                                                                        <Tooltip title="Add category" placement="top" arrow>
                                                                                        <IconButton
                                                                                            size="small"
                                                                                            aria-label="Add category"
                                                                                            onMouseDown={(e) => e.preventDefault()}
                                                                                            onClick={async () => {
                                                                                                    const el = document.getElementById('bulk-category-search') as HTMLInputElement | null;
                                                                                                    const val = el?.value?.trim();
                                                                                                    if (!val) return;
                                                                                                    try {
                                                                                                        // Try to add the category. On success, apply it to selected goals.
                                                                                                        await addCategory(val);
                                                                                                        await applyBulkCategory(val);
                                                                                                    } catch (err: any) {
                                                                                                        // If the category already exists, still apply it.
                                                                                                        const msg = (err && err.message) || '';
                                                                                                        if (msg.toLowerCase().includes('category already exists') || msg.toLowerCase().includes('duplicate')) {
                                                                                                            try {
                                                                                                                await applyBulkCategory(val);
                                                                                                            } catch (innerErr) {
                                                                                                                console.error('Failed to apply existing category', innerErr);
                                                                                                                notifyError('Failed to apply category');
                                                                                                            }
                                                                                                        } else {
                                                                                                            console.error('Failed to add category', err);
                                                                                                            notifyError('Failed to add category');
                                                                                                        }
                                                                                                    }
                                                                                                }}
                                                                                            type="button"
                                                                                        >
                                                                                            <PlusIcon className="w-4 h-4" />
                                                                                        </IconButton>
                                                                                        </Tooltip>
                                                                                    </InputAdornment>
                                                                                ),
                                                                            }}
                                                                        />
                                                                    </div>
                                                                </div>
                                                                <MenuItem
                                                                    key={c}
                                                                    onClick={() => applyBulkCategory(c)}
                                                                >
                                                                    {c}
                                                                </MenuItem>
                                                            </span>
                                                        ) : (
                                                            <MenuItem
                                                                key={c}
                                                                onClick={() => applyBulkCategory(c)}
                                                            >
                                                                {c}
                                                            </MenuItem>
                                                        )
                                                    ))}
                                                </Menu>
                                                
                                            </span>
                                        </TableCell>
                                        {selectedCount === 0 && (
                                            <>
                                            {/* <TableCell onClick={() => toggleSort('title')} style={{ cursor: 'pointer' }}>
                                                <span className="flex items-center">
                                                    Goal
                                                    {sortBy === 'title' && (sortDirection === 'asc' ? <ArrowUp className="w-4 h-4 ml-2" /> : <ArrowDown className="w-4 h-4 ml-2" />)}
                                                </span>
                                            </TableCell> */}
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
                                            </>
                                        )}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {/* <TableRow sx={{ maxHeight: '1px', display: 'block' }} className='h-[1px] p-0 m-0 block overflow-hidden'>
                                        <TableCell className='w-full' />
                                        <TableCell className='w-auto' />
                                        <TableCell className='w-auto' />
                                        <TableCell className='w-auto' />
                                        <TableCell className='w-auto' />
                                    </TableRow> */}
                                    {sortedAndFilteredGoals.map((goal) => (
                                        <TableRow 
                                            key={goal.id}
                                            hover
                                            // onClick={() => toggleSelect(goal.id)}
                                            onClick={(e) => {
                                                // If the click originated from an interactive element (button, input, link, select, textarea,
                                                // or any element with role="button"), don't treat it as a card-select click. This prevents
                                                // clicks on internal controls (icons, buttons, menus) from toggling selection.
                                                const target = e.target as HTMLElement | null;
                                                if (target && typeof target.closest === 'function') {
                                                const interactive = target.closest('button, a, input, select, textarea, [role="button"]');
                                                if (interactive) return;
                                                }
                                                toggleSelect(goal.id);
                                            }}
                                            role="checkbox"
                                            aria-checked={selectedIds.has(goal.id)}
                                            tabIndex={-1}
                                            selected={selectedIds.has(goal.id)}
                                            // inputProps={{ 'aria-label': `Select goal ${goal.title}` }}
                                            sx={{ cursor: 'pointer' }}
                                        >
                                            {/* <TableCell>
                                                <Checkbox size="small" checked={selectedIds.has(goal.id)} inputProps={{ 'aria-label': `Select goal ${goal.title}` }} />
                                            </TableCell> */}
                                            <TableCell>
                                                <Typography variant="body1"><span dangerouslySetInnerHTML={renderHTML(goal.title)} /></Typography>
                                                <Typography variant="body2" className="text-gray-50">
                                                    <span dangerouslySetInnerHTML={renderHTML(((goal.description || '').substring(0, 100) + ((goal.description || '').length > 200 ? '...' : '')))} />
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <span className='card-category text-nowrap' dangerouslySetInnerHTML={renderHTML(goal.category)} />
                                            </TableCell>
                                            <TableCell>
                                                <InlineStatus goal={goal} onUpdated={() => refreshGoals().then(() => {})} />
                                            </TableCell>
                                            <TableCell><span className='text-xs' dangerouslySetInnerHTML={renderHTML(goal.week_start)} /></TableCell>
                                            <TableCell>
                                                {/* Single chevron button that opens a per-row actions menu */}
                                                
                                                <IconButton
                                                    className="btn-ghost"
                                                    size="small"
                                                    aria-controls={rowActionsAnchorEl && rowActionsTargetId === goal.id ? 'row-actions-menu' : undefined}
                                                    aria-haspopup="true"
                                                    aria-expanded={rowActionsAnchorEl && rowActionsTargetId === goal.id ? 'true' : undefined}
                                                    onClick={(e) => {
                                                        const el = e.currentTarget as HTMLElement;
                                                        if (rowActionsTargetId === goal.id && rowActionsAnchorEl) {
                                                            setRowActionsAnchorEl(null);
                                                            setRowActionsTargetId(null);
                                                        } else {
                                                            setRowActionsAnchorEl(el);
                                                            setRowActionsTargetId(goal.id);
                                                        }
                                                    }}
                                                >
                                                    {/* Rotate chevron when open to indicate expanded state */}
                                                { (accomplishmentCountMap[goal.id] || 0) > 0 || (notesCountMap[goal.id] || 0) > 0 ? (
                                                    <Badge 
                                                        badgeContent="" 
                                                        color="primary"
                                                        variant='dot'
                                                        anchorOrigin={{
                                                            vertical: 'top',
                                                            horizontal: 'right',
                                                        }}
                                                    >
                                                        <ChevronRight className={`w-4 h-4 ${rowActionsTargetId === goal.id && rowActionsAnchorEl ? 'transform rotate-90' : ''}`} />
                                                    </Badge>
                                                ) : (
                                                    <ChevronRight className={`w-4 h-4 ${rowActionsTargetId === goal.id && rowActionsAnchorEl ? 'transform rotate-90' : ''}`} />
                                                )}
                                                </IconButton>

                                                <Menu
                                                    id="row-actions-menu"
                                                    anchorEl={rowActionsAnchorEl}
                                                    open={Boolean(rowActionsAnchorEl) && rowActionsTargetId === goal.id}
                                                    onClose={() => { setRowActionsAnchorEl(null); setRowActionsTargetId(null); }}
                                                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                                                    transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                                                    PaperProps={{ sx: { bgcolor: theme.palette.mode === 'dark' ? 'grey.900' : 'grey.100' } }}
                                                >
                                                    <MenuItem 
                                                        aria-label="Accomplishments" 
                                                        onClick={() => { setSelectedGoal(goal); openAccomplishments(goal); }} 
                                                    >
                                                    <Badge 
                                                        badgeContent={accomplishmentCountMap[goal.id] ?? 0} 
                                                        color="primary"
                                                        anchorOrigin={{
                                                            vertical: 'top',
                                                            horizontal: 'right',
                                                        }}
                                                    >
                                                        <Award className="w-4 h-4 mr-2" name="Add accomplishment" />
                                                    </Badge>
                                                    {/* {accomplishments.length > 0 && (
                                                    <div className={objectCounter}>{accomplishments.length}</div>
                                                    )} */}
                                                        Accomplishments
                                                    </MenuItem>
                                        
                                                    <MenuItem 
                                                        aria-label="Notes" onClick={() => { setSelectedGoal(goal); openNotes(goal); }} 
                                                        id="openNotes"
                                                        >
                                                            <Badge 
                                                                badgeContent={notesCountMap[goal.id] ?? 0} 
                                                                color="primary"
                                                                anchorOrigin={{
                                                                    vertical: 'top',
                                                                    horizontal: 'right',
                                                                }}
                                                            >
                                                                <NotesIcon className="w-4 h-4 mr-2" />
                                                            </Badge>
                                                            {/* {(typeof notesCount === 'number' && notesCount != 0) && (
                                                            <div className={objectCounter}>{notes.length > 0 ? notes.length : (notesCount ?? 0)}
                                                            </div>
                                                            )} */}
                                                            Notes
                                                    </MenuItem >
                                                    <MenuItem
                                                        onClick={() => {
                                                            setSelectedGoal(goal);
                                                            setIsEditorOpen(true);
                                                            setRowActionsAnchorEl(null);
                                                            setRowActionsTargetId(null);
                                                        }}
                                                    >
                                                        <Edit className="w-4 h-4 mr-2" />
                                                        Edit goal
                                                    </MenuItem>
                                                        <MenuItem
                                                            onClick={() => {
                                                                setRowActionsAnchorEl(null);
                                                                setRowActionsTargetId(null);
                                                                setDeleteTargetId(goal.id);
                                                                setIsDeleteConfirmOpen(true);
                                                            }}
                                                        >
                                                            <Trash className="w-4 h-4 mr-2" />
                                                            Delete goal
                                                        </MenuItem>
                                                </Menu>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </Paper>
                    )
                )}
                <ConfirmModal
                    isOpen={isBulkDeleteConfirmOpen}
                    title={`Delete ${selectedCount} goals?`}
                    message={`Are you sure you want to permanently delete ${selectedCount} selected goals? This action cannot be undone.`}
                    onCancel={() => setIsBulkDeleteConfirmOpen(false)}
                    onConfirm={async () => {
                        setBulkActionLoading(true);
                        try {
                            const ids = Array.from(selectedIds);
                            for (const id of ids) {
                                await deleteGoal(id);
                            }
                            notifySuccess('Selected goals deleted');
                        } catch (err) {
                            console.error('Bulk delete failed', err);
                            notifyError('Failed to delete some goals');
                        } finally {
                            setBulkActionLoading(false);
                            setIsBulkDeleteConfirmOpen(false);
                            clearSelection();
                            await refreshGoals();
                        }
                    }}
                    confirmLabel="Delete"
                    cancelLabel="Cancel"
                    loading={bulkActionLoading}
                />
                            {viewMode === 'kanban' && (
                                <div className="flex flex-col mt-2 md:flex-row gap-4 w-full overflow-auto">
                                    {isScopeLoading ? (
                                        <div className="w-full flex items-center justify-center p-8">
                                            <div className="flex items-center space-x-3">
                                                <LoadingSpinner />
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
                                                className={`
                                                    ${!isCollapsed ? (
                                                        "flex-1 border border-gray-30 dark:border-gray-70 bg-gray-0 dark:bg-gray-100 dark:bg-opacity-30 p-3 rounded-md" 
                                                    ) : (
                                                        "flex-0 border border-gray-30 dark:border-gray-70 bg-gray-0 dark:bg-gray-100 dark:bg-opacity-30 p-3 rounded-md"
                                                    )} 
                                                `}
                                                onDragOver={(e) => handleDragOver(e, status)}
                                                onDrop={(e) => handleDrop(e, status)}
                                            >
                                                <div className={`flex items-center justify-between w-full ${!isCollapsed && ('mb-3')} `}>
                                                    
                                                    {/* Status label with color dot */}
                                                    {!isCollapsed && (
                                                        <div className="flex items-center space-x-2">  
                                                            <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 6, background: STATUS_COLORS[status], marginRight: 8 }} />
                                                            <div className="text-nowrap" style={{color: STATUS_COLORS[status]}}>
                                                                {status}
                                                                <span className="ml-2 text-sm text-gray-30 dark:text-gray-70">({allIds.length})</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {hiddenCount > 0 && (
                                                        <span className="text-sm text-gray-500 dark:text-gray-300">{hiddenCount} hidden</span>
                                                    )}
                                                    {(isCollapsed) ? (
                                                        <>
                                                        {(isSmall) && (
                                                        <div className="flex items-center space-x-2">
                                                            <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 6, background: STATUS_COLORS[status], marginRight: 8 }} />
                                                            <div className="text-nowrap" style={{color: STATUS_COLORS[status]}}>{status}
                                                            </div>
                                                        </div>
                                                        )}
                                                        
                                                            <Tooltip title={`Show "${status}" column`} placement="top" arrow>
                                                            <IconButton
                                                                aria-label={`Show ${status} column`}
                                                                onClick={() => setCollapsedColumns((prev) => ({ ...prev, [status]: false }))}
                                                                className="btn-ghost p-1"
                                                            >
                                                                <div className="flex items-center">
                                                                    <Badge 
                                                                        badgeContent={allIds.length} 
                                                                        color="primary"
                                                                        // variant='dot'
                                                                        anchorOrigin={{
                                                                            vertical: 'top',
                                                                            horizontal: 'right',
                                                                        }}
                                                                    >
                                                                        <Eye className="w-4 h-4 text-gray-70 dark:text-gray-20" />
                                                                    </Badge>
                                                                </div>
                                                            </IconButton>
                                                            </Tooltip>
                                                        </>
                                                    ) : (
                                                            
                                                        <Tooltip title={`Hide column`} placement="top" arrow>
                                                            <IconButton
                                                                aria-label={`Hide ${status} column`}
                                                                onClick={() => setCollapsedColumns((prev) => ({ ...prev, [status]: !prev[status] }))}
                                                                className="btn-ghost p-1"
                                                                >
                                                                <EyeOff className="w-4 h-4 text-gray-50" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    
                                                    )}
                                                </div>

                                                {!isCollapsed && (
                                                    <div className="space-y-3">
                                                        {visibleIds.map((id, _idx) => {
                                                            // When showing all in kanban, prefer the `fullGoals` cache
                                                            // which contains unscoped results from the server. When
                                                            // showAllGoals is false, fall back to the scoped
                                                            // `indexedGoals` map.
                                                            const goalListForLookup = showAllGoals ? (fullGoals || Object.values(indexedGoals).flat()) : (indexedGoals[currentPage] || []);
                                                            const goal = (goalListForLookup || []).find((g) => g.id === id) as Goal | undefined;
                                                            if (!goal) return null;
                                                            return (
                                                            
                                                            <GoalKanbanCard
                                                                key={id}
                                                                goal={goal}
                                                                handleDelete={(id) => handleDeleteGoal(id)}
                                                                handleEdit={(id) => {
                                                                    const goalSourceForEdit = showAllGoals ? (fullGoals || Object.values(indexedGoals).flat()) : (indexedGoals[currentPage] || []);
                                                                    const goalToEdit = goalSourceForEdit.find((g) => g.id === id);
                                                                    if (goalToEdit) {
                                                                        setSelectedGoal(goalToEdit);
                                                                        setIsEditorOpen(true);
                                                                    }
                                                                }}
                                                                filter={filter}
                                                                draggable
                                                                selectable={true}
                                                                isSelected={selectedIds.has(goal.id)}
                                                                onToggleSelect={toggleSelect}
                                                                onDragStart={(e) => handleDragStart(e, id)}
                                                            />
                                                                
                                                                    
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
                    <div className="text-center text-gray-50 mt-4 justify-center flex flex-col items-center">
                        No goals found. Try adding one!
                        {/* <Tooltip title={`Add a new goal`} placement="top" arrow> */}
                            <button
                                onClick={openGoalModal}
                                className="btn-primary gap-2 flex ml-auto"
                                // title={`Add a new goal for the current ${scope}`}
                                aria-label={`Add a new goal for the current ${scope}`}
                                >
                                <PlusIcon className="w-5 h-5" />
                                <span className="block flex text-nowrap">Add a Goal</span>
                            </button>
                        {/* </Tooltip> */}
                    </div>
                )}
            </div>
            <div id="summary">
                    <Modal
                        key={selectedSummary?.id || 'summary-editor'}
                        isOpen={!!selectedSummary && isEditorOpen}
                        onRequestClose={() => setSelectedSummary(null)}
                        shouldCloseOnOverlayClick={true}
                        ariaHideApp={ARIA_HIDE_APP}
                        className={`fixed inset-0 flex items-center justify-center z-50`}
                        overlayClassName={`${overlayClasses}`}
                    >
                        <div className={`${modalClasses}`}>
                        {selectedSummary && (
                                                    <SummaryEditor
                                                        id={selectedSummary.id}
                                                        content={selectedSummary.content || ''}
                                                        type={selectedSummary.type === 'AI' || selectedSummary.type === 'User' ? selectedSummary.type : 'User'}
                                                        title={selectedSummary.title || ''}
                                                        onRequestClose={() => setSelectedSummary(null)}
                                                        onSave={async (editedTitle, editedContent) => {
                                                        try {
                                                                await saveSummary(
                                                                    setLocalSummaryId,
                                                                    editedTitle || selectedSummary.title || '',
                                                                    editedContent || selectedSummary.content || '',
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
                    shouldCloseOnOverlayClick={true}
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
                    shouldCloseOnOverlayClick={true}
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
                    {/* Confirm delete goal modal (shared for table/mobile actions) */}
                    <ConfirmModal
                        isOpen={isDeleteConfirmOpen}
                        title="Delete goal?"
                        message={deleteTargetId ? `Are you sure you want to permanently delete this goal? This action cannot be undone.` : 'Are you sure you want to delete this goal?'}
                        onCancel={() => { setIsDeleteConfirmOpen(false); setDeleteTargetId(null); }}
                        onConfirm={async () => {
                            try {
                                if (!deleteTargetId) return;
                                await handleDeleteGoal(deleteTargetId);
                            } finally {
                                setIsDeleteConfirmOpen(false);
                                setDeleteTargetId(null);
                            }
                        }}
                        confirmLabel="Delete"
                        cancelLabel="Cancel"
                    />
                    {/* Accomplishments modal used by mobile stacked rows */}
                    <AccomplishmentsModal
                        goalTitle={(selectedGoal as any)?.title || ''}
                        isOpen={isAccomplishmentModalOpen}
                        onClose={() => closeAccomplishments()}
                        accomplishments={accomplishments}
                        onCreate={async ({ title, description, impact }) => {
                            const gid = (selectedGoal as any)?.id;
                            if (!gid) return;
                            await createAccomplishment(gid, { title, description, impact });
                        }}
                        onDelete={async (id) => {
                            await deleteAccomplishment(id, (selectedGoal as any)?.id);
                        }}
                        onEdit={(item) => {
                            setSelectedAccomplishment(item);
                            setIsEditAccomplishmentModalOpen(true);
                        }}
                        loading={isAccomplishmentLoading}
                    />

                    {/* Notes modal used by mobile stacked rows */}
                    {isNotesModalOpen && (
                        <div id="editNotes" className={`${overlayClasses} flex items-center justify-center`}>
                            <div className={`${modalClasses} w-full max-w-2xl`}> 
                                <div className='flex flex-row w-full justify-between items-start'>
                                    <h3 className="text-lg font-medium text-gray-90 mb-4">Notes for <br />"{(selectedGoal as any)?.title}"</h3>
                                    <div className="mb-4 flex justify-end">
                                        <button className="btn-ghost" onClick={() => closeNotes()}>
                                            <CloseButton className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                { notes.length != 0 ? (
                                    <div>
                                        <h4 className="text-md font-semibold mb-2">Existing notes</h4>
                                        <ul className="space-y-3">
                                            {notes.map((note) => (
                                                <li key={note.id} className="p-3 border rounded bg-gray-10 dark:bg-gray-80 dark:border-gray-70">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <div className="text-xs text-gray-40">{new Date(note.created_at).toLocaleString()}</div>
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button className="btn-ghost" onClick={() => { setEditingNoteId(note.id); setEditingNoteContent(note.content); }} title="Edit note"><Edit className="w-4 h-4" /></button>
                                                            <button className="btn-ghost" onClick={() => setNoteDeleteTarget(note.id)} title="Delete note" disabled={isNotesLoading}><Trash className="w-4 h-4" /></button>
                                                        </div>
                                                    </div>
                                                    <div className="text-sm text-gray-70 dark:text-gray-20" dangerouslySetInnerHTML={{ __html: note.content }} />
                                                    {editingNoteId === note.id && (
                                                        <div className="mt-2">
                                                            <TextField
                                                                value={editingNoteContent}
                                                                onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setEditingNoteContent(e.target.value)}
                                                                multiline
                                                                rows={3}
                                                                size="small"
                                                                className="mt-1 block w-full"
                                                            />
                                                            <div className="mt-2 flex justify-end gap-2">
                                                                <button className="btn-ghost" onClick={() => { setEditingNoteId(null); setEditingNoteContent(''); }}>Cancel</button>
                                                                <button className="btn-primary" onClick={() => updateNote(editingNoteId as string, editingNoteContent)}><SaveIcon className="w-4 h-4 inline mr-1" />Save</button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ): null}
                                <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                                    <div className="mt-4">
                                        <TextField
                                            value={newNoteContent}
                                            onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setNewNoteContent(e.target.value)}
                                            className="mt-4 block w-full"
                                            label="Add a new note"
                                            multiline
                                            rows={3}
                                            size="small"
                                        />
                                        <div className="mt-2 flex justify-end gap-2">
                                            <button className="btn-primary" onClick={() => createNote((selectedGoal as any)?.id)} disabled={isNotesLoading}><PlusIcon className="w-4 h-4 inline mr-1" />{isNotesLoading ? (<span className="ml-2 text-sm text-gray-50">Adding...</span>) : ( 'Add note') }</button>
                                            
                                        </div>
                                    </div>
                                    {isNotesLoading && notes.length === 0 ? (
                                        <div className="text-sm text-gray-50">Loading notes...</div>
                                    ) : null}
                                </div>
                                <ConfirmModal
                                    isOpen={!!noteDeleteTarget}
                                    title="Delete note?"
                                    message={`Are you sure you want to delete this note? This action cannot be undone.`}
                                    onCancel={() => setNoteDeleteTarget(null)}
                                    onConfirm={async () => {
                                        if (!noteDeleteTarget) return;
                                        await deleteNote(noteDeleteTarget);
                                        setNoteDeleteTarget(null);
                                    }}
                                    confirmLabel="Delete"
                                    cancelLabel="Cancel"
                                />
                            </div>
                        </div>
                    )}
            </div>
        </div>
    // </div>
  );
};

export default GoalsComponent;
