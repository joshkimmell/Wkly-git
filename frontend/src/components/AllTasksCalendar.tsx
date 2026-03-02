import { useState, useEffect, useMemo, useCallback } from 'react';
import { Task } from '@utils/goalUtils';
import TaskCard from './TaskCard';
import { notifyError, notifySuccess, notifyWithUndo } from './ToastyNotification';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import supabase from '@lib/supabase';
import { useTouchDrag } from '@hooks/useTouchDrag';
import { 
    CircularProgress,
  IconButton,
  Tooltip
} from '@mui/material';

interface TaskWithGoal extends Omit<Task, 'goal'> {
  goal?: {
    id: string;
    title: string;
    category: string;
    status: string;
  } | null;
}

interface AllTasksCalendarProps {
  onRefresh?: () => void;
  // Filters from parent (AllGoals)
  textFilter?: string;
  statusFilter?: string[];
  categoryFilter?: string[];
  goalFilter?: string[];
  startDateFilter?: Date | null;
  endDateFilter?: Date | null;
  // Selection props
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string, type: 'goals' | 'tasks') => void;
  onVisibleTasksChange?: (taskIds: string[]) => void;
}

export default function AllTasksCalendar({ 
  onRefresh, 
  textFilter = '',
  statusFilter = [],
  categoryFilter = [],
  goalFilter = [],
  startDateFilter = null,
  endDateFilter = null,
  selectedIds = new Set(),
  onToggleSelect,
  onVisibleTasksChange
}: AllTasksCalendarProps) {
  const [tasks, setTasks] = useState<TaskWithGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  // Fetch all tasks
  const fetchAllTasks = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('User not authenticated');

      // Reschedule any overdue incomplete tasks to today before fetching
      await fetch('/api/rescheduleOverdueTasks', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      const response = await fetch('/api/getAllTasks', {
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

  // Filter tasks based on parent filters only
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Parent text filter (search)
      if (textFilter) {
        const searchLower = textFilter.toLowerCase();
        const titleMatch = (task.title || '').toLowerCase().includes(searchLower);
        const goalTitleMatch = (task.goal?.title || '').toLowerCase().includes(searchLower);
        const categoryMatch = (task.goal?.category || '').toLowerCase().includes(searchLower);
        if (!titleMatch && !goalTitleMatch && !categoryMatch) return false;
      }

      // Parent status filter
      if (statusFilter.length > 0 && !statusFilter.includes(task.status || '')) return false;

      // Parent category filter (from goal)
      if (categoryFilter.length > 0 && !categoryFilter.includes(task.goal?.category || '')) return false;

      // Parent goal filter
      if (goalFilter.length > 0 && !goalFilter.includes(task.goal?.id || '')) return false;

      // Parent date range filter (scheduled_date)
      if (startDateFilter && task.scheduled_date) {
        const taskDate = new Date(task.scheduled_date);
        if (taskDate < startDateFilter) return false;
      }
      if (endDateFilter && task.scheduled_date) {
        const taskDate = new Date(task.scheduled_date);
        if (taskDate > endDateFilter) return false;
      }

      return true;
    });
  }, [tasks, textFilter, statusFilter, categoryFilter, goalFilter, startDateFilter, endDateFilter]);

  // Calendar logic
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = firstDay.getDay(); // 0 = Sunday
    const daysInMonth = lastDay.getDate();

    const days: Date[] = [];
    
    // Add previous month's trailing days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDay - 1; i >= 0; i--) {
      days.push(new Date(year, month - 1, prevMonthLastDay - i));
    }

    // Add current month's days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    // Add next month's leading days to complete the grid (6 weeks = 42 days)
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push(new Date(year, month + 1, i));
    }

    return days;
  }, [currentDate]);

  // Group tasks by date (sorted chronologically by time)
  const tasksByDate = useMemo(() => {
    const grouped = new Map<string, TaskWithGoal[]>();
    
    filteredTasks.forEach((task) => {
      if (task.scheduled_date) {
        const dateKey = task.scheduled_date;
        if (!grouped.has(dateKey)) {
          grouped.set(dateKey, []);
        }
        grouped.get(dateKey)!.push(task);
      }
    });

    // Sort each day's tasks chronologically by scheduled_time
    grouped.forEach((tasksOnDate) => {
      tasksOnDate.sort((a, b) => {
        const timeA = a.scheduled_time || '23:59';
        const timeB = b.scheduled_time || '23:59';
        return timeA.localeCompare(timeB);
      });
    });

    return grouped;
  }, [filteredTasks]);

  // Unscheduled tasks
  const unscheduledTasks = useMemo(() => {
    return filteredTasks.filter((task) => !task.scheduled_date);
  }, [filteredTasks]);

  const visibleCalendarTaskIds = useMemo(() => {
    const visibleDateKeys = new Set(
      calendarDays.map((date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      })
    );

    return filteredTasks
      .filter((task) => !task.scheduled_date || visibleDateKeys.has(task.scheduled_date))
      .map((task) => task.id);
  }, [calendarDays, filteredTasks]);

  // Notify parent of currently visible (not hidden) task IDs for Select All
  useEffect(() => {
    if (onVisibleTasksChange) {
      onVisibleTasksChange(visibleCalendarTaskIds);
    }
  }, [visibleCalendarTaskIds, onVisibleTasksChange]);

  // Navigation handlers
  const goToPrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const goToPrevThreeDays = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() - 3));
  };

  const goToNextThreeDays = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() + 3));
  };

  const goToPrevDay = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() - 1));
  };

  const goToNextDay = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() + 1));
  };

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

      const response = await fetch('/api/updateTask', {
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
        const response = await fetch('/api/deleteTask', {
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

      const response = await fetch('/api/updateTask', {
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

  const handleRescheduleTask = async (taskId: string, newDate: string | null) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const oldDate = task.scheduled_date;
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, scheduled_date: newDate || undefined } : t))
    );

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

      if (!response.ok) throw new Error('Failed to reschedule task');
      notifySuccess('Task rescheduled');
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Error rescheduling task:', error);
      notifyError('Failed to reschedule task');
      // Revert on error
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, scheduled_date: oldDate } : t))
      );
    }
  };

  // Drag and drop handlers
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, dateKey: string) => {
    e.preventDefault();
    setDragOverDate(dateKey);
  };

  const handleDrop = (e: React.DragEvent, dateKey: string) => {
    e.preventDefault();
    setDragOverDate(null);

    if (!draggedTaskId) return;

    handleRescheduleTask(draggedTaskId, dateKey);
    setDraggedTaskId(null);
  };

  const handleTouchDrop = useCallback((taskId: string, dropTarget: HTMLElement) => {
    const newDate = dropTarget.dataset.dropDate;
    if (newDate) handleRescheduleTask(taskId, newDate);
  }, []);

  const { getTouchProps } = useTouchDrag({
    onDragStart: (taskId) => setDraggedTaskId(taskId),
    onTouchDrop: handleTouchDrop,
  });

  const formatDateKey = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth();
  };

  const threeDayDates = useMemo(() => {
    return [0, 1, 2].map((offset) =>
      new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + offset)
    );
  }, [currentDate]);

  const selectedDateKey = formatDateKey(currentDate);
  const selectedDayTasks = tasksByDate.get(selectedDateKey) || [];

  const todayNow = new Date();
  const isViewingToday = isToday(currentDate);
  const isViewingTodayMonth =
    currentDate.getMonth() === todayNow.getMonth() &&
    currentDate.getFullYear() === todayNow.getFullYear();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <CircularProgress />
      </div>
    );
  }

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="flex flex-col h-full">
      {/* lg: full month */}
      <div className="hidden xl:block">
        <div className="flex items-center justify-start gap-2 mb-4">
          <h2 className="text-2xl font-bold">{monthName}</h2>
          <div className="flex items-center gap-2">
            <Tooltip title="Today">
              <span>
                <IconButton onClick={goToToday} size="small" className="btn-ghost" disabled={isViewingTodayMonth}>
                  <Calendar className="w-5 h-5" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Previous month">
              <IconButton onClick={goToPrevMonth} size="small" className="btn-ghost">
                <ChevronLeft className="w-5 h-5" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Next month">
              <IconButton onClick={goToNextMonth} size="small" className="btn-ghost">
                <ChevronRight className="w-5 h-5" />
              </IconButton>
            </Tooltip>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <div className="grid grid-cols-7 gap-2 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="text-center font-semibold text-sm text-gray-60 dark:text-gray-40 p-2">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0">
            {calendarDays.map((date, index) => {
              const dateKey = formatDateKey(date);
              const dayTasks = tasksByDate.get(dateKey) || [];
              const isDragOver = dragOverDate === dateKey;

              return (
                <div
                  key={index}
                  data-drop-date={dateKey}
                  className={`
                    min-h-[120px] p-2 border
                    ${isToday(date) ? 'bg-brand-20 dark:bg-brand-90 border-brand-40' : 'bg-background-color border-background'}
                    ${!isCurrentMonth(date) ? 'opacity-50' : ''}
                    ${isDragOver ? 'ring-2 ring-brand-40' : ''}
                  `}
                  onDragOver={(e) => handleDragOver(e, dateKey)}
                  onDrop={(e) => handleDrop(e, dateKey)}
                >
                  <div className="text-sm font-medium mb-1 text-gray-70 dark:text-gray-30">{date.getDate()}</div>
                  <div className="space-y-1">
                    {dayTasks.map((task) => (
                      <div key={task.id} {...getTouchProps(task.id)}>
                        <TaskCard
                          task={task as Task}
                          onStatusChange={(id, status) => handleStatusChange(id, status)}
                          onUpdate={handleUpdateTask}
                          onDelete={handleDeleteTask}
                          draggable
                          onDragStart={handleDragStart}
                          compact
                          allowInlineEdit
                          hideCategory
                          filter={textFilter}
                          selectable={!!onToggleSelect}
                          isSelected={selectedIds.has(task.id)}
                          onToggleSelect={onToggleSelect ? (id) => onToggleSelect(id, 'tasks') : undefined}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* md: 3-day view */}
      <div className="hidden md:block xl:hidden">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">{currentDate.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</h2>
          <div className="flex items-center gap-2">
            <Tooltip title="Today">
              <span>
                <IconButton onClick={goToToday} size="small" className="btn-ghost" disabled={isViewingToday}>
                  <Calendar className="w-5 h-5" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Previous 3 days">
              <IconButton onClick={goToPrevThreeDays} size="small" className="btn-ghost">
                <ChevronLeft className="w-5 h-5" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Next 3 days">
              <IconButton onClick={goToNextThreeDays} size="small" className="btn-ghost">
                <ChevronRight className="w-5 h-5" />
              </IconButton>
            </Tooltip>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-0">
          {threeDayDates.map((date) => {
            const dateKey = formatDateKey(date);
            const dayTasks = tasksByDate.get(dateKey) || [];
            const isDragOver = dragOverDate === dateKey;
            return (
              <div
                key={dateKey}
                data-drop-date={dateKey}
                className={`min-h-[240px] p-2 border ${isToday(date) ? 'bg-brand-20 dark:bg-brand-90 border-brand-40' : 'bg-background-color border-background'} ${isDragOver ? 'ring-2 ring-brand-40' : ''}`}
                onDragOver={(e) => handleDragOver(e, dateKey)}
                onDrop={(e) => handleDrop(e, dateKey)}
              >
                <div className="text-sm font-semibold mb-2 text-gray-70 dark:text-gray-30">
                  {date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                </div>
                <div className="space-y-1">
                  {dayTasks.map((task) => (
                    <div key={task.id} {...getTouchProps(task.id)}>
                      <TaskCard
                        task={task as Task}
                        onStatusChange={(id, status) => handleStatusChange(id, status)}
                        onUpdate={handleUpdateTask}
                        onDelete={handleDeleteTask}
                        draggable
                        onDragStart={handleDragStart}
                        compact
                        allowInlineEdit
                        hideCategory
                        filter={textFilter}
                        selectable={!!onToggleSelect}
                        isSelected={selectedIds.has(task.id)}
                        onToggleSelect={onToggleSelect ? (id) => onToggleSelect(id, 'tasks') : undefined}
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* sm: 1-day view + micro month with task dots */}
      <div className="md:hidden">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold">{currentDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h2>
          <div className="flex items-center gap-1">
            <Tooltip title="Today">
              <span>
                <IconButton onClick={goToToday} size="small" className="btn-ghost" disabled={isViewingToday}>
                  <Calendar className="w-4 h-4" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Previous day">
              <IconButton onClick={goToPrevDay} size="small" className="btn-ghost">
                <ChevronLeft className="w-4 h-4" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Next day">
              <IconButton onClick={goToNextDay} size="small" className="btn-ghost">
                <ChevronRight className="w-4 h-4" />
              </IconButton>
            </Tooltip>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-3">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
            <div key={`${day}-${i}`} className="text-center text-xs text-gray-60 dark:text-gray-40">{day}</div>
          ))}
          {calendarDays.map((date, index) => {
            const dateKey = formatDateKey(date);
            const hasTasks = (tasksByDate.get(dateKey) || []).length > 0;
            const isSelectedDay = dateKey === selectedDateKey;
            return (
              <button
                key={`${dateKey}-${index}`}
                type="button"
                onClick={() => setCurrentDate(new Date(date.getFullYear(), date.getMonth(), date.getDate()))}
                className={`h-8 rounded text-xs relative ${isSelectedDay ? 'bg-brand-50 text-brand-0' : 'bg-background-color text-gray-80 dark:text-gray-20'} ${!isCurrentMonth(date) ? 'opacity-50' : ''}`}
              >
                <span>{date.getDate()}</span>
                {hasTasks && <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-brand-50" />}
              </button>
            );
          })}
        </div>

        <div
          data-drop-date={selectedDateKey}
          className={`min-h-[220px] p-2 border ${isToday(currentDate) ? 'bg-brand-20 dark:bg-brand-90 border-brand-40' : 'bg-background-color border-background'} ${dragOverDate === selectedDateKey ? 'ring-2 ring-brand-40' : ''}`}
          onDragOver={(e) => handleDragOver(e, selectedDateKey)}
          onDrop={(e) => handleDrop(e, selectedDateKey)}
        >
          <div className="text-sm font-semibold mb-2 text-gray-70 dark:text-gray-30">
            {currentDate.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
          </div>
          <div className="space-y-1">
            {selectedDayTasks.map((task) => (
              <div key={task.id} {...getTouchProps(task.id)}>
                <TaskCard
                  task={task as Task}
                  onStatusChange={(id, status) => handleStatusChange(id, status)}
                  onUpdate={handleUpdateTask}
                  onDelete={handleDeleteTask}
                  draggable
                  onDragStart={handleDragStart}
                  compact
                  allowInlineEdit
                  hideCategory
                  filter={textFilter}
                  selectable={!!onToggleSelect}
                  isSelected={selectedIds.has(task.id)}
                  onToggleSelect={onToggleSelect ? (id) => onToggleSelect(id, 'tasks') : undefined}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Unscheduled Tasks */}
      {unscheduledTasks.length > 0 && (
        <div className="mt-4 p-4 bg-background-color">
          <h3 className="text-lg font-semibold mb-3">Unscheduled Tasks ({unscheduledTasks.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {unscheduledTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task as Task}
                onStatusChange={(id, status) => handleStatusChange(id, status)}
                onUpdate={handleUpdateTask}
                onDelete={handleDeleteTask}
                draggable
                onDragStart={handleDragStart}
                allowInlineEdit
                hideCategory
                filter={textFilter}
                selectable={!!onToggleSelect}
                isSelected={selectedIds.has(task.id)}
                onToggleSelect={onToggleSelect ? (id) => onToggleSelect(id, 'tasks') : undefined}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
