import React, { useState, useMemo, useCallback } from 'react';
import { Task } from '@utils/goalUtils';
import TaskCard from './TaskCard';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { IconButton, Tooltip } from '@mui/material';
import { useTouchDrag } from '@hooks/useTouchDrag';

interface TasksCalendarProps {
  tasks: Task[];
  onStatusChange?: (taskId: string, newStatus: Task['status']) => void;
  onUpdate?: (taskId: string, updates: Partial<Task>) => void;
  onEdit?: (task: Task) => void;
  onDelete?: (taskId: string) => void;
  onReschedule?: (taskId: string, newDate: string) => void;
}

const TasksCalendar: React.FC<TasksCalendarProps> = ({
  tasks,
  onStatusChange,
  onUpdate,
  onEdit,
  onDelete,
  onReschedule,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  // Get the first and last day of the current month view
  const firstDayOfMonth = useMemo(() => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    return date;
  }, [currentDate]);

  const lastDayOfMonth = useMemo(() => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    return date;
  }, [currentDate]);

  // Calculate calendar grid (including days from prev/next month)
  const calendarDays = useMemo(() => {
    const days: Date[] = [];
    const startDay = firstDayOfMonth.getDay(); // 0 = Sunday

    // Add days from previous month
    for (let i = startDay - 1; i >= 0; i--) {
      const date = new Date(firstDayOfMonth);
      date.setDate(date.getDate() - i - 1);
      days.push(date);
    }

    // Add days from current month
    for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
      days.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), i));
    }

    // Add days from next month to complete the grid
    const remainingDays = 42 - days.length; // 6 weeks * 7 days
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(lastDayOfMonth);
      date.setDate(date.getDate() + i);
      days.push(date);
    }

    return days;
  }, [firstDayOfMonth, lastDayOfMonth, currentDate]);

  // Group tasks by date
  const tasksByDate = useMemo(() => {
    const grouped: Record<string, Task[]> = {};
    tasks.forEach((task) => {
      if (task.scheduled_date) {
        const dateKey = new Date(task.scheduled_date).toISOString().split('T')[0];
        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        grouped[dateKey].push(task);
      }
    });
    return grouped;
  }, [tasks]);

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, date: Date) => {
    e.preventDefault();
    if (draggedTaskId && onReschedule) {
      const newDate = date.toISOString().split('T')[0];
      onReschedule(draggedTaskId, newDate);
    }
    setDraggedTaskId(null);
  };

  const handleTouchDrop = useCallback((taskId: string, dropTarget: HTMLElement) => {
    const newDate = dropTarget.dataset.dropDate;
    if (newDate && onReschedule) {
      onReschedule(taskId, newDate);
    }
  }, [onReschedule]);

  const { getTouchProps } = useTouchDrag({
    onDragStart: (taskId) => setDraggedTaskId(taskId),
    onTouchDrop: handleTouchDrop,
  });

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth();
  };

  const monthYear = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-20 dark:border-gray-70">
        <h3 className="text-xl font-semibold">{monthYear}</h3>
        <div className="flex items-center gap-2">
          <button onClick={goToToday} className="btn-secondary btn-sm">
            Today
          </button>
          <Tooltip title="Previous month">
            <IconButton size="small" onClick={goToPreviousMonth}>
              <ChevronLeft className="w-5 h-5" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Next month">
            <IconButton size="small" onClick={goToNextMonth}>
              <ChevronRight className="w-5 h-5" />
            </IconButton>
          </Tooltip>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-2 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="text-center text-sm font-semibold text-gray-60 dark:text-gray-40">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-2 flex-1">
        {calendarDays.map((date, index) => {
          const dateKey = date.toISOString().split('T')[0];
          const dayTasks = tasksByDate[dateKey] || [];
          const isTodayDate = isToday(date);
          const isCurrentMonthDate = isCurrentMonth(date);

          return (
            <div
              key={index}
              data-drop-date={dateKey}
              className={`min-h-24 p-2 rounded-lg border transition-colors ${
                isTodayDate
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
                  : isCurrentMonthDate
                  ? 'bg-white dark:bg-gray-80 border-gray-20 dark:border-gray-70'
                  : 'bg-gray-50 dark:bg-gray-90 border-gray-100 dark:border-gray-80 opacity-50'
              } ${draggedTaskId ? 'hover:bg-blue-100 dark:hover:bg-blue-900/30' : ''}`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, date)}
            >
              <div className={`text-sm mb-1 ${isTodayDate ? 'font-bold text-blue-600 dark:text-blue-400' : isCurrentMonthDate ? 'text-gray-70 dark:text-gray-30' : 'text-gray-40'}`}>
                {date.getDate()}
              </div>
              
              <div className="space-y-1 overflow-y-auto max-h-32">
                {dayTasks.map((task) => (
                  <div key={task.id} {...getTouchProps(task.id)}>
                    <TaskCard
                      task={task}
                      onStatusChange={onStatusChange}
                      onUpdate={onUpdate}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      draggable
                      onDragStart={handleDragStart}
                      compact
                      allowInlineEdit
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Unscheduled tasks */}
      {tasks.filter((t) => !t.scheduled_date).length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-20 dark:border-gray-70">
          <h4 className="text-sm font-semibold text-gray-60 dark:text-gray-40 mb-2">
            Unscheduled Tasks ({tasks.filter((t) => !t.scheduled_date).length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {tasks.filter((t) => !t.scheduled_date).map((task) => (
              <div key={task.id} className="w-full sm:w-auto">
                <TaskCard
                  task={task}
                  onStatusChange={onStatusChange}
                  onUpdate={onUpdate}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  draggable
                  onDragStart={handleDragStart}
                  compact
                  allowInlineEdit
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TasksCalendar;
