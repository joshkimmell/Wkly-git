import React, { useState, useEffect } from 'react';
import supabase from '@lib/supabase';
import { Task } from '@utils/goalUtils';
import { notifySuccess, notifyError, notifyWithUndo } from './ToastyNotification';
import { TextField, ToggleButtonGroup, ToggleButton, Tooltip, IconButton, Collapse, Badge, Menu, MenuItem } from '@mui/material';
import { List, LayoutGrid, Calendar as CalendarIcon, Plus, X, CheckSquare2, SquareSlash } from 'lucide-react';
import TaskCard from './TaskCard';
import TasksKanban from './TasksKanban';
import TasksCalendar from './TasksCalendar';
import ConfirmModal from './ConfirmModal';
import { STATUS_COLORS } from '../constants/statuses';

interface TasksListProps {
  goalId: string;
  goalTitle: string;
  goalDescription: string;
  onTaskCountChange?: (count: number) => void;
}

type ViewMode = 'list' | 'kanban' | 'calendar';

const TasksList: React.FC<TasksListProps> = ({ goalId, goalTitle, goalDescription, onTaskCountChange }) => {
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
    scheduled_date: '',
    scheduled_time: '',
  });

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
        ? data.sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
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
      
      const response = await fetch('/api/generatePlan', {
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

      const response = await fetch('/api/createTask', {
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
          scheduled_date: dataToUse.scheduled_date || null,
          scheduled_time: dataToUse.scheduled_time || null,
          order_index: tasks.length,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create task');
      }

      notifySuccess('Task created');
      if (!taskData) {
        // Only reset the form if not called from kanban
        setNewTask({
          title: '',
          description: '',
          status: 'Not started',
          scheduled_date: '',
          scheduled_time: '',
        });
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

      const response = await fetch('/api/updateTask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id: taskId, status: newStatus }),
      });

      if (!response.ok) {
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

  const deleteTask = (taskId: string) => {
    const taskToDelete = tasks.find(t => t.id === taskId);
    if (!taskToDelete) return;
    const prevCount = tasks.length;
    // Optimistically remove from UI
    setTasks(prev => prev.filter(t => t.id !== taskId));
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
  };

  const cancelEdit = () => {
    setEditingTaskId(null);
    setEditingTask({});
  };

  const saveEdit = async () => {
    if (!editingTaskId) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('User not authenticated');

      const response = await fetch('/api/updateTask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id: editingTaskId, ...editingTask }),
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
        fetch('/api/updateTask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ id: newTasks[taskIndex].id, order_index: taskIndex }),
        }),
        fetch('/api/updateTask', {
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

  const rescheduleTask = async (taskId: string, newDate: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('User not authenticated');

      const response = await fetch('/api/updateTask', {
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
          fetch('/api/updateTask', {
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
          fetch('/api/deleteTask', {
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
          <button
            onClick={generateTasks}
            disabled={isGenerating}
            className="btn-primary"
          >
            {isGenerating ? 'Generating...' : 'Generate Tasks with AI'}
          </button>
          <button
            onClick={() => setIsAddingTask(true)}
            className="btn-secondary"
          >
            <Plus className="w-4 h-4 inline mr-1" />
            Add Task Manually
          </button>
        </div>
        {isAddingTask && (
          <div className="mt-6 p-4 border rounded bg-background dark:border-gray-70">
            <h4 className="text-sm font-semibold mb-3 text-gray-90 dark:text-gray-10">Create a New Task</h4>
            <textarea
              placeholder="Task title..."
              value={newTask.title || ''}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              className="w-full p-2 border rounded mb-2 bg-background dark:border-gray-70 text-gray-90 dark:text-gray-10"
              rows={1}
            />
            <textarea
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
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Tooltip title="Add task">
            <IconButton 
              size="small" 
              onClick={() => setIsAddingTask(!isAddingTask)}
              className={isAddingTask ? 'text-primary' : ''}
            >
              {isAddingTask ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
            </IconButton>
          </Tooltip>
          
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
            <Tooltip title="Kanban view"><LayoutGrid className="w-4 h-4" /></Tooltip>
          </ToggleButton>
          <ToggleButton value="calendar" aria-label="Calendar view">
            <Tooltip title="Calendar view"><CalendarIcon className="w-4 h-4" /></Tooltip>
          </ToggleButton>
        </ToggleButtonGroup>
      </div>

      {/* Add Task Form */}
      <Collapse in={isAddingTask}>
        <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-80 rounded-lg border-2 border-dashed border-gray-30 dark:border-gray-60">
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
            <div className="flex gap-2">
              <TextField
                type="date"
                value={newTask.scheduled_date || ''}
                onChange={(e) => setNewTask(prev => ({ ...prev, scheduled_date: e.target.value }))}
                size="small"
                label="Scheduled Date"
                InputLabelProps={{ shrink: true }}
                className="flex-1"
              />
              <TextField
                type="time"
                value={newTask.scheduled_time || ''}
                onChange={(e) => setNewTask(prev => ({ ...prev, scheduled_time: e.target.value }))}
                size="small"
                label="Scheduled Time"
                InputLabelProps={{ shrink: true }}
                className="flex-1"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => {
                setIsAddingTask(false);
                setNewTask({
                  title: '',
                  description: '',
                  status: 'Not started',
                  scheduled_date: '',
                  scheduled_time: '',
                });
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
              <div key={task.id} className="p-3 bg-gray-50 dark:bg-gray-80 rounded-lg space-y-2">
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
                <div className="flex gap-2">
                  <TextField
                    type="date"
                    value={editingTask.scheduled_date || ''}
                    onChange={(e) => setEditingTask(prev => ({ ...prev, scheduled_date: e.target.value }))}
                    size="small"
                    label="Scheduled Date"
                    InputLabelProps={{ shrink: true }}
                  />
                  <TextField
                    type="time"
                    value={editingTask.scheduled_time || ''}
                    onChange={(e) => setEditingTask(prev => ({ ...prev, scheduled_time: e.target.value }))}
                    size="small"
                    label="Scheduled Time"
                    InputLabelProps={{ shrink: true }}
                  />
                </div>
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
          onEdit={startEdit}
          onDelete={(id) => setDeleteConfirmId(id)}
          onCreate={createTask}
          goalId={goalId}
        />
      )}

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <TasksCalendar
          tasks={tasks}
          onStatusChange={updateTaskStatus}
          onEdit={startEdit}
          onDelete={(id) => setDeleteConfirmId(id)}
          onReschedule={rescheduleTask}
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
