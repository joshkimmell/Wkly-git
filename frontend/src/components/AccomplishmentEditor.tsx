import { modalClasses } from '@styles/classes';
import React, { useState, useEffect } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { Accomplishment } from '@utils/goalUtils'; // Import the addCategory function


  interface AccomplishmentEditorProps {
    id: string;
    title: string;
    description: string;
    impact: string;
    goal_id: string;
    // onAddCategory: (newCategory: string) => void;
    onRequestClose: () => void;
    onSave: (updatedDescription: string, updatedTitle: string, updatedImpact: string) => Promise<void>; // 
    // Updated to include updatedTitle
    onUpdate: (updatedAccomplishment: Accomplishment) => void;
    onDelete: (id: string) => void;
  }

  // id: string;
  // title: string;
  // description: string;
  // impact: string;
  // goal_id: string;
  // user_id: string;
  // created_at: string;
const AccomplishmentEditor: React.FC<AccomplishmentEditorProps> = ({ 
    title: initialTitle,
    description: initialDescription,
    impact: initialImpact,
    goal_id,
    id: id,
    onRequestClose,
    onSave,
  }) => {
  const [updatedAccomplishment, setUpdatedAccomplishment] = useState<Accomplishment>({
    title: initialTitle,
    description: initialDescription,
    impact: initialImpact,
    goal_id: goal_id, // Assuming you will set this when editing an existing accomplishment
    id: '', // Add appropriate default value
    user_id: '', // Add appropriate default value
    created_at: new Date().toISOString(), // Add appropriate default value
  });
    
    const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        try {
            await onSave(
                updatedAccomplishment.description,
                updatedAccomplishment.title,
                updatedAccomplishment.impact,
            );
            onRequestClose(); // Close the editor after saving
        } catch (error) {
            console.error('Error saving edited goal:', error);
        }
    };
    
    const handleFieldChange = (field: keyof Accomplishment, value: string) => {
        setUpdatedAccomplishment((prevAccomplishment) => ({ ...prevAccomplishment, [field]: value })); // Preserve other fields
    };

    return (
        <form onSubmit={handleSave} id="goalEditorForm" className={modalClasses}>
            {/* Input for editing the title */}
            <input
                type="text"
                name="title"
                value={updatedAccomplishment.title}
                onChange={(e) => handleFieldChange('title', e.target.value)} // Update title state
                className="w-full p-2 mb-4 border rounded"
                placeholder="Enter accomplishment title"
            />
            {/* ReactQuill editor for editing the content */}
            <ReactQuill
                value={updatedAccomplishment.description}
                onChange={(value) => handleFieldChange('description', value)} // Update description state
            />
            {/* <input
                type="hidden"
                name="accomplishment_id"
                value={updatedAccomplishment.id} // Pass the goal ID
                readOnly
            /> */}
          
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
