// SummaryGenerator.tsx
// This component allows users to generate summaries based on a selected period (weekly, quarterly, yearly).

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown'; // Import react-markdown
import { handleGenerate, getWeekStartDate } from '@utils/functions';
import supabase from '@lib/supabase';
// import openEditorModal from '@components/SummaryEditor'; // Import the function to open the modal
import SummaryEditor from '@components/SummaryEditor';
import Modal from 'react-modal';
import { Edit } from 'lucide-react';
// import { set } from 'lodash';

interface SummaryGeneratorProps {
  // summaryId: string; // Add summaryId to the props
  selectedWeek: Date;
  filteredGoals: { title: string; description: string; category: string; accomplishments?: string[] }[]; // Add filteredGoals as a prop
  content?: string | null; // Optional content prop

  // type: null | 'AI' | 'User';
//   filteredGoals: { title: string; description: string; category: string; accomplishments?: string[] }[]; // Add filteredGoals as a prop
}

const SummaryGenerator: React.FC<SummaryGeneratorProps> = ({ selectedWeek, filteredGoals }) => {
  const [summary, setSummary] = useState<string | null>(null);

  const handleGenerateClick = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User is not authenticated');

      const userId = user.id;
      const weekStart = selectedWeek.toISOString().split('T')[0];

      const goalsWithAccomplishments = filteredGoals.map(goal => ({
        title: goal.title,
        description: goal.description,
        category: goal.category || 'Technical skills',
        accomplishments: (goal.accomplishments || []).map(accomplishment => ({
          title: accomplishment,
          description: accomplishment,
          impact: 'Medium',
        })),
      }));

      const generatedSummary = await handleGenerate(userId, weekStart, goalsWithAccomplishments);
      setSummary(generatedSummary);
      saveSummary(generatedSummary || '', 'AI');
      
    } catch (error) {
      console.error('Error generating summary:', error);
    }
  };

  const saveSummary = async (summaryContent: string, summaryType: string = 'AI') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User is not authenticated');
  
      const userId = user.id;
      const weekStart = getWeekStartDate(selectedWeek); // Get Monday as YYYY-MM-DD
  
      const requestBody = {
        user_id: userId,
        week_start: weekStart,
        content: summaryContent,
        summary_type: summaryType, // Use the provided summaryType
      };
  
      console.log('Request body:', requestBody);
  
      const { error } = await supabase.from('summaries').insert(requestBody);
  
      if (error) {
        console.error('Error saving summary:', error.message);
        throw new Error('Failed to save summary');
      }
  
      console.log('Summary saved successfully');
    } catch (error) {
      console.error('Error saving summary:', error);
    }
  };


  const [isEditorOpen, setIsEditorOpen] = useState(false);

  function openEditor(event: React.MouseEvent<HTMLButtonElement, MouseEvent>): void {
    event.preventDefault();
    setIsEditorOpen(true);
  }
  console.log('isEditorOpen:', isEditorOpen);

  function closeEditor() {
    setIsEditorOpen(false);
  }
  return (
    <div>
      <button
        onClick={handleGenerateClick}
        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
      >
        Generate Summary
      </button>

      {summary && (
        <div className="mt-4 p-4 bg-gray-100 rounded-md">
          <button
            onClick={openEditor} // NEED FUNCTION TO PASS
            className="text-blue-600 hover:text-blue-800 ml-2"
            aria-activedescendant="Edit"
            aria-label="Edit Summary"
            title="Edit Summary"
            role="button"
          >
            <Edit className="w-5 h-5" />
          </button>
        
          <ReactMarkdown>{summary}</ReactMarkdown>
        </div>
      )}

      {isEditorOpen && ( 
        <Modal
          isOpen={isEditorOpen}
          onRequestClose={closeEditor}
          className="fixed inset-0 flex items-center justify-center z-50"
          overlayClassName="fixed inset-0 bg-gray-500 bg-opacity-75"
        > 
          <div className="bg-white rounded-lg shadow-lg p-6 w-96">
            <SummaryEditor
              summaryId={summary || ''} // Use selectedSummary.id if available
              initialContent={summary || ''}
              onRequestClose={closeEditor}
              onSave={async (editedContent) => {
                try {
                  await saveSummary(editedContent, 'User'); // Save the edited summary as a new entry
                  setSummary(editedContent); // Update the local state
                  closeEditor(); // Close the editor
                } catch (error) {
                  console.error('Error saving edited summary:', error);
                }
              }} 
            />
            <button
              onClick={() => saveSummary(summary || '', 'User')} // Save as 'User' type
              className="mt-4 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Save edited summary
            </button> 
          </div>
        </Modal> 
       )}
    </div>
  );
};

export default SummaryGenerator; 
// export openEditor;