import { modalClasses } from '@styles/classes';
import React, { useState } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

interface SummaryEditorProps {
    id: string;
    title: string;
    content: string;
    type: 'AI' | 'User'; // Assuming you have a type field to distinguish between AI and User summaries
    onRequestClose: () => void;
    onSave: (updatedContent: string, updatedTitle: string) => Promise<void>; // Updated to include updatedTitle
}

const SummaryEditor: React.FC<SummaryEditorProps> = ({
    id, 
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
        <form onSubmit={handleSave} id="summaryForm" className={modalClasses}>
            {/* Input for editing the title */}
            <input
                type="text"
                name="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)} // Update title state
                className="w-full p-2 mb-4 border rounded"
                placeholder="Enter summary title"
            />
            {/* ReactQuill editor for editing the content */}
            <ReactQuill
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