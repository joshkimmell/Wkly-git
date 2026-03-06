import { useState, useEffect, useMemo, useCallback } from 'react';
import { Task } from '@utils/goalUtils';
import TaskCard from './TaskCard';
import LoadingSpinner from './LoadingSpinner';
import { notifyError, notifySuccess, notifyWithUndo } from './ToastyNotification';
import supabase from '@lib/supabase';
import { useTouchDrag } from '@hooks/useTouchDrag';
import { 
  Box, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  SelectChangeEvent,
  Button
} from '@mui/material';

interface TaskWithGoal extends Omit<Task, 'goal'> {
  goal?: {
    id: string;
    title: string;
    category: string;
    status: string;
  } | null;
}

interface AllTasksKanbanProps {
  onRefresh?: () => void;
}

export default function AllTasksKanban({ onRefresh }: AllTasksKanbanProps) {
  const [tasks, setTasks] = useState<TaskWithGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [taskIdToEdit, setTaskIdToEdit] = useState<string | null>(null);
  
  // Filters
  const [selectedGoal, setSelectedGoal] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Drag and drop
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<Task['status'] | null>(null);

  const columns: Task['status'][] = ['Not started', 'In progress', 'Done'];

  // Fetch all tasks
  const fetchAllTasks = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('User not authenticated');

      const response = await fetch('/.netlify/functions/getAllTasks', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch tasks: ${response.status}`);
      }
      const data = await response.json();
      setTasks(data);
    } catch (error) {
      console.error('Error fetching all tasks:', error);
      notifyError('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllTasks();
  }, []);

  // Check for task to auto-edit from reminder notification
  useEffect(() => {
    try {
      const taskId = sessionStorage.getItem('wkly_edit_task_id');
      if (taskId) {
        setTaskIdToEdit(taskId);
        sessionStorage.removeItem('wkly_edit_task_id');
        // Clear after a delay to allow TaskCard to mount and open modal
        setTimeout(() => setTaskIdToEdit(null), 1000);
      }
    } catch (e) {
      console.warn('Failed to check for task to edit', e);
    }
  }, []);

  // Extract unique goals and categories for filter dropdowns
  const { goals, categories } = useMemo(() => {
    const goalsMap = new Map<string, { id: string; title: string }>();
    const categoriesSet = new Set<string>();

    tasks.forEach((task) => {
      if (task.goal) {
        goalsMap.set(task.goal.id, { id: task.goal.id, title: task.goal.title });
        if (task.goal.category) {
          categoriesSet.add(task.goal.category);
        }
      }
    });

    return {
      goals: Array.from(goalsMap.values()).sort((a, b) => a.title.localeCompare(b.title)),
      categories: Array.from(categoriesSet).sort(),
    };
  }, [tasks]);

  // Filter tasks based on selected filters
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (selectedGoal !== 'all' && task.goal?.id !== selectedGoal) return false;
      if (selectedCategory !== 'all' && task.goal?.category !== selectedCategory) return false;
      return true;
    });
  }, [tasks, selectedGoal, selectedCategory]);

  // Group tasks by status
  const tasksByStatus = useMemo(() => {
    const grouped: Record<Task['status'], TaskWithGoal[]> = {
      'Not started': [],
      'In progress': [],
      'Blocked': [],
      'On hold': [],
      'Done': [],
    };
    
    filteredTasks.forEach((task) => {
      if (grouped[task.status]) {
        grouped[task.status].push(task);
      }
    });

    // Sort by order_index within each column
    Object.keys(grouped).forEach((status) => {
      grouped[status as Task['status']].sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
    });

    return grouped;
  }, [filteredTasks]);

  // Task handlers
  const handleStatusChange = async (taskId: string, newStatus: Task['status']) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const oldStatus = task.status;
    // Optimistic update
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));

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
        body: JSON.stringify({ id: taskId, status: newStatus }),
      });

      if (!response.ok) throw new Error('Failed to update task status');
      notifySuccess('Task status updated');
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Error updating task status:', error);
      notifyError('Failed to update task status');
      // Revert on error
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: oldStatus } : t)));
    }
  };

  const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const oldTask = { ...task };
    // Optimistic update
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...updates } as TaskWithGoal : t)));

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
        body: JSON.stringify({ id: taskId, ...updates }),
      });

      if (!response.ok) throw new Error('Failed to update task');
      notifySuccess('Task updated');
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Error updating task:', error);
      notifyError('Failed to update task');
      // Revert on error
      setTasks((prev) => prev.map((t) => (t.id === taskId ? oldTask : t)));
    }
  };

  const handleDeleteTask = (taskId: string) => {
    const taskToDelete = tasks.find(t => t.id === taskId);
    if (!taskToDelete) return;
    // Optimistically remove from UI
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    notifyWithUndo(
      'Task deleted',
      async () => {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) throw new Error('User not authenticated');
        const response = await fetch('/.netlify/functions/deleteTask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ id: taskId }),
        });
        if (!response.ok) throw new Error('Failed to delete task');
        if (onRefresh) onRefresh();
      },
      () => {
        setTasks((prev) => [...prev, taskToDelete].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)));
      },
    );
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, status: Task['status']) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(status);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, newStatus: Task['status']) => {
    e.preventDefault();
    setDragOverColumn(null);

    if (!draggedTaskId) return;

    const task = tasks.find((t) => t.id === draggedTaskId);
    if (!task || task.status === newStatus) {
      setDraggedTaskId(null);
      return;
    }

    handleStatusChange(draggedTaskId, newStatus);
    setDraggedTaskId(null);
  };

  const handleTouchDrop = useCallback((taskId: string, dropTarget: HTMLElement) => {
    const newStatus = dropTarget.dataset.dropStatus as Task['status'] | undefined;
    if (newStatus) handleStatusChange(taskId, newStatus);
  }, []);

  const { getTouchProps } = useTouchDrag({
    onDragStart: (taskId) => setDraggedTaskId(taskId),
    onTouchDrop: handleTouchDrop,
  });

  const getColumnColor = (status: Task['status']) => {
    switch (status) {
      case 'Done':
        return 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20';
      case 'In progress':
        return 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20';
      default:
        return 'border-gray-30 dark:border-gray-70 bg-gray-50 dark:bg-gray-90/20';
    }
  };

  const getColumnHeaderColor = (status: Task['status']) => {
    switch (status) {
      case 'Done':
        return 'text-green-700 dark:text-green-400';
      case 'In progress':
        return 'text-blue-700 dark:text-blue-400';
      default:
        return 'text-gray-70 dark:text-gray-40';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Filters */}
      <Box className="flex flex-wrap gap-3 mb-4 p-4 bg-gray-50 dark:bg-gray-80 rounded-md">
        <FormControl size="small" className="min-w-[200px]">
          <InputLabel>Goal</InputLabel>
          <Select
            value={selectedGoal}
            label="Goal"
            onChange={(e: SelectChangeEvent) => setSelectedGoal(e.target.value)}
          >
            <MenuItem value="all">All Goals</MenuItem>
            {goals.map((goal) => (
              <MenuItem key={goal.id} value={goal.id}>
                {goal.title}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" className="min-w-[180px]">
          <InputLabel>Category</InputLabel>
          <Select
            value={selectedCategory}
            label="Category"
            onChange={(e: SelectChangeEvent) => setSelectedCategory(e.target.value)}
          >
            <MenuItem value="all">All Categories</MenuItem>
            {categories.map((category) => (
              <MenuItem key={category} value={category}>
                {category}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {(selectedGoal !== 'all' || selectedCategory !== 'all') && (
          <Button
            size="small"
            onClick={() => {
              setSelectedGoal('all');
              setSelectedCategory('all');
            }}
          >
            Clear Filters
          </Button>
        )}
      </Box>

      {/* Kanban Board */}
      <div className="flex-1 overflow-auto">
        <div className="flex gap-4 h-full">
          {columns.map((status) => {
            const columnTasks = tasksByStatus[status] || [];
            const isDragOver = dragOverColumn === status;

            return (
              <div
                key={status}
                data-drop-status={status}
                className={`flex-1 min-w-[300px] border-2 rounded-lg p-4 ${getColumnColor(status)} ${isDragOver ? 'ring-2 ring-blue-400 dark:ring-blue-600' : ''}`}
                onDragOver={(e) => handleDragOver(e, status)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, status)}
              >
                <h3 className={`text-lg font-semibold mb-4 ${getColumnHeaderColor(status)}`}>
                  {status}
                  <span className="ml-2 text-sm font-normal">({columnTasks.length})</span>
                </h3>

                <div className="space-y-3">
                  {columnTasks.map((task) => (
                    <div key={task.id} {...getTouchProps(task.id)}>
                      <TaskCard
                        task={task as Task}
                        onStatusChange={handleStatusChange}
                        onUpdate={handleUpdateTask}
                        onDelete={handleDeleteTask}
                        draggable
                        onDragStart={handleDragStart}
                        allowInlineEdit
                        hideStatusChip
                        autoOpenEditModal={taskIdToEdit === task.id}
                      />
                      {task.goal && (
                        <div className="mt-1 text-xs text-gray-50 dark:text-gray-40 px-3">
                          Goal: {task.goal.title}
                        </div>
                      )}
                    </div>
                  ))}

                  {columnTasks.length === 0 && (
                    <div className="text-center text-gray-40 dark:text-gray-60 py-8">
                      No tasks
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
