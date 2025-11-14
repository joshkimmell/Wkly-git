import React, { useState, useEffect } from 'react';
import { useGoalsContext } from '@context/GoalsContext';
import supabase from '@lib/supabase'; // Ensure this is the correct path to your Supabase client
// import { handleDeleteGoal } from '@utils/functions';
import { Goal, Accomplishment } from '@utils/goalUtils'; // Adjust the import path as necessary
import { Trash, Edit, Award, X as CloseButton, ChevronUp, ChevronDown } from 'lucide-react';
import { FileText as NotesIcon, Plus as PlusIcon, Save as SaveIcon } from 'lucide-react';
import { TextField, Tooltip, IconButton } from '@mui/material';
import type { ChangeEvent } from 'react';
// import { STATUSES, STATUS_COLORS, type Status } from '../constants/statuses';
import { cardClasses, modalClasses, objectCounter, overlayClasses } from '@styles/classes'; // Adjust the import path as necessary
import useGoalExtras from '@hooks/useGoalExtras';
import { notifyError, notifySuccess } from './ToastyNotification';
// import { Link } from 'react-router-dom';
import { applyHighlight } from '@utils/functions'; // Adjust the import path as necessary
import AccomplishmentEditor from './AccomplishmentEditor'; // Import the AccomplishmentEditor component
import AccomplishmentsModal from './AccomplishmentsModal';
import ConfirmModal from './ConfirmModal';

// interface GoalKanbanCardProps {
//   goal: Goal; // Add the goal prop to access goal properties
//   handleDelete: (goalId: string) => void;
//   handleEdit: (goalId: string) => void;
//   filter: string; // Accept filter as a prop
//   draggable 
//   onDragStart={(e) => handleDragStart(e, id)}
// }
interface GoalKanbanCardProps {
  goal: Goal;
  handleDelete: (goalId: string) => void;
  handleEdit: (goalId: string) => void;
  // onDragStart accepts the native drag event so parents can forward their
  // handler directly and capture the goal id in their closure
  // (e.g. `onDragStart={(e) => handleDragStart(e, id)}`).
  onDragStart?: (e: React.DragEvent<HTMLDivElement>) => void;
  filter: string;
  draggable?: boolean;
}

// const GoalCard: React.FC<GoalCardProps> = ({ goal }) => {
const GoalKanbanCard: React.FC<GoalKanbanCardProps> = ({ 
  goal, 
  handleDelete, 
  handleEdit,
  onDragStart,
  filter, // Accept filter as a prop
  draggable = true,
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
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [noteDeleteTarget, setNoteDeleteTarget] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteContent, setEditingNoteContent] = useState('');
  // Local status state for optimistic UI updates when changing status inline
  // We call useGoalsContext to ensure any context subscriptions remain active.
  useGoalsContext();

  // Local expanded state for this single card (clicking expands only this card)
  const [isExpanded, setIsExpanded] = useState(false);

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
  const { notesCountMap, accomplishmentCountMap, fetchNotesCount, fetchAccomplishmentsCount } = useGoalExtras();

  // Proactively prime counts for Kanban cards without waiting for user interaction.
  // Only fetch when we don't already have a cached value to avoid duplicate requests.
  useEffect(() => {
    if (!goal?.id) return;
    if (typeof goal.id === 'string' && goal.id.startsWith('temp-')) return; // skip temp ids
    // if no notes count, try to fetch it (hook will guard auth/retries)
    if (notesCountMap[goal.id] === undefined) {
      (async () => { try { await fetchNotesCount?.(goal.id); } catch (e) { /* ignore */ } })();
    }
    // if no accomplishments count, try to fetch it
    if (accomplishmentCountMap[goal.id] === undefined) {
      (async () => { try { await fetchAccomplishmentsCount?.(goal.id); } catch (e) { /* ignore */ } })();
    }
  }, [goal?.id, notesCountMap, accomplishmentCountMap, fetchNotesCount, fetchAccomplishmentsCount]);

  // const [localStatus, setLocalStatus] = useState<string | undefined>(goal.status);
  // const [statusAnchorEl, setStatusAnchorEl] = useState<null | HTMLElement>(null);
  // const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // const statusColors = STATUS_COLORS;

  const { subscribeToTempId } = useGoalsContext();

  const openModal = () => {
    if (!isAccomplishmentModalOpen) {
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
      const userId = await getCachedUserId();
      if (!userId) throw new Error('User not authenticated');
      const res = await fetch(`/api/getNotes?goal_id=${idToUse}`, { headers: { Authorization: `Bearer ${userId}` } });
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      const res = await fetch(`/api/createNote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.id}` },
        body: JSON.stringify({ goal_id: goal.id, content: tempNote.content }),
      });
      if (!res.ok) throw new Error(await res.text());
      // reconcile with server copy
      await fetchNotes();
  // refresh the shared notes count for this goal
  try { await fetchNotesCount?.(goal.id); } catch (e) { /* ignore */ }
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      const res = await fetch(`/api/updateNote`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.id}` },
        body: JSON.stringify({ id: noteId, content }),
      });
      if (!res.ok) throw new Error(await res.text());
      await fetchNotes();
      try { 
        await fetchNotesCount?.(goal.id); 
      } catch (e) { /* ignore */ }
      setEditingNoteId(null);
      setEditingNoteContent('');
    } catch (err: any) {
      console.error('Error updating note:', err);
      notifyError('Failed to update note.');
    }
  };

  const deleteNote = async (noteId: string) => {
    // optimistic delete: remove locally first
    const prior = notes;
    setNotes((s) => s.filter((n) => n.id !== noteId));
    setIsNotesLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      const res = await fetch(`/api/deleteNote?note_id=${noteId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${user.id}` } });
      if (!res.ok) throw new Error(await res.text());
      // success; nothing else
      try { 
        await fetchNotesCount?.(goal.id); 
      } catch (e) { /* ignore */ }
    } catch (err: any) {
      console.error('Error deleting note:', err);
      // rollback
      setNotes(prior);
      notifyError('Failed to delete note.');
    } finally {
      setIsNotesLoading(false);
    }
  };

  const deleteAccomplishment = async (accomplishmentId: string) => {
    // optimistic delete
    const prior = accomplishments;
    setAccomplishments((s) => s.filter((a) => a.id !== accomplishmentId));
    setIsAccomplishmentLoading(true);
    try {
      const { error } = await supabase
        .from('accomplishments')
        .delete()
        .eq('id', accomplishmentId);

      if (error) {
        console.error('Error deleting accomplishment:', error.message);
        // rollback
        setAccomplishments(prior);
        notifyError('Error deleting accomplishment.');
        return;
      }

      notifySuccess('Accomplishment deleted successfully.');
    } catch (err) {
      console.error('Unexpected error deleting accomplishment:', err);
      setAccomplishments(prior);
      notifyError('Error deleting accomplishment.');
    } finally {
      setIsAccomplishmentLoading(false);
    }
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

      // Refresh the accomplishments list after saving
      fetchAccomplishments();
      notifySuccess('Accomplishment updated successfully.');
      closeEditAccomplishmentModal();
    } catch (err) {
      console.error('Unexpected error saving edited accomplishment:', err);
      notifyError('Error saving edited accomplishment.');
    } finally {
      setIsAccomplishmentLoading(false);
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
          // fetch lightweight count on initial prime so UI can show note counts without fetching full notes
          (async () => { try { await fetchNotesCount(); } catch (e) { /* ignore */ } })();
        } else {
          // subscribe to auth changes so we can populate the cache once available
          authListener = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
              userIdRef.current = session.user.id;
              // fetch count once auth arrives
              (async () => { try { await fetchNotesCount(); } catch (e) { /* ignore */ } })();
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

  // // Keep localStatus in sync with prop changes
  // useEffect(() => {
  //   setLocalStatus(goal.status);
  // }, [goal.status]);

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

   // Use shared HTML-producing highlight helper and render via dangerouslySetInnerHTML
      const renderHTML = (text?: string | null) => ({ __html: applyHighlight(text ?? '', filter) });

  return (
    <div
      key={goal.id}
      className={`${cardClasses} min-w-40 p-0 bg-gray-10 dark:bg-gray-80 rounded shadow-md hover:shadow-lg border border-transparent hover:border-gray-20 dark:hover:border-gray-70 transition-shadow`}
      draggable={draggable}
  onDragStart={(e) => { if (typeof onDragStart === 'function') onDragStart(e); }}
    >
      <div className="goal-header flex flex-row w-full justify-end items-center">
        
        <div className="tabs flex flex-row items-center justify-end w-full">
          <span className="card-category" dangerouslySetInnerHTML={{ __html: applyHighlight(goal.category, filter) || 'No category provided.' }}>
          </span>
        </div>
      </div>

      <div className="mb-2 gap-1 flex flex-col justify-between w-full items-start">
        <div className="text-sm font-semibold pt-2 "><span dangerouslySetInnerHTML={renderHTML(goal.title)} /></div>
        {goal.description ? (
          <>
            {!isExpanded ? (
              <div
                className="text-xs pt-2"
                dangerouslySetInnerHTML={{ __html: goal.description.substring(0, 100) + (goal.description.length > 100 ? '...' : '') }}
              />
            ) : (
              <div className="text-xs pt-2"><span dangerouslySetInnerHTML={renderHTML(goal.description)} /></div>
            )}
            { goal.description.length >= 100 && (
            <button
              onClick={() => setIsExpanded((s) => !s)}
              className="btn-ghost inline items-center justify-start shadow-0 p-0"
              type="button"
            >
              {isExpanded ? (
                <span className="text-xs text-brand-60 dark:text-brand-20">Show Less <ChevronUp className="w-3 h-3 inline-block ml-1" /></span>
              ) : (
                <span className="text-xs text-brand-60 dark:text-brand-20">Show More <ChevronDown className="w-3 h-3 inline-block ml-1" /></span>
              )}
            </button>
            )}
          </>
        ) : null}
      </div>
      {/* Footer with accomplishments and actions */}
      <footer className="mt-2 text-sm text-gray-50 dark:text-gray-30 flex flex-col items-left justify-between">
          <div className='flex flex-row w-full justify-end items-end gap-2'>
            <Tooltip title="Accomplishments" placement="top" arrow>
              <span>
                <IconButton aria-label="Accomplishments" onClick={() => openModal()} size="small" className="btn-ghost">
                  {(accomplishmentCountMap[goal.id] ?? accomplishments.length) > 0 && (
                    <div className={objectCounter}>{accomplishmentCountMap[goal.id] ?? accomplishments.length}</div>
                  )}
                  <Award className="w-5 h-5 inline" name="Add accomplishment" />
                </IconButton>
              </span>
            </Tooltip>

            <Tooltip title="Notes" placement="top" arrow>
              <span>
                <IconButton aria-label="Notes" onClick={openNotesModal} id="openNotes" size="small" className="btn-ghost">
                  {((notesCountMap[goal.id] ?? (notes.length > 0 ? notes.length : 0)) > 0) && (
                    <div className={objectCounter}>{notesCountMap[goal.id] ?? (notes.length > 0 ? notes.length : 0)}</div>
                  )}
                  <NotesIcon className="w-5 h-5" />
                </IconButton>
              </span>
            </Tooltip>

            <Tooltip title="Delete Goal" placement="top" arrow>
              <span>
                <IconButton aria-label="Delete Goal" onClick={() => setIsDeleteConfirmOpen(true)} size="small" className="btn-ghost">
                  <Trash className="w-5 h-5" />
                </IconButton>
              </span>
            </Tooltip>

            <Tooltip title="Edit Goal" placement="top" arrow>
              <span>
                <IconButton aria-label="Edit Goal" onClick={() => handleEdit(goal.id)} size="small" className="btn-ghost">
                  <Edit className="w-5 h-5" />
                </IconButton>
              </span>
            </Tooltip>
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
          // refresh from server to replace temp with real rows
          await fetchAccomplishments();
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
      <div id="editNotes" className={`${overlayClasses} flex items-center justify-center`}>
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
              {/* <label className="block text-sm font-medium text-gray-700">Add a new note</label> */}
              <TextField
                value={newNoteContent}
                onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setNewNoteContent(e.target.value)}
                className="mt-4 block w-full"
                label="Add a new note"
                multiline
                rows={3}
                size="small"
                
              />
              <div className="mt-2 flex justify-end gap-2">
                {/* <button className="btn-ghost" onClick={() => { setNewNoteContent(''); }}>Cancel</button> */}
                <button className="btn-primary" onClick={createNote} disabled={isNotesLoading}><PlusIcon className="w-4 h-4 inline mr-1" />Add note</button>
                {isNotesLoading && <div className="ml-2 text-sm text-gray-500">Saving...</div>}
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
                  <li key={note.id} className="p-3 border rounded bg-gray-10 dark:bg-gray-80 dark:border-gray-70">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-xs text-gray-40">{new Date(note.created_at).toLocaleString()}</div>
                        <div className="flex items-center justify-end gap-2">
                          <button className="btn-ghost" onClick={() => { setEditingNoteId(note.id); setEditingNoteContent(note.content); }} title="Edit note"><Edit className="w-4 h-4" /></button>
                          <button className="btn-ghost" onClick={() => setNoteDeleteTarget(note.id)} title="Delete note" disabled={isNotesLoading}><Trash className="w-4 h-4" /></button>
                        </div>
                      </div>
                      <div className="text-sm text-gray-70 dark:text-gray-20" dangerouslySetInnerHTML={{ __html: note.content }} />
                    {editingNoteId === note.id && (
                      <div className="mt-2">
                        <TextField
                          value={editingNoteContent}
                          onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setEditingNoteContent(e.target.value)}
                          multiline
                          rows={3}
                          size="small"
                          
                          className="mt-1 block w-full"
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
    {/* Render children if provided */}
    {/* {children && <div className="goal-children">{children}</div>} */}

    {/* Edit Accomplishment Modal */}
    {isEditAccomplishmentModalOpen && selectedAccomplishment && (
      <div className={`${overlayClasses} flex items-center justify-center`}>
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
  </div>

  // </div>
  );
};
      
export default GoalKanbanCard;

// <div key={id} className={`${cardClasses} kanban-card min-w-40 p-0 bg-gray-10 dark:bg-gray-90 rounded shadow-md hover:shadow-lg border border-transparent hover:border-gray-20 dark:hover:border-gray-70 transition-shadow`} draggable onDragStart={(e) => handleDragStart(e, id)}>
      //     <div className="flex flex-col justify-end items-start">
      //         <div className="flex flex-row justify-end w-full items-start">
      //             <div className="card-category"><span dangerouslySetInnerHTML={renderHTML(goal.category)} /></div>
      //         </div>
      //         <div className="mb-2 gap-1 flex flex-col justify-between w-full items-start">
      //             <div className="text-sm font-semibold pt-2 "><span dangerouslySetInnerHTML={renderHTML(goal.title)} /></div>
      //             {goal.description ? (
      //                 <>
      //                     {!expandedCards[goal.id] ? (
      //                         <div
      //                             className="text-xs pt-2"
      //                             dangerouslySetInnerHTML={{ __html: goal.description.substring(0, 100) + (goal.description.length > 100 ? '...' : '') }}
      //                         />
      //                     ) : (
      //                         <div className="text-xs pt-2"><span dangerouslySetInnerHTML={renderHTML(goal.description)} /></div>
      //                     )}
      //                     { goal.description.length >= 100 && (
      //                     <button
      //                         onClick={() => toggleExpanded(goal.id)}
      //                         className="btn-ghost inline items-center justify-start shadow-0 p-0"
      //                         type="button"
      //                     >
      //                         {expandedCards[goal.id] ? (
      //                             <span className="text-xs text-brand-60 dark:text-brand-20">Show Less <ChevronUp className="w-3 h-3 inline-block ml-1" /></span>
      //                         ) : (
      //                             <span className="text-xs text-brand-60 dark:text-brand-20">Show More <ChevronDown className="w-3 h-3 inline-block ml-1" /></span>
      //                         )}
      //                     </button>
      //                     )}
      //                 </>
      //             ) : null}
      //         </div>
      //         <div className="flex flex-row w-full justify-end items-end">
      //             <Tooltip title="Edit" placement="top" arrow>
      //                 <button aria-label={`Edit ${goal.title}`} onClick={() => { setSelectedGoal(goal); setIsEditorOpen(true); }} className="text-sm btn-ghost"><Edit className='w-3 h-3' /></button>
      //             </Tooltip>
      //             <Tooltip title="Delete" placement="top" arrow>
      //                 <button aria-label={`Delete ${goal.title}`} onClick={() => handleDeleteGoal(goal.id)} className="text-sm btn-ghost"><Trash className='w-3 h-3' /></button>
      //             </Tooltip>
      //         </div>
      //     </div>
      // </div>