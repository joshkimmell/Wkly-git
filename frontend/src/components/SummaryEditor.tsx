import React, { useState } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

interface SummaryEditorProps {
    initialContent: string;
    onRequestClose: () => void;
    onSave: (updatedContent: string) => Promise<void>;
}

const SummaryEditor: React.FC<SummaryEditorProps> = ({
    initialContent,
    onRequestClose,
    onSave,
}) => {
    const [content, setContent] = useState(initialContent);

    const handleSave = async () => {
        await onSave(content); // Pass the latest content
        onRequestClose();
    };

    return (
        <div>
            <ReactQuill
                value={content}
                onChange={setContent} // This captures all changes
            />
            <div className="flex justify-end mt-4 space-x-2 text-gray-90 dark:text-gray-10">
                <button className="btn btn-secondary" onClick={onRequestClose}>Cancel</button>
                <button className="btn btn-primary" onClick={handleSave}>Save</button>
            </div>
        </div>
    );
};

export default SummaryEditor;