import { useState, useEffect, useRef } from 'react';
import { Edit, Trash, Plus as PlusIcon, X as CloseButton } from 'lucide-react';
import { modalClasses, overlayClasses } from '@styles/classes';
import { TextField, Tooltip, IconButton } from '@mui/material';
import ConfirmModal from './ConfirmModal';
import { Accomplishment } from '@utils/goalUtils';
import RichTextEditor from './RichTextEditor';

interface Props {
  goalTitle: string;
  isOpen: boolean;
  onClose: () => void;
  accomplishments: Accomplishment[];
  onCreate: (item: { title: string; description?: string; impact?: string }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onEdit: (item: Accomplishment) => void;
  loading?: boolean;
}

export default function AccomplishmentsModal({ goalTitle, isOpen, onClose, accomplishments, onCreate, onDelete, onEdit, loading }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [impact, setImpact] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [rteResetKey, setRteResetKey] = useState(0);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const [titleFocused, setTitleFocused] = useState(false);

  const handleFieldChange = (field: 'description', value: string) => {
    if (field === 'description') {
      setDescription(value);
    }
  };

  const handleAdd = async () => {
    if (!title.trim()) return;
    await onCreate({ title: title.trim(), description: description.trim() || undefined, impact: impact.trim() || undefined });
    setTitle('');
    // Clear the controlled description and force the RichTextEditor to remount
    // so any internal editor state is reset.
    setDescription('');
    setRteResetKey((k) => k + 1);
    setImpact('');
  };

  // Clear internal form state when the modal is closed so reopening starts fresh
  // This handles both cancel/close and after deletion confirmations.
  useEffect(() => {
    if (!isOpen) {
      setTitle('');
      setDescription('');
      setRteResetKey((k) => k + 1);
      setImpact('');
      setDeleteTarget(null);
      setIsDeleting(false);
      setTitleFocused(false);
    }
  }, [isOpen]);

  // Focus trap: when modal opens, save previously focused element and trap
  // tab/shift+tab within the modal. Restore focus when modal closes.
  useEffect(() => {
    if (!isOpen) return;
    if (typeof document === 'undefined') return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;

    const container = modalRef.current || document.getElementById('editAccomplishments');
    if (!container) return;

    const focusableSelector = 'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';
    const getFocusable = () => Array.from(container.querySelectorAll<HTMLElement>(focusableSelector)).filter((el) => !el.hasAttribute('disabled'));

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const focusable = getFocusable();
      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey) {
        if (active === first || active === container) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    // Small timeout to allow autofocus to settle on the first field
    setTimeout(() => {
      const focusable = getFocusable();
      if (focusable.length > 0) focusable[0].focus();
    }, 0);

    container.addEventListener('keydown', handleKeyDown as any);

    return () => {
      container.removeEventListener('keydown', handleKeyDown as any);
      // restore focus
      try {
        previouslyFocused.current?.focus();
      } catch (e) {
        // ignore
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      id="editAccomplishments"
      className={`${overlayClasses} flex items-center justify-center`}
      onMouseDown={(e) => {
        // close when clicking the backdrop (only when clicking the overlay itself)
        if (e.target === e.currentTarget) onClose();
      }}
      role="presentation"
    >
      <div className={`${modalClasses} w-full max-w-2xl`}>
        <div className='flex flex-row w-full justify-between'>
                <h3 className="text-lg font-medium text-gray-90 mb-4">Accomplishments for "{goalTitle}"</h3>
                <div className="mb-2 flex justify-end">
                    <Tooltip title="Close" placement="top" arrow>
                      <span>
                        <IconButton className="btn-ghost" title="Close" onClick={onClose} size="small" aria-label="Close">
                          <CloseButton className="w-4 h-4" />
                        </IconButton>
                      </span>
                    </Tooltip>
                </div>
            </div>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          <div className='flex flex-col gap-8'>
            <TextField
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onFocus={() => setTitleFocused(true)}
              onBlur={() => setTitleFocused(false)}
              placeholder="Add an accomplishment for this goal."
              label="Add a new accomplishment"
              multiline
              rows={3}
              className="mt-1 block w-full"
              fullWidth
            />

            {(titleFocused || title.trim().length > 0) && (
              <>
                <RichTextEditor key={`acc-rte-${rteResetKey}`} id="acc-description" value={description} onChange={(value) => handleFieldChange('description', value)} placeholder="Provide a description (optional)" label="Description (optional)" />
                <TextField value={impact} onChange={(e) => setImpact(e.target.value)} placeholder="Include the impact you had (optional)" label="Impact (optional)" className="mt-1 block w-full" fullWidth />
              </>
            )}
            <div className="mt-2 flex justify-end gap-2">
              <button className="btn-primary" onClick={handleAdd} disabled={loading}><PlusIcon className="w-4 h-4 inline mr-1" />Add accomplishment</button>
            </div>
          </div>
          <div>
        {accomplishments.length > 0 && (
            <h4 className="text-md font-semibold mb-2">Existing accomplishments</h4>
        )}    
            <ul className="space-y-3">
              {accomplishments.map((acc) => (
                <li key={acc.id} className="p-3 border rounded bg-gray-20 dark:bg-gray-80 dark:border-gray-70">
                    <div className="flex flex-col w-full">
                        <div className='flex flex-row justify-between items-center mb-2'>
                        {acc.created_at && <div className="text-xs dark:text-gray-40 text-gray-70">{new Date(acc.created_at).toLocaleString()}</div>}
                        <div className="flex flex-row justify-end">
                        <Tooltip title="Edit accomplishment" placement="top" arrow>
                          <span>
                            <IconButton className="btn-ghost" onClick={() => onEdit(acc)} size="small" aria-label="Edit accomplishment"><Edit className="w-4 h-4" /></IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title="Delete accomplishment" placement="top" arrow>
                          <span>
                            <IconButton className="btn-ghost" onClick={() => setDeleteTarget(acc.id)} size="small" aria-label="Delete accomplishment"><Trash className="w-4 h-4" /></IconButton>
                          </span>
                        </Tooltip>
                        </div>
                    </div>
                    <div className="flex-1">
                      <div className="text-md font-semibold text-brand-80 dark:text-brand-10">{acc.title}</div>
                      <div className="text-md text-gray-80 dark:text-gray-40 mt-1">{acc.description ? <span dangerouslySetInnerHTML={{ __html: acc.description }} /> : <span className="text-gray-400">No description provided.</span>}</div>
                      {acc.impact && acc.impact.trim() ? (
                        <div className="text-sm dark:text-gray-40 text-gray-70 mt-2"><strong>Impact:</strong> <span dangerouslySetInnerHTML={{ __html: acc.impact }} /></div>
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}

              {accomplishments.length === 0 && (
                <li className="text-sm text-gray-500">No accomplishments yet.</li>
              )}
            </ul>
          </div>
        </div>
      </div>
      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Delete accomplishment?"
        message={`Are you sure you want to delete this accomplishment? This action cannot be undone.`}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return;
          try {
            setIsDeleting(true);
            await onDelete(deleteTarget);
          } finally {
            setIsDeleting(false);
            setDeleteTarget(null);
          }
        }}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        loading={isDeleting}
      />
    </div>
  );
}
