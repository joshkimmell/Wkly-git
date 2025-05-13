import React, { useState } from 'react';
// import Modal from 'react-modal';
import axios from 'axios';



interface SummaryEditorProps {
    summaryId: string;
    // summaryTitle: string;
    initialContent: string;
    onRequestClose: () => void;
}

const SummaryEditor: React.FC<SummaryEditorProps> = ({ summaryId, initialContent, onRequestClose }) => {
    const [content, setContent] = useState(initialContent);
    const handleSave = async () => {
        try {
            await axios.put(`/api/summaries/${summaryId}`, { content });
            alert('Summary updated successfully!');
        } catch (error) {
            console.error('Error updating summary:', error);
        }
    };
    const handleCancel = async () => {
        if (window.confirm('Are you sure you want to cancel? Unsaved changes will be lost.')) {
            // Call the onRequestClose prop to close the editor
            onRequestClose();
        }
    };

    // function onRequestClose(): void {
    //     console.log('Closing the editor');
    // }
    return (
        <>
            <div>
                <h2>Edit Summary</h2>
                <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={8}
                    cols={38}
                />
                <div className="mt-4 flex justify-end">
                    <button className='button' onClick={handleCancel}>Cancel</button>
                    <button className='button' onClick={handleSave}>Save</button>
                </div>
            </div>
        </>
    );
};

export default SummaryEditor;