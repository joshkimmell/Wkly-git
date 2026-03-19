import React, { useState } from 'react';
import { Edit, Plus, Trash2 } from 'lucide-react';
import RichTextEditor from '@components/RichTextEditor';

/** Strip HTML tags to get plain text — used for empty checks */
const stripHtml = (html: string) => html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();

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
  /** Called when an existing note's content is edited inline */
  onNoteEdited?: (note: FocusNote) => void;
}

const FocusNotes: React.FC<Props> = ({ notes, onChange, onNoteAdded, onNoteEdited }) => {
  const [draft, setDraft] = useState('');
  const [rteKey, setRteKey] = useState(0); // bump to reset the add-note RTE
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');

  const addNote = () => {
    const trimmed = stripHtml(draft).trim();
    if (!trimmed) return;
    const newNote: FocusNote = { id: `fn-${Date.now()}`, content: draft, createdAt: Date.now() };
    onChange([newNote, ...notes]);
    onNoteAdded?.(newNote);
    setDraft('');
    setRteKey((k) => k + 1); // force RTE to remount with empty state
  };

  const startEdit = (note: FocusNote) => {
    setEditingId(note.id);
    setEditDraft(note.content);
  };

  const commitEdit = () => {
    const trimmed = stripHtml(editDraft).trim();
    if (!trimmed) return;
    const updatedNote = notes.find((n) => n.id === editingId);
    const updated = { ...updatedNote!, content: editDraft };
    onChange(notes.map((n) => (n.id === editingId ? updated : n)));
    onNoteEdited?.(updated);
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      addNote();
    }
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
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
      <div className="flex flex-col gap-2" onKeyDown={handleKeyDown}>
        <RichTextEditor
          key={rteKey}
          id="focus-note-draft"
          value={draft}
          onChange={setDraft}
          placeholder="Quick note… (⌘+Enter to save)"
        />
        <button
          onClick={addNote}
          disabled={!stripHtml(draft).trim()}
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
                  <div onKeyDown={handleEditKeyDown}>
                    <RichTextEditor
                      id={`edit-note-${note.id}`}
                      value={editDraft}
                      onChange={setEditDraft}
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={cancelEdit}
                      className="btn-secondary px-2.5 py-1 rounded-md text-xs transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={commitEdit}
                      disabled={!stripHtml(editDraft).trim()}
                      className="btn-primary px-2.5 py-1 rounded-md text-xs disabled:opacity-40"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex-1 whitespace-pre-wrap break-words" dangerouslySetInnerHTML={{ __html: note.content }} />
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
