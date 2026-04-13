import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { Task, Goal } from '@utils/goalUtils';
import GoalCard from '@components/GoalCard';
import { useFocusMode } from '@context/FocusModeContext';
import { hasSession } from './focus/useFocusSession';
import { useFocusTimer } from './focus/FocusTimerContext';
import { formatTime } from './focus/FocusTimer';
import PomodoroTimer, { type PomodoroPhase } from './focus/PomodoroTimer';
import { usePomodoroSettings } from '@hooks/usePomodoroSettings';
import { CheckCircle, Calendar, Bell, Trash, Edit, Clock, GripVertical, ChevronUp, ChevronDown, FileText, Tag, Square, CheckSquare2, Target, Zap, CalendarX } from 'lucide-react';
import { Save, X as CloseButton, Plus as PlusIcon, Save as SaveIcon } from 'lucide-react';
import { IconButton, Tooltip, Chip, TextField, Button, Menu, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions, FormControlLabel, Switch, Select, FormControl, InputLabel, useMediaQuery, Popover } from '@mui/material';
import { DatePicker, TimePicker, DateTimePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import DateTimePickerDialog from './DateTimePickerDialog';
import ConfirmModal from './ConfirmModal';
import RichTextEditor from './RichTextEditor';
import { objectCounter, modalClasses, overlayClasses } from '@styles/classes';
import supabase from '@lib/supabase';
import { notifyError, notifySuccess, notifyWithUndo } from './ToastyNotification';
import { enhanceLinks, applyHighlight } from '@utils/functions';
import { useTimezone } from '@context/TimezoneContext';
import { useFireworks } from '@context/FireworksContext';
import { utcToDatetimeLocal, convertToUTC } from '@utils/timezone';
import { clearNotifiedReminder } from '@hooks/useReminderService';

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
  list?: boolean;
  allowInlineEdit?: boolean;
  hideStatusChip?: boolean;
  hideGoalChip?: boolean;
  hideCategory?: boolean;
  filter?: string; // For highlighting matching text
  selectable?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
  autoOpenEditModal?: boolean; // Auto-open edit modal on mount (for reminder navigation)
  onModalClose?: () => void;   // Called when the full edit modal closes (save or cancel)
  className?: string; // Allow passing additional class names
  onUnschedule?: (taskId: string) => void; // Remove task from calendar (AllTasksCalendar / TasksCalendar only)
  onBeforeFocusMode?: () => void; // Called before TaskFocusMode opens — lets parent close overlapping dialogs
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
  list = false,
  compact = false,
  allowInlineEdit = false,
  hideStatusChip = false,
  hideGoalChip = false,
  hideCategory = false,
  filter = '',
  selectable = false,
  isSelected = false,
  onToggleSelect,
  autoOpenEditModal = false,
  onModalClose,
  className = '',
  onUnschedule,
  onBeforeFocusMode,
}) => {
  const { timezone } = useTimezone();
  const { triggerFireworks } = useFireworks();
  const focusTimer = useFocusTimer();
  const { settings: pomodoroSettings } = usePomodoroSettings();
  const isTimerActive = focusTimer.isActiveFor(task.id);
  const isTimerRunning = isTimerActive && focusTimer.timerState === 'running';

  // Pomodoro pill state
  const [pomodoroPhase, setPomodoroPhase] = useState<PomodoroPhase>('focus');
  const [pomodoroRemaining, setPomodoroRemaining] = useState(pomodoroSettings.focusMinutes * 60);
  const [pomodoroPopoverAnchor, setPomodoroPopoverAnchor] = useState<HTMLElement | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDescription, setEditDescription] = useState(task.description || '');
  const [isFullEditModalOpen, setIsFullEditModalOpen] = useState(autoOpenEditModal && allowInlineEdit);
  const [modalEditTitle, setModalEditTitle] = useState(task.title);
  const [modalEditDescription, setModalEditDescription] = useState(task.description || '');
  const [modalEditStatus, setModalEditStatus] = useState<Task['status']>(task.status);
  const [modalEditDate, setModalEditDate] = useState(task.scheduled_date || '');
  const [modalEditTime, setModalEditTime] = useState(task.scheduled_time || '');
  const [modalSelectedDate, setModalSelectedDate] = useState<Dayjs | null>(task.scheduled_date ? dayjs(task.scheduled_date) : null);
  const [modalSelectedTime, setModalSelectedTime] = useState<Dayjs | null>(task.scheduled_time ? dayjs(`2000-01-01T${task.scheduled_time}`) : null);
  const [modalSelectedReminderDatetime, setModalSelectedReminderDatetime] = useState<Dayjs | null>(null);
  const [modalEditReminderEnabled, setModalEditReminderEnabled] = useState(task.reminder_enabled || false);
  const [modalEditReminderOffset, setModalEditReminderOffset] = useState<string>('30');
  const [modalEditReminderDatetime, setModalEditReminderDatetime] = useState<string>('');
  // Full-screen dialog on mobile
  const isMobile = useMediaQuery('(max-width: 600px)');
  const [isDateTimeDialogOpen, setIsDateTimeDialogOpen] = useState(false);
  const [statusMenuAnchor, setStatusMenuAnchor] = useState<null | HTMLElement>(null);
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [isClosingRationaleDialogOpen, setIsClosingRationaleDialogOpen] = useState(false);
  const [closingRationale, setClosingRationale] = useState('');
  
  // Notes state
  const [notes, setNotes] = useState<Array<{ id: string; content: string; created_at: string; updated_at: string }>>([]);
  const [isNotesLoading, setIsNotesLoading] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [noteRteResetKey, setNoteRteResetKey] = useState(0);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteContent, setEditingNoteContent] = useState('');
  const [noteDeleteTarget, setNoteDeleteTarget] = useState<string | null>(null);
  const [deleteTaskConfirmOpen, setDeleteTaskConfirmOpen] = useState(false);

  // Goal details dialog
  const [isGoalDetailsOpen, setIsGoalDetailsOpen] = useState(false);
  const [hasFocusSession, setHasFocusSession] = useState(() => hasSession(task.id));

  const { openFocusMode } = useFocusMode();

  const handleFocusDone = async (taskId: string) => {
    // Mark task done via status change callback + update
    onStatusChange?.(taskId, 'Done');
    await onUpdate?.(taskId, { status: 'Done' });
  };

  // Exposed so parent dialogs can close before focus mode mounts
  const handleCloseDialogs = () => {
    setIsFullEditModalOpen(false);
    setIsNotesModalOpen(false);
    setIsDateTimeDialogOpen(false);
    setStatusMenuAnchor(null);
    setIsGoalDetailsOpen(false);
    setIsClosingRationaleDialogOpen(false);
    setPomodoroPopoverAnchor(null);
  };

  const handleOpenFocusMode = async () => {
    // Close any open dialogs/modals before entering focus mode
    handleCloseDialogs();
    // Auto-advance status to In Progress when entering focus mode
    if (displayStatus !== 'In progress' && displayStatus !== 'Done') {
      setDisplayStatus('In progress');
      onStatusChange?.(task.id, 'In progress');
      if (onUpdate) {
        onUpdate(task.id, { status: 'In progress' });
      } else {
        // Fallback: direct API call if no onUpdate prop provided
        try {
          const { data: { session: authSess } } = await supabase.auth.getSession();
          const token = authSess?.access_token;
          if (token) {
            await fetch('/.netlify/functions/updateTask', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({ id: task.id, status: 'In progress' }),
            });
          }
        } catch { /* non-critical */ }
      }
    }
    // Open focus mode via app-level context so it survives any parent unmounts
    openFocusMode({
      task,
      goalTitle: (task as any).goal?.title,
      onDone: handleFocusDone,
      onClose: () => { setHasFocusSession(hasSession(task.id)); },
    });
    // Close parent dialog/modal after context has registered the request
    onBeforeFocusMode?.();
  };
  const [goalDetails, setGoalDetails] = useState<Goal | null>(null);
  const [goalDetailsLoading, setGoalDetailsLoading] = useState(false);

  const handleOpenGoalDetails = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!task.goal?.id) return;
    setIsGoalDetailsOpen(true);
    if (goalDetails?.id === task.goal.id) return; // already loaded
    setGoalDetailsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('User not authenticated');
      const res = await fetch(`/api/getAllGoals?goal_id=${task.goal.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch goal');
      const data = await res.json();
      if (data) setGoalDetails(data);
    } catch (err) {
      console.error('Failed to fetch goal details', err);
    } finally {
      setGoalDetailsLoading(false);
    }
  };
  
  // Ref for click-outside detection
  const cardRef = useRef<HTMLDivElement>(null);
  // Suppresses card selection for one tick after any floating menu/popover closes
  const menuJustClosedRef = useRef(false);
  
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

  // Load notes on component mount to display count
  useEffect(() => {
    if (notes.length === 0) {
      loadNotes();
    }
  }, [task.id]);

  // Load notes when modal opens (if they haven't been loaded yet)
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
    setNoteRteResetKey((k) => k + 1);
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

  const deleteNote = (noteId: string) => {
    const noteToDelete = notes.find(n => n.id === noteId);
    if (!noteToDelete) return;
    // Optimistically remove
    setNotes((s) => s.filter((n) => n.id !== noteId));
    notifyWithUndo(
      'Note deleted',
      async () => {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) throw new Error('User not authenticated');
        const res = await fetch(`/api/deleteTaskNote?note_id=${noteId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(await res.text());
      },
      () => {
        setNotes((s) => [...s, noteToDelete].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()));
      },
    );
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
    return <CheckCircle className="w-5 h-5 text-secondary-text" />;
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

  const handleOpenFullEditModal = useCallback(() => {
    setModalEditTitle(task.title);
    setModalEditDescription(task.description || '');
    setModalEditStatus(task.status);
    setModalEditDate(task.scheduled_date || '');
    setModalEditTime(task.scheduled_time || '');
    // Initialise reminder state
    setModalEditReminderEnabled(task.reminder_enabled || false);
    if (task.reminder_datetime && task.scheduled_date && task.scheduled_time) {
      const rem = new Date(task.reminder_datetime).getTime();
      const sched = new Date(`${task.scheduled_date}T${task.scheduled_time}`).getTime();
      const diffMin = Math.round((sched - rem) / 60000);
      const presets = [0, 15, 30, 60, 1440];
      const match = presets.find((p) => p === diffMin);
      if (match !== undefined) {
        setModalEditReminderOffset(String(match));
        setModalEditReminderDatetime('');
      } else {
        setModalEditReminderOffset('custom');
        setModalEditReminderDatetime(utcToDatetimeLocal(task.reminder_datetime, timezone));
      }
    } else if (task.reminder_datetime) {
      setModalEditReminderOffset('custom');
      setModalEditReminderDatetime(utcToDatetimeLocal(task.reminder_datetime, timezone));
    } else {
      setModalEditReminderOffset('30');
      setModalEditReminderDatetime('');
    }
    setModalSelectedDate(task.scheduled_date ? dayjs(task.scheduled_date) : null);
    setModalSelectedTime(task.scheduled_time ? dayjs(`2000-01-01T${task.scheduled_time}`) : null);
    setModalSelectedReminderDatetime(task.reminder_datetime ? dayjs(utcToDatetimeLocal(task.reminder_datetime, timezone)) : null);
    setIsFullEditModalOpen(true);
  }, [task, timezone]);

  // Auto-open edit modal if requested (for reminder navigation)
  // isFullEditModalOpen is already initialised to true from the prop; this
  // useLayoutEffect runs once on mount to properly populate reminder-related
  // state (offset/datetime) that can't be derived from simple useState init.
  useLayoutEffect(() => {
    if (autoOpenEditModal && allowInlineEdit) {
      handleOpenFullEditModal();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveFullEdit = () => {
    if (onUpdate) {
      // Compute reminder_datetime from offset or custom input (in UTC)
      let computedReminderDatetime: string | null = null;
      if (modalEditReminderEnabled) {
        try {
          if (modalEditReminderOffset === 'custom') {
            computedReminderDatetime = modalEditReminderDatetime
              ? new Date(modalEditReminderDatetime).toISOString()
              : null;
          } else if (modalEditDate && modalEditTime) {
            // Convert scheduled time from user's timezone to UTC
            const scheduledUTC = convertToUTC(modalEditDate, modalEditTime, timezone);
            const scheduledDate = new Date(scheduledUTC);
            scheduledDate.setMinutes(scheduledDate.getMinutes() - Number(modalEditReminderOffset));
            computedReminderDatetime = scheduledDate.toISOString();
          } else if (modalEditReminderDatetime) {
            computedReminderDatetime = new Date(modalEditReminderDatetime).toISOString();
          }
        } catch (error) {
          console.error('Failed to compute reminder datetime:', error);
          // If conversion fails, disable the reminder
          computedReminderDatetime = null;
        }
      }
      
      // If reminder datetime changed, clear it from notified list so it can fire again
      if (task.reminder_datetime !== computedReminderDatetime) {
        clearNotifiedReminder(task.id);
      }
      
      const updates: Partial<Task> = {
        title: modalEditTitle,
        description: modalEditDescription,
        status: modalEditStatus,
        scheduled_date: modalEditDate || undefined,
        scheduled_time: modalEditTime || undefined,
        reminder_enabled: modalEditReminderEnabled && computedReminderDatetime !== null,
        reminder_datetime: computedReminderDatetime ?? undefined,
      };
      onUpdate(task.id, updates);
      notifySuccess('Task updated successfully');
    }
    setIsFullEditModalOpen(false);
    onModalClose?.();
  };

  const handleCancelFullEdit = () => {
    setIsFullEditModalOpen(false);
    onModalClose?.();
  };

  const handleDateClick = () => {
    // if (onUpdate) {
      setIsDateTimeDialogOpen(true);
    // }
  };

  const handleTimeClick = () => {
    if (onUpdate) {
      setIsDateTimeDialogOpen(true);
    }
  };

  const handleDateTimeSave = (date: string | null, time: string | null, reminderEnabled?: boolean, reminderDatetime?: string | null) => {
    if (onUpdate) {
      // If reminder datetime changed, clear it from notified list so it can fire again
      if (task.reminder_datetime !== reminderDatetime) {
        clearNotifiedReminder(task.id);
      }
      
      // Explicitly send null to clear fields when unscheduling
      const updates: any = {
        scheduled_date: date,
        scheduled_time: time,
        reminder_enabled: reminderEnabled ?? false,
        reminder_datetime: reminderDatetime ?? null,
      };
      onUpdate(task.id, updates);
    }
  };

  const handleStatusChipClick = (event: React.MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
    setStatusMenuAnchor(event.currentTarget);
  };

  const closeStatusMenu = () => {
    setStatusMenuAnchor(null);
    menuJustClosedRef.current = true;
    setTimeout(() => { menuJustClosedRef.current = false; }, 0);
  };

  const handleStatusMenuClose = () => {
    closeStatusMenu();
  };

  const handleStatusSelect = (newStatus: Task['status']) => {
    if (!onStatusChange) return;
    
    // If selecting Done, show closing rationale dialog
    if (newStatus === 'Done' && displayStatus !== 'Done') {
      closeStatusMenu();
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
    closeStatusMenu();
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
    
    // Celebrate!
    triggerFireworks();
    
    // Close dialog and reset
    setIsClosingRationaleDialogOpen(false);
    setClosingRationale('');
  };

  const handleClosingRationaleCancel = () => {
    setIsClosingRationaleDialogOpen(false);
    setClosingRationale('');
  };

  // Derive a human-readable preview of when the alert will fire (shown inline in the modal, in user's timezone)
  const computedAlertPreview = React.useMemo(() => {
    if (!modalEditReminderEnabled) return '';
    if (modalEditReminderOffset === 'custom' || !modalEditDate || !modalEditTime) {
      if (!modalEditReminderDatetime) return '';
      try {
        // modalEditReminderDatetime is already in user's timezone (from utcToDatetimeLocal)
        return new Date(modalEditReminderDatetime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
      } catch {
        return '';
      }
    }
    try {
      // Scheduled time is in user's timezone
      const scheduledUTC = convertToUTC(modalEditDate, modalEditTime, timezone);
      const scheduledDate = new Date(scheduledUTC);
      scheduledDate.setMinutes(scheduledDate.getMinutes() - Number(modalEditReminderOffset));
      return scheduledDate.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
    } catch (error) {
      console.warn('Failed to compute alert preview:', error);
      return '';
    }
  }, [modalEditReminderEnabled, modalEditReminderOffset, modalEditDate, modalEditTime, modalEditReminderDatetime, timezone]);

  return (
    <div
      ref={cardRef}
      className={`${compact ? 'p-2 w-full' : `${list ? 'p-4 md:px-32' : 'p-3'}`} ${isSelected ? 'border-2 border-brand-50 bg-gray-20 dark:bg-brand-90' : isTimerRunning ? 'focus-timer-active border border-transparent' : `${!list ? 'border border-gray-20 dark:border-gray-70' : 'border-0'}`} bg-background-color-alpha rounded-md hover:shadow-md transition-all ${
        displayStatus === 'Done' ? 'opacity-60' : ''
      } ${className}`}
      draggable={draggable}
      onDragStart={(e) => onDragStart?.(e, task.id)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop?.(e, task.id)}
      onClick={() => {
        // Selection is only via the checkbox; card body clicks do nothing for selection
        if (menuJustClosedRef.current) return;
      }}
    >
      <div className={`flex w-full items-start gap-2 ${list ? 'flex-wrap justify-between' : 'flex-col'}`}>
        <div className={`flex flex-row py-2 justify-between ${list ? 'w-auto' : 'w-full'}`} onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-1">
            
            {/* Drag handle */}
            {draggable && (
              <div className="cursor-grab active:cursor-grabbing mt-1">
                <GripVertical className="w-4 h-4 text-primary" />
              </div>
            )}
          </div>
          <div className={`flex flex-wrap w-full items-center gap-3 ${list ? 'max-w-28' : 'justify-end'}`}>
            {/* Status toggle */}
            <IconButton
              onClick={cycleStatus}
              className="btn-ghost  md:!rounded-full text-tertiary-button mt-0.5 hover:scale-110 transition-transform"
              title={`${displayStatus === 'Done' ? 'Reopen' : 'Mark as done'} `}
            >
              <Tooltip title={`${displayStatus === 'Done' ? 'Reopen' : 'Mark as done'}  `} placement="top" arrow>
                {getStatusIcon(displayStatus)}
              </Tooltip>
              <span className=' md:hidden text-xs text-primary-text px-2 md:px-0'>{`${displayStatus === 'Done' ? 'Reopen' : 'Mark as done'}`}</span>
            </IconButton>

            {/* Start focus */}
            <span className="relative inline-flex flex-col items-center">
              <IconButton
                aria-label="Focus Mode"
                size="small"
                onClick={handleOpenFocusMode}
                className={`btn-ghost px-0 md:!rounded-full ${isTimerRunning ? '!bg-brand-60 transition-all animate-pulse duration-300' : ''}`}
              >
              <Tooltip title={`${
                isTimerActive
                  ? pomodoroSettings.timerMode === 'pomodoro'
                    ? ``
                    : `Timer: ${formatTime(focusTimer.elapsed)} — `
                  : ''
              }${hasFocusSession ? 'Resume Task' : 'Start Task'}`} placement="top" arrow>
                <Zap className={`w-5 h-5 ${hasFocusSession || isTimerActive ? 'text-interactive-icon' : ''}`} />
                </Tooltip>
                  <span className=' md:hidden text-xs text-primary-text text-nowrap px-2 md:px-0'>{`${hasFocusSession ? "Resume Task" : "Start Task"}`}</span>
              </IconButton>
              {/* Basic timer floating countdown */}
              {isTimerActive && pomodoroSettings.timerMode !== 'pomodoro' && (
                <span className="absolute text-xs font-mono text-interactive-icon leading-none -bottom-4 tabular-nums pointer-events-none">
                  {formatTime(focusTimer.elapsed)}
                </span>
              )}
            </span>

            {/* Pomodoro compact pill — only when pomodoro mode and timer active for this task */}
            {/* {isTimerActive && pomodoroSettings.timerMode === 'pomodoro' && (() => {
              const pillColor =
                pomodoroPhase === 'focus' ? { border: 'border-red-400/40', icon: 'text-red-500', dot: 'bg-red-500' }
                : pomodoroPhase === 'short-break' ? { border: 'border-blue-400/40', icon: 'text-blue-500', dot: 'bg-blue-500' }
                : { border: 'border-violet-400/40', icon: 'text-violet-500', dot: 'bg-violet-500' };
              return (
                <Tooltip arrow placement="top" title="View Timer" placement="top" arrow>
                  <button
                    onClick={(e) => { e.stopPropagation(); setPomodoroPopoverAnchor(e.currentTarget); }}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-background-color border ${pillColor.border} text-xs font-mono text-primary-text hover:opacity-80 transition-opacity`}
                  >
                    <Clock className={`w-3 h-3 ${pillColor.icon}`} />
                    <span className="tabular-nums">{formatTime(pomodoroRemaining)}</span>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      !isTimerRunning ? 'bg-gray-40' : `${pillColor.dot} animate-pulse`
                    }`} />
                  </button>
                </Tooltip>
              );
            })()} */}
          </div>
        </div>

        {/* Task content */}
        <div className="flex-1 px-2 w-full space-y-3">
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
              {/* Pomodoro compact pill — only when pomodoro mode and timer active for this task */}
            {isTimerActive && pomodoroSettings.timerMode === 'pomodoro' && (() => {
              const pillColor =
                pomodoroPhase === 'focus' ? { border: 'border-red-400/40', icon: 'text-red-500', dot: 'bg-red-500' }
                : pomodoroPhase === 'short-break' ? { border: 'border-blue-400/40', icon: 'text-blue-500', dot: 'bg-blue-500' }
                : { border: 'border-violet-400/40', icon: 'text-violet-500', dot: 'bg-violet-500' };
              return (
                <Tooltip title="View Timer" placement="top" arrow>
                  <button
                    onClick={(e) => { e.stopPropagation(); setPomodoroPopoverAnchor(e.currentTarget); }}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-background-color border ${pillColor.border} text-xs font-mono text-primary-text hover:opacity-80 transition-opacity`}
                  >
                    <Clock className={`w-3 h-3 ${pillColor.icon}`} />
                    <span className="tabular-nums">{formatTime(pomodoroRemaining)}</span>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      !isTimerRunning ? 'bg-gray-40' : `${pillColor.dot} animate-pulse`
                    }`} />
                  </button>
                </Tooltip>
              );
            })()}
                <div className="flex w-full items-start gap-2">
                    {/* Selection checkbox */}
                    {selectable && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onToggleSelect?.(task.id); }}
                        className="btn-ghost p-0.5 text-brand-50 dark:text-brand-30 rounded transition-colors"
                        aria-label={isSelected ? 'Deselect task' : 'Select task'}
                    >
                        {isSelected
                        ? <CheckSquare2 className="w-4 h-4 " />
                        : <Square className="w-4 h-4 text-gray-40 dark:text-gray-60" />}
                    </button>
                    )}
                    <div 
                        className={`font-medium ${compact ? 'text-sm' : ''} ${displayStatus === 'Done' ? 'line-through text-tertiary-text' : 'text-primary-text'} ${allowInlineEdit ? 'cursor-pointer hover:text-primary-link' : ''}`}
                        onClick={handleStartEdit}
                        dangerouslySetInnerHTML={{ __html: applyHighlight(task.title, filter) }}
                    />
                </div>
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
          <div className="flex flex-wrap w-full h-auto gap-2" onClick={(e) => e.stopPropagation()}>
            {!task.scheduled_date && onUpdate && (
              <Chip
                size="medium"
                variant="outlined"
                label={
                  <span className="flex items-center text-primary-link gap-2 px-2 py-1">
                    Set Date & Time
                  </span>
                }
                icon={<Calendar className="w-3 h-3 text-primary-text" />}
                onClick={() => setIsDateTimeDialogOpen(true)}
                className="!text-interactive-text max-h-7"
              />
                
              
            )}
            {task.scheduled_date && !hideCategory && (
              <>
                <Tooltip arrow placement="top" title="Edit date and time">
                  <Chip
                    size="medium"
                    icon={<Calendar className="w-3 h-3" />}
                    label={
                      <span className="flex items-center">
                        <span className="flex items-center text-interactive-text gap-2 pl-2 py-1">
                          {formattedDate}{task.scheduled_time ? ` ${task.scheduled_time}` : ''}
                          {task.reminder_enabled ? <><span className='min-w-3 h-auto'></span><span className='absolute right-0 bg-background rounded-full p-1'><Bell className="w-3 h-3 text-secondary-icon" /></span></> : null}
                        </span>
                      </span>
                    }
                    className="relative flex text-xs max-h-7 cursor-pointer"
                    onClick={handleDateClick}
                    variant="outlined"
                    // sx={{ cursor: onUpdate ? 'pointer' : 'default' }}
                  />
                </Tooltip>
              </>
            )}
            {task.scheduled_date && hideCategory && task.scheduled_time && (
              <>
                <Tooltip arrow placement="top" title="Edit date and time"><Chip
                  size="medium"
                  icon={<Clock className="w-3 h-3" />}
                  label={
                    <>
                    <span className="flex flex-row items-center text-secondary-text gap-2 pl-2 py-1">
                      {task.scheduled_time}
                      {task.reminder_enabled ? <><span className='min-w-3 h-auto'></span><span className='absolute right-0 bg-background rounded-full p-1'><Bell className="w-3 h-3 text-secondary-text" /></span></> : null}
                    </span>
                    </>
                  }
                  className="relative text-xs min-h-7 max-h-7 cursor-pointer"
                  variant='outlined'
                  onClick={handleTimeClick}
                  sx={{ cursor: onUpdate ? 'pointer' : 'default' }}
                />
                </Tooltip>
              </>
            )}
            {task.scheduled_time && !task.scheduled_date && (
              <>
                <Tooltip arrow placement="top" title="Edit time"><Chip
                  size="medium"
                  icon={<Clock className="w-3 h-3" />}
                  label={
                    <span className="flex flex-row items-center text-interactive-text gap-2 px-2 py-1">
                      {task.scheduled_time}
                      {task.reminder_enabled ? <Bell className="w-3 h-3 text-interactive-icon" /> : null}
                    </span>
                  }
                  className="text-xs h-auto max-h-7"
                  onClick={handleTimeClick}
                  variant='outlined'
                  sx={{ cursor: onUpdate ? 'pointer' : 'default' }}
                />
                </Tooltip>
              </>
            )}
            {!hideCategory && task.goal?.category && (
              <Chip
                size="medium"
                icon={<Tag className="w-3 h-3" />}
                label={
                  <span className="flex items-center text-secondary-text gap-2 px-2 py-1">
                    {task.goal.category}
                  </span>
                }
                className="gap-1 text-xs h-auto max-h-7"
                variant="outlined"
              />
              
            )}
            {!hideGoalChip && task.goal?.title && (
                  <Tooltip arrow placement="top" title="View goal details"><Chip
                    size="medium"
                    icon={<Target className="w-3 h-3 min-w-3" />}
                    label={
                      <span className="flex items-center py-1 text-secondary-text">
                        <span className='truncate'>{task.goal.title}</span>
                      </span>
                    }
                    className="w-auto text-xs px-2 py-1 min-w-[100px] max-h-7 cursor-pointer"
                    variant="outlined"
                    onClick={handleOpenGoalDetails}
                  />
                  </Tooltip>
            )}
            {!hideStatusChip && (
              <Tooltip arrow placement="top" title="Change status"><Chip
                size="medium"
                label={
                    <span className="flex items-center gap-2 px-2 py-1">
                      {displayStatus} {!statusMenuAnchor ?<ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
                    </span>
                }
                // icon={<Circle className="w-3 h-3" />}
                color={getStatusColor(displayStatus)}
                onClick={handleStatusChipClick}
                className="text-xs h-7 max-h-7"
                sx={{ cursor: 'pointer' }}
                variant='outlined'
              />
              </Tooltip>
            )}

          </div>
        </div>

        {/* Actions */}
        <div className={`flex ${list ? 'w-auto flex-wrap items-center' : 'w-full'} justify-end gap-1`} onClick={(e) => e.stopPropagation()}>
          {isEditing ? (
            <>
              <Tooltip arrow placement="top" title="Save">
                <IconButton size="small" onClick={handleSaveEdit} className="text-green-600 dark:text-green-400">
                  <Save className="w-4 h-4" />
                </IconButton>
              </Tooltip>
              <Tooltip arrow placement="top" title="Cancel">
                <IconButton size="small" onClick={handleCancelEdit} className="text-red-600 dark:text-red-400">
                  <CloseButton className="w-4 h-4" />
                </IconButton>
              </Tooltip>
            </>
          ) : (
            <>
              {showMoveButtons && (
                <>
                  <Tooltip arrow placement="top" title="Move up">
                    <span>
                      <IconButton 
                        size="small" 
                        onClick={() => onMoveUp?.(task.id)}
                        disabled={isFirst}
                      >
                        <ChevronUp className="w-5 h-5" />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip arrow placement="top" title="Move down">
                    <span>
                      <IconButton 
                        size="small" 
                        onClick={() => onMoveDown?.(task.id)}
                        disabled={isLast}
                      >
                        <ChevronDown className="w-5 h-5" />
                      </IconButton>
                    </span>
                  </Tooltip>
                </>
              )}
              
              {onEdit && !allowInlineEdit && (
                <Tooltip title="Edit task" placement="top" arrow>
                  <IconButton size="small" className='btn-ghost' onClick={() => onEdit(task)}>
                    <Edit className="w-5 h-5" />
                  </IconButton>
                </Tooltip>
              )}
              
              {allowInlineEdit && onUpdate && (
                <>
                  <Tooltip title="Edit all fields" placement="top" arrow>
                    <IconButton className='btn-ghost' size="small" onClick={handleOpenFullEditModal}>
                      <Edit className="w-5 h-5" />
                    </IconButton>
                  </Tooltip>
                </>
              )}

              {/* <Tooltip title={`${isTimerActive ? `Timer: ${formatTime(focusTimer.elapsed)} — ` : ''}${hasFocusSession ? "Resume Task" : "Start Task"}`} placement="top" arrow>
                <span className="relative inline-flex flex-col items-center">
                  <IconButton
                    aria-label="Focus Mode"
                    size="small"
                    onClick={handleOpenFocusMode}
                    className={`btn-ghost ${isTimerRunning ? 'bg-radial from-brand-40 from-40% to-transparent transition-all animate-pulse duration-300' : ''}`}
                    // style={{ background: 'radial-gradient(ellipse at center, var(--primary-background) 0%, transparent 100%), var(--background)' }}
                  >
                    <Zap className={`w-5 h-5 ${hasFocusSession || isTimerActive ? 'text-primary-link' : ''}`} />
                  </IconButton>
                  {isTimerActive && (
                    <span className="text-[9px] font-mono text-interactive-icon leading-none -mt-1 tabular-nums pointer-events-none">
                      {formatTime(focusTimer.elapsed)}
                    </span>
                  )}
                </span>
              </Tooltip> */}

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
              
              {onUnschedule && task.scheduled_date && (
                <Tooltip title="Remove from calendar" placement="top" arrow>
                  <IconButton className="btn-ghost" size="small" onClick={(e) => { e.stopPropagation(); onUnschedule(task.id); }}>
                    <CalendarX className="w-5 h-5" />
                  </IconButton>
                </Tooltip>
              )}

              {onDelete && (
                <Tooltip title="Delete task" placement="top" arrow>
                  <IconButton className='btn-ghost' size="small" onClick={(e) => { e.stopPropagation(); setDeleteTaskConfirmOpen(true); }}>
                    <Trash className="w-5 h-5" />
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
        initialReminderEnabled={task.reminder_enabled}
        initialReminderDatetime={task.reminder_datetime}
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
                  key={`new-task-note-rte-${task.id}-${noteRteResetKey}`}
                  id={`new-task-note-${task.id}`}
                  value={newNoteContent}
                  onChange={setNewNoteContent}
                  placeholder="Add notes about this task..."
                  label="Add a new note"
                />
                <div className="mt-2 flex justify-end gap-2">
                  <button className="btn-primary" onClick={createNote} disabled={isNotesLoading || !newNoteContent.replace(/<[^>]*>/g, '').trim()}>
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
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
        PaperProps={{
          elevation: 24,
          sx: {
            backgroundColor: 'var(--background-color)',
            backgroundImage: 'none',
          }
        }}
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
            <div className='py-2'>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={modalEditStatus}
                onChange={(e) => setModalEditStatus(e.target.value as Task['status'])}
                label="Status"
              >
                <MenuItem value="Not started">Not started</MenuItem>
                <MenuItem value="In progress">In progress</MenuItem>
                <MenuItem value="Blocked">Blocked</MenuItem>
                <MenuItem value="On hold">On hold</MenuItem>
                <MenuItem value="Done">Done</MenuItem>
              </Select>
            </FormControl>
            </div>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <div className="grid grid-cols-2 gap-4">
                {/* Date */}
                <DatePicker
                  label="Scheduled Date"
                  value={modalSelectedDate}
                  onChange={(newValue) => {
                    setModalSelectedDate(newValue);
                    setModalEditDate(newValue ? newValue.format('YYYY-MM-DD') : '');
                  }}
                  slotProps={{ textField: { size: 'small', fullWidth: true } }}
                />
                {/* Time */}
                <TimePicker
                  label="Scheduled Time"
                  value={modalSelectedTime}
                  onChange={(newValue) => {
                    setModalSelectedTime(newValue);
                    setModalEditTime(newValue ? newValue.format('HH:mm') : '');
                  }}
                  disabled={!modalEditDate}
                  slotProps={{ textField: { size: 'small', fullWidth: true } }}
                />
              </div>
            </LocalizationProvider>

            {/* Alert / Reminder */}
            <div className="border border-gray-20 dark:border-gray-70 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between space-y-2">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4" />
                  <label className="text-sm font-semibold">Alert</label>
                </div>
                <FormControlLabel
                  control={
                    <Switch
                      checked={modalEditReminderEnabled}
                      onChange={(e) => setModalEditReminderEnabled(e.target.checked)}
                      size="small"
                    />
                  }
                  label={modalEditReminderEnabled ? 'On' : 'Off'}
                  labelPlacement="start"
                  sx={{ marginLeft: 0, paddingY: 1 }}
                />
              </div>

              {modalEditReminderEnabled && (
                <div className="space-y-2 gap-2">
                  {modalEditDate && modalEditTime ? (
                    <FormControl fullWidth size="small" sx={{paddingY: 2}}>
                      <InputLabel>Alert time</InputLabel>
                      <Select
                        value={modalEditReminderOffset}
                        onChange={(e) => setModalEditReminderOffset(e.target.value)}
                        label="Alert time"
                      >
                        <MenuItem value="0">At time of task</MenuItem>
                        <MenuItem value="15">15 minutes before</MenuItem>
                        <MenuItem value="30">30 minutes before</MenuItem>
                        <MenuItem value="60">1 hour before</MenuItem>
                        <MenuItem value="1440">1 day before</MenuItem>
                        <MenuItem value="custom">Custom time</MenuItem>
                      </Select>
                    </FormControl>
                  ) : (
                    <p className="text-xs text-secondary-text">Set a scheduled date &amp; time above to use relative alerts, or pick a custom time.</p>
                  )}

                  {(modalEditReminderOffset === 'custom' || !modalEditDate || !modalEditTime) && (
                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                      <DateTimePicker
                        label="Custom alert date &amp; time"
                        value={modalSelectedReminderDatetime}
                        onChange={(newValue) => {
                          setModalSelectedReminderDatetime(newValue);
                          setModalEditReminderDatetime(newValue ? newValue.format('YYYY-MM-DDTHH:mm') : '');
                        }}
                        slotProps={{ textField: { size: 'small', fullWidth: true } }}
                      />
                    </LocalizationProvider>
                  )}

                  {computedAlertPreview && (
                    <p className="text-xs text-brand-60 dark:text-brand-30">
                      Alert at: {computedAlertPreview}
                    </p>
                  )}
                </div>
              )}
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
        isOpen={deleteTaskConfirmOpen}
        title="Delete task?"
        message="Are you sure you want to delete this task? This action cannot be undone."
        onCancel={() => setDeleteTaskConfirmOpen(false)}
        onConfirm={() => { setDeleteTaskConfirmOpen(false); onDelete?.(task.id); }}
        confirmLabel="Delete"
        cancelLabel="Cancel"
      />

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

      {/* Goal Details Dialog */}
      <Dialog
        open={isGoalDetailsOpen}
        onClose={() => setIsGoalDetailsOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          elevation: 24,
          sx: {
            backgroundColor: 'var(--background-color)',
            backgroundImage: 'none',
          }
        }}
      >
        <DialogContent sx={{ p: 0 }}>
          {goalDetailsLoading ? (
            <div className="py-8 text-center">
              <p className="text-sm text-secondary-text">Loading…</p>
            </div>
          ) : goalDetails ? (
            <GoalCard
              goal={goalDetails}
              handleDelete={() => {
                setIsGoalDetailsOpen(false);
                setGoalDetails(null);
              }}
              handleEdit={() => { /* handled inline via inlineEdit prop */ }}
              filter=""
              hideTasks={true}
              inlineEdit={true}
            />
          ) : (
            <div className="p-6">
              <p className="text-sm text-secondary-text py-4 text-center">Could not load goal details.</p>
              <div className="flex justify-end">
                <Button onClick={() => setIsGoalDetailsOpen(false)} color="inherit">Close</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Closing Rationale Dialog */}
      <Dialog
        open={isClosingRationaleDialogOpen}
        onClose={handleClosingRationaleCancel}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          elevation: 24,
          sx: {
            backgroundColor: 'var(--background)',
            backgroundImage: 'none',
          }
        }}
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

      {/* Pomodoro popover — keepMounted keeps PomodoroTimer (and its tick interval) alive
           even when the popover is closed, so the pill updates in real time. */}
      <Popover
        open={Boolean(pomodoroPopoverAnchor)}
        anchorEl={pomodoroPopoverAnchor}
        onClose={() => setPomodoroPopoverAnchor(null)}
        keepMounted
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        transformOrigin={{ vertical: 'top', horizontal: 'center' }}
        PaperProps={{
          elevation: 8,
          sx: { backgroundColor: 'var(--background-color)', backgroundImage: 'none', borderRadius: '12px', overflow: 'hidden' },
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-3 w-64">
          <PomodoroTimer
            taskId={task.id}
            settings={pomodoroSettings}
            onStart={() => focusTimer.startTimer(task.id, 0)}
            onPause={() => focusTimer.pauseTimer()}
            onResume={() => focusTimer.resumeTimer()}
            onReset={() => focusTimer.pauseTimer()} // pause instead of clear — keeps pill visible
            externalTimerState={focusTimer.isActiveFor(task.id) ? focusTimer.timerState : 'idle'}
            onStateChange={(phase, _state, remaining) => {
              setPomodoroPhase(phase);
              setPomodoroRemaining(remaining);
            }}
          />
        </div>
      </Popover>

      {/* Task Focus Mode is rendered at app level via FocusModeContext */}
    </div>
  );
};

export default TaskCard;
