import React, { useState } from 'react';
import { Edit, Plus, Trash2 } from 'lucide-react';
import { TextareaAutosize } from '@mui/material';

export interface FocusNote {
  id: string;
  content: string;
  createdAt: number;
}

interface Props {
  notes: FocusNote[];
  onChange: (notes: FocusNote[]) => void;
  /** Called immediately when a new note is added so the parent can persist it */
  onNoteAdded?: (note: FocusNote) => void;
}

const FocusNotes: React.FC<Props> = ({ notes, onChange, onNoteAdded }) => {
  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');

  const addNote = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    const newNote: FocusNote = { id: `fn-${Date.now()}`, content: trimmed, createdAt: Date.now() };
    onChange([newNote, ...notes]);
    onNoteAdded?.(newNote);
    setDraft('');
  };

  const startEdit = (note: FocusNote) => {
    setEditingId(note.id);
    setEditDraft(note.content);
  };

  const commitEdit = () => {
    const trimmed = editDraft.trim();
    if (!trimmed) return;
    onChange(notes.map((n) => (n.id === editingId ? { ...n, content: trimmed } : n)));
    setEditingId(null);
    setEditDraft('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft('');
  };

  const removeNote = (id: string) => {
    onChange(notes.filter((n) => n.id !== id));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      addNote();
    }
  };

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      commitEdit();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    }
  };

  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="flex flex-col gap-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Quick note… (⌘+Enter to save)"
          rows={3}
          className="w-full !rounded-md !border !border-gray-70 dark:!border-gray-70 !bg-gray-80 dark:!bg-gray-90 !text-sm text-primary-text placeholder:text-secondary-text !p-3 resize-none focus:outline-none focus:!border-brand-50 transition-colors"
        />
        <button
          onClick={addNote}
          disabled={!draft.trim()}
          className="btn-primary self-end disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" /> Add note
        </button>
      </div>

      {notes.length > 0 && (
        <ul className="flex flex-col gap-2 overflow-y-auto flex-1 min-h-0 pr-1 mt-4 border-t border-gray-80 pt-8">
          {notes.map((note) => (
            <li
              key={note.id}
              className="group flex items-start gap-2 rounded-none p-3 bg-gray-80/40 dark:bg-gray-90/70 border-t border-gray-90 text-sm text-primary-text"
            >
              {editingId === note.id ? (
                <div className="flex flex-col gap-2 flex-1 min-w-0">
                  <TextareaAutosize
                    autoFocus
                    value={editDraft}
                    onChange={(e) => setEditDraft(e.target.value)}
                    onKeyDown={handleEditKeyDown}
                    minRows={3}
                    className="w-full rounded-md border border-brand-50 bg-gray-80 dark:bg-gray-90 text-primary-text text-sm p-2 resize-none focus:outline-none transition-colors"
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={cancelEdit}
                      className="btn-secondary px-2.5 py-1 rounded-md text-xs transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={commitEdit}
                      disabled={!editDraft.trim()}
                      className="btn-primary px-2.5 py-1 rounded-md text-xs disabled:opacity-40"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <span className="flex-1 whitespace-pre-wrap break-words">{note.content}</span>
                  <button
                    onClick={() => startEdit(note)}
                    className="btn-ghost opacity-0 group-hover:opacity-100 text-secondary-text hover:text-brand-40 transition-opacity mt-0.5"
                    title="Edit note"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => removeNote(note.id)}
                    className="btn-ghost opacity-0 group-hover:opacity-100 text-secondary-text hover:text-red-40 transition-opacity mt-0.5"
                    title="Remove note"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      {notes.length === 0 && (
        <p className="text-xs text-secondary-text text-center py-4">Notes sync to this task automatically.</p>
      )}
    </div>
  );
};

export default FocusNotes;
