import React, { useState, useMemo, useCallback } from 'react';
import { Task } from '@utils/goalUtils';
import TaskCard from './TaskCard';
import { Plus, Eye, EyeOff } from 'lucide-react';
import { TextField, IconButton, Tooltip, Badge, useMediaQuery } from '@mui/material';
import { useTouchDrag } from '@hooks/useTouchDrag';
import { STATUS_COLORS } from '../constants/statuses';

interface TasksKanbanProps {
  tasks: Task[];
  onStatusChange?: (taskId: string, newStatus: Task['status']) => void;
  onEdit?: (task: Task) => void;
  onUpdate?: (taskId: string, updates: Partial<Task>) => void;
  onDelete?: (taskId: string) => void;
  onCreate?: (taskData: Partial<Task>) => Promise<void>;
  goalId?: string;
  filter?: string;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string, type: 'tasks' | 'goals') => void;
}

const TasksKanban: React.FC<TasksKanbanProps> = ({
  tasks,
  onStatusChange,
  onEdit,
  onUpdate,
  onDelete,
  onCreate,
  filter = '',
  selectedIds = new Set(),
  onToggleSelect,
}) => {
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<Task['status'] | null>(null);
  const [addingToColumn, setAddingToColumn] = useState<Task['status'] | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [collapsedColumns, setCollapsedColumns] = useState<Record<string, boolean>>({});
  const [manuallyExpandedEmptyColumns, setManuallyExpandedEmptyColumns] = useState<Set<string>>(new Set());
  const isSmall = useMediaQuery('(max-width: 640px)');

  const columns: Task['status'][] = ['Not started', 'In progress', 'Blocked', 'On hold', 'Done'];

  const tasksByStatus = useMemo(() => {
    const grouped: Record<Task['status'], Task[]> = {
      'Not started': [],
      'In progress': [],
      'Blocked': [],
      'On hold': [],
      'Done': [],
    };
    
    tasks.forEach((task) => {
      if (grouped[task.status]) {
        grouped[task.status].push(task);
      }
    });

    // Sort by order_index
    Object.keys(grouped).forEach((status) => {
      grouped[status as Task['status']].sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
    });

    return grouped;
  }, [tasks]);

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
    if (draggedTaskId && onStatusChange) {
      const draggedTask = tasks.find((t) => t.id === draggedTaskId);
      if (draggedTask && draggedTask.status !== newStatus) {
        onStatusChange(draggedTaskId, newStatus);
      }
    }
    setDraggedTaskId(null);
    setDragOverColumn(null);
  };

  const handleTouchDrop = useCallback((taskId: string, dropTarget: HTMLElement) => {
    const newStatus = dropTarget.dataset.dropStatus as Task['status'] | undefined;
    if (newStatus && onStatusChange) {
      onStatusChange(taskId, newStatus);
    }
  }, [onStatusChange]);

  const { getTouchProps } = useTouchDrag({
    onDragStart: (taskId) => setDraggedTaskId(taskId),
    onTouchDrop: handleTouchDrop,
  });

  const getColumnColor = (status: Task['status']) => {
    switch (status) {
      case 'Not started':
        return 'bg-gray-5 dark:bg-gray-90/40';
      case 'In progress':
        return 'bg-blue-50 dark:bg-blue-900/20';
      case 'Blocked':
        return 'bg-red-50 dark:bg-red-900/20';
      case 'On hold':
        return 'bg-yellow-50 dark:bg-yellow-900/20';
      case 'Done':
        return 'bg-green-50 dark:bg-green-900/20';
      default:
        return 'bg-gray-5 dark:bg-gray-90/40';
    }
  };

  const getColumnBorderColor = (status: Task['status']) => {
    switch (status) {
      case 'Not started':
        return 'border-gray-30 dark:border-gray-60';
      case 'In progress':
        return 'border-blue-300 dark:border-blue-700';
      case 'Blocked':
        return 'border-red-300 dark:border-red-700';
      case 'On hold':
        return 'border-yellow-300 dark:border-yellow-700';
      case 'Done':
        return 'border-green-300 dark:border-green-700';
      default:
        return 'border-gray-30 dark:border-gray-60';
    }
  };

  const handleCreateTask = async (status: Task['status']) => {
    if (!newTaskTitle.trim() || !onCreate) return;
    
    await onCreate({
      title: newTaskTitle,
      status,
    });
    
    setNewTaskTitle('');
    setAddingToColumn(null);
  };

  return (
    <div className="flex gap-4 overflow-x-auto h-full">
      {columns.map((status) => {
        const columnTasks = tasksByStatus[status] || [];
        const isDragOver = dragOverColumn === status;
        
        // Auto-collapse empty columns unless manually expanded by user
        const isCollapsed = (columnTasks.length === 0 && !manuallyExpandedEmptyColumns.has(status)) || !!collapsedColumns[status];

        return (
          <div
            key={status}
            data-drop-status={status}
            className={`${!isCollapsed ? 'flex-1 min-w-80' : 'flex-0'} flex flex-col rounded-lg border-2 transition-all ${
              isDragOver ? 'border-blue-50 dark:border-blue-40' : getColumnBorderColor(status)
            } ${getColumnColor(status)}`}
            onDragOver={(e) => handleDragOver(e, status)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, status)}
          >
            {/* Column header */}
            <div className={`p-4 ${!isCollapsed ? 'border-b border-gray-20 dark:border-gray-70' : ''} flex items-center justify-between`}>
              {!isCollapsed && (
                <div className="flex items-center space-x-2">
                  <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 6, background: STATUS_COLORS[status], marginRight: 8 }} />
                  <h3 className="font-semibold text-lg" style={{ color: STATUS_COLORS[status] }}>
                    {status}
                    <span className="ml-2 text-sm text-gray-30 dark:text-gray-70">
                      ({columnTasks.length})
                    </span>
                  </h3>
                </div>
              )}
              
              {isCollapsed ? (
                <>
                  {isSmall && (
                    <div className="flex items-center space-x-2">
                      <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 6, background: STATUS_COLORS[status], marginRight: 8 }} />
                      {/* <div className="text-nowrap" style={{ color: STATUS_COLORS[status] }}>{status}</div> */}
                    </div>
                  )}
                  <Tooltip title={`Show "${status}" column`} placement="top" arrow>
                    <IconButton
                      aria-label={`Show ${status} column`}
                      onClick={() => {
                        setCollapsedColumns((prev) => ({ ...prev, [status]: false }));
                        if (columnTasks.length === 0) {
                          setManuallyExpandedEmptyColumns((prev) => new Set(prev).add(status));
                        }
                      }}
                      className="btn-ghost p-1"
                    >
                      <Badge 
                        badgeContent={columnTasks.length} 
                        color="primary"
                        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                      >
                        <Eye className="w-4 h-4 text-gray-70 dark:text-gray-20" />
                      </Badge>
                    </IconButton>
                  </Tooltip>
                </>
              ) : (
                <Tooltip title="Hide column" placement="top" arrow>
                  <IconButton
                    aria-label={`Hide ${status} column`}
                    onClick={() => {
                      setCollapsedColumns((prev) => ({ ...prev, [status]: true }));
                      setManuallyExpandedEmptyColumns((prev) => {
                        const newSet = new Set(prev);
                        newSet.delete(status);
                        return newSet;
                      });
                    }}
                    className="btn-ghost p-1"
                  >
                    <EyeOff className="w-4 h-4 text-gray-50" />
                  </IconButton>
                </Tooltip>
              )}
            </div>

            {/* Tasks */}
            {!isCollapsed && (
              <div className="flex-1 p-3 space-y-2 overflow-y-auto">
                {columnTasks.length === 0 && !addingToColumn ? (
                  <div className="text-center text-gray-40 dark:text-gray-60 py-8">
                    {draggedTaskId ? 'Drop task here' : 'No tasks'}
                  </div>
                ) : (
                  columnTasks.map((task) => (
                    <div key={task.id} {...getTouchProps(task.id)}>
                      <TaskCard
                        task={task}
                        filter={filter}
                        selectable={!!onToggleSelect}
                        isSelected={selectedIds.has(task.id)}
                        onToggleSelect={(id) => onToggleSelect?.(id, 'tasks')}
                        onStatusChange={onStatusChange}
                        onUpdate={onUpdate}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        draggable
                        onDragStart={handleDragStart}
                        allowInlineEdit
                        hideStatusChip
                      />
                    </div>
                  ))
                )}
              
                {/* Add task form */}
                {/* {onCreate && (
                  <div className="pt-2">
                  {addingToColumn === status ? (
                    <div className="space-y-2">
                      <TextField
                        size="small"
                        fullWidth
                        placeholder="Task title"
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && newTaskTitle.trim()) {
                            handleCreateTask(status);
                          }
                        }}
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleCreateTask(status)}
                          className="btn-primary btn-sm flex-1"
                        >
                          Add
                        </button>
                        <button
                          onClick={() => {
                            setAddingToColumn(null);
                            setNewTaskTitle('');
                          }}
                          className="btn-secondary btn-sm flex-1"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAddingToColumn(status)}
                      className="w-full btn-primary rounded border border-dashed border-gray-30 dark:border-gray-60 transition-colors flex items-center justify-center gap-1"
                    >
                      <Plus className="w-4 h-4" />
                      Add task
                    </button>
                    )}
                  </div>
                )} */}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default TasksKanban;
