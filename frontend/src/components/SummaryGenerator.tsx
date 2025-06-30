// SummaryGenerator.tsx
// This component allows users to generate summaries based on a selected period (weekly, quarterly, yearly).

import React, { useState, useEffect } from 'react';
import { handleGenerate, saveSummary, deleteSummary, getWeekStartDate } from '@utils/functions';
import supabase from '@lib/supabase';
import SummaryEditor from '@components/SummaryEditor';
import Modal from 'react-modal';
import SummaryCard from '@components/SummaryCard';
import { overlayClasses } from '@styles/classes';

interface SummaryGeneratorProps {
  summaryId: string;
  summaryTitle: string | null;
  selectedRange: Date;
  filteredGoals: { title: string; description: string; category: string; accomplishments?: string[] }[];
  content?: string | null;
  // summaryType: 'AI' | 'User';
  scope: 'week' | 'month' | 'year'; // Add scope to the props
}

const SummaryGenerator: React.FC<SummaryGeneratorProps> = ({
  summaryTitle: initialSummaryTitle,
  summaryId: summaryId,
  content: initialContent,
  selectedRange,
  filteredGoals,
  scope,
}) => {
  const [summary, setSummary] = useState<string | null>(initialContent || null);
  const [localSummaryId, setLocalSummaryId] = useState<string | null>(summaryId || null);
  const [summaryType, setSummaryType] = useState<string>('AI'); // Default to 'AI' if not provided
  const [summaryTitle, setSummaryTitle] = useState<string | null>(initialSummaryTitle);

  // // Compute a formatted range string for rendering and logic
  const formattedRange =
    scope === 'week'
      ? selectedRange.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) // e.g., June 16, 2025
      : scope === 'month'
      ? selectedRange.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) // e.g., June 2025
      : scope === 'year'
      ? selectedRange.toLocaleDateString('en-US', { year: 'numeric' }) // e.g., 2025
      : ''; // Fallback for unexpected scope values

  // Dynamically generate the summary title based on the scope
  const generatedSummaryTitle = `Summary for ${scope}: ${formattedRange}`;

  // Reset summary state when scope changes
  useEffect(() => {
    // const newFormattedRange =
    //   scope === 'week'
    //     ? selectedRange.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    //     : scope === 'month'
    //     ? selectedRange.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    //     : scope === 'year'
    //     ? selectedRange.toLocaleDateString('en-US', { year: 'numeric' })
    //     : '';

    const newGeneratedSummaryTitle = `Summary for ${scope}: ${formattedRange}`;
    // console.log('Scope changed to:', scope);
    // console.log('New Formatted Range:', formattedRange);
    // console.log('New Generated Summary Title:', newGeneratedSummaryTitle);

    setSummary(null); // Clear the current summary
    setLocalSummaryId(null); // Reset the summary ID
    setSummaryTitle(initialSummaryTitle || newGeneratedSummaryTitle); // Update the title
  }, [scope, selectedRange, initialSummaryTitle]);

  const handleGenerateClick = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User is not authenticated');

      const userId = user.id;

      // Map the filtered goals to include accomplishments and other details
      const goalsWithAccomplishments = filteredGoals.map(goal => ({
        title: goal.title,
        description: goal.description,
        category: goal.category || 'Technical skills',
        accomplishments: (goal.accomplishments || []).map(accomplishment => ({
          title: accomplishment,
          description: accomplishment,
          impact: 'Medium', // Default impact level
        })),
      }));

      // Calculate the correct week_start value
      const weekStart =
        scope === 'week'
          ? getWeekStartDate(selectedRange) // Start of the week (Monday)
          : scope === 'month'
          ? new Date(selectedRange.getFullYear(), selectedRange.getMonth(), 1).toISOString().split('T')[0] // First day of the month
          : scope === 'year'
          ? new Date(selectedRange.getFullYear(), 0, 1).toISOString().split('T')[0] // First day of the year
          : '';

      // console.log('Scope:', scope);
      // console.log('selectedRange:', selectedRange);

      const generatedSummary = await handleGenerate(
        localSummaryId || '',
        scope, // Pass the scope (week, month, year)
        summaryTitle || generatedSummaryTitle,
        userId,
        weekStart, // Pass the corrected week_start value
        goalsWithAccomplishments,
      );

      setSummary(generatedSummary);
      saveSummary(
        setLocalSummaryId,
        summaryTitle || generatedSummaryTitle,
        generatedSummary,
        'AI', // Set type to 'AI' for generated summaries
        new Date(weekStart)
      );
      setSummaryType('AI');
    } catch (error) {
      console.error('Error generating summary:', error);
    }
  };

  const handleSave = async (updatedContent: string, updatedTitle: string) => {
    try {
      // Save the updated summary to the database or state
      await saveSummary(
        setLocalSummaryId,
        updatedTitle, // Save the updated title
        updatedContent, // Save the updated content
        summaryType || 'User', // Use the current summary type
        selectedRange // Pass the selected range
      );
      setSummary(updatedContent); // Update the summary state
      setSummaryTitle(updatedTitle); // Update the title state
      // console.log('formatted range:', formattedRange);
      // console.log('Summary saved successfully');
    } catch (error) {
      console.error('Error saving summary:', error);
    }
  };

  const [isEditorOpen, setIsEditorOpen] = useState(false);



  function closeEditor() {
    setIsEditorOpen(false);
  }

  const handleDeleteSummary = async () => {
    try {
      if (!localSummaryId) {
        console.error('No summary ID to delete');
        return;
      }
      // console.log('Deleting summary with ID:', localSummaryId);
      await deleteSummary(localSummaryId); // Pass the ID, not the content!
      setSummary(null);
      setLocalSummaryId(null);
      setIsEditorOpen(false);
      // console.log('Summary deleted successfully');
    } catch (error) {
      console.error('Error deleting summary:', error);
    }
  };

  return (
    <div>
      <button onClick={handleGenerateClick} className="btn-primary">
        Generate Summary
      </button>

      {summary && (
        <SummaryCard
          id={summaryId}
          scope={scope}
          title={generatedSummaryTitle}
          content={summary}
          type={summaryType || ''}
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
          overlayClassName={`${overlayClasses}`}
        >
          <SummaryEditor
            id={localSummaryId || ''}
            title={summaryTitle || generatedSummaryTitle}
            content={summary || ''}
            type={'User'}
            onRequestClose={closeEditor}
            onSave={handleSave}
          />
        </Modal>
      )}
    </div>
  );
};

export default SummaryGenerator;