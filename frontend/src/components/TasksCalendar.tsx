import React, { useState, useMemo, useCallback } from 'react';
import { Task } from '@utils/goalUtils';
import TaskCard from './TaskCard';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { IconButton, Tooltip, ToggleButtonGroup, ToggleButton, useMediaQuery, useTheme } from '@mui/material';
import { useTouchDrag } from '@hooks/useTouchDrag';

interface TasksCalendarProps {
  tasks: Task[];
  onStatusChange?: (taskId: string, newStatus: Task['status']) => void;
  onUpdate?: (taskId: string, updates: Partial<Task>) => void;
  onEdit?: (task: Task) => void;
  onDelete?: (taskId: string) => void;
  onReschedule?: (taskId: string, newDate: string) => void;
  onUnschedule?: (taskId: string) => void;
}

const TasksCalendar: React.FC<TasksCalendarProps> = ({
  tasks,
  onStatusChange,
  onUpdate,
  onEdit,
  onDelete,
  onReschedule,
  onUnschedule,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'day' | '3day' | 'week' | 'month'>('day');
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);

  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up('md'));

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

  const threeDayDates = useMemo(() => {
    return [0, 1, 2].map((offset) =>
      new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + offset)
    );
  }, [currentDate]);

  const weekDates = useMemo(() => {
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    startOfWeek.setDate(startOfWeek.getDate() - day); // Start on Sunday
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      return date;
    });
  }, [currentDate]);

  // Group tasks by date
  const tasksByDate = useMemo(() => {
    const grouped = new Map<string, Task[]>();
    tasks.forEach((task) => {
      if (task.scheduled_date) {
        const dateKey = task.scheduled_date.split('T')[0];
        if (!grouped.has(dateKey)) grouped.set(dateKey, []);
        grouped.get(dateKey)!.push(task);
      }
    });
    return grouped;
  }, [tasks]);

  // Navigation handlers
  const goToPrevDay = () => setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() - 1));
  const goToNextDay = () => setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() + 1));
  const goToPrevThreeDays = () => setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() - 3));
  const goToNextThreeDays = () => setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() + 3));
  const goToPrevWeek = () => setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() - 7));
  const goToNextWeek = () => setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() + 7));

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const handlePrevious = () => {
    if (viewMode === 'day') goToPrevDay();
    else if (viewMode === '3day') goToPrevThreeDays();
    else if (viewMode === 'week') goToPrevWeek();
    else goToPreviousMonth();
  };

  const handleNext = () => {
    if (viewMode === 'day') goToNextDay();
    else if (viewMode === '3day') goToNextThreeDays();
    else if (viewMode === 'week') goToNextWeek();
    else goToNextMonth();
  };

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  const selectedDateKey = formatDateKey(currentDate);
  const selectedDayTasks = tasksByDate.get(selectedDateKey) || [];
  const todayNow = new Date();
  const isViewingToday = isToday(currentDate);
  const isViewingTodayMonth =
    currentDate.getMonth() === todayNow.getMonth() &&
    currentDate.getFullYear() === todayNow.getFullYear();

  const getViewTitle = () => {
    if (viewMode === 'day') {
      return currentDate.toLocaleDateString(undefined, { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' });
    } else if (viewMode === '3day') {
      const endDate = threeDayDates[2];
      return `${currentDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
    } else if (viewMode === 'week') {
      const startDate = weekDates[0];
      const endDate = weekDates[6];
      return `${startDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
    } else {
      return monthName;
    }
  };

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
    if (draggedTaskId && onReschedule) {
      onReschedule(draggedTaskId, dateKey);
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

  const unscheduledTasks = tasks.filter((t) => !t.scheduled_date);

  return (
    <div className="h-full flex flex-col">
      {/* View toggle and navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <h3 className="text-xl font-semibold">{getViewTitle()}</h3>
        <div className="flex items-center gap-3 flex-wrap">
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(_, newView) => newView && setViewMode(newView)}
            size="small"
            aria-label="calendar view mode"
          >
            <ToggleButton value="day" aria-label="day view">1d</ToggleButton>
            <ToggleButton value="3day" aria-label="3 day view">3d</ToggleButton>
            {isMdUp && <ToggleButton value="week" aria-label="week view">1w</ToggleButton>}
            {isMdUp && <ToggleButton value="month" aria-label="month view">1m</ToggleButton>}
          </ToggleButtonGroup>
          <div className="flex items-center gap-2">
            <Tooltip title="Today">
              <span>
                <IconButton
                  onClick={goToToday}
                  size="small"
                  className="btn-ghost"
                  disabled={viewMode === 'month' ? isViewingTodayMonth : isViewingToday}
                >
                  <Calendar className="w-5 h-5" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title={`Previous ${viewMode === 'day' ? 'day' : viewMode === '3day' ? '3 days' : viewMode === 'week' ? 'week' : 'month'}`}>
              <IconButton onClick={handlePrevious} size="small" className="btn-ghost">
                <ChevronLeft className="w-5 h-5" />
              </IconButton>
            </Tooltip>
            <Tooltip title={`Next ${viewMode === 'day' ? 'day' : viewMode === '3day' ? '3 days' : viewMode === 'week' ? 'week' : 'month'}`}>
              <IconButton onClick={handleNext} size="small" className="btn-ghost">
                <ChevronRight className="w-5 h-5" />
              </IconButton>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* Month view */}
      {viewMode === 'month' && (
        <div>
          <div className="grid grid-cols-7 gap-2 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="text-center font-semibold text-sm text-gray-60 dark:text-gray-40 p-2">{day}</div>
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
                  className={`min-h-[120px] p-2 border ${isToday(date) ? 'bg-brand-20 dark:bg-brand-90 border-brand-40' : 'bg-background-color border-background'} ${!isCurrentMonth(date) ? 'opacity-50' : ''} ${isDragOver ? 'ring-2 ring-brand-40' : ''}`}
                  onDragOver={(e) => handleDragOver(e, dateKey)}
                  onDrop={(e) => handleDrop(e, dateKey)}
                >
                  <div className="text-sm font-medium mb-1 text-gray-70 dark:text-gray-30">{date.getDate()}</div>
                  <div className="space-y-1">
                    {dayTasks.map((task) => (
                      <div key={task.id} {...getTouchProps(task.id)}>
                        <TaskCard
                          task={task}
                          onStatusChange={onStatusChange}
                          onUpdate={onUpdate}
                          onEdit={onEdit}
                          onDelete={onDelete}
                          onUnschedule={onUnschedule}
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
        </div>
      )}

      {/* Week view */}
      {viewMode === 'week' && (
        <div>
          <div className="grid grid-cols-7 gap-2 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="text-center font-semibold text-sm text-gray-60 dark:text-gray-40 p-2">{day}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0">
            {weekDates.map((date) => {
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
                          task={task}
                          onStatusChange={onStatusChange}
                          onUpdate={onUpdate}
                          onEdit={onEdit}
                          onDelete={onDelete}
                          onUnschedule={onUnschedule}
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
        </div>
      )}

      {/* 3-day view */}
      {viewMode === '3day' && (
        <div>
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
                          task={task}
                          onStatusChange={onStatusChange}
                          onUpdate={onUpdate}
                          onEdit={onEdit}
                          onDelete={onDelete}
                          onUnschedule={onUnschedule}
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
        </div>
      )}

      {/* Day view */}
      {viewMode === 'day' && (
        <div>
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
                    task={task}
                    onStatusChange={onStatusChange}
                    onUpdate={onUpdate}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onUnschedule={onUnschedule}
                    draggable
                    onDragStart={handleDragStart}
                    compact
                    allowInlineEdit
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Unscheduled tasks */}
      {unscheduledTasks.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-20 dark:border-gray-70">
          <h4 className="text-sm font-semibold text-gray-60 dark:text-gray-40 mb-2">
            Unscheduled Tasks ({unscheduledTasks.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {unscheduledTasks.map((task) => (
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

