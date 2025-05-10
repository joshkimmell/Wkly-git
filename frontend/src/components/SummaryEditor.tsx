import React, { useState } from 'react';
import axios from 'axios';

interface SummaryEditorProps {
    summaryId: string;
    initialContent: string;
}

const SummaryEditor: React.FC<SummaryEditorProps> = ({ summaryId, initialContent }) => {
    const [content, setContent] = useState(initialContent);

    const handleSave = async () => {
        try {
            await axios.put(`/api/summaries/${summaryId}`, { content });
            alert('Summary updated successfully!');
        } catch (error) {
            console.error('Error updating summary:', error);
        }
    };

    return (
        <div>
            <h2>Edit Summary</h2>
            <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={10}
                cols={50}
            />
            <button onClick={handleSave}>Save</button>
        </div>
    );
};

export default SummaryEditor;