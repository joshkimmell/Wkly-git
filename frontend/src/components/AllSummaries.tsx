import { useState, useEffect, useRef } from 'react';
import { TextField, Tooltip, IconButton, Badge, Popover, Box, FormControl, MenuItem, Checkbox, ListItemText, Chip, InputAdornment, Menu, List } from '@mui/material';
import Modal from 'react-modal';
import { ARIA_HIDE_APP } from '@lib/modal';
import ConfirmModal from '@components/ConfirmModal';
import { Summary } from '@utils/goalUtils'; // Adjust the import path as necessary
import { fetchSummaries, createSummary, deleteSummary, saveSummary } from '@utils/functions'; // Adjust the import path as necessary
import supabase from '@lib/supabase'; // Ensure this is the correct path to your Supabase client
import SummaryCard from '@components/SummaryCard';
import SummaryEditor from '@components/SummaryEditor';
// import SummaryGenerator from '@components/SummaryGenerator';
import { modalClasses, overlayClasses } from '@styles/classes'; // Adjust the import path as necessary
import ReactQuill from 'react-quill';
import { notifyError, notifySuccess } from './ToastyNotification';
import { CheckSquare2, Filter, SquareSlash, X as CloseButton } from 'lucide-react';
import { useTheme } from '@mui/material/styles';
// import Editor from '@components/Editor';


const AllSummaries = () => {
  const theme = useTheme();
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [filteredSummaries, setFilteredSummaries] = useState<Summary[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  // Removed unused summaryType state
  const [newSummary, setNewSummary] = useState<Summary>({
    id: '',
    scope: 'week', // Default scope
    title: '',
    description: '',
    content: '',
    type: '', 
    // format: '',
    week_start: '',
    user_id: '',
    created_at: ''
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
  // const [filterStartDate, setFilterStartDate] = useState<Dayjs | null>(null);
  // const [filterEndDate, setFilterEndDate] = useState<Dayjs | null>(null);
  const [filterAnchorEl, setFilterAnchorEl] = useState<HTMLElement | null>(null);
  const [summaryAnchorEl, setSummaryAnchorEl] = useState<HTMLElement | null>(null);
  const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [singleDeleteId, setSingleDeleteId] = useState<string | null>(null);
  const [isSingleDeleteConfirmOpen, setIsSingleDeleteConfirmOpen] = useState(false);
  const [singleDeleting, setSingleDeleting] = useState(false);
  // Count of active filters to display as a badge on the filter button
    const selectedFiltersCount =
        (filterStatus?.length || 0) +
        (filterCategory?.length || 0) +
        (filterType?.length || 0) +
        // (filterStartDate && filterEndDate ? 1 : 0) +
        (filter && filter.trim().length > 0 ? 1 : 0);

 
  const closeModal = () => {
    setIsModalOpen(false);
  };
  
  useEffect(() => {
    setFilteredSummaries(summaries); // Initialize filteredSummaries with summaries
  }, [summaries]);

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

  const performDeleteSummary = async (summaryId: string | null) => {
    if (!summaryId) return;
    setSingleDeleting(true);
    try {
      await deleteSummary(summaryId);
      // reset local newSummary and editor state if needed
      setNewSummary((prev) => ({ ...prev, id: '', title: '', content: '' } as Summary));
      setIsEditorOpen(false);
      await handleFetchSummaries();
      notifySuccess('Summary deleted successfully');
    } catch (error) {
      console.error('Error deleting summary:', error);
      notifyError('Error deleting summary.');
    } finally {
      setSingleDeleting(false);
      setIsSingleDeleteConfirmOpen(false);
      setSingleDeleteId(null);
    }
  };

  const handleAddSummary = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const title = formData.get('title') as string;
    const content = formData.get('content') as string;
    const week_start = formData.get('week_start') as string;
    // const summary_type = formData.get('summary_type') as string;

    // Get user_id from your auth/session context
    const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('User is not authenticated');
        return;
      }
    const user_id = user; // Ensure user_id is defined
      await createSummary({
        user_id,        
        content,        // string, not undefined
        summary_type: 'User',   
        week_start,     // string, e.g. '2025-06-02'
        title,
      });
      setNewSummary({
        id: '',
        scope: 'week', // Default scope
        title: '',
        description: '',
        content: '',
        type: 'User',
        week_start: '',
        user_id: user.id,
        created_at: new Date().toISOString(), // Set created_at to current time
      });
      closeModal; // Close the modal after adding
      handleFetchSummaries(); // Refresh summaries after adding
      notifySuccess('Summary added successfully');
    // Reset the form fields
    form.reset();
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

    // Status filter (defensive; Summary may not have status)
    if (filterStatus && filterStatus.length > 0) {
      result = result.filter((s: any) => filterStatus.includes((s.status || '') as string));
    }

    // Category filter (defensive)
    if (filterCategory && filterCategory.length > 0) {
      result = result.filter((s: any) => filterCategory.includes((s.category || '') as string));
    }

    setFilteredSummaries(result);
  }, [summaries, filter, filterType, filterStatus, filterCategory]);

  return (
    <div className="p-4">
      <div className="flex justify-between items-center">
        <h1 className="mt-4 block sm:hidden">Summaries</h1>
      </div> 
    
      {/* Filter and Sort Controls */}
      <div className="mt-4 h-10 flex items-center space-x-2">
        <Tooltip title="Open filters" placement="top" arrow>
          <span>
            <Badge badgeContent={(filterType?.length || 0)} color="primary" invisible={(filterType?.length || 0) === 0}>
              <IconButton
                className="btn-ghost mr-2"
                size="small"
                aria-label={`Open filters`}
                onClick={(e) => setFilterAnchorEl(e.currentTarget)}
                >
                <Filter className='w-5 h-5' />
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
          <Box sx={{ p: 2, width: 240 }}>
            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <label id="filter-type-label">Type</label>
              <List role="listbox" aria-labelledby="filter-type-label" sx={{ pl: 0 }}>
                {uniqueTypes.map((t) => {
                  const checked = (filterType || []).includes(t);
                  return (
                      <MenuItem
                      key={t}
                      onClick={() => {
                        setFilterType((prev) => (prev || []).includes(t) ? (prev || []).filter((v) => v !== t) : [...(prev || []), t]);
                      }}
                      selected={checked}
                      dense
                    >
                      <Checkbox size="small" edge="start" checked={checked} tabIndex={-1} disableRipple />
                      <ListItemText primary={t} />
                    </MenuItem>
                  );
                })}
              </List>
              {/* <Select
                labelId="filter-type-label"
                multiple
                value={filterType}
                label="Type"
                onChange={(e) => {
                  const val = (e.target as HTMLInputElement).value;
                  setFilterType(typeof val === 'string' ? val.split(',') : (val as string[]));
                }}
                renderValue={(selected) => (selected as string[]).join(', ')}
              >
                {/* <MenuItem value="">
                  <ListItemText primary="Any" />
                </MenuItem> */}
                {/* {uniqueTypes.map((t) => (
                  <MenuItem key={t} value={t}>
                    <Checkbox size="small" checked={(filterType || []).indexOf(t) > -1} />
                    <ListItemText primary={t} />
                  </MenuItem>
                ))} */}
              {/* </Select> */}
            </FormControl>
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                className="btn-ghost"
                onClick={() => {
                  setFilterType([]);
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

        {/* Filter chips */}
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
                      // ...(filterStartDate && filterEndDate ? [{ key: 'range', type: 'range' as const, label: `Range: ${filterStartDate.format('YYYY-MM-DD')} → ${filterEndDate.format('YYYY-MM-DD')}`, value: `${filterStartDate.format('YYYY-MM-DD')}|${filterEndDate.format('YYYY-MM-DD')}` }] : []),
                      ...(filter && filter.trim() ? [{ key: 'text', type: 'text' as const, label: `Search: ${filter}`, value: filter }] : []),
                  ].map((item) => (
                      <MenuItem
                          key={item.key}
                          onClick={() => {
                              // deselect individual
                              if (item.type === 'status') setFilterStatus((prev) => (prev || []).filter((v) => v !== item.value));
                              else if (item.type === 'category') setFilterCategory((prev) => (prev || []).filter((v) => v !== item.value));
                              // else if (item.type === 'range') { setFilterStartDate(null); setFilterEndDate(null); }
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
                      // setFilterStartDate(null);
                      // setFilterEndDate(null);
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
              {/* {filterStartDate && filterEndDate && (
                  <Chip
                      label={`Range: ${filterStartDate?.format('YYYY-MM-DD')} → ${filterEndDate?.format('YYYY-MM-DD')}`}
                      size="small"
                      onDelete={() => { setFilterStartDate(null); setFilterEndDate(null); }}
                      deleteIcon={<Tooltip title="Remove filter" placement='top' arrow><CloseButton className="btn-ghost block ml-2 w-3 h-3 stroke-gray-90 dark:stroke-gray-10 " /></Tooltip>}
                      className="gap-2 bg-gray-30 dark:bg-gray-70 text-gray-70 dark:text-gray-30"
                  />
              )} */}
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
                        // setFilterStartDate(null);
                        // setFilterEndDate(null);
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
        <>
          {((filterType || []).length > 0) && (filterType || []).map((t) => (
            <Chip key={`type-${t}`} label={`Type: ${t}`} size="small" onDelete={() => setFilterType((prev) => prev.filter((v) => v !== t))} 
              // className="gap-2 bg-gray-30 dark:bg-gray-70 text-gray-70 dark:text-gray-30 cursor-pointer" 
              />
          ))}
          {/* date range filters removed */}
        </>

        {/* Bulk toolbar */}
        <div className="selectAll">

          <div className={`floating-bulk${selectedCount > 0 ? '-toolbar flex-row align-start justify-start items-start' : ''}`} role="toolbar" aria-label="Bulk actions">
            <Tooltip title={selectedCount === visibleIdsArray.length ? 'Deselect all' : 'Select all'} placement="top" arrow>
              <Badge badgeContent={selectedCount} color="primary">
                <span className="sr-only">{selectedCount} selected</span>
                <button
                  className={`btn-ghost fb-btn`}
                  onClick={() => { if (selectedCount === visibleIdsArray.length) deselectAll(); else selectAllVisible(); }}
                  aria-label={selectedCount === visibleIdsArray.length ? 'Deselect all' : 'Select all'}
                >
                  {selectedCount === visibleIdsArray.length ? <SquareSlash /> : <CheckSquare2 />}
                </button>
              </Badge>
            </Tooltip>
            {selectedCount > 0 && (
              <div className="flex flex-col items-start justify-start sm:flex-row ml-2">
                <button className="btn-ghost fb-btn" onClick={() => setIsBulkDeleteConfirmOpen(true)}>Delete</button>
              </div>
            )}
          </div>
        
      {(selectedCount === 0 ) && (
        <TextField
          id="summary-filter"
          size="small"
          value={filter}
          onChange={(e) => handleFilterChange(e.target.value)}
          placeholder="Filter by title, type, or content"
          fullWidth
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <button
                  onClick={() => setSortDirection(dir => (dir === 'asc' ? 'desc' : 'asc'))}
                  className="border rounded px-2 py-1"
                  title="Toggle sort direction"
                >
                  {sortDirection === 'asc' ? '↑' : '↓'}
                </button>
              </InputAdornment>
            )
          }}
        />
      )}
      </div>
    </div>

      {/* Summaries List */}
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
      {sortedAndFilteredSummaries.length === 0 && (
        <div className="text-center text-gray-50 mt-4">
          No summaries found. Create a few goals to get started!
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
        

      {/* Add Summary Modal */}
      <Modal
        isOpen={isModalOpen}
        onRequestClose={() => closeModal()}
        shouldCloseOnOverlayClick={true}
        className="fixed inset-0 flex items-center justify-center z-50"
        overlayClassName={`${overlayClasses}`}
        ariaHideApp={ARIA_HIDE_APP}
      >
        {isModalOpen && (
          <form id="summaryForm" onSubmit={handleAddSummary} className={`${modalClasses}`}>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Add Summary</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="summary-title" className="block text-sm font-medium text-gray-700">Title</label>
                <TextField
                  id="summary-title"
                  name="title"
                  value={newSummary.title}
                  onChange={(e) => setNewSummary({ ...newSummary, title: e.target.value })}
                  fullWidth
                />
              </div>
              <div>
                <label htmlFor="summary-week-start" className="block text-sm font-medium text-gray-700">Select timeframe</label>
                <TextField
                  id="summary-week-start"
                  name="week_start"
                  type="date"
                  value={newSummary.week_start}
                  onChange={(e) => setNewSummary({ ...newSummary, week_start: e.target.value })}
                  fullWidth
                />
              </div>
              <div>
                <label htmlFor="summary-content" className="block text-sm font-medium text-gray-700">Content</label>
                <ReactQuill
                  id="summary-content"
                  value={newSummary.content}
                  className=""
                  onChange={(value) =>
                    setNewSummary({ ...newSummary, content: value })
                  }
                />
                <input
                  type="hidden"
                  name="content"
                  value={newSummary.content}
                  readOnly
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-4">
              <button
                onClick={() => closeModal()}
                className="btn-secondary"
                aria-label="Cancel"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary"
              >
                Add
              </button>
            </div>
          </form>
        )}
      </Modal>
      
      <ConfirmModal
        isOpen={isBulkDeleteConfirmOpen}
        title={`Delete ${selectedCount} summaries?`}
        message={`This will permanently delete ${selectedCount} summaries. This action cannot be undone.`}
        loading={bulkDeleting}
        onCancel={() => setIsBulkDeleteConfirmOpen(false)}
        onConfirm={async () => {
          setBulkDeleting(true);
          try {
            for (const id of selectedIds) {
              await deleteSummary(id);
            }
            notifySuccess('Deleted selected summaries');
            setSelectedIds([]);
            await handleFetchSummaries();
          } catch (err) {
            console.error('Failed to delete selected summaries', err);
            notifyError('Failed to delete some summaries');
            await handleFetchSummaries();
          } finally {
            setBulkDeleting(false);
            setIsBulkDeleteConfirmOpen(false);
          }
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
    </div>
    
  );
  };


export default AllSummaries;
