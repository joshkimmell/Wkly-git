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
    onSave: (updatedContent: string, updatedTitle: string) => Promise<void>;
}

const SummaryEditor: React.FC<SummaryEditorProps> = ({
    id, 
    title: initialTitle,
    content: initialContent,
    type,
    onRequestClose,
    onSave,
}) => {

    const [title, setTitle] = useState(initialTitle); // If you want to edit the title as well
    const [content, setContent] = useState(initialContent);
    const [summaryId, setSummaryId] = useState(id); // If you want to edit the ID as well, though usually IDs are not edited  
    // const 

    const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        try {
            await onSave(content, title); // Pass the latest content and title
            onRequestClose();
        } catch (error) {
            console.error('Error saving edited summary:', error);
        }
    };

    return (
    <form onSubmit={handleSave} id="summaryForm" className={modalClasses}>
        <input
            type="text"
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)} // This captures title changes
            className="w-full p-2 mb-4 border rounded"
            placeholder="Enter summary title"
        />
        <ReactQuill
            value={content}
            onChange={setContent} // This captures content changes
        />
        <input
            type="hidden"
            name="summary_type"
            value= // AI if generated, or USER if manually entered
            "AI" // Adjust this based on your logic for summary type
            readOnly    
        />
        <input
            type="hidden"
            name="content"
            value={content} // This ensures the content is included in the form submission
            readOnly
        />
        <div className="flex justify-end mt-4 space-x-2 text-gray-90 dark:text-gray-10">
            <button className="btn btn-secondary" onClick={onRequestClose}>Cancel</button>
            <button type='submit' className="btn btn-primary">Save</button>
        </div>
    </ form>  
           
    );
};

export default SummaryEditor;