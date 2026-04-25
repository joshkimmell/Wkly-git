import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '@lib/supabase';
import { Task } from '@utils/goalUtils';
import { notifySuccess, notifyError, notifyWithUndo, notifyTierLimit } from './ToastyNotification';
import { TextField, ToggleButtonGroup, ToggleButton, Tooltip, IconButton, Collapse, Badge, Menu, MenuItem, FormControl, InputLabel, Select, FormControlLabel, Switch } from '@mui/material';
import { List, Calendar as CalendarIcon, Plus, X, CheckSquare2, SquareSlash, Kanban, Bell, Sparkles, Unlock } from 'lucide-react';
import { DatePicker, TimePicker, DateTimePicker } from '@mui/x-date-pickers';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { useTimezone } from '@context/TimezoneContext';
import { useFireworks } from '@context/FireworksContext';
import { convertToUTC } from '@utils/timezone';
import TaskCard from './TaskCard';
import TasksKanban from './TasksKanban';
import TasksCalendar from './TasksCalendar';
import ConfirmModal from './ConfirmModal';
import { STATUS_COLORS } from '../constants/statuses';
import RichTextEditor from './RichTextEditor';
import { useTier } from '@hooks/useTier';

interface TasksListProps {
  goalId: string;
  goalTitle: string;
  goalDescription: string;
  goalCategory?: string;
  onTaskCountChange?: (count: number) => void;
  onBeforeFocusMode?: () => void; // Propagated to TaskCard — lets parent close overlapping dialogs
}

type ViewMode = 'list' | 'kanban' | 'calendar';

const TasksList: React.FC<TasksListProps> = ({ goalId, goalTitle, goalDescription, goalCategory, onTaskCountChange, onBeforeFocusMode }) => {
  const navigate = useNavigate();
  const { canGeneratePlan } = useTier();
  const { timezone } = useTimezone();
  const { triggerFireworks } = useFireworks();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Partial<Task>>({});
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('tasksViewMode');
    return (saved as ViewMode) || 'list';
  });
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTask, setNewTask] = useState<Partial<Task>>({
    title: '',
    description: '',
    status: 'Not started',
  });
  // Date/time picker + reminder state for Add Task form
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);
  const [selectedTime, setSelectedTime] = useState<Dayjs | null>(null);
  // Date/time picker state for Edit Task form
  const [editingSelectedDate, setEditingSelectedDate] = useState<Dayjs | null>(null);
  const [editingSelectedTime, setEditingSelectedTime] = useState<Dayjs | null>(null);
  const [editingReminderEnabled, setEditingReminderEnabled] = useState(false);
  const [editingReminderOffset, setEditingReminderOffset] = useState('30');
  const [editingReminderDatetime, setEditingReminderDatetime] = useState('');
  const [editingSelectedReminderDatetime, setEditingSelectedReminderDatetime] = useState<Dayjs | null>(null);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderOffset, setReminderOffset] = useState('30');
  const [reminderDatetime, setReminderDatetime] = useState('');
  const [selectedReminderDatetime, setSelectedReminderDatetime] = useState<Dayjs | null>(null);

  // Selection state for bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const selectedCount = selectedIds.size;
  const [bulkStatusAnchorEl, setBulkStatusAnchorEl] = useState<null | HTMLElement>(null);
  const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  
  const statusOptions = ['Not started', 'In progress', 'Blocked', 'On hold', 'Done'];

  // Persist view mode
  useEffect(() => {
    localStorage.setItem('tasksViewMode', viewMode);
  }, [viewMode]);

  useEffect(() => {
    fetchTasks();
  }, [goalId]);

  const fetchTasks = async () => {
    try {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('User not authenticated');

      const response = await fetch(`/api/getTasks?goal_id=${encodeURIComponent(goalId)}`, {
        headers:{ Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch tasks');
      }

      const data = await response.json();
      const sortedTasks = Array.isArray(data)
        ? data
            .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
            .map((t) => ({ ...t, goal: { id: goalId, category: goalCategory } }))
        : [];
      setTasks(sortedTasks);
      onTaskCountChange?.(sortedTasks.length);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      notifyError('Failed to load tasks');
    } finally {
      setIsLoading(false);
    }
  };

  const generateTasks = async () => {
    setIsGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('User not authenticated');
      
      const response = await fetch('/.netlify/functions/generatePlan', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ 
          title: goalTitle,
          description: goalDescription 
        }),
      });

      if (!response.ok) {
        const errorMessage = await response.text();
        throw new Error(errorMessage || 'Failed to generate tasks');
      }

      const data = await response.json();
      if (Array.isArray(data.tasks)) {
        // Create tasks from generated plan
        for (const task of data.tasks) {
          await createTask({
            title: task.title,
            description: task.description,
          });
        }
        await fetchTasks();
        notifySuccess(`Generated ${data.tasks.length} tasks for your goal`);
      }
    } catch (error) {
      console.error('Error generating tasks:', error);
      notifyError(error instanceof Error ? error.message : 'Failed to generate tasks');
    } finally {
      setIsGenerating(false);
    }
  };

  const createTask = async (taskData?: Partial<Task>) => {
    const dataToUse = taskData || newTask;
    
    if (!dataToUse.title?.trim()) {
      notifyError('Task title is required');
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('User not authenticated');

      // For form submissions (no taskData), use Dayjs date/time state + compute reminder
      const dateStr = !taskData && selectedDate ? selectedDate.format('YYYY-MM-DD') : (dataToUse.scheduled_date || null);
      const timeStr = !taskData && selectedTime ? selectedTime.format('HH:mm') : (dataToUse.scheduled_time || null);
      let computedReminderDatetime: string | null = null;
      let finalReminderEnabled = !taskData ? reminderEnabled : false;
      if (finalReminderEnabled) {
        try {
          if (reminderOffset === 'custom') {
            computedReminderDatetime = reminderDatetime ? new Date(reminderDatetime).toISOString() : null;
          } else if (dateStr && timeStr) {
            const scheduledUTC = convertToUTC(dateStr, timeStr, timezone);
            const scheduledDate = new Date(scheduledUTC);
            scheduledDate.setMinutes(scheduledDate.getMinutes() - Number(reminderOffset));
            computedReminderDatetime = scheduledDate.toISOString();
          } else if (reminderDatetime) {
            computedReminderDatetime = new Date(reminderDatetime).toISOString();
          }
        } catch (e) {
          computedReminderDatetime = null;
        }
        if (!computedReminderDatetime) finalReminderEnabled = false;
      }

      const response = await fetch('/.netlify/functions/createTask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          goal_id: goalId,
          title: dataToUse.title,
          description: dataToUse.description || null,
          status: dataToUse.status || 'Not started',
          scheduled_date: dateStr,
          scheduled_time: timeStr,
          reminder_enabled: finalReminderEnabled,
          reminder_datetime: computedReminderDatetime,
          order_index: tasks.length,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create task');
      }

      notifySuccess('Task created');
      if (!taskData) {
        // Only reset the form if not called from kanban
        setNewTask({ title: '', description: '', status: 'Not started' });
        setSelectedDate(null);
        setSelectedTime(null);
        setReminderEnabled(false);
        setReminderOffset('30');
        setReminderDatetime('');
        setSelectedReminderDatetime(null);
        setIsAddingTask(false);
      }
      await fetchTasks();
    } catch (error) {
      console.error('Error creating task:', error);
      notifyError('Failed to create task');
    }
  };

  const updateTaskStatus = async (taskId: string, newStatus: Task['status']) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('User not authenticated');

      // Optimistic update
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
      window.dispatchEvent(new CustomEvent('task:updated', { detail: { taskId, goalId, status: newStatus } }));

      const response = await fetch('/.netlify/functions/updateTask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id: taskId, status: newStatus }),
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        if (errBody?.error === 'tier_limit') {
          notifyTierLimit(errBody.message || 'Upgrade to activate more goals simultaneously.');
          // Revert the optimistic update
          fetchTasks();
          return;
        }
        throw new Error('Failed to update task');
      }

      notifySuccess('Task updated');
    } catch (error) {
      console.error('Error updating task:', error);
      notifyError('Failed to update task');
      // Revert on error
      fetchTasks();
    }
  };

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('User not authenticated');

      // Optimistic update
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));
      window.dispatchEvent(new CustomEvent('task:updated', { detail: { taskId, goalId, updates } }));

      const response = await fetch('/.netlify/functions/updateTask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id: taskId, ...updates }),
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        if (errBody?.error === 'tier_limit') {
          notifyTierLimit(errBody.message || 'Upgrade to activate more goals simultaneously.');
          fetchTasks();
          return;
        }
        throw new Error('Failed to update task');
      }

      notifySuccess('Task updated');
    } catch (error) {
      console.error('Error updating task:', error);
      notifyError('Failed to update task');
      fetchTasks();
    }
  };

  const deleteTask = (taskId: string) => {
    const taskToDelete = tasks.find(t => t.id === taskId);
    if (!taskToDelete) return;
    const prevCount = tasks.length;
    // Optimistically remove from UI
    setTasks(prev => prev.filter(t => t.id !== taskId));
    window.dispatchEvent(new CustomEvent('task:deleted', { detail: { taskId, goalId } }));
    onTaskCountChange?.(prevCount - 1);
    setDeleteConfirmId(null);
    notifyWithUndo(
      'Task deleted',
      async () => {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) throw new Error('User not authenticated');
        const response = await fetch(`/api/deleteTask?id=${encodeURIComponent(taskId)}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error('Failed to delete task');
      },
      () => {
        // Undo: restore the task
        setTasks(prev => [...prev, taskToDelete].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)));
        onTaskCountChange?.(prevCount);
      },
    );
  };

  const startEdit = (task: Task) => {
    setEditingTaskId(task.id);
    setEditingTask(task);
    setEditingSelectedDate(task.scheduled_date ? dayjs(task.scheduled_date) : null);
    setEditingSelectedTime(task.scheduled_time ? dayjs(`2000-01-01T${task.scheduled_time}`) : null);
    setEditingReminderEnabled(task.reminder_enabled ?? false);
    setEditingReminderOffset('30');
    setEditingReminderDatetime(task.reminder_datetime ?? '');
    setEditingSelectedReminderDatetime(task.reminder_datetime ? dayjs(task.reminder_datetime) : null);
  };

  const cancelEdit = () => {
    setEditingTaskId(null);
    setEditingTask({});
    setEditingSelectedDate(null);
    setEditingSelectedTime(null);
    setEditingReminderEnabled(false);
    setEditingReminderOffset('30');
    setEditingReminderDatetime('');
    setEditingSelectedReminderDatetime(null);
  };

  const saveEdit = async () => {
    if (!editingTaskId) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('User not authenticated');

      // Compute reminder_datetime from relative offset if needed
      let computedReminderDatetime: string | undefined = editingTask.reminder_datetime;
      if (editingReminderEnabled && editingReminderOffset !== 'custom') {
        const dateStr = editingSelectedDate?.format('YYYY-MM-DD');
        const timeStr = editingSelectedTime?.format('HH:mm');
        if (dateStr && timeStr) {
          try {
            const scheduledUTC = convertToUTC(dateStr, timeStr, timezone);
            const scheduledDate = new Date(scheduledUTC);
            scheduledDate.setMinutes(scheduledDate.getMinutes() - Number(editingReminderOffset));
            computedReminderDatetime = scheduledDate.toISOString();
          } catch { /* leave as-is */ }
        }
      }

      const response = await fetch('/.netlify/functions/updateTask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: editingTaskId,
          ...editingTask,
          reminder_enabled: editingReminderEnabled,
          reminder_datetime: editingReminderEnabled ? computedReminderDatetime : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update task');
      }

      await fetchTasks();
      setEditingTaskId(null);
      setEditingTask({});
      notifySuccess('Task updated');
    } catch (error) {
      console.error('Error updating task:', error);
      notifyError('Failed to update task');
    }
  };

  const moveTask = async (taskId: string, direction: 'up' | 'down') => {
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return;
    if (direction === 'up' && taskIndex === 0) return;
    if (direction === 'down' && taskIndex === tasks.length - 1) return;

    const newIndex = direction === 'up' ? taskIndex - 1 : taskIndex + 1;
    const newTasks = [...tasks];
    [newTasks[taskIndex], newTasks[newIndex]] = [newTasks[newIndex], newTasks[taskIndex]];

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('User not authenticated');

      setTasks(newTasks);

      await Promise.all([
        fetch('/.netlify/functions/updateTask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ id: newTasks[taskIndex].id, order_index: taskIndex }),
        }),
        fetch('/.netlify/functions/updateTask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ id: newTasks[newIndex].id, order_index: newIndex }),
        }),
      ]);
    } catch (error) {
      console.error('Error reordering tasks:', error);
      notifyError('Failed to reorder tasks');
      fetchTasks();
    }
  };

  const rescheduleTask = async (taskId: string, newDate: string | null) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('User not authenticated');

      const response = await fetch('/.netlify/functions/updateTask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id: taskId, scheduled_date: newDate }),
      });

      if (!response.ok) {
        throw new Error('Failed to reschedule task');
      }

      await fetchTasks();
      notifySuccess('Task rescheduled');
    } catch (error) {
      console.error('Error rescheduling task:', error);
      notifyError('Failed to reschedule task');
    }
  };

  // Selection handlers
  const toggleSelect = (taskId: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());
  const selectAllVisible = () => setSelectedIds(new Set(tasks.map(t => t.id)));
  const deselectAll = () => setSelectedIds(new Set());

  // Bulk action handlers
  const applyBulkStatus = async (status: string) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    try {
      setBulkActionLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('User not authenticated');

      const results = await Promise.allSettled(
        ids.map((id) =>
          fetch('/.netlify/functions/updateTask', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ id, status }),
          })
        )
      );

      const successCount = results.filter((r) => r.status === 'fulfilled').length;
      notifySuccess(`Updated ${successCount} of ${ids.length} tasks`);
      if (status === 'Done' && successCount > 0) triggerFireworks();
      setBulkStatusAnchorEl(null);
      clearSelection();
      await fetchTasks();
    } catch (error) {
      console.error('Error updating task statuses:', error);
      notifyError('Failed to update task statuses');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    try {
      setBulkActionLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('User not authenticated');

      const results = await Promise.allSettled(
        ids.map((id) =>
          fetch('/.netlify/functions/deleteTask', {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ id }),
          })
        )
      );

      const successCount = results.filter((r) => r.status === 'fulfilled').length;
      notifySuccess(`Deleted ${successCount} of ${ids.length} tasks`);
      setIsBulkDeleteConfirmOpen(false);
      clearSelection();
      await fetchTasks();
    } catch (error) {
      console.error('Error deleting tasks:', error);
      notifyError('Failed to delete tasks');
    } finally {
      setBulkActionLoading(false);
    }
  };

  if (isLoading) {
    return <div className="p-4 text-center">Loading tasks...</div>;
  }

  if (tasks.length === 0) {
    return (
      <div className="p-8 text-center text-gray-50">
        <p className="mb-4">No tasks yet. Tasks help you break down your goal into actionable steps.</p>
        <div className="flex gap-3 justify-center flex-wrap">
          {canGeneratePlan ? (
            <button
              onClick={generateTasks}
              disabled={isGenerating}
              className="btn-primary"
            >
              {isGenerating ? 'Generating...' : 'Generate Tasks with AI'}
            </button>
          ) : (
            <button
              onClick={() => navigate('/pricing')}
              className="btn-primary gap-2"
            >
              <Unlock className="w-4 h-4" />
              Upgrade to Generate Tasks
            </button>
          )}
          <button
            onClick={() => setIsAddingTask(true)}
            className="btn-secondary"
          >
            <Plus className="w-4 h-4 inline mr-1" />
            Add Task Manually
          </button>
        </div>
        {isAddingTask && (
          <div className="mt-6 p-4 border rounded bg-background dark:border-gray-70 space-y-4">
            <h4 className="text-sm font-semibold mb-3 text-gray-90 dark:text-gray-10">Create a New Task</h4>
            <TextField
              placeholder="Task title..."
              value={newTask.title || ''}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              className="w-full p-2 border rounded mb-2 bg-background dark:border-gray-70 text-gray-90 dark:text-gray-10"
              rows={1}
            />
            <TextField
              placeholder="Task description (optional)..."
              value={newTask.description || ''}
              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
              className="w-full p-2 border rounded mb-3 bg-background dark:border-gray-70 text-gray-90 dark:text-gray-10"
              rows={2}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setIsAddingTask(false);
                  setNewTask({ title: '', description: '' });
                }}
                className="btn-ghost"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  createTask();
                  setIsAddingTask(false);
                  setNewTask({ title: '', description: '' });
                }}
                disabled={isLoading}
                className="btn-primary"
              >
                Create Task
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* View mode toggle and bulk actions */}
      <div className="flex justify-between items-center p-2">
        <div className="flex items-center gap-2">
          {/* <Tooltip title="Add task"> */}
            <button 
              onClick={() => setIsAddingTask(!isAddingTask)}
              className='btn-primary gap-1 cursor-pointer'
              // className={isAddingTask ? 'btn-primary' : ''}
            >
              {isAddingTask ? (<>
              <X className="w-5 h-5" /> <span>Cancel</span></>) : (<> 
              <Plus className="w-5 h-5" /> <span>Add Task</span></>)}
            </button>
          {/* </Tooltip> */}
            {canGeneratePlan ? (
              <button
                onClick={generateTasks}
                disabled={isGenerating}
                className="btn-primary gap-1 cursor-pointer"
              >
                {isGenerating ? 'Generating...' : <><Sparkles className="w-4 h-4" /> Generate Tasks with AI</>}
              </button>
            ) : (
              <button
                onClick={() => navigate('/pricing')}
                className="btn-secondary gap-1 cursor-pointer"
              >
                <Unlock className="w-4 h-4" /> Upgrade to Generate
              </button>
            )}
          
          {viewMode === 'list' && (
            <>
              <Tooltip title={selectedCount === tasks.length ? 'Deselect all' : 'Select all'} placement="top" arrow>
                <Badge badgeContent={selectedCount} color="primary">
                  <IconButton
                    size="small"
                    className="btn-ghost"
                    onClick={() => { if (selectedCount === tasks.length) deselectAll(); else selectAllVisible(); }}
                    aria-label={selectedCount === tasks.length ? 'Deselect all' : 'Select all'}
                  >
                    {selectedCount === tasks.length ? <SquareSlash className="w-5 h-5" /> : <CheckSquare2 className="w-5 h-5" />}
                  </IconButton>
                </Badge>
              </Tooltip>

              {selectedCount > 0 && (
                <>
                  <button className="btn-ghost text-sm" onClick={() => setIsBulkDeleteConfirmOpen(true)} disabled={bulkActionLoading}>
                    Delete ({selectedCount})
                  </button>
                  <button
                    className="btn-ghost text-sm"
                    onClick={(e) => setBulkStatusAnchorEl(e.currentTarget)}
                    disabled={bulkActionLoading}
                  >
                    Status ({selectedCount})
                  </button>
                </>
              )}
            </>
          )}
        </div>
        
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(_, value) => value && setViewMode(value)}
          size="small"
        >
          <ToggleButton value="list" aria-label="List view">
            <Tooltip title="List view"><List className="w-4 h-4" /></Tooltip>
          </ToggleButton>
          <ToggleButton value="kanban" aria-label="Kanban view">
            <Tooltip title="Kanban view"><Kanban className="w-4 h-4" /></Tooltip>
          </ToggleButton>
          <ToggleButton value="calendar" aria-label="Calendar view">
            <Tooltip title="Calendar view"><CalendarIcon className="w-4 h-4" /></Tooltip>
          </ToggleButton>
        </ToggleButtonGroup>
      </div>

      {/* Add Task Form */}
      <Collapse in={isAddingTask}>
        <div className="mb-4 p-4 bg-background dark:bg-gray-100/30 rounded-md border-2 border-dashed border-gray-30 dark:border-gray-70">
          <div className="space-y-3">
            <TextField
              value={newTask.title || ''}
              onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
              size="small"
              fullWidth
              placeholder="Enter task title"
              label="Title *"
              autoFocus
            />
            <TextField
              value={newTask.description || ''}
              onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
              size="small"
              fullWidth
              multiline
              rows={2}
              placeholder="Add description (optional)"
              label="Description"
            />
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <div className="flex flex-col space-y-3">
                <DatePicker
                  label="Date"
                  value={selectedDate}
                  onChange={(newValue) => setSelectedDate(newValue)}
                  slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                />
                <TimePicker
                  label="Time (optional)"
                  value={selectedTime}
                  onChange={(newValue) => setSelectedTime(newValue)}
                  slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                />

                {/* Alert / Reminder */}
                <div className="border border-gray-20 dark:border-gray-70 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4" />
                      <label className="text-sm font-semibold">Alert</label>
                    </div>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={reminderEnabled}
                          onChange={(e) => setReminderEnabled(e.target.checked)}
                          size="small"
                        />
                      }
                      label={reminderEnabled ? 'On' : 'Off'}
                      labelPlacement="start"
                      sx={{ marginLeft: 0 }}
                    />
                  </div>

                  {reminderEnabled && (
                    <div className="space-y-2 gap-2">
                      {selectedDate && selectedTime ? (
                        <FormControl fullWidth size="small">
                          <InputLabel>Alert time</InputLabel>
                          <Select
                            value={reminderOffset}
                            onChange={(e) => setReminderOffset(e.target.value)}
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

                      {(reminderOffset === 'custom' || !selectedDate || !selectedTime) && (
                        <DateTimePicker
                          label="Custom alert date &amp; time"
                          value={selectedReminderDatetime}
                          onChange={(newValue) => {
                            setSelectedReminderDatetime(newValue);
                            setReminderDatetime(newValue ? newValue.format('YYYY-MM-DDTHH:mm') : '');
                          }}
                          slotProps={{ textField: { size: 'small', fullWidth: true } }}
                        />
                      )}

                      {(() => {
                        const dateStr = selectedDate?.format('YYYY-MM-DD');
                        const timeStr = selectedTime?.format('HH:mm');
                        if (reminderOffset === 'custom' || !dateStr || !timeStr) {
                          if (!reminderDatetime) return null;
                          try {
                            const preview = new Date(reminderDatetime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
                            return <p className="text-xs text-brand-60 dark:text-brand-30">Alert at: {preview}</p>;
                          } catch { return null; }
                        }
                        try {
                          const scheduledUTC = convertToUTC(dateStr, timeStr, timezone);
                          const scheduledDate = new Date(scheduledUTC);
                          scheduledDate.setMinutes(scheduledDate.getMinutes() - Number(reminderOffset));
                          const preview = scheduledDate.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
                          return <p className="text-xs text-brand-60 dark:text-brand-30">Alert at: {preview}</p>;
                        } catch { return null; }
                      })()}
                    </div>
                  )}
                </div>
              </div>
            </LocalizationProvider>
            <div className="flex gap-2 justify-end">
              <button onClick={() => {
                setIsAddingTask(false);
                setNewTask({ title: '', description: '', status: 'Not started' });
                setSelectedDate(null);
                setSelectedTime(null);
                setReminderEnabled(false);
                setReminderOffset('30');
                setReminderDatetime('');
                setSelectedReminderDatetime(null);
              }} className="btn-secondary btn-sm">Cancel</button>
              <button onClick={() => createTask()} className="btn-primary btn-sm">Add Task</button>
            </div>
          </div>
        </div>
      </Collapse>

      {/* List View */}
      {viewMode === 'list' && (
        <div className="space-y-2">
          {tasks.map((task, index) => {
            const isEditing = editingTaskId === task.id;

            return isEditing ? (
              <div key={task.id} className="p-3 bg-gray-20/60 dark:bg-gray-100/30 border border border-dashed border-brand-50 rounded-lg space-y-4">
                <TextField
                  value={editingTask.title || ''}
                  onChange={(e) => setEditingTask(prev => ({ ...prev, title: e.target.value }))}
                  size="small"
                  fullWidth
                  placeholder="Task title"
                  label="Title"
                />
                <TextField
                  value={editingTask.description || ''}
                  onChange={(e) => setEditingTask(prev => ({ ...prev, description: e.target.value }))}
                  size="small"
                  fullWidth
                  multiline
                  rows={2}
                  placeholder="Task description"
                  label="Description"
                />
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <DateTimePicker
                    label="Scheduled Date &amp; Time"
                    value={editingSelectedDate && editingSelectedTime
                      ? editingSelectedDate.hour(editingSelectedTime.hour()).minute(editingSelectedTime.minute())
                      : editingSelectedDate ?? null}
                    onChange={(newValue) => {
                      setEditingSelectedDate(newValue);
                      setEditingSelectedTime(newValue);
                      setEditingTask(prev => ({
                        ...prev,
                        scheduled_date: newValue ? newValue.format('YYYY-MM-DD') : '',
                        scheduled_time: newValue ? newValue.format('HH:mm') : '',
                      }));
                    }}
                    slotProps={{ textField: { size: 'small', fullWidth: true } }}
                  />

                  {/* Alert / Reminder */}
                  <div className="border border-gray-20 dark:border-gray-70 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4" />
                        <label className="text-sm font-semibold">Alert</label>
                      </div>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={editingReminderEnabled}
                            onChange={(e) => {
                              setEditingReminderEnabled(e.target.checked);
                              setEditingTask(prev => ({ ...prev, reminder_enabled: e.target.checked }));
                            }}
                            size="small"
                          />
                        }
                        label={editingReminderEnabled ? 'On' : 'Off'}
                        labelPlacement="start"
                        sx={{ marginLeft: 0 }}
                      />
                    </div>

                    {editingReminderEnabled && (
                      <div className="space-y-2">
                        {editingSelectedDate && editingSelectedTime ? (
                          <FormControl fullWidth size="small">
                            <InputLabel>Alert time</InputLabel>
                            <Select
                              value={editingReminderOffset}
                              onChange={(e) => setEditingReminderOffset(e.target.value)}
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

                        {(editingReminderOffset === 'custom' || !editingSelectedDate || !editingSelectedTime) && (
                          <DateTimePicker
                            label="Custom alert date &amp; time"
                            value={editingSelectedReminderDatetime}
                            onChange={(newValue) => {
                              setEditingSelectedReminderDatetime(newValue);
                              const iso = newValue ? newValue.toISOString() : '';
                              setEditingReminderDatetime(iso);
                              setEditingTask(prev => ({ ...prev, reminder_datetime: iso || undefined }));
                            }}
                            slotProps={{ textField: { size: 'small', fullWidth: true } }}
                          />
                        )}

                        {(() => {
                          const dateStr = editingSelectedDate?.format('YYYY-MM-DD');
                          const timeStr = editingSelectedTime?.format('HH:mm');
                          if (editingReminderOffset === 'custom' || !dateStr || !timeStr) {
                            if (!editingReminderDatetime) return null;
                            try {
                              const preview = new Date(editingReminderDatetime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
                              return <p className="text-xs text-brand-60 dark:text-brand-30">Alert at: {preview}</p>;
                            } catch { return null; }
                          }
                          try {
                            const scheduledUTC = convertToUTC(dateStr, timeStr, timezone);
                            const scheduledDate = new Date(scheduledUTC);
                            scheduledDate.setMinutes(scheduledDate.getMinutes() - Number(editingReminderOffset));
                            const preview = scheduledDate.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
                            return <p className="text-xs text-brand-60 dark:text-brand-30">Alert at: {preview}</p>;
                          } catch { return null; }
                        })()}
                      </div>
                    )}
                  </div>
                </LocalizationProvider>
                <div className="flex gap-2">
                  <button onClick={saveEdit} className="btn-primary btn-sm">Save</button>
                  <button onClick={cancelEdit} className="btn-secondary btn-sm">Cancel</button>
                </div>
              </div>
            ) : (
              <TaskCard
                key={task.id}
                task={task}
                onStatusChange={updateTaskStatus}
                onEdit={startEdit}
                onDelete={(id) => setDeleteConfirmId(id)}
                onMoveUp={(id) => moveTask(id, 'up')}
                onMoveDown={(id) => moveTask(id, 'down')}
                showMoveButtons
                isFirst={index === 0}
                isLast={index === tasks.length - 1}
                selectable
                isSelected={selectedIds.has(task.id)}
                onToggleSelect={toggleSelect}
                onBeforeFocusMode={onBeforeFocusMode}
                allowInlineEdit
              />
            );
          })}
        </div>
      )}

      {/* Kanban View */}
      {viewMode === 'kanban' && (
        <TasksKanban
          tasks={tasks}
          onStatusChange={updateTaskStatus}
          onUpdate={updateTask}
          onEdit={startEdit}
          onDelete={deleteTask}
          onCreate={createTask}
          goalId={goalId}
        />
      )}

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <TasksCalendar
          tasks={tasks}
          onStatusChange={updateTaskStatus}
          onUpdate={updateTask}
          onEdit={startEdit}
          onDelete={deleteTask}
          onReschedule={rescheduleTask}
          onUnschedule={(id) => rescheduleTask(id, null)}
        />
      )}

      {/* Delete confirmation modal */}
      <ConfirmModal
        isOpen={!!deleteConfirmId}
        title="Delete task?"
        message="Are you sure you want to delete this task? This action cannot be undone."
        onCancel={() => setDeleteConfirmId(null)}
        onConfirm={async () => {
          if (deleteConfirmId) {
            await deleteTask(deleteConfirmId);
          }
        }}
        confirmLabel="Delete"
        cancelLabel="Cancel"
      />

      {/* Bulk delete confirmation modal */}
      <ConfirmModal
        isOpen={isBulkDeleteConfirmOpen}
        title="Delete selected tasks?"
        message={`Are you sure you want to delete ${selectedCount} task${selectedCount !== 1 ? 's' : ''}? This action cannot be undone.`}
        onCancel={() => setIsBulkDeleteConfirmOpen(false)}
        onConfirm={handleBulkDelete}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        loading={bulkActionLoading}
      />

      {/* Bulk status menu */}
      <Menu
        id="bulk-status-menu"
        anchorEl={bulkStatusAnchorEl}
        open={Boolean(bulkStatusAnchorEl)}
        onClose={() => setBulkStatusAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        {statusOptions.map((s) => (
          <MenuItem
            key={s}
            onClick={() => applyBulkStatus(s)}
            className='text-xs'
          >
            <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 6, background: STATUS_COLORS[s], marginRight: 8 }} />
            {s}
          </MenuItem>
        ))}
      </Menu>
    </div>
  );
};

export default TasksList;
