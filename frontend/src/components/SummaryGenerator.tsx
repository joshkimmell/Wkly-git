// SummaryGenerator.tsx
// This component allows users to generate summaries based on a selected period (weekly, quarterly, yearly).

import React, { useState, useEffect } from 'react';
import { saveSummary, deleteSummary, getWeekStartDate, generateSummary } from '@utils/functions';
import supabase from '@lib/supabase';
import SummaryEditor from '@components/SummaryEditor';
import Modal from 'react-modal';
import { ARIA_HIDE_APP } from '@lib/modal';
import SummaryCard from '@components/SummaryCard';
import { modalClasses, overlayClasses } from '@styles/classes';
import ReactQuill from 'react-quill'; // Fix import for ReactQuill
import { RefreshCcw } from 'lucide-react';

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
  summaryId,
  content: initialContent,
  selectedRange,
  filteredGoals,
  scope,
}) => {
  const [summary, setSummary] = useState<string | null>(initialContent || null);
  const [localSummaryId, setLocalSummaryId] = useState<string | null>(summaryId || null);
  const [summaryType, setSummaryType] = useState<string>('AI'); // Default to 'AI' if not provided
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  // Generate the summary title based on the scope and selectedRange
  const generateSummaryTitle = (scope: 'week' | 'month' | 'year', date: Date): string => {
    const weekStart = getWeekStartDate(date);
    if (scope === 'week') {
      return `Summary for week: ${new Date(weekStart).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })}`;
    } else if (scope === 'month') {
      return `Summary for month: ${new Date(weekStart).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      })}`;
    } else if (scope === 'year') {
      return `Summary for year: ${new Date(weekStart).toLocaleDateString('en-US', {
        year: 'numeric',
      })}`;
    }
    return '';
  };

  const [summaryTitle, setSummaryTitle] = useState<string | null>(
    initialSummaryTitle || generateSummaryTitle(scope, selectedRange)
  );

  // Reset summary state when scope changes
  useEffect(() => {
    setSummary(null); // Clear the current summary
    setLocalSummaryId(null); // Reset the summary ID
    setSummaryTitle(generateSummaryTitle(scope, selectedRange)); // Update the title
  }, [scope, selectedRange]);

  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [additionalContext, setAdditionalContext] = useState('');
  const [responseLength, setResponseLength] = useState(500); // Default response length

  const openGenerateModal = () => {
    setIsGenerateModalOpen(true);
  };

  const closeGenerateModal = () => {
    setIsGenerateModalOpen(false);
  };

  const handleGenerate = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User is not authenticated');

      const userId = user.id;

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

      const weekStart = getWeekStartDate(selectedRange);
      const correctTitle = generateSummaryTitle(scope, selectedRange); // Ensure correct title is used

      const generatedSummary = await generateSummary(
        localSummaryId || '',
        scope,
        correctTitle,
        userId,
        weekStart,
        goalsWithAccomplishments
      );

      setSummary(generatedSummary);
      saveSummary(
        setLocalSummaryId,
        correctTitle, // Save the correct title
        generatedSummary,
        'AI',
        new Date(weekStart),
        scope
      );
      setSummaryType('AI');
    } catch (error) {
      console.error('Error generating summary:', error);
    }
  };

  const handleGenerateWithParams = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User is not authenticated');

      const userId = user.id;

      const goalsWithAccomplishments = filteredGoals.map(goal => ({
        title: goal.title,
        description: `${goal.description} ${additionalContext}`, // Append additional context to the description
        category: goal.category || 'Technical skills',
        accomplishments: (goal.accomplishments || []).map(accomplishment => ({
          title: accomplishment,
          description: `${accomplishment} ${additionalContext}`, // Append additional context to accomplishments
          impact: 'Medium',
        })),
      }));

      const weekStart =
        scope === 'week'
          ? getWeekStartDate(selectedRange)
          : scope === 'month'
          ? new Date(selectedRange.getFullYear(), selectedRange.getMonth(), 1).toISOString().split('T')[0]
          : scope === 'year'
          ? new Date(selectedRange.getFullYear(), 0, 1).toISOString().split('T')[0]
          : '';

      const generatedSummary = await generateSummary(
        localSummaryId || '',
        scope || 'week',
        summaryTitle || generateSummaryTitle(scope, selectedRange),
        userId,
        weekStart,
        goalsWithAccomplishments,
        responseLength // Pass the updated response length
      );

      setSummary(generatedSummary);
      saveSummary(
        setLocalSummaryId,
        // generatedSummaryTitle,
        summaryTitle || generateSummaryTitle(scope, selectedRange),
        generatedSummary,
        summaryType || 'AI', // Use the current summary type or default to 'AI'
        new Date(weekStart),
        scope,
      );
      setSummaryType('AI');
      closeGenerateModal();
      console.log('Response Length:', responseLength);
      console.log('Additional Context:', additionalContext);
      console.log('Initial Summary Title:', initialSummaryTitle);
      console.log('Title from functions:', summaryTitle);
      // console.log('Generated Title:', generatedSummaryTitle);
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
        summaryType, // Use the current summary type
        selectedRange, // Pass the selected range as a string
        scope // Pass the scope as the sixth argument
      );
      setSummary(updatedContent); // Update the summary state
      setSummaryTitle(updatedTitle); // Update the title state
      // console.log('formatted range:', formattedRange);
      // console.log('Summary saved successfully');
    } catch (error) {
      console.error('Error saving summary:', error);
    }
  };

  const closeEditor = () => {
    setIsEditorOpen(false);
  };

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
      

      <Modal
        isOpen={isGenerateModalOpen}
        onRequestClose={closeGenerateModal}
        className="fixed inset-0 flex items-center justify-center z-50"
        overlayClassName={`${overlayClasses}`}
        ariaHideApp={ARIA_HIDE_APP}
      >
        <div className={`${modalClasses}`}>
          {isGenerateModalOpen && (
            <>
              <h2 className="text-xl font-bold mb-4">Customize Summary Generation</h2>
              <label className="block mb-2 font-medium">Additional Context:</label>
              <ReactQuill value={additionalContext} onChange={setAdditionalContext} className="mb-4" />

              <label className="block mb-2 font-medium">Response Length:</label>
              <input
                type="number"
                value={responseLength}
                onChange={(e) => setResponseLength(Number(e.target.value))}
                className="block w-full p-2 border rounded mb-4"
              />

              <div className="flex justify-end space-x-4">
                <button onClick={closeGenerateModal} className="btn-secondary">
                  Cancel
                </button>
                <button onClick={handleGenerateWithParams} className="btn-primary">
                  Generate
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>
      {!summary && (
        <>
        <div className="flex flex-col mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">Summary</h2>
                    <p className="text-gray-60 dark:text-gray-30">Generate and edit your {scope}ly summary.</p>
                </div>
        <button onClick={openGenerateModal} className="btn-primary">
          Generate Summary
        </button>
        </>
      )}
      {summary && (
        <div className="flex flex-col gap-4">
          <SummaryCard
            id={summaryId}
            className="bg-transparent dark:bg-transparent" // Pass className prop
            scope={scope}
            title={generateSummaryTitle(scope, selectedRange)}
            content={summary}
            type={summaryType || ''}
            format={'content'}
            created_at={new Date().toISOString()}
            handleDelete={handleDeleteSummary}
            handleEdit={() => setIsEditorOpen(true)}
          />

          {/* <div key={summaryId} className={`flex flex-col text-left w-full space-y-4 mt-4 relative`}>
        <div className={`flex flex-row w-full items-center justify-between gap-4 align-top`}>  
          <h4 className="w-full text-lg font-bold text-gray-90" dangerouslySetInnerHTML={{ __html: generatedSummaryTitle }}></h4>
          <div className="flex flex-row justify-between">
            <span dangerouslySetInnerHTML={{ __html: summaryType }} className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand-10 text-brand-100 mt-2">
            </span>
          </div>
        </div>
        
            <div 
              className='flex flex-col text-left'>
              <span dangerouslySetInnerHTML={{ __html: summary}}></span>
            </div> */}


        
        {/* <footer className="mt-4 flex justify-end w-full space-x-2">
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
      </div>*/}
        
          <button onClick={handleGenerate} className="btn-primary w-auto self-end">
            <RefreshCcw className='mr-4 w-5 h-5' /> Regenerate Summary
          </button>
        </div>
      )}

      <Modal
        key={'summary-editor-modal'}
        isOpen={isEditorOpen}
        onRequestClose={closeEditor}
        className="fixed inset-0 flex items-center justify-center z-50"
        overlayClassName={`${overlayClasses}`}
        ariaHideApp={ARIA_HIDE_APP}
      >
        {isEditorOpen && (
          <SummaryEditor
            id={localSummaryId || ''}
            title={summaryTitle || ''}
            content={summary || ''}
            type={'User'}
            onRequestClose={closeEditor}
            onSave={handleSave}
          />
        )}
      </Modal>
    </div>
  );
};

export default SummaryGenerator;

