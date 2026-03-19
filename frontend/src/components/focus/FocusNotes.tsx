import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';

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

  const addNote = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    const newNote: FocusNote = { id: `fn-${Date.now()}`, content: trimmed, createdAt: Date.now() };
    onChange([newNote, ...notes]);
    onNoteAdded?.(newNote);
    setDraft('');
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

  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="flex flex-col gap-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Quick note… (⌘+Enter to save)"
          rows={3}
          className="w-full rounded-lg border border-gray-70 dark:border-gray-700 bg-gray-800 dark:bg-gray-900 text-primary-text placeholder:text-secondary-text text-sm p-3 resize-none focus:outline-none focus:border-violet-500 transition-colors"
        />
        <button
          onClick={addNote}
          disabled={!draft.trim()}
          className="flex items-center gap-1.5 self-end px-3 py-1.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" /> Add note
        </button>
      </div>

      {notes.length > 0 && (
        <ul className="flex flex-col gap-2 overflow-y-auto flex-1 min-h-0 pr-1">
          {notes.map((note) => (
            <li
              key={note.id}
              className="group flex items-start gap-2 rounded-lg p-3 bg-gray-800 dark:bg-gray-900 border border-gray-700 text-sm text-primary-text"
            >
              <span className="flex-1 whitespace-pre-wrap break-words">{note.content}</span>
              <button
                onClick={() => removeNote(note.id)}
                className="opacity-0 group-hover:opacity-100 text-secondary-text hover:text-red-400 transition-opacity mt-0.5"
                title="Remove note"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
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
