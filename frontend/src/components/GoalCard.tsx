import React, { useState, useEffect } from 'react';
import supabase from '@lib/supabase'; // Ensure this is the correct path to your Supabase client
// import { handleDeleteGoal } from '@utils/functions';
import { Goal, Accomplishment } from '@utils/goalUtils'; // Adjust the import path as necessary
import { Trash, Edit, Award, X as CloseButton } from 'lucide-react';
import { FileText as NotesIcon, Plus as PlusIcon, Save as SaveIcon } from 'lucide-react';
import { cardClasses, modalClasses } from '@styles/classes'; // Adjust the import path as necessary
import { notifyError, notifySuccess } from './ToastyNotification';
// import { Link } from 'react-router-dom';
import { applyHighlight } from '@utils/functions'; // Adjust the import path as necessary
import AccomplishmentEditor from './AccomplishmentEditor'; // Import the AccomplishmentEditor component
import AccomplishmentsModal from './AccomplishmentsModal';
import ConfirmModal from './ConfirmModal';

interface GoalCardProps {
  goal: Goal; // Add the goal prop to access goal properties
  handleDelete: (goalId: string) => void;
  handleEdit: (goalId: string) => void;
  filter: string; // Accept filter as a prop
}

// const GoalCard: React.FC<GoalCardProps> = ({ goal }) => {
const GoalCard: React.FC<GoalCardProps> = ({ 
  goal, 
  handleDelete, 
  handleEdit,
  filter // Accept filter as a prop
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
  const fetchAccomplishments = async () => {
    try {
      const { data, error } = await supabase
        .from('accomplishments')
        .select('*')
        .eq('goal_id', goal.id);

      if (error) {
        console.error('Error fetching accomplishments:', error.message);
        return;
      }

      setAccomplishments(data || []);
    } catch (err) {
      console.error('Unexpected error fetching accomplishments:', err);
    }
  };

  const fetchNotes = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      const res = await fetch(`/api/getNotes?goal_id=${goal.id}`, { headers: { Authorization: `Bearer ${user.id}` } });
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
    // If the user isn't available immediately (auth is async), subscribe to auth state changes
    // and fetch notes when the user signs in.
    let authListener: { data?: { subscription?: any } } | null = null;
    const tryFetchNotes = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await fetchNotes();
        } else {
          // subscribe to auth changes
          authListener = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
              fetchNotes();
            }
          });
        }
      } catch (err) {
        console.error('Error checking auth for notes preload:', err);
      }
    };

    tryFetchNotes();

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

  // accomplishment creation now handled via AccomplishmentsModal onCreate (optimistic updates)

  return (
    <div key={goal.id} className={`${cardClasses} shadow-xl`}>
      <div className="goal-header flex flex-row w-full justify-between items-center">
        <div className="flex items-center gap-2">
          {goal.status && (
            <div className="card-status text-nowrap">
              {goal.status}
            </div>
          )}
        </div>
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
        {/* Status display */}
        <div className="mb-2">
          {/* {goal.status && (
            <div className="inline-block px-2 py-1 rounded text-xs font-semibold bg-gray-20 dark:bg-gray-80 mr-2">
              {goal.status}
            </div>
          )} */}
          {/* {goal.status_set_at && (
            <div className="text-xs text-gray-50 dark:text-gray-40 inline-block ml-2">Set: {new Date(goal.status_set_at).toLocaleString()}</div>
          )} */}
          {/* {goal.status_notes && (

            <div className="mt-1 text-sm text-gray-60 dark:text-gray-40">Notes: <span dangerouslySetInnerHTML={{ __html: goal.status_notes }} /></div>
          )} */}
        </div>
       {/* { accomplishments.length > 0 && ( 
          <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="px-0 text-gray-90 dark:text-gray-10 bg-transparent hover:bg-transparent border-none focus-visible:outline-none  flex flex-row items-center justify-between w-full"
          >
            <h4 className="text-sm font-semibold text-gray-90 dark:text-gray-10  flex flex-row items-center justify-between w-full">
              Accomplishments ({accomplishments.length})
            {isExpanded ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </h4>
            
        </button>
          )} 
        
           {isExpanded && (
            <div className="goal_accomplishments mt-4">
              <ul className="list-none list-inside text-gray-700 mt-2 space-y-1">
                {accomplishments.map((accomplishment) => (
                  <li
                    key={accomplishment.id}
                    className="dark:bg-gray-90 dark:bg-opacity-30 hover:bg-gray-20 dark:hover:bg-gray-90 flex flex-row justify-between items-start space-x-2 border-b rounded-md border-gray-30 dark:border-gray-70 p-2 m-2"
                  >
                    <div className="flex flex-col">
                      <h5 className="text-md font-semibold text-brand-80 dark:text-brand-20">
                        {accomplishment.title}
                      </h5>
                      <p className="text-md text-gray-60 dark:text-gray-40">
                        <span dangerouslySetInnerHTML={{ __html: accomplishment.description }} />
                      </p>
                      {accomplishment.impact?.trim() && (
                      <label className="text-sm text-gray-40 dark:text-gray-50">
                        <span dangerouslySetInnerHTML={{ __html: `Impact: ` + accomplishment.impact }} />
                      </label>
                      )}
                    </div>
                    <div className="flex flex-row justify-end">
                      <button
                        type="button"
                        onClick={() => deleteAccomplishment(accomplishment.id)}
                        className="btn-ghost w-auto opacity-50 hover:opacity-100"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditAccomplishmentModal(accomplishment)}
                        className="btn-ghost w-auto opacity-50 hover:opacity-100"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )} */}
          <div className='flex flex-row w-full justify-end items-end gap-2'>
          <button
            // to='#'
            onClick={() => openModal()}
            className="relative btn-ghost flex items-center text-brand-70 dark:text-brand-20 hover:text-brand-90 dark:hover:text-brand-10 dark:hover:bg-gray-90"
            title='Accomplishments'
            >
            {accomplishments.length > 0 && (
            <div className="absolute min-w-4 -top-1 -right-1 items-centered text-xs text-brand-10 border-brand-20 font-semibold bg-gray-70 border-brand-30 rounded-lg px-2">{accomplishments.length}</div>
            )}
            <Award className="w-5 h-5 inline" name="Add accomplishment" /> 
          </button>
            {/* Notes button */}
            <button
              onClick={openNotesModal}
              id="openNotes"
              className="relative btn-ghost flex items-center gap-2 dark:hover:bg-gray-90"
              title="Notes"
            >
              {notes.length > 0 && (
                <div className="absolute min-w-4 -top-1 -right-1 items-centered text-xs text-brand-10 border-brand-20 font-semibold bg-gray-70 border-brand-30 rounded-lg px-2">{notes.length}</div>
              )}
              <NotesIcon className="w-5 h-5" />
            </button>

            <button
              onClick={() => setIsDeleteConfirmOpen(true)}
              title="Delete Goal"
              className="btn-ghost w-auto dark:hover:bg-gray-90"
              >
              <Trash className="w-5 h-5" />
            </button>
            <button
              onClick={() => handleEdit(goal.id)}
              className="btn-ghost w-auto dark:hover:bg-gray-90"
              title='Edit Goal'
              >
              <Edit className="w-5 h-5" />
            </button>
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
      <div id="editNotes" className="fixed inset-0 bg-gray-100 bg-opacity-75 flex items-center justify-center z-50">
        <div className={`${modalClasses} w-full max-w-2xl`}> 
          <div className='flex flex-row w-full justify-between'>
              <h3 className="text-lg font-medium text-gray-90 mb-4">Notes for "{goal.title}"</h3>
              {/* <h4 className="text-md font-semibold mb-2">Existing accomplishments</h4> */}
              <div className="mb-4 flex justify-end">
                  <button className="btn-ghost" onClick={closeNotesModal}>
                    <CloseButton className="w-4 h-4" />
                  </button>
              </div>
          </div>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div>
              <label className="block text-sm font-medium text-gray-700">Add a new note</label>
              <textarea value={newNoteContent} onChange={(e) => setNewNoteContent(e.target.value)} className="mt-1 block w-full border-gray-30 focus:border-b-2 focus:ring-0" rows={3} />
              <div className="mt-2 flex justify-end gap-2">
                {/* <button className="btn-ghost" onClick={() => { setNewNoteContent(''); }}>Cancel</button> */}
                <button className="btn-primary" onClick={createNote} disabled={isNotesLoading}><PlusIcon className="w-4 h-4 inline mr-1" />Add note</button>
                {isNotesLoading && <div className="ml-2 text-sm text-gray-500">Saving...</div>}
              </div>
            </div>

            <div>
              <h4 className="text-md font-semibold mb-2">Existing notes</h4>
              <ul className="space-y-3">
                {notes.map((note) => (
                  <li key={note.id} className="p-3 border rounded bg-gray-10 dark:bg-gray-80 dark:border-gray-70">
                    <div className="flex justify-between items-start">
                      <div className="text-sm font-semibold text-gray-70 dark:text-gray-20" dangerouslySetInnerHTML={{ __html: note.content }} />
                      <div className="flex items-center gap-2">
                        <div className="text-xs text-gray-40">{new Date(note.created_at).toLocaleString()}</div>
                        <button className="btn-ghost" onClick={() => { setEditingNoteId(note.id); setEditingNoteContent(note.content); }} title="Edit note"><Edit className="w-4 h-4" /></button>
                        <button className="btn-ghost" onClick={() => setNoteDeleteTarget(note.id)} title="Delete note" disabled={isNotesLoading}><Trash className="w-4 h-4" /></button>
                      </div>
                    </div>
                    {editingNoteId === note.id && (
                      <div className="mt-2">
                        <textarea className="mt-1 block w-full border-gray-30 focus:border-b-2 focus:ring-0" value={editingNoteContent} onChange={(e) => setEditingNoteContent(e.target.value)} rows={3} />
                        <div className="mt-2 flex justify-end gap-2">
                          <button className="btn-ghost" onClick={() => { setEditingNoteId(null); setEditingNoteContent(''); }}>Cancel</button>
                          <button className="btn-primary" onClick={() => updateNote(note.id, editingNoteContent)}><SaveIcon className="w-4 h-4 inline mr-1" />Save</button>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
                {notes.length === 0 && (
                  <li className="text-sm text-gray-500">No notes yet.</li>
                )}
              </ul>
            </div>
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
      <div className="fixed inset-0 bg-gray-100 bg-opacity-75 flex items-center justify-center z-50">
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
      
export default GoalCard;

      // <div key={goal.id} className="bg-white shadow-sm border rounded-lg p-4">
      //   <h4 className="text-lg font-medium text-gray-900">{goal.title}</h4>
      //   <p className="text-gray-600 mt-1">{goal.description}</p>
      //   <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 mt-2">
      //     {goal.category}
      //   </span>
      //   {/* <p className="text-sm text-gray-500 mt-2">{goal.impact}</p> */}
      //   <div className="mt-4 flex justify-end space-x-2">
      //     <button
      //       onClick={() => handleDeleteGoal(goal.id)}
      //       className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
      //     >
      //       Delete
      //     </button>
      //   </div>
      // </div>