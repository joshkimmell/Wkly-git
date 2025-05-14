import React, { useState } from 'react';
// import Modal from 'react-modal';
import axios from 'axios';
// import { userId, summaryId } from '@utils/functions';
// import { id } from 'date-fns/locale';



interface SummaryEditorProps {
    summaryId: string;
    initialContent: string;
    onRequestClose: () => void;
    onSave: (updatedContent: string) => Promise<void>;
}


async function onSave(summaryId: string, updatedContent: string) {
    try {
        // Call the API to save the updated content
        const response = await axios.put(`/api/summaries/${summaryId}`, {
            content: updatedContent,
        });
        if (response.status === 200) {
            console.log('Content saved successfully');
        } else {
            console.error('Failed to save content');
        }
    } catch (error) {
        console.error('Error saving content:', error);
    }
}


const SummaryEditor: React.FC<SummaryEditorProps> = ({ summaryId, initialContent, onRequestClose, onSave }) => {
    const [content, setContent] = useState(initialContent);
    const handleSave = async () => {
            try {
                await onSave(summaryId);
                // Call the onRequestClose prop to close the editor
                onRequestClose();
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
                    // rows=''
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