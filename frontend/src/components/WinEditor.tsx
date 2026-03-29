import React, { useState } from 'react';
import { TextField } from '@mui/material';
import RichTextEditor from './RichTextEditor';
import { Win } from '@utils/goalUtils'; // Import the addCategory function
import { notifySuccess } from '@components/ToastyNotification';


interface WinEditorProps {
  win: Win; // Added win prop
  onRequestClose: () => void;
  // description is optional when saving
  onSave: (updatedDescription?: string, updatedTitle?: string, updatedImpact?: string) => Promise<void>;
}

const WinEditor: React.FC<WinEditorProps> = ({ 
  win,
  onRequestClose,
  onSave,
}) => {
  const [updatedWin, setUpdatedWin] = useState<Win>({
    ...win,
    title: win.title || '',
    description: win.description || '',
    impact: win.impact || '', // Default to an empty string if undefined
  });

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      await onSave(
        updatedWin.description || undefined,
        updatedWin.title,
        updatedWin.impact || undefined // Pass undefined if impact is empty
      );
      onRequestClose();
    } catch (error) {
      console.error('Error saving edited win:', error);
    }
    notifySuccess('Win updated successfully.');
  };

  const handleFieldChange = (field: keyof Win, value: string) => {
    setUpdatedWin((prev) => ({ ...prev, [field]: value }));
  };

  if (!win) {
    return (
      <div className="text-red-500">Error: No win data provided.</div>
    );
  }

  return (
    <form onSubmit={handleSave} id="winEditorForm">

      <label htmlFor="title_acc" className="block mb-2 text-sm font-medium text-gray-70">Title</label>
      <TextField
        id="title_acc"
        name="title_acc"
        value={updatedWin.title}
        onChange={(e) => handleFieldChange('title', e.target.value)}
        placeholder="Enter win title"
        fullWidth
        className="mb-4"
      />

      <RichTextEditor
        id="description_acc"
        value={updatedWin.description || ''}
        onChange={(value) => handleFieldChange('description', value)}
        label="Description"
      />

      <label htmlFor="impact" className="block mb-2 text-sm font-medium text-gray-70">Impact (Optional)</label>
      <TextField
        id="impact"
        name="impact"
        value={updatedWin.impact || ''}
        onChange={(e) => handleFieldChange('impact', e.target.value)}
        placeholder="Enter impact (optional)"
        fullWidth
        className="mb-4"
      />
        

      <div className="flex justify-end mt-4 space-x-2 text-gray-90 dark:text-gray-10">
        <button className="btn btn-secondary" onClick={onRequestClose} type="button">
          Cancel
        </button>
        <button type="submit" className="btn btn-primary">
          Save win
        </button>
      </div>
    </form>
  );
};

export default WinEditor;


