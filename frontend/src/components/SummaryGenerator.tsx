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
      setSummary(generatedSummary.content); // or whatever field holds the summary text
      setLocalSummaryId(generatedSummary.id); // Use .id, not .summary_id
      setSummaryType('AI');
      // saveSummary(generatedSummary || '', 'AI');
    } catch (error) {
      console.error('Error generating summary:', error);
    }
  };

  const handleSave = async (editedContent: string) => {
  try {
    // const weekStart = selectedWeek.toISOString().split('T')[0];
    const { summary_id } = await saveSummary(setLocalSummaryId, editedContent, summaryType || 'User', selectedWeek);
    setLocalSummaryId(summary_id);

    closeEditor();
    // Refresh displayed summary with saved summary
    console.log('Edited summary:', editedContent);
    setLocalSummaryId(summary_id); // Ensure you set the local summary ID after saving
    setSummaryType('AI'); // Set the summary type to 'User' after saving
    setSummary(editedContent);
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
            title={`Summary for week of ${selectedWeek.toLocaleDateString()}`}
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
          <div className={ `${modalClasses} gap-4` }>
            
            <SummaryEditor
              // summaryId={localSummaryId || ''} // Pass the summary ID if needed, or keep it empty for new summaries
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