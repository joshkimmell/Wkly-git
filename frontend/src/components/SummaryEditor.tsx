import { modalClasses } from '@styles/classes';
import React, { useState } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

interface SummaryEditorProps {
    initialTitle: string;
    initialContent: string;
    onRequestClose: () => void;
    onSave: (updatedContent: string, updatedTitle: string) => Promise<void>;
}

const SummaryEditor: React.FC<SummaryEditorProps> = ({
    initialTitle,
    initialContent,
    onRequestClose,
    onSave,
}) => {

    const [title, setTitle] = useState(initialTitle); // If you want to edit the title as well
    const [content, setContent] = useState(initialContent);

    // const handleSave = async () => {
    //     await onSave(title, content); // Pass the latest content
    //     onRequestClose();
    // };
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
   
        // <div>
        //     <label className="block text-sm font-medium text-gray-700">Content</label>
        //     <ReactQuill
        //         id={newSummary.id}
        //         value={newSummary.content}
        //         className=""
                
        //         onChange={(value) =>
        //         setNewSummary({ ...newSummary, content: value })
        //         }
        //         // ReactQuill does not support the "name" prop directly,
        //         // but you can add a hidden input to include it in form data:
        //     />
        //     <input
        //         type="hidden"
        //         name="summary_type"
        //         value={newSummary.summary_type}
        //         readOnly
        //     />  
        //     <input
        //         type="hidden"
        //         name="content"
        //         value={newSummary.content}
        //         readOnly
        //     />
        //     <div className="mt-6 flex justify-end space-x-4">
        //         <button
        //             onClick={() => setIsModalOpen(false)}
        //             className="btn-secondary"
        //             aria-label="Cancel"
        //             >
        //             Cancel
        //         </button>
        //         <button
        //             type="submit"
        //             className="btn-primary"
        //             >
        //             Add
        //         </button>
        //     </div>
        // </div>
         
        
           
    );
};

export default SummaryEditor;