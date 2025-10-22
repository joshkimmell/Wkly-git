import { useState } from 'react';
import { Edit, Trash, Plus as PlusIcon, X as CloseButton } from 'lucide-react';
import { modalClasses } from '@styles/classes';
import ConfirmModal from './ConfirmModal';
import { Accomplishment } from '@utils/goalUtils';

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

  const handleAdd = async () => {
    if (!title.trim()) return;
    await onCreate({ title: title.trim(), description: description.trim() || undefined, impact: impact.trim() || undefined });
    setTitle('');
    setDescription('');
    setImpact('');
  };

  if (!isOpen) return null;

  return (
    <div id="editAccomplishments" className="fixed inset-0 bg-gray-100 bg-opacity-75 flex items-center justify-center z-50">
      <div className={`${modalClasses} w-full max-w-2xl`}>
        <div className='flex flex-row w-full justify-between'>
                <h3 className="text-lg font-medium text-gray-90 mb-4">Accomplishments for "{goalTitle}"</h3>
                <div className="mb-2 flex justify-end">
                    <button className="btn-ghost" title="Close" onClick={onClose}>
                        <CloseButton className="w-4 h-4" />
                    </button>
                </div>
            </div>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-gray-700">Add a new accomplishment</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="mt-1 block w-full border-gray-30 focus:border-b-2 focus:ring-0" />
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" rows={3} className="mt-1 block w-full border-gray-30 focus:border-b-2 focus:ring-0" />
            <input value={impact} onChange={(e) => setImpact(e.target.value)} placeholder="Impact (optional)" className="mt-1 block w-full border-gray-30 focus:border-b-2 focus:ring-0" />
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
                <li key={acc.id} className="p-3 border rounded bg-gray-10 dark:bg-gray-80 dark:border-gray-70">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="text-md font-semibold text-brand-80 dark:text-brand-20">{acc.title}</div>
                      <div className="text-sm text-gray-60 dark:text-gray-40 mt-1">{acc.description ? <span dangerouslySetInnerHTML={{ __html: acc.description }} /> : <span className="text-gray-400">No description provided.</span>}</div>
                      {acc.impact && acc.impact.trim() ? (
                        <div className="text-sm text-gray-40 mt-2">Impact: <span dangerouslySetInnerHTML={{ __html: acc.impact }} /></div>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {acc.created_at && <div className="text-xs text-gray-40">{new Date(acc.created_at).toLocaleString()}</div>}
                      <button className="btn-ghost" onClick={() => onEdit(acc)} title="Edit accomplishment"><Edit className="w-4 h-4" /></button>
                      <button className="btn-ghost" onClick={() => setDeleteTarget(acc.id)} title="Delete accomplishment"><Trash className="w-4 h-4" /></button>
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
