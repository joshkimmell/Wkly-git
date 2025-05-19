import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown'; // Import react-markdown
import supabase from '@lib/supabase'; // Ensure this is the correct path to your Supabase client
// import { handleDeleteGoal } from '@utils/functions';
import { Summary } from '@utils/goalUtils'; // Adjust the import path as necessary
import { ChevronDown, ChevronUp, Trash, Edit } from 'lucide-react';

interface SummaryCardProps {
  summary: Summary;
  handleDelete: (summaryId: string) => void;
  handleEdit: (summaryId: string) => void;
}

// const GoalCard: React.FC<GoalCardProps> = ({ goal }) => {
const SummaryCard: React.FC<SummaryCardProps> = ({ summary, handleDelete, handleEdit }) => {
  // const handleDeleteSummary = (summaryId: string) => {
  //   // Implement the delete logic here
    // console.log(`Deleting goal with ID: ${goal.id}`);
  // };

  // const handleEdit = () => {
  //   // Implement the edit logic here
    // console.log('Editing goal');
  // };
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false); // State to track expansion

  // Fetch summaries from the backend
  
  
  
  return (
    <div className="flex flex-col space-y-4">
      <div key={summary.id} className="bg-white shadow-sm border rounded-lg p-4">
        {/* <h4 className="text-lg font-medium text-gray-900">{summary.title}</h4> */}
        <ReactMarkdown>{summary.content}</ReactMarkdown>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 mt-2">
          {summary.type}
        </span>
        <div className="mt-4 flex justify-end space-x-2">
          <button
            onClick={() => handleEdit(summary.id)}
            className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500" 
          >
            <Edit />
          </button>
            <button
            onClick={() => handleDelete(summary.id)}
            className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            <Trash />
          </button>
        </div>
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