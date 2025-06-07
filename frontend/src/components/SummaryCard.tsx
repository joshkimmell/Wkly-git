import React, { useState } from 'react';
// import ReactMarkdown, { MarkdownAsync } from 'react-markdown'; // Import react-markdown
// import supabase from '../../frontend/src/lib/supabase'; // Ensure this is the correct path to your Supabase client
// import { handleDeleteGoal } from '@utils/functions';
import { Summary } from '@utils/goalUtils'; // Adjust the import path as necessary
import { Trash, Edit } from 'lucide-react';
import { cardClasses } from '@styles/classes';

interface SummaryCardProps {
  id: Summary["id"]; // Corrected type
  title: Summary["title"]; // Optional title property
  content: Summary["content"];
  type: Summary["type"];
  week_start?: string; // Optional property for week start
  handleDelete: (id: string) => void; // Corrected type
  handleEdit: (openEditor: any) => void;
  created_at?: string; // Optional property for created date
}

// const GoalCard: React.FC<GoalCardProps> = ({ goal }) => {
const SummaryCard: React.FC<SummaryCardProps> = ({ id, title, content, type, handleDelete, handleEdit }) => {
  // const handleDeleteSummary = (summaryId: string) => {
  //   // Implement the delete logic here
    // console.log(`Deleting goal with ID: ${goal.id}`);
  // };

  // const handleEdit = () => {
  //   // Implement the edit logic here
    // console.log('Editing goal');
  // };
  // const [summaries, setSummaries] = useState<Summary[]>([]);
  // const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false); // State to track expansion
  
//  const [isEditorOpen, setIsEditorOpen] = useState(false);
 
//    function openEditor(event: React.MouseEvent<HTMLButtonElement, MouseEvent>): void {
//      event.preventDefault();
//      setIsEditorOpen(true);
//    }
//    console.log('isEditorOpen:', isEditorOpen);
 
//    function closeEditor() {
//      setIsEditorOpen(false);
//    }
  
  return (
    <div>
      <div key={id} className={`flex flex-col text-left w-full space-y-4 ${cardClasses} mt-4 relative`}>
        <div className={`flex flex-row w-full items-center justify-between`}>  
          <h4 className="w-full text-lg font-bold text-gray-90">{title}</h4>
          <div className="flex flex-row justify-between">
            <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand-10 text-brand-100 mt-2">
              {type} 
            </span>
          </div>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="btn-ghost flex flex-row items-center justify-between w-full rounded-lg p-4"
          type="button"   
        >
          {!isExpanded ? (
            // <ChevronUp className="w-5 h-5" />
              <div className='flex flex-col text-left'
                dangerouslySetInnerHTML={{ __html:content.substring(0, 200) + (content.length > 200 ? '...' : '')}}
              />
              // {summary.content.substring(0, 200) + (summary.content.length > 200 ? '...' : '')}
            ) : (
              <div 
                className='flex flex-col text-left'
                dangerouslySetInnerHTML={{ __html: content }}
              />
          )}
        </button>

        
        <footer className="mt-4 flex justify-end absolute bottom-0 left-0 w-full space-x-2">
          <button
            // onClick={handleEdit.bind(null, summary.id)} // Pass the summary ID to the handleEdit function
            onClick={() => handleEdit(true)} // Open the editor modal
            className="btn-ghost" 
          >
            <Edit />
          </button>
            <button
            // onClick={() => handleDelete.bind(null, summary.id)} // Pass the summary ID to the handleDelete function
            onClick={() => handleDelete(id)}
            // onClick={handleDelete.bind (summary.id)}
            className="btn-ghost"
          >
            <Trash />
          </button>
        </footer>
      </div>
      
    </div>
  );
  };
      
      export default SummaryCard;

      // <div key={goal.id} className="bg-white shadow-sm border rounded-lg p-4">
      //   <h4 className="text-lg font-medium text-gray-900">{goal.title}</h4>
      //   <p className="text-gray-600 mt-1">{goal.description}</p>
      //   <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 mt-2">
      //     {goal.category}
      //   </span>
      //   {/* <p className="text-sm text-gray-500 mt-2">{goal.impact}</p> */}
      //   <div className="mt-4 flex justify-end space-x-2">
      //     <button
      //       onClick={() => handleDeleteGoal(goal.id)}
      //       className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
      //     >
      //       Delete
      //     </button>
      //   </div>
      // </div>