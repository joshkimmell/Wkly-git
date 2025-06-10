// SummaryGenerator.tsx
// This component allows users to generate summaries based on a selected period (weekly, quarterly, yearly).

import React, { useState } from 'react';
import { handleGenerate, saveSummary, deleteSummary } from '@utils/functions';
import supabase from '@lib/supabase';
import SummaryEditor from '@components/SummaryEditor';
import Modal from 'react-modal';
import SummaryCard from '@components/SummaryCard';
import { modalClasses } from '@styles/classes';

interface SummaryGeneratorProps {
  summaryId: string; // Add summaryId to the props
  selectedWeek: Date;
  filteredGoals: { title: string; description: string; category: string; accomplishments?: string[] }[]; // Add filteredGoals as a prop
  content?: string | null; // Optional content prop
  summaryType: null | 'AI' | 'User';
}



const SummaryGenerator: React.FC<SummaryGeneratorProps> = ({ summaryType: initialSummaryType, selectedWeek, filteredGoals }) => {
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryTitle, setSummaryTitle] = useState<string | null>(null);
  const [localSummaryId, setLocalSummaryId] = useState<string | null>(null);
  const [summaryType, setSummaryType] = useState<null | 'AI' | 'User'>(initialSummaryType || 'AI');
  
  
  // const handleGenerateClick = async () => {
  //   try {
  //     const { data: { user } } = await supabase.auth.getUser();
  //     if (!user) throw new Error('User is not authenticated');

  //     const userId = user.id;
  //     const weekStart = selectedWeek.toISOString().split('T')[0];

  //     const goalsWithAccomplishments = filteredGoals.map(goal => ({
  //       title: goal.title,
  //       description: goal.description,
  //       category: goal.category || 'Technical skills',
  //       accomplishments: (goal.accomplishments || []).map(accomplishment => ({
  //         title: accomplishment,
  //         description: accomplishment,
  //         impact: 'Medium',
  //       })),
  //     }));

  //     const generatedSummary = await handleGenerate(
  //       localSummaryId || '',
  //       summaryTitle || `Summary for week of ${selectedWeek.toLocaleDateString()}`,
  //       userId,
  //       weekStart,
  //       goalsWithAccomplishments,
  //     );
  //     setSummary(generatedSummary); // or whatever field holds the summary text
  //     setLocalSummaryId(generatedSummary.id); // Use .id, not .summary_id
  //     setSummaryType('AI');
  //     // saveSummary(generatedSummary || '', 'AI');
  //   } catch (error) {
  //     console.error('Error generating summary:', error);
  //   }
  // };

// const handleSave = async (editedContent: string, editedTitle: string) => {
//   try {
//     // Use a default or generated title since only content is passed
//     const editedTitle = summaryTitle || `Summary for week of ${selectedWeek.toLocaleDateString()}`;
//     const { summary_id } = await saveSummary(setLocalSummaryId, editedTitle, editedContent, summaryType || 'User', selectedWeek);
//     setLocalSummaryId(summary_id);

//     closeEditor();
//     // Refresh displayed summary with saved summary
//     // console.log('Edited summary:', editedContent);
//     setLocalSummaryId(summary_id); // Ensure you set the local summary ID after saving
//     setSummaryType('User'); // Set the summary type to 'User' after saving
//     const editedSummary = editedContent && editedTitle ? editedContent : 'No content provided'; // Ensure you have a valid summary content
//     setSummary(editedSummary); // Update the summary state with the edited content
//     // setSummary(editedTitle && editedContent);
//     console.log('Summary title saved successfully:', editedTitle);
//   } catch (error) {
//     console.error('Error saving edited summary:', error);
//   }
// };
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

    // 1. Generate the summary content
    const generatedSummary = await handleGenerate(
      localSummaryId || '',
      summaryTitle || `Summary for week of ${selectedWeek.toLocaleDateString()}`,
      userId,
      weekStart,
      goalsWithAccomplishments,
    );
    setSummary(generatedSummary);

    // 2. Save the summary and get the summary_id
    const { summary_id } = await saveSummary(
      setLocalSummaryId,
      summaryTitle || `Summary for week of ${selectedWeek.toLocaleDateString()}`,
      generatedSummary,
      'AI',
      selectedWeek
    );
    setLocalSummaryId(summary_id);
    setSummaryType('AI');
  } catch (error) {
    console.error('Error generating summary:', error);
  }
};

const handleSave = async (editedContent: string, editedTitle: string) => {
  try {
    const { summary_id } = await saveSummary(
      setLocalSummaryId,
      editedTitle, // Use the actual edited title from the editor!
      editedContent,
      summaryType || 'User',
      selectedWeek
    );
    setLocalSummaryId(summary_id);
    setSummaryType('User');
    setSummary(editedContent);
    setSummaryTitle(editedTitle);
    closeEditor();
    // console.log('Summary title saved successfully:', editedTitle);
  } catch (error) {
    console.error('Error saving edited summary:', error);
  }
};

  const [isEditorOpen, setIsEditorOpen] = useState(false);

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
      console.log('Deleting summary with ID:', localSummaryId);
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
            id={localSummaryId || ''}
            title={summaryTitle || `Summary for week of ${selectedWeek.toLocaleDateString()}`}
            content={summary}
            type={summaryType || ''}
            week_start={selectedWeek.toISOString().split('T')[0]}
            created_at={new Date().toISOString()}
            handleDelete={handleDeleteSummary}
            handleEdit={() => setIsEditorOpen(true)}
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
          {/* <div className={ `${modalClasses} gap-4` }> */}
            
            <SummaryEditor
              id={localSummaryId || ''} // Pass the summary ID if needed, or keep it empty for new summaries
              title={`Summary for week of ${selectedWeek.toLocaleDateString()}`}
              content={summary || ''}
              type={summaryType || 'User'} // Default to 'AI' if not set
              onRequestClose={closeEditor}
              onSave={handleSave}
            />
          {/* </div> */}
        </Modal> 
       )}
    </div>
  );
};

export default SummaryGenerator; 
// export openEditor;