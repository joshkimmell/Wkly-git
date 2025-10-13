import React, { useState } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { Accomplishment } from '@utils/goalUtils'; // Import the addCategory function
import { notifySuccess } from '@components/ToastyNotification';


interface AccomplishmentEditorProps {
  accomplishment: Accomplishment; // Added accomplishment prop
  onRequestClose: () => void;
  onSave: (updatedDescription: string, updatedTitle: string, updatedImpact?: string) => Promise<void>; // Made updatedImpact optional
}

const AccomplishmentEditor: React.FC<AccomplishmentEditorProps> = ({ 
  accomplishment,
  onRequestClose,
  onSave,
}) => {
  const [updatedAccomplishment, setUpdatedAccomplishment] = useState<Accomplishment>({
    ...accomplishment,
    title: accomplishment.title || '',
    description: accomplishment.description || '',
    impact: accomplishment.impact || '', // Default to an empty string if undefined
  });

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      await onSave(
        updatedAccomplishment.description,
        updatedAccomplishment.title,
        updatedAccomplishment.impact || undefined // Pass undefined if impact is empty
      );
      onRequestClose();
    } catch (error) {
      console.error('Error saving edited accomplishment:', error);
    }
    notifySuccess('Accomplishment updated successfully.');
  };

  const handleFieldChange = (field: keyof Accomplishment, value: string) => {
    setUpdatedAccomplishment((prev) => ({ ...prev, [field]: value }));
  };

  if (!accomplishment) {
    return (
      <div className="text-red-500">Error: No accomplishment data provided.</div>
    );
  }

  return (
    <form onSubmit={handleSave} id="accomplishmentEditorForm">

      <label htmlFor="title_acc" className="block mb-2 text-sm font-medium text-gray-700">
        Title
      </label>
      <input
        type="text"
        name="title_acc"
        id="title_acc"
        value={updatedAccomplishment.title}
        onChange={(e) => handleFieldChange('title', e.target.value)}
        className="w-full p-2 mb-4"
        placeholder="Enter accomplishment title"
      />

      <label htmlFor="description_acc" className="block mb-2 text-sm font-medium text-gray-700">
        Description
      </label>
      <ReactQuill
        id="description_acc"
        value={updatedAccomplishment.description}
        onChange={(value) => handleFieldChange('description', value)}
        className="mb-4"
      />

        <label htmlFor="impact" className="block mb-2 text-sm font-medium text-gray-70">
        Impact (Optional)
        </label>
        <input
        name="impact"
        id="impact"
        type="text"
        value={updatedAccomplishment.impact || ''}
        onChange={(e) => handleFieldChange('impact', e.target.value)}
        className="w-full p-2 mb-4"
        placeholder="Enter impact (optional)"
        />
        

      <div className="flex justify-end mt-4 space-x-2 text-gray-90 dark:text-gray-10">
        <button className="btn btn-secondary" onClick={onRequestClose} type="button">
          Cancel
        </button>
        <button type="submit" className="btn btn-primary">
          Save accomplishment
        </button>
      </div>
    </form>
  );
};

export default AccomplishmentEditor;


