import { useState, useEffect, useRef } from 'react';
import { TextField, Tooltip, IconButton, Badge, MenuItem, Checkbox, ListItemText, Button, Chip, InputAdornment, Menu, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import Modal from 'react-modal';
import { ARIA_HIDE_APP } from '@lib/modal';
import ConfirmModal from '@components/ConfirmModal';
import { Summary, Goal, Task, calculateGoalCompletion } from '@utils/goalUtils'; // Adjust the import path as necessary
import { fetchSummaries, createSummary, deleteSummary, saveSummary, UserCategories, getWeekStartDate } from '@utils/functions'; // Adjust the import path as necessary
import supabase from '@lib/supabase'; // Ensure this is the correct path to your Supabase client
import SummaryCard from '@components/SummaryCard';
import SummaryEditor from '@components/SummaryEditor';
import GoalForm from '@components/GoalForm';
import { useGoalsContext } from '@context/GoalsContext';
import SummaryGenerator from '@components/SummaryGenerator';
import { modalClasses, overlayClasses } from '@styles/classes'; // Adjust the import path as necessary
import ReactQuill from 'react-quill';
import { notifyError, notifySuccess, notifyWithUndo } from './ToastyNotification';
import { CheckSquare2, Filter, SquareSlash, X as CloseButton, Target, ChevronDown, XCircle, Search, Sparkles } from 'lucide-react';
import { useTheme } from '@mui/material/styles';
import RichTextEditor from './RichTextEditor';
// import Editor from '@components/Editor';


const AllSummaries = () => {
  const theme = useTheme();
  const { goals, refreshGoals } = useGoalsContext();
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [filteredSummaries, setFilteredSummaries] = useState<Summary[]>([]);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [newGoal, setNewGoal] = useState<Goal>({
    id: '',
    title: '',
    description: '',
    category: '',
    week_start: getWeekStartDate(new Date()),
    user_id: '',
    created_at: '',
    status: 'Not started',
    status_notes: '',
  });
  const [localSummaryId, setLocalSummaryId] = useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [selectedSummary, setSelectedSummary] = useState<Summary | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sortField] = useState('created_at' as const);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  const [filterCategory, setFilterCategory] = useState<string[]>([]);
  const filterInputRef = useRef<HTMLInputElement | null>(null);
  const [filter, setFilter] = useState<string>(''); // For filtering summaries
  const [filterType, setFilterType] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [filterScope, setFilterScope] = useState<string[]>([]);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  // const [filterStartDate, setFilterStartDate] = useState<Dayjs | null>(null);
  // const [filterEndDate, setFilterEndDate] = useState<Dayjs | null>(null);
  const [filterAnchorEl, setFilterAnchorEl] = useState<HTMLElement | null>(null);
  const [summaryAnchorEl, setSummaryAnchorEl] = useState<HTMLElement | null>(null);
  const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [singleDeleteId, setSingleDeleteId] = useState<string | null>(null);
  const [isSingleDeleteConfirmOpen, setIsSingleDeleteConfirmOpen] = useState(false);
  const [singleDeleting, setSingleDeleting] = useState(false);
  const [tasksByGoal, setTasksByGoal] = useState<Record<string, Task[]>>({});
  
  // Count of active filters to display as a badge on the filter button
    const selectedFiltersCount =
        (filterStatus?.length || 0) +
        (filterCategory?.length || 0) +
        (filterType?.length || 0) +
        (filterScope?.length || 0) +
        // (filterStartDate && filterEndDate ? 1 : 0) +
        (filter && filter.trim().length > 0 ? 1 : 0);

  // Count incomplete goals (all goals where task completion is not 100%)
  const incompleteGoalsCount = goals.filter(goal => {
    const tasks = tasksByGoal[goal.id] || [];
    const completion = calculateGoalCompletion(tasks);
    return completion < 100;
  }).length;

 
  const openGoalModal = () => {
    if (!isGoalModalOpen) {
      setNewGoal((prev) => ({
        ...prev,
        week_start: getWeekStartDate(new Date()),
      }));
      setIsGoalModalOpen(true);
    }
  };

  const closeGoalModal = () => {
    setIsGoalModalOpen(false);
  };
  
  useEffect(() => {
    setFilteredSummaries(summaries); // Initialize filteredSummaries with summaries
  }, [summaries]);

  // Fetch tasks for all goals to calculate completion percentages
  useEffect(() => {
    const fetchAllTasks = async () => {
      if (goals.length === 0) return;
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) return;

        const response = await fetch('/.netlify/functions/getAllTasks', {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (!response.ok) throw new Error('Failed to fetch tasks');
        
        const allTasks: Task[] = await response.json();
        
        // Group tasks by goal_id
        const tasksByGoalMap: Record<string, Task[]> = {};
        goals.forEach(goal => {
          tasksByGoalMap[goal.id] = allTasks.filter(task => task.goal_id === goal.id);
        });
        
        setTasksByGoal(tasksByGoalMap);
      } catch (error) {
        console.error('Error fetching tasks:', error);
      }
    };

    fetchAllTasks();
  }, [goals]);

  // Removed scope-related state and logic

  // Corrected fetchSummaries call with required arguments
  const fetchSummariesData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('User is not authenticated');
        return;
      }
      const response = await fetchSummaries(user.id, ''); // Provided required arguments
      setSummaries(response || []);
      setFilteredSummaries(response || []);
    } catch (error) {
      console.error('Error fetching summaries:', error);
    }
  };

  useEffect(() => {
    fetchSummariesData();
  }, []);

  function openEditor(summary: Summary) {
    setSelectedSummary(summary);
    setIsEditorOpen(true);
  }
  // console.log('isEditorOpen:', isEditorOpen);

  function closeEditor() {
    setIsEditorOpen(false);
    setSelectedSummary(null);
  }
  const handleFetchSummaries = async () => {
    try {
      // Get the current user ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('User is not authenticated');
        return;
      }
      // Fetch summaries from the server
      const response = await fetchSummaries(user.id, localSummaryId ?? ''); // Pass user ID and localSummaryId if needed
      if (!response) {
        console.error('Error fetching summaries:', response);
        return;
      }
      const data = response;
      setSummaries(data || []);
    } catch (err) {
      console.error('Unexpected error fetching summaries:', err);
    }
  };
  
  // Open confirmation for single delete
  const handleDeleteSummary = (summaryId: string) => {
    setSingleDeleteId(summaryId);
    setIsSingleDeleteConfirmOpen(true);
  };

  const performDeleteSummary = (summaryId: string | null) => {
    if (!summaryId) return;
    const toDelete = summaries.find(s => s.id === summaryId);
    // Optimistically remove from UI
    setSummaries(prev => prev.filter(s => s.id !== summaryId));
    setFilteredSummaries(prev => prev.filter(s => s.id !== summaryId));
    setIsEditorOpen(false);
    setIsSingleDeleteConfirmOpen(false);
    setSingleDeleteId(null);
    notifyWithUndo(
      'Summary deleted',
      async () => {
        await deleteSummary(summaryId);
      },
      () => {
        if (toDelete) {
          setSummaries(prev => [...prev, toDelete]);
          setFilteredSummaries(prev => [...prev, toDelete]);
        }
      },
    );
  };

  // Updated handleFilterChange to include filtering by content
  const handleFilterChange = (filterValue: string) => {
    setFilter(filterValue);
    if (filterValue) {
      const filtered = summaries.filter((summary) =>
        summary.title.toLowerCase().includes(filterValue.toLowerCase()) ||
        summary.type.toLowerCase().includes(filterValue.toLowerCase()) ||
        summary.content.toLowerCase().includes(filterValue.toLowerCase()) // Added content filtering
      );
      setFilteredSummaries(filtered);
    } else {
      setFilteredSummaries(summaries); // Reset to all summaries if no filter
    }
  };

  useEffect(() => {
    handleFetchSummaries();
  }, []);

  // Update the Summaries list rendering logic to apply filtering and sorting
  const sortedAndFilteredSummaries = filteredSummaries.sort((a, b) => {
    if (sortField === 'created_at') {
      const aDate = new Date(a.created_at);
      const bDate = new Date(b.created_at);
      return sortDirection === 'asc'
        ? aDate.getTime() - bDate.getTime()
        : bDate.getTime() - aDate.getTime();
    } else {
      const aStr = (a[sortField] as string)?.toLowerCase() || '';
      const bStr = (b[sortField] as string)?.toLowerCase() || '';
      return sortDirection === 'asc'
        ? aStr.localeCompare(bStr)
        : bStr.localeCompare(aStr);
    }
  });

  const visibleIdsArray = sortedAndFilteredSummaries.map((s) => s.id);
  const selectedCount = selectedIds.length;

  const selectAllVisible = () => setSelectedIds(Array.from(new Set([...selectedIds, ...visibleIdsArray])));
  const deselectAll = () => setSelectedIds([]);

  const uniqueTypes = Array.from(new Set(summaries.map((s) => s.type).filter(Boolean)));

  // Simple helper: apply client-side text filter
  // client-side filtering handled by `handleFilterChange` / `filteredSummaries`

  // Recompute filteredSummaries whenever any of the filter controls change.
  useEffect(() => {
    let result = summaries.slice();

    // Text search
    if (filter && filter.trim()) {
      const f = filter.toLowerCase();
      result = result.filter((s) => {
        const title = (s.title || '').toLowerCase();
        const type = (s.type || '').toLowerCase();
        const content = (s.content || '').toLowerCase();
        return title.includes(f) || type.includes(f) || content.includes(f);
      });
    }

    // Type filter (checklist)
    if (filterType && filterType.length > 0) {
      result = result.filter((s) => filterType.includes(s.type || ''));
    }

    // Scope filter (checklist)
    if (filterScope && filterScope.length > 0) {
      result = result.filter((s) => filterScope.includes(s.scope || ''));
    }

    // Status filter (defensive; Summary may not have status)
    if (filterStatus && filterStatus.length > 0) {
      result = result.filter((s: any) => filterStatus.includes((s.status || '') as string));
    }

    // Category filter (defensive)
    if (filterCategory && filterCategory.length > 0) {
      result = result.filter((s: any) => filterCategory.includes((s.category || '') as string));
    }

    setFilteredSummaries(result);
  }, [summaries, filter, filterType, filterScope, filterStatus, filterCategory]);

  return (
    <div className="p-4">
      <div className="flex justify-between items-center">
        <h1 className="mt-4 block sm:hidden">Summaries</h1>
      </div> 
    {summaries.length !== 0 ? (
      <>
        {/* Filter and Sort Controls */}
        <div className="mt-4 h-10 flex items-center space-x-2">
          {/* Filter toggle button */}
          <Tooltip title={filterPanelOpen ? 'Close filters' : 'Open filters'} placement="top" arrow>
            <span>
              <Badge badgeContent={selectedFiltersCount} color="primary" invisible={selectedFiltersCount === 0}>
                <IconButton
                  className={`btn-ghost mr-2 border-2${filterPanelOpen ? ' !bg-gray-20 dark:!bg-gray-80 !text-primary-text !border-primary' : ''}`}
                  size="small"
                  aria-label={`${filterPanelOpen ? 'Close' : 'Open'} filters${selectedFiltersCount > 0 ? ` (${selectedFiltersCount} active)` : ''}`}
                  aria-pressed={filterPanelOpen}
                  onClick={() => setFilterPanelOpen(prev => !prev)}
                >
                  <Filter className="w-5 h-5" />
                </IconButton>
              </Badge>
            </span>
          </Tooltip>

          {/* Selected filter chips */}
          <div className="hidden sm:flex items-center space-x-2 ml-2">
            {selectedFiltersCount >= 4 ? (
              <>
                <Chip
                  label={`${selectedFiltersCount} filters`}
                  size="small"
                  onClick={(e) => setSummaryAnchorEl(e.currentTarget)}
                  className="cursor-pointer"
                />
                <Menu
                  anchorEl={summaryAnchorEl}
                  open={Boolean(summaryAnchorEl)}
                  onClose={() => setSummaryAnchorEl(null)}
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                  transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                  PaperProps={{ sx: { bgcolor: 'var(--color-background)', p: 1 } }}
                >
                  {[
                    ...((filterType || []).map((t) => ({ key: `type:${t}`, type: 'type' as const, label: `Type: ${t}`, value: t }))),
                    ...((filterScope || []).map((s) => ({ key: `scope:${s}`, type: 'scope' as const, label: `Scope: ${s}`, value: s }))),
                    ...(filter && filter.trim() ? [{ key: 'text', type: 'text' as const, label: `Search: ${filter}`, value: filter }] : []),
                  ].map((item) => (
                    <MenuItem
                      key={item.key}
                      onClick={() => {
                        if (item.type === 'type') setFilterType((prev) => (prev || []).filter((v) => v !== item.value));
                        else if (item.type === 'scope') setFilterScope((prev) => (prev || []).filter((v) => v !== item.value));
                        else if (item.type === 'text') { setFilter(''); }
                      }}
                    >
                      <Checkbox size="small" checked={true} />
                      <ListItemText primary={item.label} />
                    </MenuItem>
                  ))}
                </Menu>
                <button
                  type="button"
                  className="btn-ghost ml-1"
                  title="Clear all filters"
                  onClick={() => {
                    setFilter('');
                    setFilterType([]);
                    setFilterScope([]);
                  }}
                >
                  <Tooltip title="Clear all filters" placement="top" arrow>
                    <CloseButton className="w-4 h-4" />
                  </Tooltip>
                </button>
              </>
            ) : (
              <>
                {filterType && filterType.length > 0 && (
                  filterType.map((t) => (
                    <Chip
                      key={`type-${t}`}
                      label={`Type: ${t}`}
                      size="small"
                      onDelete={() => setFilterType((prev) => (prev || []).filter((v) => v !== t))}
                      deleteIcon={<Tooltip title="Remove filter" placement='top' arrow><CloseButton className="btn-ghost block ml-2 w-3 h-3 stroke-gray-90 dark:stroke-gray-10 " /></Tooltip>}
                      className="cursor-pointer"
                    />
                  ))
                )}
                {filterScope && filterScope.length > 0 && (
                  filterScope.map((s) => (
                    <Chip
                      key={`scope-${s}`}
                      label={`Scope: ${s}`}
                      size="small"
                      onDelete={() => setFilterScope((prev) => (prev || []).filter((v) => v !== s))}
                      deleteIcon={<Tooltip title="Remove filter" placement='top' arrow><CloseButton className="btn-ghost block ml-2 w-3 h-3 stroke-gray-90 dark:stroke-gray-10 " /></Tooltip>}
                      className="cursor-pointer"
                    />
                  ))
                )}
              </>
            )}
          </div>

          {/* Bulk select toolbar */}
          <div className="ml-auto flex items-center gap-2">
            <Tooltip title={selectedCount > 0 ? `Deselect all` : 'Select all visible'} placement="top" arrow>
              <Badge badgeContent={selectedCount} color="primary">
                <span className="sr-only">{selectedCount} selected</span>
                <button
                  className={`btn-ghost ${selectedCount > 0 ? 'dark:[&>.lucide]:stroke-brand-30 [&>.lucide]:stroke-brand-70' : ''}`}
                  onClick={() => {
                    if (selectedCount > 0) {
                      deselectAll();
                    } else {
                      selectAllVisible();
                    }
                  }}
                  aria-label={selectedCount > 0 ? `Deselect all` : 'Select all visible'}
                >
                  {selectedCount > 0 ? <SquareSlash /> : <CheckSquare2 />}
                </button>
              </Badge>
            </Tooltip>
            {selectedCount > 0 && (
              <button className="btn-ghost" onClick={() => setIsBulkDeleteConfirmOpen(true)} title="Delete selected" aria-label="Delete selected">Delete</button>
            )}
          </div>
        </div>

        {/* Filter panel + content row */}
        <div className="flex flex-row items-start w-full mt-4">
          {/* Slide-in filter panel */}
          <div
            style={{
              width: filterPanelOpen ? '252px' : '0px',
              overflow: 'hidden',
              flexShrink: 0,
              transition: 'width 0.25s ease',
            }}
          >
            <div className="pr-4" style={{ width: '252px', minWidth: '252px' }}>
              <div className="rounded-lg border border-gray-20 dark:border-gray-70 bg-background-color p-3 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-primary">Filters</span>
                  <IconButton size="small" className="btn-ghost" onClick={() => setFilterPanelOpen(false)} aria-label="Close filters">
                    <XCircle className="w-4 h-4" />
                  </IconButton>
                </div>

                {/* Type accordion */}
                <Accordion defaultExpanded disableGutters elevation={0} sx={{ bgcolor: 'transparent', '&:before': { display: 'none' }, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <AccordionSummary expandIcon={<ChevronDown className="w-3.5 h-3.5" />} sx={{ p: 0, minHeight: 'unset', '& .MuiAccordionSummary-content': { my: '6px' } }}>
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-60 dark:text-gray-40">Type</span>
                  </AccordionSummary>
                  <AccordionDetails sx={{ p: 0, pb: 1 }}>
                    <div className="flex flex-col">
                      {uniqueTypes.map((t) => (
                        <label key={t} className="flex items-center gap-2 cursor-pointer text-sm py-0.5 px-1 rounded hover:bg-gray-10 dark:hover:bg-gray-80">
                          <Checkbox
                            size="small"
                            checked={(filterType || []).indexOf(t) > -1}
                            onChange={(e) => {
                              if (e.target.checked) setFilterType(prev => [...(prev || []), t]);
                              else setFilterType(prev => (prev || []).filter(v => v !== t));
                            }}
                            sx={{ p: 0 }}
                          />
                          {t}
                        </label>
                      ))}
                    </div>
                  </AccordionDetails>
                </Accordion>

                {/* Scope accordion */}
                <Accordion defaultExpanded disableGutters elevation={0} sx={{ bgcolor: 'transparent', '&:before': { display: 'none' }, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <AccordionSummary expandIcon={<ChevronDown className="w-3.5 h-3.5" />} sx={{ p: 0, minHeight: 'unset', '& .MuiAccordionSummary-content': { my: '6px' } }}>
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-60 dark:text-gray-40">Scope</span>
                  </AccordionSummary>
                  <AccordionDetails sx={{ p: 0, pb: 1 }}>
                    <div className="flex flex-col">
                      {['week', 'month', 'year'].map((s) => (
                        <label key={s} className="flex items-center gap-2 cursor-pointer text-sm py-0.5 px-1 rounded hover:bg-gray-10 dark:hover:bg-gray-80">
                          <Checkbox
                            size="small"
                            checked={(filterScope || []).indexOf(s) > -1}
                            onChange={(e) => {
                              if (e.target.checked) setFilterScope(prev => [...(prev || []), s]);
                              else setFilterScope(prev => (prev || []).filter(v => v !== s));
                            }}
                            sx={{ p: 0 }}
                          />
                          <span className="capitalize">{s}</span>
                        </label>
                      ))}
                    </div>
                  </AccordionDetails>
                </Accordion>

                <div className="flex justify-between items-center pt-2">
                  <button
                    type="button"
                    className="btn-ghost text-sm"
                    onClick={() => {
                      setFilterType([]);
                      setFilterScope([]);
                    }}
                  >
                    Clear all
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Summaries content */}
          <div className="flex-1 min-w-0">
            {/* Search field */}
            <TextField
              placeholder="Search summaries..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              variant="outlined"
              size="small"
              fullWidth
              className="mb-4 bg-white dark:bg-gray-90"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search className="w-4 h-4" />
                  </InputAdornment>
                ),
              }}
            />

            {/* Summaries grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {sortedAndFilteredSummaries.map((summary) => (
                <SummaryCard
                  key={summary.id}
                  content={summary.content}
                  title={summary.title}
                  format="card"
                  type={summary.type}
                  id={summary.id}
                  created_at={summary.created_at}
                  week_start={summary.week_start}
                  handleDelete={() => handleDeleteSummary(summary.id)}
                  handleEdit={() => openEditor(summary)}
                  selectable={true}
                  isSelected={selectedIds.includes(summary.id)}
                  onToggleSelect={(id: string) => {
                    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
                  }}
                />
              ))}
            </div>
            {sortedAndFilteredSummaries.length === 0 && summaries.length > 0 && (
              <div className="text-center text-gray-50 mt-16 space-y-4">
                <p>No summaries match the current filters.</p>
              </div>
            )}
          </div>
        </div>
      </>
    ) : (
      <div className="text-center text-gray-50 mt-16 space-y-4">
        {incompleteGoalsCount !== 0 ? (
          <>
            <p>You have {incompleteGoalsCount} goal{incompleteGoalsCount !== 1 ? 's' : ''}. <br />Create a summary when you're ready!</p>
            <SummaryGenerator
              summaryId={selectedSummary?.id || ''}
              summaryTitle={selectedSummary?.title || `Summary: ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`}
              selectedRange={new Date()}
              filteredGoals={goals}
              scope='week'
              className="flex w-auto mx-auto justify-center"
              onSummaryCreated={fetchSummariesData}
            />
          </>
        ) : (
          <>
            <p>You don't have any goals yet. Create a goal to start generating summaries.</p>
            <Button
              onClick={openGoalModal}
              variant='contained'
              className="btn-primary gap-3 flex mx-auto w-fit"
              aria-label="Add a new goal"
            >
              <span className="block flex text-nowrap">Add a Goal</span>
              <Target className="w-5 h-5" />
            </Button>
          </>
        )}
      </div>
    )}

      {/* Edit Summary Modal */}
      <Modal
        isOpen={isEditorOpen && !!selectedSummary}
        onRequestClose={() => setSelectedSummary(null)}
        shouldCloseOnOverlayClick={true}
        className={`fixed inset-0 flex items-center justify-center z-50`}
        overlayClassName={`${overlayClasses}`}
        ariaHideApp={ARIA_HIDE_APP}
      >
        {isEditorOpen && selectedSummary && (
          <SummaryEditor
            id={selectedSummary.id}
            type='User'
            title={selectedSummary.title}
            content={selectedSummary.content}
            onRequestClose={() => setSelectedSummary(null)}
            onSave={async (editedContent, editedTitle) => {
              try {
                await saveSummary(
                  setLocalSummaryId,
                  editedTitle || selectedSummary.title,
                  editedContent,
                  'User',
                  new Date(),
                  'week'
                );
                closeEditor();
                handleFetchSummaries();
              } catch (error) {
                console.error('Error saving edited summary:', error);
              }
            }}
          />
        )}
      </Modal>
      
      <ConfirmModal
        isOpen={isBulkDeleteConfirmOpen}
        title={`Delete ${selectedCount} summaries?`}
        message={`This will permanently delete ${selectedCount} summaries. This action cannot be undone.`}
        loading={bulkDeleting}
        onCancel={() => setIsBulkDeleteConfirmOpen(false)}
        onConfirm={async () => {
          const idsToDelete = [...selectedIds];
          const toDeleteSummaries = summaries.filter(s => idsToDelete.includes(s.id));
          // Optimistically remove from UI
          setSummaries(prev => prev.filter(s => !idsToDelete.includes(s.id)));
          setFilteredSummaries(prev => prev.filter(s => !idsToDelete.includes(s.id)));
          setSelectedIds([]);
          setIsBulkDeleteConfirmOpen(false);
          notifyWithUndo(
            `${idsToDelete.length} summaries deleted`,
            async () => {
              for (const id of idsToDelete) {
                await deleteSummary(id);
              }
            },
            () => {
              setSummaries(prev => [...prev, ...toDeleteSummaries]);
              setFilteredSummaries(prev => [...prev, ...toDeleteSummaries]);
            },
          );
        }}
      />
      <ConfirmModal
        isOpen={isSingleDeleteConfirmOpen}
        title={`Delete this summary?`}
        message={`This will permanently delete this summary. This action cannot be undone.`}
        loading={singleDeleting}
        onCancel={() => setIsSingleDeleteConfirmOpen(false)}
        onConfirm={async () => {
          await performDeleteSummary(singleDeleteId);
        }}
      />

      {/* Add Goal Modal */}
      <Modal
        isOpen={isGoalModalOpen}
        onRequestClose={closeGoalModal}
        shouldCloseOnOverlayClick={true}
        ariaHideApp={ARIA_HIDE_APP}
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
    </div>
    
  );
  };


export default AllSummaries;
