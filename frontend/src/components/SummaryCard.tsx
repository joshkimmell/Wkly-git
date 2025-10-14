import React, { useState } from 'react';
// import ReactMarkdown, { MarkdownAsync } from 'react-markdown'; // Import react-markdown
// import supabase from '../../frontend/src/lib/supabase'; // Ensure this is the correct path to your Supabase client
// import { handleDeleteGoal } from '@utils/functions';
import { Summary } from '@utils/goalUtils'; // Adjust the import path as necessary
import { Trash, Edit, Copy } from 'lucide-react';
import { cardClasses } from '@styles/classes';
import { notifySuccess, notifyError } from '@components/ToastyNotification';
interface SummaryCardProps {
  id: Summary["id"]; // Corrected type to inherit summary_id
  scope?: 'week' | 'month' | 'year'; // Optional property for scope
  week_start?: string; // Optional property for week start
  formattedRange?: string; // Optional property for formatted range
  title: Summary["title"]; // Optional title property
  content: Summary["content"];
  type: Summary["type"];
  handleDelete: (id: string) => void; // Corrected type
  handleEdit: (openEditor: any) => void;
  created_at?: string; // Optional property for created date
}

// const GoalCard: React.FC<GoalCardProps> = ({ goal }) => {
const SummaryCard: React.FC<SummaryCardProps> = ({ 
  id, 
  // scope, 
  title, 
  content, 
  type, 
  handleDelete, 
  handleEdit 
}) => {
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
  
  function handleCopy(content: string): void {
    if (navigator && navigator.clipboard) {
      navigator.clipboard.writeText(content).then(
        () => {
          // Optionally, show a success message or toast here
          console.log('Copied!');
          notifySuccess('Content copied to clipboard!'); 
          
        },
        () => {
          notifyError('Error copying content to clipboard'); // Show error if copy fails
          // Optionally, handle error (e.g., show an error message)
        }
      );
    }
  }
  
  return (
    <div>
      <div key={id} className={`flex flex-col text-left w-full space-y-4 ${cardClasses} mt-4 relative`}>
        <div className={`flex flex-row w-full items-center justify-between gap-4 align-top`}>  
          <h4 className="w-full text-lg font-bold text-gray-90" dangerouslySetInnerHTML={{ __html: title }}></h4>
          <div className="flex flex-row justify-between">
            <span dangerouslySetInnerHTML={{ __html: type }} className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand-10 text-brand-100 mt-2">
            </span>
          </div>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="btn-summary flex flex-row items-center justify-between w-full rounded-lg p-4"
          type="button"   
        >
          {!isExpanded ? (
            <div className='flex flex-col text-left'
              dangerouslySetInnerHTML={{ __html: content.substring(0, 200) + (content.length > 200 ? '...' : '') }}
            />
          ) : (
            <div 
              className='flex flex-col text-left'
              dangerouslySetInnerHTML={{ __html: content }}
            />
          )}
        </button>

        
        <footer className="mt-4 flex justify-end w-full space-x-2">
           <button
            onClick={() => handleCopy(content)}
            className="btn-ghost"
            >
            <Copy />
          </button>
          <button
            onClick={() => handleEdit(true)} // Open the editor modal
            className="btn-ghost" 
          >
            <Edit />
          </button>
          <button
            onClick={() => handleDelete(id)}
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