import React, { useState, useMemo } from 'react';
import { Task } from '@utils/goalUtils';
import TaskCard from './TaskCard';
import { Plus } from 'lucide-react';
import { TextField } from '@mui/material';

interface TasksKanbanProps {
  tasks: Task[];
  onStatusChange?: (taskId: string, newStatus: Task['status']) => void;
  onEdit?: (task: Task) => void;
  onDelete?: (taskId: string) => void;
  onCreate?: (taskData: Partial<Task>) => Promise<void>;
  goalId?: string;
}

const TasksKanban: React.FC<TasksKanbanProps> = ({
  tasks,
  onStatusChange,
  onEdit,
  onDelete,
  onCreate,
}) => {
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<Task['status'] | null>(null);
  const [addingToColumn, setAddingToColumn] = useState<Task['status'] | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');

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

  const getColumnColor = (status: Task['status']) => {
    switch (status) {
      case 'Not started':
        return 'bg-gray-100 dark:bg-gray-80';
      case 'In progress':
        return 'bg-blue-50 dark:bg-blue-900/20';
      case 'Blocked':
        return 'bg-red-50 dark:bg-red-900/20';
      case 'On hold':
        return 'bg-yellow-50 dark:bg-yellow-900/20';
      case 'Done':
        return 'bg-green-50 dark:bg-green-900/20';
      default:
        return 'bg-gray-100 dark:bg-gray-80';
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

        return (
          <div
            key={status}
            className={`flex-1 min-w-80 flex flex-col rounded-lg border-2 transition-all ${
              isDragOver ? 'border-blue-500 dark:border-blue-400' : getColumnBorderColor(status)
            } ${getColumnColor(status)}`}
            onDragOver={(e) => handleDragOver(e, status)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, status)}
          >
            {/* Column header */}
            <div className="p-4 border-b border-gray-20 dark:border-gray-70">
              <h3 className="font-semibold text-lg">
                {status}
                <span className="ml-2 text-sm text-gray-50 dark:text-gray-40">
                  ({columnTasks.length})
                </span>
              </h3>
            </div>

            {/* Tasks */}
            <div className="flex-1 p-3 space-y-2 overflow-y-auto">
              {columnTasks.length === 0 && !addingToColumn ? (
                <div className="text-center text-gray-40 dark:text-gray-60 py-8">
                  {draggedTaskId ? 'Drop task here' : 'No tasks'}
                </div>
              ) : (
                columnTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onStatusChange={onStatusChange}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    draggable
                    onDragStart={handleDragStart}
                    hideStatusChip
                  />
                ))
              )}
              
              {/* Add task form */}
              {onCreate && (
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
                      className="w-full p-2 text-sm text-gray-50 dark:text-gray-40 hover:text-primary dark:hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-70 rounded border border-dashed border-gray-30 dark:border-gray-60 transition-colors flex items-center justify-center gap-1"
                    >
                      <Plus className="w-4 h-4" />
                      Add task
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TasksKanban;
