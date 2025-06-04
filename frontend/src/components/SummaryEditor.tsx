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

// import React, { useState } from 'react';
// import ReactQuill from 'react-quill';  
// import 'react-quill/dist/quill.snow.css'; // Import the Quill styles 
// // import Modal from 'react-modal';
// import axios from 'axios';
// // import { userId, summaryId } from '@utils/functions';
// // import { id } from 'date-fns/locale';



// interface SummaryEditorProps {
//     summaryId: string;
//     initialContent: string;
//     onRequestClose: () => void;
//     onSave: (updatedContent: string) => Promise<void>;
// }


// async function onSave(updatedContent: string) {
//     try {
//         // Call the API to save the updated content
//         const newId = crypto.randomUUID();
//         const response = await axios.put(`/api/summaries/${newId}`, {
//             id: newId,
//             content: updatedContent,
//         });
//         if (response.status === 200) {
//             console.log('Content saved successfully');
//         } else {
//             console.error('Failed to save content');
//         }
//     } catch (error) {
//         console.error('Error saving content:', error);
//     }
// }


// const SummaryEditor: React.FC<SummaryEditorProps> = ({ summaryId, initialContent, onRequestClose, onSave }) => {
//     const [content, setContent] = useState(initialContent);
//     const handleSave = async () => {
//             try {
//                 await onSave(content);
//                 // Call the onRequestClose prop to close the editor
//                 onRequestClose();
//             } catch (error) {
//                 console.error('Error updating summary:', error);
//             }
//         };
//     const handleCancel = async () => {
//         if (window.confirm('Are you sure you want to cancel? Unsaved changes will be lost.')) {
//             // Call the onRequestClose prop to close the editor
//             onRequestClose();
//         }
//     };

//     // function onRequestClose(): void {
//     //     console.log('Closing the editor');
//     // }
//     return (
//         <>
//             <div>
//                 <h1>Edit Summary</h1>
//                 <ReactQuill
//                     value={content}
//                     onChange={setContent}
//                     theme="snow"
//                     className='text-gray-90 dark:text-gray-10 ql-stroke-gray-90 dark:ql-stroke-gray-10'
//                     style={{ height: 'auto', marginBottom: 24 }}
//                     modules={{
//                         toolbar: true,
//                     }}
//                     readOnly={false}
//                     formats={[
//                         'header', 'bold', 'italic', 'underline', 'strike', 'blockquote',
//                         'list', 'bullet', 'link', 'code', 'code-block', 'image'
//                     ]}
//                 />
//                 {/* <textarea
//                     value={content}
//                     onChange={(e) => setContent(e.target.value)}
//                     rows={10}
//                     cols={30}
//                 /> */}
//                 {/* <div className="mt-4 flex justify-end">
//                     <button className='btn-secondary' onClick={handleCancel}>Cancel</button>
//                     <button className='btn-primary' onClick={handleSave}>Save</button>
//                 </div> */}
//             </div>
//         </>
//     );
// };

// export default SummaryEditor;