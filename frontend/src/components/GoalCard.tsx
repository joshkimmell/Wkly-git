import React, { useState, useEffect } from 'react';
import { useGoalsContext } from '@context/GoalsContext';
import supabase from '@lib/supabase'; // Ensure this is the correct path to your Supabase client
// import { handleDeleteGoal } from '@utils/functions';
import { Goal, Accomplishment, Task, calculateGoalCompletion } from '@utils/goalUtils'; // Adjust the import path as necessary
import GoalEditor from '@components/GoalEditor';
import { updateGoal, addCategory } from '@utils/functions';
import { Trash, Edit, Award, X as CloseButton, ListTodo, Archive, ArchiveRestore } from 'lucide-react';
import { FileText as NotesIcon, Plus as PlusIcon, Save as SaveIcon } from 'lucide-react';
import { Tooltip, IconButton } from '@mui/material';
// import { Chip, Menu, MenuItem, TextField, Tooltip, IconButton, Checkbox } from '@mui/material';
// import type { ChangeEvent } from 'react';
import { STATUS_COLORS } from '../constants/statuses';
// import { STATUSES, STATUS_COLORS, type Status } from '../constants/statuses';
import { cardClasses, modalClasses, objectCounter, overlayClasses } from '@styles/classes'; // Adjust the import path as necessary
import useGoalExtras from '@hooks/useGoalExtras';
import { notifyError, notifySuccess, notifyWithUndo } from './ToastyNotification';
// import { Link } from 'react-router-dom';
import { applyHighlight, enhanceLinks } from '@utils/functions'; // Adjust the import path as necessary
import AccomplishmentEditor from './AccomplishmentEditor'; // Import the AccomplishmentEditor component
import AccomplishmentsModal from './AccomplishmentsModal';
import ConfirmModal from './ConfirmModal';
import TasksList from './TasksList'; // Import TasksList component
import GoalCompletionDonut from './GoalCompletionDonut';
import RichTextEditor from './RichTextEditor';

interface GoalCardProps {
  goal: Goal; // Add the goal prop to access goal properties
  handleDelete: (goalId: string) => void;
  handleEdit: (goalId: string) => void;
  filter: string; // Accept filter as a prop
  showAllGoals?: boolean; // Whether parent view is showing all goals
  selectable?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
  hideTasks?: boolean; // Hide the Tasks action button (e.g. when viewed from a single task)
  inlineEdit?: boolean; // Open GoalEditor inline instead of calling handleEdit callback
}

// const GoalCard: React.FC<GoalCardProps> = ({ goal }) => {
const GoalCard: React.FC<GoalCardProps> = ({ 
  goal, 
  handleDelete, 
  handleEdit,
  filter, // Accept filter as a prop
  showAllGoals = false,
  selectable = false,
  isSelected = false,
  onToggleSelect,
  hideTasks = false,
  inlineEdit = false,
}) => {
  // // const handleDeleteGoal = (goalId: string) => {
  //   // Implement the delete logic here
    // console.log(`Deleting goal with ID: ${goal.id}`);
  // };

  // const handleEdit = () => {
  //   // Implement the edit logic here
    // console.log('Editing goal');
  // };
  const [accomplishments, setAccomplishments] = useState<Accomplishment[]>([]);
  const [isAccomplishmentModalOpen, setIsAccomplishmentModalOpen] = useState(false);
  // expansion no longer used; kept out
  // accomplishments handled via AccomplishmentsModal onCreate
  const [isEditAccomplishmentModalOpen, setIsEditAccomplishmentModalOpen] = useState(false);
  const [selectedAccomplishment, setSelectedAccomplishment] = useState<Accomplishment | null>(null);
  const [isAccomplishmentLoading, setIsAccomplishmentLoading] = useState(false);
  const [isNotesLoading, setIsNotesLoading] = useState(false);
  // Notes state
  const [notes, setNotes] = useState<Array<{ id: string; content: string; created_at: string; updated_at: string }>>([]);
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  // Tasks state
  const [isTasksModalOpen, setIsTasksModalOpen] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  // Archive confirmation
  const [isArchiveConfirmOpen, setIsArchiveConfirmOpen] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);

  // Delete confirmation
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [noteDeleteTarget, setNoteDeleteTarget] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteContent, setEditingNoteContent] = useState('');
  // Local status state for optimistic UI updates when changing status inline
  const { refreshGoals, updateGoalInCache } = useGoalsContext();

  // Inline edit state (used when inlineEdit prop is true)
  const [isInlineEditOpen, setIsInlineEditOpen] = useState(false);
  const [inlineEditGoal, setInlineEditGoal] = useState<Goal>(goal);

  // Cache the current authenticated user's id to avoid repeated supabase.auth.getUser() calls
  const userIdRef = React.useRef<string | null>(null);
  const getCachedUserId = async () => {
    if (userIdRef.current) return userIdRef.current;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        userIdRef.current = user.id;
        return user.id;
      }
      return null;
    } catch (e) {
      return null;
    }
  };

  // Shared counts and helpers
  const { notesCountMap, accomplishmentCountMap, tasksCountMap, fetchNotesCount, fetchAccomplishmentsCount, refreshNotesAndCount, refreshAccomplishmentsAndCount, bumpNotesCount, decrementNotesCount } = useGoalExtras();

  // counts are provided by useGoalExtras (notesCountMap, accomplishmentCountMap)

  const [localStatus, setLocalStatus] = useState<string | undefined>(goal.status);
  const [statusAnchorEl, setStatusAnchorEl] = useState<null | HTMLElement>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const statusColors = STATUS_COLORS;

  const { subscribeToTempId } = useGoalsContext();

  const openModal = () => {
    if (!isAccomplishmentModalOpen) {
      // Fetch fresh accomplishments scoped to this goal whenever the modal opens
      void fetchAccomplishments(goal.id);
      setIsAccomplishmentModalOpen(true);
    }
  };

  const closeModal = () => {
    if (isAccomplishmentModalOpen) {
      setIsAccomplishmentModalOpen(false);
    }
  };

  const openEditAccomplishmentModal = (accomplishment: Accomplishment) => {
    setSelectedAccomplishment(accomplishment);
    setIsEditAccomplishmentModalOpen(true);
  };

  const closeEditAccomplishmentModal = () => {
    setSelectedAccomplishment(null);
    setIsEditAccomplishmentModalOpen(false);
  };

  // Fetch accomplishments from the backend
  const fetchAccomplishments = async (idArg?: string) => {
    try {
      const idToUse = idArg ?? goal.id;
      // If this goal is an optimistic temporary item (client-side id), skip server requests
      if (typeof idToUse === 'string' && idToUse.startsWith('temp-')) {
        setAccomplishments([]);
        return;
      }
      const { data, error } = await supabase
        .from('accomplishments')
        .select('*')
        .eq('goal_id', idToUse);

      if (error) {
        console.error('Error fetching accomplishments:', error.message);
        return;
      }

      setAccomplishments(data || []);
    } catch (err) {
      console.error('Unexpected error fetching accomplishments:', err);
    }
  };

  const fetchNotes = async (idArg?: string) => {
    try {
      // avoid calling server with temporary goal ids
      const idToUse = idArg ?? goal.id;
      if (typeof idToUse === 'string' && idToUse.startsWith('temp-')) {
        setNotes([]);
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('User not authenticated');
      const res = await fetch(`/api/getNotes?goal_id=${idToUse}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setNotes(json || []);
    } catch (err: any) {
      console.error('Unexpected error fetching notes:', err);
      notifyError('Failed to fetch notes.');
    }
  };

  const openNotesModal = async () => {
    await fetchNotes();
    setIsNotesModalOpen(true);
  };

  const closeNotesModal = () => {
    setIsNotesModalOpen(false);
    setNewNoteContent('');
    setEditingNoteId(null);
    setEditingNoteContent('');
  };

  const openTasksModal = () => {
    setIsTasksModalOpen(true);
  };

  const closeTasksModal = () => {
    setIsTasksModalOpen(false);
  };

  const createNote = async () => {
    // optimistic create: add a temp note locally immediately
    // Prevent creating notes for unsaved (temp) goals
    if (typeof goal.id === 'string' && goal.id.startsWith('temp-')) {
      notifyError('Please save the goal before adding notes.');
      return;
    }
    const tempId = `temp-${Date.now()}`;
    const tempNote = { id: tempId, content: newNoteContent, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    setNotes((s) => [tempNote, ...s]);
    setNewNoteContent('');
    setIsNotesLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('User not authenticated');
      const res = await fetch(`/api/createNote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ goal_id: goal.id, content: tempNote.content }),
      });
      if (!res.ok) throw new Error(await res.text());
  // reconcile with server copy and refresh via centralized helper
  // bump visible count optimistically so UI updates immediately in tests
  try { bumpNotesCount(goal.id); } catch (e) { /* ignore */ }
  await refreshNotesAndCount(goal.id);
    } catch (err: any) {
      console.error('Error creating note:', err);
      // remove temp note
      setNotes((s) => s.filter((n) => n.id !== tempId));
      notifyError('Failed to create note.');
    } finally {
      setIsNotesLoading(false);
    }
  };

  const updateNote = async (noteId: string, content: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('User not authenticated');
      const res = await fetch(`/api/updateNote`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: noteId, content }),
      });
      if (!res.ok) throw new Error(await res.text());
      await refreshNotesAndCount(goal.id);
      setEditingNoteId(null);
      setEditingNoteContent('');
    } catch (err: any) {
      console.error('Error updating note:', err);
      notifyError('Failed to update note.');
    }
  };

  const deleteNote = (noteId: string) => {
    // optimistic delete: remove locally first
    const prior = notes;
    setNotes((s) => s.filter((n) => n.id !== noteId));
    notifyWithUndo(
      'Note deleted',
      async () => {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) throw new Error('User not authenticated');
        const res = await fetch(`/api/deleteNote?note_id=${noteId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error(await res.text());
        try { await refreshNotesAndCount(goal.id); } catch (e) { /* ignore */ }
        try { decrementNotesCount(goal.id); } catch (e) { /* ignore */ }
      },
      () => {
        setNotes(prior);
      },
    );
  };

  const deleteAccomplishment = (accomplishmentId: string) => {
    // optimistic delete
    const prior = accomplishments;
    setAccomplishments((s) => s.filter((a) => a.id !== accomplishmentId));
    // If this is a temp (optimistic) record that never persisted, just drop it from state
    if (accomplishmentId.startsWith('temp-')) return;
    notifyWithUndo(
      'Accomplishment deleted',
      async () => {
        const { error } = await supabase
          .from('accomplishments')
          .delete()
          .eq('id', accomplishmentId);
        if (error) throw new Error(error.message);
        // async refresh list using GoalCard's own fetch so the correct state is updated
        void fetchAccomplishments(goal.id);
      },
      () => {
        setAccomplishments(prior);
      },
    );
  };

  const saveEditedAccomplishment = async (
    updatedDescription?: string,
    updatedTitle?: string,
    updatedImpact?: string
  ) => {
    if (!selectedAccomplishment) return;

    try {
      setIsAccomplishmentLoading(true);
      const { error } = await supabase
        .from('accomplishments')
        .update({
          title: updatedTitle,
          // write null when empty/undefined so DB doesn't store empty strings
          description: updatedDescription && updatedDescription.trim() ? updatedDescription : null,
          impact: updatedImpact || null,
        })
        .eq('id', selectedAccomplishment.id);

      if (error) {
        console.error('Error saving edited accomplishment:', error.message);
        notifyError('Error saving edited accomplishment.');
        return;
      }

      // Refresh GoalCard's own accomplishments list after saving
      void fetchAccomplishments(goal.id);
      notifySuccess('Accomplishment updated successfully.');
      closeEditAccomplishmentModal();
    } catch (err) {
      console.error('Unexpected error saving edited accomplishment:', err);
      notifyError('Error saving edited accomplishment.');
    } finally {
      setIsAccomplishmentLoading(false);
    }
  };

  // Archive / unarchive handler
  const handleArchiveToggle = async () => {
    const newArchived = !goal.is_archived;
    const action = newArchived ? 'archived' : 'restored';
    setIsArchiving(true);
    try {
      await updateGoal(goal.id, { is_archived: newArchived });
      const updated = { ...goal, is_archived: newArchived };
      updateGoalInCache(updated);
      await refreshGoals();
      notifySuccess(`Goal ${action}.`);
    } catch (err) {
      console.error('Error toggling archive:', err);
      notifyError(`Failed to ${newArchived ? 'archive' : 'restore'} goal.`);
    } finally {
      setIsArchiving(false);
      setIsArchiveConfirmOpen(false);
    }
  };

  // Fetch accomplishments when the component mounts
  useEffect(() => {
    fetchAccomplishments();

    // Preload notes only after an authenticated user is available.
    // We no longer eagerly preload notes for every GoalCard on mount because that can
    // produce many duplicate network requests and auth checks. Instead, cache the
    // authenticated user's id locally and only fetch notes when the user explicitly
    // opens the notes modal (openNotesModal) or when a temp id is replaced.
    let authListener: { data?: { subscription?: any } } | null = null;
    const primeUserCache = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          userIdRef.current = user.id;
          // prime lightweight shared counts for this goal (non-blocking)
          (async () => { try { await fetchNotesCount?.(goal.id); } catch (e) { /* ignore */ } })();
          (async () => { try { await fetchAccomplishmentsCount?.(goal.id); } catch (e) { /* ignore */ } })();
        } else {
          // subscribe to auth changes so we can populate the cache once available
          authListener = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
              userIdRef.current = session.user.id;
              // prime shared counts once auth arrives
              (async () => { try { await fetchNotesCount?.(goal.id); } catch (e) { /* ignore */ } })();
              (async () => { try { await fetchAccomplishmentsCount?.(goal.id); } catch (e) { /* ignore */ } })();
            }
          });
        }
      } catch (err) {
        console.error('Error priming auth cache for notes:', err);
      }
    };

    primeUserCache();

    return () => {
      // cleanup listener if present
      try {
        if (authListener?.data?.subscription) {
          authListener.data.subscription.unsubscribe();
        }
      } catch (e) {
        // ignore
      }
    };
  }, [goal.id]);

  // Keep localStatus in sync with prop changes
  useEffect(() => {
    setLocalStatus(goal.status);
  }, [goal.status]);

  // Fetch tasks for this goal
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) return;

        const response = await fetch('/.netlify/functions/getAllTasks', {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (!response.ok) throw new Error('Failed to fetch tasks');
        
        const allTasks: Task[] = await response.json();
        const goalTasks = allTasks.filter(task => task.goal_id === goal.id);
        setTasks(goalTasks);
      } catch (error) {
        console.error('Error fetching tasks:', error);
      }
    };

    fetchTasks();
  }, [goal.id]);

  // Derive displayed counts: prefer the larger of the shared cached count and local array length
  const displayedNotesCount = Math.max(notesCountMap[goal.id] ?? 0, notes.length ?? 0);
  const displayedAccomplishmentsCount = Math.max(accomplishmentCountMap[goal.id] ?? 0, accomplishments.length ?? 0);
  const displayedTasksCount = tasksCountMap[goal.id] ?? tasks.length ?? 0;

  // Subscribe to temp-id replacement so this component can proactively fetch
  // accomplishments and notes even if the parent doesn't re-render immediately.
  useEffect(() => {
    // only subscribe for client-side temp ids
    if (!(typeof goal.id === 'string' && goal.id.startsWith('temp-'))) return;
    const unsubscribe = subscribeToTempId(goal.id, (_newId: string) => {
      // When the temp id is replaced, fetch related resources using the new id
      (async () => {
        try {
          // fetch accomplishments and notes for the new server id
          await fetchAccomplishments(_newId);
        } catch (e) {
          // ignore
        }
        try {
          await fetchNotes(_newId);
        } catch (e) {
          // ignore
        }
      })();
    });

    return () => unsubscribe();
  }, [goal.id, subscribeToTempId]);

  // accomplishment creation now handled via AccomplishmentsModal onCreate (optimistic updates)

  return (
    <>

      <div
        key={goal.id}
        className={`${cardClasses} ${isSelected ? 'border-2 border-brand-50 bg-gray-20 dark:bg-brand-90' : 'border-2 border-transparent bg-background-color' } shadow-xl`}
        onClick={(e) => {
          // If the click originated from an interactive element (button, input, link, select, textarea,
          // or any element with role="button"), don't treat it as a card-select click. This prevents
          // clicks on internal controls (icons, buttons, menus) from toggling selection.
          const target = e.target as HTMLElement | null;
          if (target && typeof target.closest === 'function') {
            const interactive = target.closest('button, a, input, select, textarea, [role="button"]');
            if (interactive) return;
          }
          onToggleSelect?.(goal.id);
        }}
      >
          {/* {selectable && (
            <div className="w-full flex justify-end">
            <Checkbox
              size="small"
              checked={!!isSelected}
              onChange={() => onToggleSelect?.(goal.id)}
              inputProps={{ 'aria-label': `Select goal ${goal.title}` }}
            />
            </div>
          )} */}
      
      <div className="goal-header flex flex-row w-full justify-between items-start">
        <div className="flex items-center gap-2 mb-4">
          {tasks && tasks.length > 0 && (
            <GoalCompletionDonut percentage={calculateGoalCompletion(tasks)} size={70} strokeWidth={6} />
          )}          {goal.is_archived && (
            <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <Archive className="w-3 h-3" /> Archived
            </span>
          )}        </div>
        <div className="tabs flex flex-row items-center justify-end w-full">
          <span className="card-category" dangerouslySetInnerHTML={{ __html: applyHighlight(goal.category, filter) || 'No category provided.' }}>
          </span>
        </div>
      </div>
      <div className="goal-content flex flex-col mt-2 flex-grow">
        <h4 className={`card-title text-lg text-gray-90 dark:text-gray-10 font-medium`} dangerouslySetInnerHTML={{ __html: applyHighlight(goal.title, filter) || 'Untitled Goal' }}>
        </h4>
        <p className={`text-gray-60 dark:text-gray-40 mt-1`} dangerouslySetInnerHTML={{ __html: applyHighlight(goal.description, filter) || 'No description provided.' }}>
        </p>
      </div>
      {/* Footer with accomplishments and actions */}
      <footer className="mt-2 text-sm text-gray-50 dark:text-gray-30 flex flex-col items-left justify-between">
        <div className='flex flex-row w-full justify-between items-end gap-2'>
          {showAllGoals && (
          <div className="hidden text-xs pb-2 w-full text-tertiary-text">
            {goal.week_start}
          </div>
          )}
          <div className="flex flex-row items-center gap-1">
            <Tooltip title="Accomplishments" placement="top" arrow>
              <span>
                <IconButton aria-label="Accomplishments" onClick={(e) => { e.stopPropagation(); openModal(); }} size="small" className="btn-ghost">
                  {displayedAccomplishmentsCount > 0 && (
                    <div data-testid={`accomplishments-count-${goal.id}`} className={objectCounter}>{displayedAccomplishmentsCount}</div>
                  )}
                  {/* Test-only hidden counter for deterministic tests */}
                  {process.env.NODE_ENV === 'test' && (
                    <span data-testid={`accomplishments-count-${goal.id}-testonly`} style={{ display: 'none' }}>{accomplishmentCountMap[goal.id] ?? accomplishments.length}</span>
                  )}
                  <Award className="w-5 h-5 inline" name="Add accomplishment" />
                </IconButton>
              </span>
            </Tooltip>

            <Tooltip title="Notes" placement="top" arrow>
              <span>
                <IconButton aria-label="Notes" onClick={(e) => { e.stopPropagation(); openNotesModal(); }} id="openNotes" size="small" className="btn-ghost">
                  {(displayedNotesCount > 0) && (
                    <div data-testid={`notes-count-${goal.id}`} className={objectCounter}>{displayedNotesCount}</div>
                  )}
                  {/* Test-only hidden counter for deterministic tests */}
                  {process.env.NODE_ENV === 'test' && (
                    <span data-testid={`notes-count-${goal.id}-testonly`} style={{ display: 'none' }}>{notesCountMap[goal.id] ?? (notes.length > 0 ? notes.length : 0)}</span>
                  )}
                  <NotesIcon className="w-5 h-5" />
                </IconButton>
              </span>
            </Tooltip>

            {!hideTasks && (
            <Tooltip title="Tasks" placement="top" arrow>
              <span>
                <IconButton aria-label="Tasks" onClick={(e) => { e.stopPropagation(); openTasksModal(); }} size="small" className="btn-ghost">
                  {displayedTasksCount > 0 && (
                    <div data-testid={`tasks-count-${goal.id}`} className={objectCounter}>{displayedTasksCount}</div>
                  )}
                  <ListTodo className="w-5 h-5" />
                </IconButton>
              </span>
            </Tooltip>
            )}
          </div>
          <div className="flex flex-row items-center gap-1">
            <Tooltip title="Edit Goal" placement="top" arrow>
              <span>
                <IconButton
                  aria-label="Edit Goal"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (inlineEdit) {
                      setInlineEditGoal(goal);
                      setIsInlineEditOpen(true);
                    } else {
                      handleEdit(goal.id);
                    }
                  }}
                  size="small"
                  className="btn-ghost"
                >
                  <Edit className="w-5 h-5" />
                </IconButton>
              </span>
            </Tooltip>
          

            <Tooltip title={goal.is_archived ? 'Restore Goal' : 'Archive Goal'} placement="top" arrow>
              <span>
                <IconButton
                  aria-label={goal.is_archived ? 'Restore Goal' : 'Archive Goal'}
                  onClick={(e) => { e.stopPropagation(); setIsArchiveConfirmOpen(true); }}
                  size="small"
                  className="btn-ghost"
                  disabled={isArchiving}
                >
                  {goal.is_archived ? <ArchiveRestore className="w-5 h-5" /> : <Archive className="w-5 h-5" />}
                </IconButton>
              </span>
            </Tooltip>

            <Tooltip title="Delete Goal" placement="top" arrow>
              <span>
                <IconButton aria-label="Delete Goal" onClick={(e) => { e.stopPropagation(); setIsDeleteConfirmOpen(true); }} size="small" className="btn-ghost">
                  <Trash className="w-5 h-5" />
                </IconButton>
              </span>
            </Tooltip>
          </div>
        </div>
    </footer>
        
    {/* Accomplishments modal (extracted component) */}
    <AccomplishmentsModal
      goalTitle={goal.title}
      isOpen={isAccomplishmentModalOpen}
      onClose={closeModal}
      accomplishments={accomplishments}
      onCreate={async ({ title, description, impact }) => {
        // optimistic create
        const tempId = `temp-${Date.now()}`;
        const temp = { id: tempId, title, description, impact: impact || '', created_at: new Date().toISOString() } as Accomplishment;
        setAccomplishments((s) => [temp, ...s]);
        setIsAccomplishmentLoading(true);
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('User not authenticated');
          const { error } = await supabase.from('accomplishments').insert({
            title,
            description,
            impact: impact || null,
            goal_id: goal.id,
            user_id: user.id,
            week_start: goal.week_start,
          }).select();
          if (error) throw error;
          // refresh GoalCard's own list to replace the temp record with the real row
          void fetchAccomplishments(goal.id);
        } catch (err) {
          console.error('Error creating accomplishment:', err);
          // rollback
          setAccomplishments((s) => s.filter((a) => a.id !== tempId));
          notifyError('Failed to create accomplishment.');
        } finally {
          setIsAccomplishmentLoading(false);
        }
      }}
      onDelete={async (id) => {
        await deleteAccomplishment(id);
      }}
      onEdit={(item) => openEditAccomplishmentModal(item)}
      loading={isAccomplishmentLoading}
    />
    {/* Notes Modal */}
    {isNotesModalOpen && (
      <div 
        id="editNotes" 
        className={`${overlayClasses} flex items-center justify-center`}
        onMouseDown={(e) => {
          // close when clicking the backdrop (only when clicking the overlay itself)
          if (e.target === e.currentTarget) closeNotesModal();
        }}
      >
        <div className={`${modalClasses} w-full max-w-2xl`}> 
          <div className='flex flex-row w-full justify-between items-start'>
              <h3 className="text-lg font-medium text-gray-90 mb-4">Notes for <br />"{goal.title}"</h3>
              {/* <h4 className="text-md font-semibold mb-2">Existing accomplishments</h4> */}
              <div className="mb-4 flex justify-end">
                  <button className="btn-ghost" onClick={closeNotesModal}>
                    <CloseButton className="w-4 h-4" />
                  </button>
              </div>
          </div>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="mt-4">
              <RichTextEditor
                id={`new-note-${goal.id}`}
                value={newNoteContent}
                onChange={setNewNoteContent}
                placeholder="Add notes about this goal..."
                label="Add a new note"
              />
              <div className="mt-2 flex justify-end gap-2">
                {/* <button className="btn-ghost" onClick={() => { setNewNoteContent(''); }}>Cancel</button> */}
                <button className="btn-primary" onClick={createNote} disabled={isNotesLoading}><PlusIcon className="w-4 h-4 inline mr-1" />Add note</button>
                {isNotesLoading && <div className="ml-2 text-sm text-gray-50">Saving...</div>}
              </div>
            </div>
            {isNotesLoading && notes.length === 0 ? (
              <div className="text-sm text-gray-50">Loading notes...</div>
            ) : null
            }
            { notes.length != 0 && (
            <div>
              <h4 className="text-md font-semibold mb-2">Existing notes</h4>
              <ul className="space-y-3">
                {notes.map((note) => (
                  <li key={note.id} className="p-3 border rounded bg-background dark:border-gray-70">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-xs text-secondary-text">{new Date(note.created_at).toLocaleString()}</div>
                        <div className="flex items-center justify-end gap-2">
                          <button className="btn-ghost" onClick={() => { setEditingNoteId(note.id); setEditingNoteContent(note.content); }} title="Edit note"><Edit className="w-4 h-4" /></button>
                          <button className="btn-ghost" onClick={() => setNoteDeleteTarget(note.id)} title="Delete note" disabled={isNotesLoading}><Trash className="w-4 h-4" /></button>
                        </div>
                      </div>
                      <div className="text-sm text-primary-text" dangerouslySetInnerHTML={{ __html: enhanceLinks(note.content) }} />
                    {editingNoteId === note.id && (
                      <div className="mt-2">
                        <RichTextEditor
                          id={`edit-note-${note.id}`}
                          value={editingNoteContent}
                          onChange={setEditingNoteContent}
                          placeholder="Edit note..."
                          label="Edit note"
                        />
                        <div className="mt-2 flex justify-end gap-2">
                          <button className="btn-ghost" onClick={() => { setEditingNoteId(null); setEditingNoteContent(''); }}>Cancel</button>
                          <button className="btn-primary" onClick={() => updateNote(note.id, editingNoteContent)}><SaveIcon className="w-4 h-4 inline mr-1" />Save</button>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
            )}
          </div>
          <ConfirmModal
            isOpen={!!noteDeleteTarget}
            title="Delete note?"
            message={`Are you sure you want to delete this note? This action cannot be undone.`}
            onCancel={() => setNoteDeleteTarget(null)}
            onConfirm={async () => {
              if (!noteDeleteTarget) return;
              await deleteNote(noteDeleteTarget);
              setNoteDeleteTarget(null);
            }}
            confirmLabel="Delete"
            cancelLabel="Cancel"
          />
          {/* <div className="mt-4 flex justify-end">
            <button className="btn-secondary" onClick={closeNotesModal}>Close</button>
          </div> */}
        </div>
      </div>
    )}

    {/* Tasks Modal */}
    {isTasksModalOpen && (
      <div 
        id="editTasks" 
        className={`${overlayClasses} flex items-center justify-center`}
        onMouseDown={(e) => {
          // close when clicking the backdrop (only when clicking the overlay itself)
          if (e.target === e.currentTarget) closeTasksModal();
        }}
      >
        <div className={`${modalClasses} w-3/4`}> 
          <div className='flex flex-row w-full justify-between items-start mb-4'>
            <h3 className="text-lg font-medium text-gray-90">
              Tasks for <br />"{goal.title}"
            </h3>
            <button className="btn-ghost" onClick={closeTasksModal}>
              <CloseButton className="w-4 h-4" />
            </button>
          </div>
          
          <div className="max-h-[70vh] overflow-y-auto">
            <TasksList 
              goalId={goal.id}
              goalTitle={goal.title}
              goalDescription={goal.description || ''}
              goalCategory={goal.category}
            />
          </div>
        </div>
      </div>
    )}

    <ConfirmModal
      isOpen={isDeleteConfirmOpen}
      title="Delete goal?"
      message={`Are you sure you want to permanently delete the goal "${goal.title}"? This action cannot be undone.`}
      onCancel={() => setIsDeleteConfirmOpen(false)}
      onConfirm={async () => {
        try {
          setIsDeleting(true);
          await handleDelete(goal.id);
        } catch (err) {
          console.error('Error deleting goal:', err);
        } finally {
          setIsDeleting(false);
          setIsDeleteConfirmOpen(false);
        }
      }}
      confirmLabel="Delete"
      cancelLabel="Cancel"
      loading={isDeleting}
    />
    <ConfirmModal
      isOpen={isArchiveConfirmOpen}
      title={goal.is_archived ? 'Restore goal?' : 'Archive goal?'}
      message={
        goal.is_archived
          ? `Restore "${goal.title}"? It will reappear in all views.`
          : `Archive "${goal.title}"? It will be hidden from all views but included in summaries for its time range.`
      }
      onCancel={() => setIsArchiveConfirmOpen(false)}
      onConfirm={handleArchiveToggle}
      confirmLabel={goal.is_archived ? 'Restore' : 'Archive'}
      cancelLabel="Cancel"
      loading={isArchiving}
    />
    {/* Render children if provided */}
    {/* {children && <div className="goal-children">{children}</div>} */}

    {/* Edit Accomplishment Modal */}
    {isEditAccomplishmentModalOpen && selectedAccomplishment && (
      <div 
        className={`${overlayClasses} flex items-center justify-center`}
        onMouseDown={(e) => {
          // close when clicking the backdrop (only when clicking the overlay itself)
          if (e.target === e.currentTarget) closeEditAccomplishmentModal();
        }}
      >
        <div className={`${modalClasses}`}>
          <h3 className="text-lg font-medium text-gray-90 mb-4">Edit Accomplishment</h3>
          <AccomplishmentEditor
            accomplishment={selectedAccomplishment}
            onSave={saveEditedAccomplishment}
            onRequestClose={closeEditAccomplishmentModal}
          />
        </div>
      </div>
    )}

    {/* Inline Goal Editor (used when inlineEdit prop is true) */}
    {inlineEdit && isInlineEditOpen && (
      <div 
        className={`${overlayClasses} flex items-center justify-center`}
        onMouseDown={(e) => {
          // close when clicking the backdrop (only when clicking the overlay itself)
          if (e.target === e.currentTarget) setIsInlineEditOpen(false);
        }}
      >
      <GoalEditor
        title={inlineEditGoal.title}
        description={inlineEditGoal.description || ''}
        category={inlineEditGoal.category || ''}
        week_start={inlineEditGoal.week_start || ''}
        onAddCategory={async (newCat: string) => {
          try {
            await addCategory(newCat);
            setInlineEditGoal((prev) => ({ ...prev, category: newCat }));
          } catch (err) {
            console.error('Error adding category:', err);
          }
        }}
        onRequestClose={() => setIsInlineEditOpen(false)}
        onSave={async (updatedDescription, updatedTitle, updatedCategory, updatedWeekStart, status, status_notes) => {
          try {
            const allowedStatuses = ['Not started', 'In progress', 'Blocked', 'Done', 'On hold'] as const;
            let finalStatus: Goal['status'] | undefined;
            if (typeof status === 'string' && (allowedStatuses as readonly string[]).includes(status)) {
              finalStatus = status as Goal['status'];
            } else if (typeof goal.status === 'string' && (allowedStatuses as readonly string[]).includes(goal.status)) {
              finalStatus = goal.status as Goal['status'];
            }
            const updated: Goal = {
              ...goal,
              title: updatedTitle,
              description: updatedDescription,
              category: updatedCategory,
              week_start: updatedWeekStart,
              status: finalStatus,
              status_notes: status_notes ?? goal.status_notes,
            };
            await updateGoal(goal.id, updated);
            updateGoalInCache(updated);
            await refreshGoals();
            setIsInlineEditOpen(false);
          } catch (err) {
            console.error('Error saving goal inline:', err);
            notifyError('Failed to save goal.');
          }
        }}
      />
      </div>
    )}
  </div>
</>
  );
};
      
export default GoalCard;