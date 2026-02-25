import React, { useState, useEffect, useRef } from 'react';
import { Task } from '@utils/goalUtils';
import { CheckCircle, Circle, Calendar, Bell, Trash, Edit, Clock, GripVertical, ChevronUp, ChevronDown, FileText, Tag } from 'lucide-react';
import { Edit2, Save, X as CloseButton, Plus as PlusIcon, Save as SaveIcon } from 'lucide-react';
import { IconButton, Tooltip, Chip, TextField, Button, Menu, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import DateTimePickerDialog from './DateTimePickerDialog';
import ConfirmModal from './ConfirmModal';
import RichTextEditor from './RichTextEditor';
import { objectCounter, modalClasses, overlayClasses } from '@styles/classes';
import supabase from '@lib/supabase';
import { notifyError, notifySuccess } from './ToastyNotification';
import { enhanceLinks, applyHighlight } from '@utils/functions';

interface TaskCardProps {
  task: Task;
  onStatusChange?: (taskId: string, newStatus: Task['status']) => void;
  onEdit?: (task: Task) => void;
  onUpdate?: (taskId: string, updates: Partial<Task>) => void;
  onDelete?: (taskId: string) => void;
  onMoveUp?: (taskId: string) => void;
  onMoveDown?: (taskId: string) => void;
  showMoveButtons?: boolean;
  isFirst?: boolean;
  isLast?: boolean;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent, taskId: string) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent, taskId: string) => void;
  compact?: boolean;
  allowInlineEdit?: boolean;
  hideStatusChip?: boolean;
  filter?: string; // For highlighting matching text
  selectable?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onStatusChange,
  onEdit,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  showMoveButtons = false,
  isFirst = false,
  isLast = false,
  draggable = false,
  onDragStart,
  onDragOver,
  onDrop,
  compact = false,
  allowInlineEdit = false,
  hideStatusChip = false,
  filter = '',
  selectable = false,
  isSelected = false,
  onToggleSelect,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDescription, setEditDescription] = useState(task.description || '');
  const [isFullEditModalOpen, setIsFullEditModalOpen] = useState(false);
  const [modalEditTitle, setModalEditTitle] = useState(task.title);
  const [modalEditDescription, setModalEditDescription] = useState(task.description || '');
  const [modalEditStatus, setModalEditStatus] = useState<Task['status']>(task.status);
  const [modalEditDate, setModalEditDate] = useState(task.scheduled_date || '');
  const [modalEditTime, setModalEditTime] = useState(task.scheduled_time || '');
  const [isDateTimeDialogOpen, setIsDateTimeDialogOpen] = useState(false);
  const [statusMenuAnchor, setStatusMenuAnchor] = useState<null | HTMLElement>(null);
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [isClosingRationaleDialogOpen, setIsClosingRationaleDialogOpen] = useState(false);
  const [closingRationale, setClosingRationale] = useState('');
  
  // Notes state
  const [notes, setNotes] = useState<Array<{ id: string; content: string; created_at: string; updated_at: string }>>([]);
  const [isNotesLoading, setIsNotesLoading] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteContent, setEditingNoteContent] = useState('');
  const [noteDeleteTarget, setNoteDeleteTarget] = useState<string | null>(null);
  
  // Ref for click-outside detection
  const cardRef = useRef<HTMLDivElement>(null);
  
  // Track display status for optimistic UI updates
  const [displayStatus, setDisplayStatus] = useState<Task['status']>(task.status);
  
  // Helper to get/set previous status from localStorage for cross-view persistence
  const getPreviousStatusFromStorage = (taskId: string): Task['status'] | null => {
    try {
      const stored = localStorage.getItem(`task_prev_status_${taskId}`);
      return stored as Task['status'] | null;
    } catch {
      return null;
    }
  };

  const setPreviousStatusToStorage = (taskId: string, status: Task['status']) => {
    try {
      localStorage.setItem(`task_prev_status_${taskId}`, status);
    } catch {
      // Ignore storage errors
    }
  };

  // Track the status before it was marked as Done, so we can toggle back
  // Initialize from localStorage if available, otherwise use current status or fallback
  const [previousStatus, setPreviousStatus] = useState<Task['status']>(() => {
    const stored = getPreviousStatusFromStorage(task.id);
    if (stored) return stored;
    return task.status === 'Done' ? 'Not started' : task.status;
  });
  const prevTaskStatusRef = useRef(task.status);

  // Sync displayStatus with task.status when prop changes
  useEffect(() => {
    setDisplayStatus(task.status);
  }, [task.status]);

  // Load notes when modal opens
  useEffect(() => {
    if (isNotesModalOpen && notes.length === 0) {
      loadNotes();
    }
  }, [isNotesModalOpen]);

  const loadNotes = async () => {
    setIsNotesLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('User not authenticated');
      
      const res = await fetch(`/api/getTaskNotes?task_id=${task.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!res.ok) throw new Error('Failed to fetch notes');
      const data = await res.json();
      setNotes(data || []);
    } catch (err) {
      console.error('Error loading task notes:', err);
      notifyError('Failed to load notes');
    } finally {
      setIsNotesLoading(false);
    }
  };

  const createNote = async () => {
    if (!newNoteContent.trim()) return;
    
    const tempId = `temp-${Date.now()}`;
    const tempNote = { 
      id: tempId, 
      content: newNoteContent, 
      created_at: new Date().toISOString(), 
      updated_at: new Date().toISOString() 
    };
    setNotes((s) => [tempNote, ...s]);
    setNewNoteContent('');
    setIsNotesLoading(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('User not authenticated');
      
      const res = await fetch(`/api/createTaskNote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ task_id: task.id, content: tempNote.content }),
      });
      
      if (!res.ok) throw new Error(await res.text());
      await loadNotes();
      notifySuccess('Note added');
    } catch (err: any) {
      console.error('Error creating note:', err);
      setNotes((s) => s.filter((n) => n.id !== tempId));
      notifyError('Failed to create note');
    } finally {
      setIsNotesLoading(false);
    }
  };

  const updateNote = async (noteId: string, content: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('User not authenticated');
      
      const res = await fetch(`/api/updateTaskNote`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: noteId, content }),
      });
      
      if (!res.ok) throw new Error(await res.text());
      await loadNotes();
      setEditingNoteId(null);
      setEditingNoteContent('');
      notifySuccess('Note updated');
    } catch (err: any) {
      console.error('Error updating note:', err);
      notifyError('Failed to update note');
    }
  };

  const deleteNote = async (noteId: string) => {
    const prior = notes;
    setNotes((s) => s.filter((n) => n.id !== noteId));
    setIsNotesLoading(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('User not authenticated');
      
      const res = await fetch(`/api/deleteTaskNote?note_id=${noteId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!res.ok) throw new Error(await res.text());
      notifySuccess('Note deleted');
    } catch (err: any) {
      console.error('Error deleting note:', err);
      setNotes(prior);
      notifyError('Failed to delete note');
    } finally {
      setIsNotesLoading(false);
    }
  };

  const openNotesModal = () => {
    setIsNotesModalOpen(true);
  };

  const closeNotesModal = () => {
    setIsNotesModalOpen(false);
    setNewNoteContent('');
    setEditingNoteId(null);
    setEditingNoteContent('');
  };

  // Update previousStatus when task status changes externally (not from Done)
  useEffect(() => {
    if (task.status !== prevTaskStatusRef.current) {
      // Only update previousStatus when transitioning between non-Done states
      // When transitioning from Done to not-Done, preserve the previous value
      if (task.status !== 'Done' && prevTaskStatusRef.current !== 'Done') {
        setPreviousStatus(task.status);
        setPreviousStatusToStorage(task.id, task.status);
      }
      prevTaskStatusRef.current = task.status;
    }
  }, [task.status, task.id]);

  // Click outside to cancel edit mode
  useEffect(() => {
    if (!isEditing) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(event.target as Node)) {
        // Cancel edit mode
        setEditTitle(task.title);
        setEditDescription(task.description || '');
        setIsEditing(false);
      }
    };

    // Add slight delay to prevent immediate cancellation on edit start
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isEditing, task.title, task.description]);
  
  const getStatusIcon = (status: Task['status']) => {
    // Only 2 visual states: Done (checkmark) or Not Done (circle)
    if (status === 'Done') {
      return <CheckCircle className="w-5 h-5 text-green-600" />;
    }
    return <Circle className="w-5 h-5 text-secondary-text" />;
  };

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'Done':
        return 'success';
      case 'In progress':
        return 'primary';
      default:
        return 'default';
    }
  };

  const cycleStatus = () => {
    if (!onStatusChange) return;
    
    let newStatus: Task['status'];
    if (displayStatus === 'Done') {
      // Toggle back to previous status
      newStatus = previousStatus;
      // Optimistically update display status immediately
      setDisplayStatus(newStatus);
      // Notify parent to update backend
      onStatusChange(task.id, newStatus);
    } else {
      // Save current status and mark as Done - but show rationale dialog first
      setPreviousStatus(displayStatus);
      setPreviousStatusToStorage(task.id, displayStatus);
      setIsClosingRationaleDialogOpen(true);
    }
  };

  // Parse date correctly to avoid timezone offset issues
  const formattedDate = task.scheduled_date 
    ? (() => {
        const [year, month, day] = task.scheduled_date.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      })()
    : null;

  const handleStartEdit = () => {
    if (allowInlineEdit) {
      setEditTitle(task.title);
      setEditDescription(task.description || '');
      setIsEditing(true);
    }
  };

  const handleSaveEdit = () => {
    if (onUpdate) {
      onUpdate(task.id, {
        title: editTitle,
        description: editDescription,
      });
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditTitle(task.title);
    setEditDescription(task.description || '');
    setIsEditing(false);
  };

  const handleOpenFullEditModal = () => {
    setModalEditTitle(task.title);
    setModalEditDescription(task.description || '');
    setModalEditStatus(task.status);
    setModalEditDate(task.scheduled_date || '');
    setModalEditTime(task.scheduled_time || '');
    setIsFullEditModalOpen(true);
  };

  const handleSaveFullEdit = () => {
    if (onUpdate) {
      const updates: Partial<Task> = {
        title: modalEditTitle,
        description: modalEditDescription,
        status: modalEditStatus,
        scheduled_date: modalEditDate || undefined,
        scheduled_time: modalEditTime || undefined,
      };
      onUpdate(task.id, updates);
    }
    setIsFullEditModalOpen(false);
  };

  const handleCancelFullEdit = () => {
    setIsFullEditModalOpen(false);
  };

  const handleDateClick = () => {
    if (onUpdate) {
      setIsDateTimeDialogOpen(true);
    }
  };

  const handleTimeClick = () => {
    if (onUpdate) {
      setIsDateTimeDialogOpen(true);
    }
  };

  const handleDateTimeSave = (date: string | null, time: string | null) => {
    if (onUpdate) {
      // Explicitly send null to clear fields when unscheduling
      const updates: any = {
        scheduled_date: date,
        scheduled_time: time,
      };
      onUpdate(task.id, updates);
    }
  };

  const handleStatusChipClick = (event: React.MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
    setStatusMenuAnchor(event.currentTarget);
  };

  const handleStatusMenuClose = () => {
    setStatusMenuAnchor(null);
  };

  const handleStatusSelect = (newStatus: Task['status']) => {
    if (!onStatusChange) return;
    
    // If selecting Done, show closing rationale dialog
    if (newStatus === 'Done' && displayStatus !== 'Done') {
      setStatusMenuAnchor(null);
      setIsClosingRationaleDialogOpen(true);
      return;
    }
    
    // If selecting a non-Done status, save it as previous for future toggles
    if (newStatus !== 'Done') {
      setPreviousStatus(newStatus);
      setPreviousStatusToStorage(task.id, newStatus);
    }
    
    // Optimistically update display status
    setDisplayStatus(newStatus);
    // Notify parent to update backend
    onStatusChange(task.id, newStatus);
    // Close menu
    setStatusMenuAnchor(null);
  };

  const handleNotesClick = () => {
    openNotesModal();
  };

  const handleClosingRationaleSubmit = () => {
    if (!onStatusChange) return;
    
    // Update to Done status with rationale
    setDisplayStatus('Done');
    
    // Update both status and closing_rationale
    if (onUpdate) {
      onUpdate(task.id, { 
        status: 'Done',
        closing_rationale: closingRationale || undefined 
      });
    }
    
    // Also call onStatusChange for components that only listen to that
    onStatusChange(task.id, 'Done');
    
    // Close dialog and reset
    setIsClosingRationaleDialogOpen(false);
    setClosingRationale('');
  };

  const handleClosingRationaleCancel = () => {
    setIsClosingRationaleDialogOpen(false);
    setClosingRationale('');
  };

  return (
    <div
      ref={cardRef}
      className={`${compact ? 'p-2' : 'p-3'} ${isSelected ? 'border-2 border-brand-50 bg-gray-20 dark:bg-brand-90' : 'border border-gray-20 dark:border-gray-70'} bg-background-color rounded-lg hover:shadow-md transition-all ${
        displayStatus === 'Done' ? 'opacity-60' : ''
      }`}
      draggable={draggable}
      onDragStart={(e) => onDragStart?.(e, task.id)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop?.(e, task.id)}
      onClick={(e) => {
        // If the click originated from an interactive element, don't toggle selection
        if (!selectable) return;
        const target = e.target as HTMLElement | null;
        if (target && typeof target.closest === 'function') {
          const interactive = target.closest('button, a, input, select, textarea, [role="button"]');
          if (interactive) return;
        }
        onToggleSelect?.(task.id);
      }}
    >
      <div className="flex flex-col items-start gap-2">
        <div className="flex flex-row justify-between w-full">
          {/* Drag handle */}
          {draggable && (
            <div className="cursor-grab active:cursor-grabbing mt-1">
              <GripVertical className="w-4 h-4 text-primary" />
            </div>
          )}

          {/* Status toggle */}
          <IconButton
            onClick={cycleStatus}
            className="text-tertiary-button mt-0.5 hover:scale-110 transition-transform"
            title={`${displayStatus}`}
          >
            <Tooltip title={`${displayStatus === 'Done' ? 'Reopen' : 'Close'}  `}>
              {getStatusIcon(displayStatus)}
            </Tooltip>
          </IconButton>
        </div>

        {/* Task content */}
        <div className="flex-1 w-full">
          {isEditing ? (
            <div className="space-y-2">
              <TextField
                fullWidth
                size="small"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Task title"
                autoFocus
              />
              {!compact && (
                <TextField
                  fullWidth
                  size="small"
                  multiline
                  rows={2}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Description (optional)"
                />
              )}
            </div>
          ) : (
            <>
              <div 
                className={`font-medium ${compact ? 'text-sm' : ''} ${displayStatus === 'Done' ? 'line-through text-tertiary-text' : 'text-primary-text'} ${allowInlineEdit ? 'cursor-pointer hover:text-primary-link' : ''}`}
                onClick={handleStartEdit}
                dangerouslySetInnerHTML={{ __html: applyHighlight(task.title, filter) }}
              />
              
              {!compact && task.description && (
                <div 
                  className="text-sm text-gray-60 dark:text-gray-40 mt-1 line-clamp-2 cursor-pointer hover:text-secondary-text dark:hover:text-tertiary-text"
                  onClick={handleStartEdit}
                  dangerouslySetInnerHTML={{ __html: applyHighlight(task.description, filter) }}
                />
              )}
            </>
          )}

          {/* Metadata */}
          <div className="flex flex-wrap h-auto gap-2 mt-2">
            {!task.scheduled_date && onUpdate && (
              <Button
                size="small"
                variant="outlined"
                startIcon={<Calendar className="w-3 h-3" />}
                onClick={() => setIsDateTimeDialogOpen(true)}
                sx={{ 
                  fontSize: '0.75rem', 
                  padding: '2px 8px',
                  textTransform: 'none'
                }}
              >
                Set Date & Time
              </Button>
            )}
            {task.scheduled_date && (
              <>
                <Chip
                  size="small"
                  icon={<Calendar className="w-3 h-3" />}
                  label={formattedDate}
                  className="text-xs"
                  onClick={handleDateClick}
                  sx={{ cursor: onUpdate ? 'pointer' : 'default' }}
                />
              </>
            )}
            {task.scheduled_time && (
              <>
                <Chip
                  size="small"
                  icon={<Clock className="w-3 h-3" />}
                  label={task.scheduled_time}
                  className="text-xs"
                  onClick={handleTimeClick}
                  sx={{ cursor: onUpdate ? 'pointer' : 'default' }}
                />
              </>
            )}
            {task.reminder_enabled && (
              <Chip
                size="small"
                icon={<Bell className="w-3 h-3" />}
                label="Reminder"
                className="text-xs"
                color="primary"
              />
            )}
            {task.goal?.category && (
              <Chip
                size="small"
                icon={<Tag className="w-3 h-3" />}
                label={task.goal.category}
                className="text-xs"
                variant="outlined"
              />
            )}
            {!hideStatusChip && (
              <Chip
                size="small"
                label={displayStatus}
                color={getStatusColor(displayStatus)}
                onClick={handleStatusChipClick}
                className="text-xs"
                sx={{ cursor: 'pointer' }}
              />
            )}

          </div>
        </div>

        {/* Actions */}
        <div className="flex w-full justify-end gap-1">
          {isEditing ? (
            <>
              <Tooltip title="Save">
                <IconButton size="small" onClick={handleSaveEdit} className="text-green-600 dark:text-green-400">
                  <Save className="w-4 h-4" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Cancel">
                <IconButton size="small" onClick={handleCancelEdit} className="text-red-600 dark:text-red-400">
                  <CloseButton className="w-4 h-4" />
                </IconButton>
              </Tooltip>
            </>
          ) : (
            <>
              {showMoveButtons && (
                <>
                  <Tooltip title="Move up">
                    <span>
                      <IconButton 
                        size="small" 
                        onClick={() => onMoveUp?.(task.id)}
                        disabled={isFirst}
                      >
                        <ChevronUp className="w-4 h-4" />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Move down">
                    <span>
                      <IconButton 
                        size="small" 
                        onClick={() => onMoveDown?.(task.id)}
                        disabled={isLast}
                      >
                        <ChevronDown className="w-4 h-4" />
                      </IconButton>
                    </span>
                  </Tooltip>
                </>
              )}
              
              {onEdit && !allowInlineEdit && (
                <Tooltip title="Edit task">
                  <IconButton size="small" onClick={() => onEdit(task)}>
                    <Edit2 className="w-4 h-4" />
                  </IconButton>
                </Tooltip>
              )}
              
              {allowInlineEdit && onUpdate && (
                <>
                  <Tooltip title="Edit all fields">
                    <IconButton size="small" onClick={handleOpenFullEditModal}>
                      <Edit className="w-4 h-4" />
                    </IconButton>
                  </Tooltip>
                </>
              )}

              <Tooltip title="Notes" placement="top" arrow>
                <span>
                  <IconButton 
                    aria-label="Notes"
                    size="small" 
                    onClick={handleNotesClick}
                    className="btn-ghost"
                  >
                    {notes.length > 0 && (
                      <div className={objectCounter}>{notes.length}</div>
                    )}
                    <FileText className="w-5 h-5" />
                  </IconButton>
                </span>
              </Tooltip>
              
              {onDelete && (
                <Tooltip title="Delete task">
                  <IconButton size="small" onClick={() => onDelete(task.id)}>
                    <Trash className="w-4 h-4" />
                  </IconButton>
                </Tooltip>
              )}
            </>
          )}
        </div>
      </div>

      {/* Date/Time Picker Dialog */}
      <DateTimePickerDialog
        open={isDateTimeDialogOpen}
        onClose={() => setIsDateTimeDialogOpen(false)}
        onSave={handleDateTimeSave}
        initialDate={task.scheduled_date}
        initialTime={task.scheduled_time}
        title="Set Date & Time"
      />

      {/* Status Menu */}
      <Menu
        anchorEl={statusMenuAnchor}
        open={Boolean(statusMenuAnchor)}
        onClose={handleStatusMenuClose}
      >
        <MenuItem 
          onClick={() => handleStatusSelect('Not started')}
          selected={displayStatus === 'Not started'}
        >
          Not started
        </MenuItem>
        <MenuItem 
          onClick={() => handleStatusSelect('In progress')}
          selected={displayStatus === 'In progress'}
        >
          In progress
        </MenuItem>
        <MenuItem 
          onClick={() => handleStatusSelect('Blocked')}
          selected={displayStatus === 'Blocked'}
        >
          Blocked
        </MenuItem>
        <MenuItem 
          onClick={() => handleStatusSelect('On hold')}
          selected={displayStatus === 'On hold'}
        >
          On hold
        </MenuItem>
        <MenuItem 
          onClick={() => handleStatusSelect('Done')}
          selected={displayStatus === 'Done'}
        >
          Done
        </MenuItem>
      </Menu>

      {/* Notes Modal */}
      {isNotesModalOpen && (
        <div 
          className={`${overlayClasses} flex items-center justify-center`}
          onMouseDown={(e) => {
            // close when clicking the backdrop (only when clicking the overlay itself)
            if (e.target === e.currentTarget) closeNotesModal();
          }}
        >
          <div className={`${modalClasses} w-full max-w-2xl`}>
            <div className='flex flex-row w-full justify-between items-start'>
              <h3 className="text-lg font-medium text-gray-90 mb-4">
                Notes for <br />"{task.title}"
              </h3>
              <div className="mb-4 flex justify-end">
                <button className="btn-ghost" onClick={closeNotesModal}>
                  <CloseButton className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="mt-4">
                <RichTextEditor
                  id={`new-task-note-${task.id}`}
                  value={newNoteContent}
                  onChange={setNewNoteContent}
                  placeholder="Add notes about this task..."
                  label="Add a new note"
                />
                <div className="mt-2 flex justify-end gap-2">
                  <button className="btn-primary" onClick={createNote} disabled={isNotesLoading}>
                    <PlusIcon className="w-4 h-4 inline mr-1" />Add note
                  </button>
                  {isNotesLoading && <div className="ml-2 text-sm text-secondary-text">Saving...</div>}
                </div>
              </div>
              {isNotesLoading && notes.length === 0 ? (
                <div className="text-sm text-secondary-text">Loading notes...</div>
              ) : null}
              {notes.length !== 0 && (
                <div>
                  <h4 className="text-md font-semibold mb-2">Existing notes</h4>
                  <ul className="space-y-3">
                    {notes.map((note) => (
                      <li key={note.id} className="p-3 border rounded bg-background dark:border-gray-70">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-xs text-secondary-text">{new Date(note.created_at).toLocaleString()}</div>
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              className="btn-ghost" 
                              onClick={() => { setEditingNoteId(note.id); setEditingNoteContent(note.content); }} 
                              title="Edit note"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button 
                              className="btn-ghost" 
                              onClick={() => setNoteDeleteTarget(note.id)} 
                              title="Delete note" 
                              disabled={isNotesLoading}
                            >
                              <Trash className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <div className="text-sm text-primary-text mt-2" dangerouslySetInnerHTML={{ __html: enhanceLinks(note.content) }} />
                        {editingNoteId === note.id && (
                          <div className="mt-2">
                            <RichTextEditor
                              id={`edit-task-note-${note.id}`}
                              value={editingNoteContent}
                              onChange={setEditingNoteContent}
                              placeholder="Edit note..."
                              label="Edit note"
                            />
                            <div className="mt-2 flex justify-end gap-2">
                              <button className="btn-ghost" onClick={() => { setEditingNoteId(null); setEditingNoteContent(''); }}>Cancel</button>
                              <button className="btn-primary" onClick={() => updateNote(note.id, editingNoteContent)}>
                                <SaveIcon className="w-4 h-4 inline mr-1" />Save
                              </button>
                            </div>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Full Edit Modal */}
      <Dialog
        open={isFullEditModalOpen}
        onClose={handleCancelFullEdit}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit Task</DialogTitle>
        <DialogContent dividers>
          <div className="space-y-4 mt-2">
            {/* Title */}
            <div>
              <label className="text-sm font-semibold block mb-1">Title</label>
              <TextField
                fullWidth
                value={modalEditTitle}
                onChange={(e) => setModalEditTitle(e.target.value)}
                placeholder="Task title"
                size="small"
              />
            </div>
            
            {/* Description */}
            <div>
              <label className="text-sm font-semibold block mb-1">Description</label>
              <TextField
                fullWidth
                value={modalEditDescription}
                onChange={(e) => setModalEditDescription(e.target.value)}
                placeholder="Task description"
                multiline
                rows={3}
                size="small"
              />
            </div>
            
            {/* Status */}
            <div>
              <label className="text-sm font-semibold block mb-1">Status</label>
              <select 
                className="w-full px-3 py-2 border border-gray-30 dark:border-gray-70 rounded bg-background-color text-primary-text"
                value={modalEditStatus}
                onChange={(e) => setModalEditStatus(e.target.value as Task['status'])}
              >
                <option value="Not started">Not started</option>
                <option value="In progress">In progress</option>
                <option value="Blocked">Blocked</option>
                <option value="On hold">On hold</option>
                <option value="Done">Done</option>
              </select>
            </div>
            
            {/* Date */}
            <div>
              <label className="text-sm font-semibold block mb-1">Scheduled Date</label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-gray-30 dark:border-gray-70 rounded bg-background-color text-primary-text"
                value={modalEditDate}
                onChange={(e) => setModalEditDate(e.target.value)}
              />
            </div>
            
            {/* Time */}
            <div>
              <label className="text-sm font-semibold block mb-1">Scheduled Time</label>
              <input
                type="time"
                className="w-full px-3 py-2 border border-gray-30 dark:border-gray-70 rounded bg-background-color text-primary-text"
                value={modalEditTime}
                onChange={(e) => setModalEditTime(e.target.value)}
                disabled={!modalEditDate}
              />
            </div>
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelFullEdit} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleSaveFullEdit} variant="contained" color="primary">
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmModal
        isOpen={!!noteDeleteTarget}
        title="Delete note?"
        message="Are you sure you want to delete this note? This action cannot be undone."
        onCancel={() => setNoteDeleteTarget(null)}
        onConfirm={async () => {
          if (!noteDeleteTarget) return;
          await deleteNote(noteDeleteTarget);
          setNoteDeleteTarget(null);
        }}
        confirmLabel="Delete"
        cancelLabel="Cancel"
      />

      {/* Closing Rationale Dialog */}
      <Dialog
        open={isClosingRationaleDialogOpen}
        onClose={handleClosingRationaleCancel}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Mark Task as Done</DialogTitle>
        <DialogContent>
          <p className="text-sm text-secondary-text mb-4">
            You're about to mark this task as complete. Would you like to add a note about why or how this was completed?
          </p>
          <TextField
            autoFocus
            margin="dense"
            label="Closing Note (Optional)"
            fullWidth
            multiline
            rows={4}
            value={closingRationale}
            onChange={(e) => setClosingRationale(e.target.value)}
            placeholder="e.g., Completed ahead of schedule, Requirements changed, etc."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosingRationaleCancel} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleClosingRationaleSubmit} variant="contained" color="success">
            Mark as Done
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default TaskCard;
