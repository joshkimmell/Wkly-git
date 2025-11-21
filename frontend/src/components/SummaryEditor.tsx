import { modalClasses } from '@styles/classes';
import React, { useState } from 'react';
import { TextField } from '@mui/material';
import RichTextEditor from './RichTextEditor';

interface SummaryEditorProps {
    id: string;
    title: string;
    content: string;
    type: 'AI' | 'User'; // Assuming you have a type field to distinguish between AI and User summaries
    onRequestClose: () => void;
    onSave: (updatedContent: string, updatedTitle: string) => Promise<void>; // Updated to include updatedTitle
}

const SummaryEditor: React.FC<SummaryEditorProps> = ({
    title: initialTitle,
    content: initialContent,
    type,
    onRequestClose,
    onSave,
}) => {
    const [title, setTitle] = useState(initialTitle); // State for the title
    const [content, setContent] = useState(initialContent); // State for the content
    

    const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        try {
            // Pass the updated title and content to the onSave function
            await onSave(content, title);
            onRequestClose(); // Close the editor after saving
        } catch (error) {
            console.error('Error saving edited summary:', error);
        }
    };

    return (
        <form onSubmit={handleSave} id="summaryForm" className={`${modalClasses} gap-4`}>
            {/* Input for editing the title */}
            <TextField
                type="text"
                label="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full mb-4"
                placeholder="Enter summary title"
                fullWidth
            />
            <RichTextEditor
                id='Edit goal'
                label='Content'
                value={content}
                onChange={setContent} // Update content state
            />
            <input
                type="hidden"
                name="summary_type"
                value={type} // Pass the summary type (AI or User)
                readOnly
            />
            <input
                type="hidden"
                name="content"
                value={content} // Ensure content is included in the form submission
                readOnly
            />
            <div className="flex justify-end mt-4 space-x-2 text-gray-90 dark:text-gray-10">
                <button className="btn btn-secondary" onClick={onRequestClose} type="button">
                    Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                    Save
                </button>
            </div>
        </form>
    );
};

export default SummaryEditor;