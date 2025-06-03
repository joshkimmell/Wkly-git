// SummaryGenerator.tsx
// This component allows users to generate summaries based on a selected period (weekly, quarterly, yearly).

import React, { useState } from 'react';
import { handleGenerate, getWeekStartDate, handleDeleteGoal, saveSummary, deleteSummary } from '@utils/functions';
import supabase from '@lib/supabase';
// import openEditorModal from '@components/SummaryEditor'; // Import the function to open the modal
import SummaryEditor from '@components/SummaryEditor';
import Modal from 'react-modal';
// import { Edit } from 'lucide-react';
import SummaryCard from '@components/SummaryCard';
import { modalClasses, cardClasses } from '@styles/classes';

interface SummaryGeneratorProps {
  summaryId: string; // Add summaryId to the props
  selectedWeek: Date;
  filteredGoals: { title: string; description: string; category: string; accomplishments?: string[] }[]; // Add filteredGoals as a prop
  content?: string | null; // Optional content prop
  summaryType: null | 'AI' | 'User';
}



const SummaryGenerator: React.FC<SummaryGeneratorProps> = ({ summaryId, summaryType: initialSummaryType, selectedWeek, filteredGoals }) => {
  const [summary, setSummary] = useState<string | null>(null);
  const [localSummaryId, setLocalSummaryId] = useState<string | null>(null);
  const [summaryType, setSummaryType] = useState<null | 'AI' | 'User'>(initialSummaryType || 'AI');
  
  
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
      setLocalSummaryId(generatedSummary.id); // Make sure you get this from your backend!
      setSummaryType('AI');
      // saveSummary(generatedSummary || '', 'AI');
    } catch (error) {
      console.error('Error generating summary:', error);
    }
  };

  // const saveSummary = async (summaryContent: string, summaryType: string) => {
  //   try {
  //     const { data: { user } } = await supabase.auth.getUser();
  //     if (!user) throw new Error('User is not authenticated');
  
  //     const userId = user.id;
  //     const weekStart = getWeekStartDate(selectedWeek); // Get Monday as YYYY-MM-DD
  
  //     const requestBody = {
  //       user_id: userId,
  //       week_start: weekStart,
  //       content: summaryContent,
  //       summary_type: summaryType, // "User" for edited summaries
  //     };
  
  //     console.log('Request body:', requestBody);
  
  //     const { error } = await supabase.from('summaries').insert(requestBody);
  
  //     if (error) {
  //       console.error('Error saving summary:', error.message);
  //       throw new Error('Failed to save summary');
  //     }
  
  //     console.log('Summary saved successfully');
  //   } catch (error) {
  //     console.error('Error saving summary:', error);
  //   }
  // };
  const handleSave = async (editedContent: string) => {
  try {
    // const weekStart = selectedWeek.toISOString().split('T')[0];
    const { summary_id: id } = await saveSummary(setLocalSummaryId, editedContent, summaryType || 'User', selectedWeek);

    closeEditor();
    // Refresh displayed summary with saved summary
    console.log('Edited summary:', editedContent);
    setLocalSummaryId(id); // Ensure you set the local summary ID after saving
    setSummaryType('AI'); // Set the summary type to 'User' after saving
    setSummary(editedContent);
  } catch (error) {
    console.error('Error saving edited summary:', error);
  }
};


  const [isEditorOpen, setIsEditorOpen] = useState(false);

  // function openEditor(event: React.MouseEvent<HTMLButtonElement, MouseEvent>): void {
  //   event.preventDefault();
  //   setIsEditorOpen(true);
  // }
  console.log('isEditorOpen:', isEditorOpen);

  function closeEditor() {
    setIsEditorOpen(false);
  }

  const handleDeleteSummary = async () => {
    try {
      if (!localSummaryId) {
        console.error('No summary ID to delete');
        return;
      }
      await deleteSummary(localSummaryId); // Pass the ID, not the content!
      setSummary(null);
      setLocalSummaryId(null);
      setIsEditorOpen(false);
      console.log('Summary deleted successfully');
    } catch (error) {
      console.error('Error deleting summary:', error);
    }
  };

  return (
    <div>
      <button
        onClick={handleGenerateClick}
        className="btn-primary"
      >
        Generate Summary
      </button>

      {summary && (
        
          <SummaryCard
            summary={{
              id: localSummaryId || '', // Use localSummaryId for the ID
              user_id: '',
              title: `Summary for week of ${selectedWeek.toLocaleDateString()}`,
              content: summary,
              type: summaryType || '',
              week_start: selectedWeek.toISOString().split('T')[0],
            }}

            handleDelete={handleDeleteSummary} // <-- This handles the delete action
            handleEdit={() => setIsEditorOpen(true)} // <-- This sets the editor open
          />
        
      )}

      {isEditorOpen && ( 
        <Modal
        key={'summary-editor-modal'}  
        isOpen={isEditorOpen}
          onRequestClose={closeEditor}
          className="fixed inset-0 flex items-center justify-center z-50"
          overlayClassName="fixed inset-0 bg-gray-500 bg-opacity-75"
        > 
          <div className={ `${modalClasses} gap-4` }>
            
            <SummaryEditor
              summaryId={localSummaryId || ''} // Pass the summary ID if needed, or keep it empty for new summaries
              initialContent={summary || ''}
              onRequestClose={closeEditor}
              onSave={handleSave}
            />
            {/* <div className='flex flex-row justify-end mt-4 gap-2'>
              <button
                onClick={() => closeEditor()}
                className="btn-secondary"
              >
                Cancel
              </button> 
              <button
                onClick={() => handleSave(summary || '')} // Save as 'User' type
                className="btn-primary"
              >
                Save edited summary
              </button> 
              
            </div> */}
          </div>
        </Modal> 
       )}
    </div>
  );
};

export default SummaryGenerator; 
// export openEditor;