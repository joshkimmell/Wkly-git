// SummaryGenerator.tsx
// This component allows users to generate summaries based on a selected period (weekly, quarterly, yearly).

import React, { useState, useEffect } from 'react';
import { TextField, Tooltip, ToggleButtonGroup, ToggleButton, Checkbox, FormControlLabel, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import { saveSummary, deleteSummary, getWeekStartDate, generateSummary, fetchGoalsForRange } from '@utils/functions';
import { notifyWithUndo } from '@components/ToastyNotification';
import supabase from '@lib/supabase';
import SummaryEditor from '@components/SummaryEditor';
import LoadingSpinner from '@components/LoadingSpinner';
import Modal from 'react-modal';
import { ARIA_HIDE_APP } from '@lib/modal';
import SummaryCard from '@components/SummaryCard';
import { modalClasses, overlayClasses } from '@styles/classes';
import RichTextEditor from './RichTextEditor';
import { RefreshCcw, SparklesIcon, ChevronDown } from 'lucide-react';

interface SummaryGeneratorProps {
  summaryId: string;
  summaryTitle: string | null;
  selectedRange: Date;
  filteredGoals: { title: string; description: string; category: string; accomplishments?: string[] }[];
  content?: string | null;
  // summaryType: 'AI' | 'User';
  scope: 'week' | 'month' | 'year'; // Add scope to the props
  className?: string; // Optional className for styling
  onSummaryCreated?: () => void; // Optional callback for when a summary is created/updated
}

const SummaryGenerator: React.FC<SummaryGeneratorProps> = ({
  summaryTitle: initialSummaryTitle,
  summaryId,
  content: initialContent,
  selectedRange,
  filteredGoals,
  scope,
  className,
  onSummaryCreated,
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
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);

  // Reset summary state when scope or selectedRange changes, but only if modal is closed
  useEffect(() => {
    if (!isGenerateModalOpen) {
      setSummary(null); // Clear the current summary
      setLocalSummaryId(null); // Reset the summary ID
      setSummaryTitle(generateSummaryTitle(scope, selectedRange)); // Update the title
    }
  }, [scope, selectedRange, isGenerateModalOpen]);
  const [additionalContext, setAdditionalContext] = useState('');
  const [responseLength, setResponseLength] = useState(500); // Default response length
  const [isGenerating, setIsGenerating] = useState(false); // State to track loading
  const [error, setError] = useState<string | null>(null); // State to track errors
  const [selectedScope, setSelectedScope] = useState<'week' | 'month' | 'year'>(scope); // Scope selector
  const [selectedGoalIds, setSelectedGoalIds] = useState<Set<string>>(new Set(filteredGoals.map((_, idx) => idx.toString()))); // All goals selected by default

  // Keep summaryTitle in sync when the user changes scope inside the modal
  useEffect(() => {
    setSummaryTitle(generateSummaryTitle(selectedScope, selectedRange));
  }, [selectedScope, selectedRange]);

  const openGenerateModal = () => {
    setIsGenerateModalOpen(true);
  };

  const closeGenerateModal = () => {
    setIsGenerateModalOpen(false);
    // clear the RichTextEditor input when the form/modal is canceled
    setAdditionalContext('');
    setSelectedScope(scope); // Reset scope to the passed prop
    setSelectedGoalIds(new Set(filteredGoals.map((_, idx) => idx.toString()))); // Reset to all goals
  };

  const handleGenerate = async () => {
    setIsGenerating(true); // Show loading animation
    setError(null); // Reset error state
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

      // Also include archived goals that fall within the summary's scope
      try {
        const scopeEnd = new Date(weekStart);
        scopeEnd.setDate(scopeEnd.getDate() + 7);
        const archivedGoals = await fetchGoalsForRange(weekStart, scopeEnd.toISOString().split('T')[0], true);
        const archived = archivedGoals.filter(g => g.is_archived);
        archived.forEach(g => {
          if (!goalsWithAccomplishments.some(x => x.title === g.title && x.description === g.description)) {
            goalsWithAccomplishments.push({ title: g.title, description: g.description, category: g.category || 'Technical skills', accomplishments: [] });
          }
        });
      } catch (e) {
        console.warn('[SummaryGenerator] Could not fetch archived goals for scope:', e);
      }

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
      await saveSummary(
        setLocalSummaryId,
        correctTitle, // Save the correct title
        generatedSummary,
        'AI',
        new Date(weekStart),
        scope
      );
      setSummaryType('AI');
      // Notify parent component that a summary was created
      if (onSummaryCreated) {
        onSummaryCreated();
      }
    } catch (error) {
      console.error('Error generating summary:', error);
    }
    /// Finally block to reset loading state
    finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateWithParams = async () => {
    setIsGenerating(true); // Show loading animation
    setError(null); // Reset error state
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User is not authenticated');

      const userId = user.id;

      // Filter goals based on selection
      const selectedGoals = filteredGoals.filter((_, idx) => selectedGoalIds.has(idx.toString()));
      
      const goalsWithAccomplishments = selectedGoals.map(goal => ({
        title: goal.title,
        description: goal.description,
        category: goal.category || 'Technical skills',
        accomplishments: (goal.accomplishments || []).map(accomplishment => ({
          title: accomplishment,
          description: accomplishment,
          impact: 'Medium',
        })),
      }));

      const weekStart =
        selectedScope === 'week'
          ? getWeekStartDate(selectedRange)
          : selectedScope === 'month'
          ? new Date(selectedRange.getFullYear(), selectedRange.getMonth(), 1).toISOString().split('T')[0]
          : selectedScope === 'year'
          ? new Date(selectedRange.getFullYear(), 0, 1).toISOString().split('T')[0]
          : '';

      // Also include archived goals that fall within this summary's scope
      if (weekStart) {
        try {
          let scopeEnd: string;
          if (selectedScope === 'week') {
            const d = new Date(weekStart); d.setDate(d.getDate() + 7);
            scopeEnd = d.toISOString().split('T')[0];
          } else if (selectedScope === 'month') {
            const base = new Date(weekStart);
            scopeEnd = new Date(base.getFullYear(), base.getMonth() + 1, 1).toISOString().split('T')[0];
          } else {
            scopeEnd = `${new Date(weekStart).getFullYear() + 1}-01-01`;
          }
          const archivedGoals = await fetchGoalsForRange(weekStart, scopeEnd, true);
          const archived = archivedGoals.filter(g => g.is_archived);
          archived.forEach(g => {
            if (!goalsWithAccomplishments.some(x => x.title === g.title && x.description === g.description)) {
              goalsWithAccomplishments.push({ title: g.title, description: g.description, category: g.category || 'Technical skills', accomplishments: [] });
            }
          });
        } catch (e) {
          console.warn('[SummaryGenerator] Could not fetch archived goals for scope:', e);
        }
      }

      const generatedSummary = await generateSummary(
        localSummaryId || '',
        selectedScope || 'week',
        summaryTitle || generateSummaryTitle(selectedScope, selectedRange),
        userId,
        weekStart,
        goalsWithAccomplishments,
        responseLength, // Pass the updated response length
        additionalContext // Pass additional context as separate parameter
      );

      setSummary(generatedSummary);
      await saveSummary(
        setLocalSummaryId,
        // generatedSummaryTitle,
        summaryTitle || generateSummaryTitle(selectedScope, selectedRange),
        generatedSummary,
        summaryType || 'AI', // Use the current summary type or default to 'AI'
        new Date(weekStart),
        selectedScope,  // Use selectedScope instead of scope
      );
      setSummaryType('AI');
      // Notify parent component that a summary was created
      if (onSummaryCreated) {
        onSummaryCreated();
      }
      // closeGenerateModal();
      console.log('Response Length:', responseLength);
      console.log('Additional Context:', additionalContext);
      console.log('Initial Summary Title:', initialSummaryTitle);
      console.log('Title from functions:', summaryTitle);
      // console.log('Generated Title:', generatedSummaryTitle);
    } catch (error) {
      console.error('Error generating summary:', error);
      setError((error instanceof Error ? error.message : 'An unexpected error occurred'));
    }
    /// Finally block to reset loading state
    finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async (updatedContent: string, updatedTitle: string) => {
    try {
      // Save the updated summary to the database or state
      await saveSummary(
        setLocalSummaryId,
        updatedTitle, // Save the updated title
        updatedContent, // Save the updated content
        'User', // User-edited summaries are always tagged as 'User'
        selectedRange, // Pass the selected range as a string
        scope // Pass the scope as the sixth argument
      );
      setSummary(updatedContent); // Update the summary state
      setSummaryTitle(updatedTitle); // Update the title state
      setSummaryType('User'); // Mark as user-edited
      // Notify parent component that a summary was saved
      if (onSummaryCreated) {
        onSummaryCreated();
      }
      // console.log('formatted range:', formattedRange);
      // console.log('Summary saved successfully');
    } catch (error) {
      console.error('Error saving summary:', error);
    }
  };

  const closeEditor = () => {
    setIsEditorOpen(false);
  };

  const handleDeleteSummary = () => {
    if (!localSummaryId) {
      console.error('No summary ID to delete');
      return;
    }

    // Snapshot current state so it can be restored on undo
    const savedId = localSummaryId;
    const savedSummary = summary;
    const savedTitle = summaryTitle;

    // Optimistically remove from UI immediately
    setSummary(null);
    setLocalSummaryId(null);
    setIsEditorOpen(false);

    notifyWithUndo(
      'Summary deleted',
      () => deleteSummary(savedId),
      () => {
        // Restore UI state if user clicks Undo
        setSummary(savedSummary);
        setLocalSummaryId(savedId);
        setSummaryTitle(savedTitle);
      },
    );
  };

  return (
    <div className={`${className || ''}`}>
      

      <Modal
        isOpen={isGenerateModalOpen}
        onRequestClose={closeGenerateModal}
        className="fixed inset-0 flex items-center justify-center z-50"
        overlayClassName={`${overlayClasses}`}
        ariaHideApp={ARIA_HIDE_APP}
      >
        <div className={`${modalClasses}`}>
            {isGenerating && (
              <div className="w-full bg-gray-10 dark:bg-gray-90 flex justify-center items-center my-4">
                <div className="loader"><LoadingSpinner variant='mui' /></div>
                <span className="ml-2">Generating summary...</span>
              </div>
            )}
            
            {!isGenerating && !summary && (

            <div className="space-y-4">
              <h2 className="text-xl font-bold mb-4">Customize Summary Generation</h2>
              
              {/* Scope Selector */}
              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">Scope</label>
                <ToggleButtonGroup
                  value={selectedScope}
                  exclusive
                  onChange={(_, value) => value && setSelectedScope(value)}
                  fullWidth
                  size="small"
                >
                  <ToggleButton value="week">Week</ToggleButton>
                  <ToggleButton value="month">Month</ToggleButton>
                  <ToggleButton value="year">Year</ToggleButton>
                </ToggleButtonGroup>
              </div>

              {/* Goal Selection */}
              <Accordion defaultExpanded disableGutters elevation={0} sx={{ bgcolor: 'transparent', '&:before': { display: 'none' }, borderBottom: '1px solid', borderColor: 'divider' }}>
                <AccordionSummary expandIcon={<ChevronDown className="w-3.5 h-3.5" />} sx={{ p: 0, px: 2, minHeight: 'unset', '& .MuiAccordionSummary-content': { my: '6px' } }}>
                  <span className="text-sm font-semibold">
                    Goals ({selectedGoalIds.size} of {filteredGoals.length} selected)
                  </span>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 2, maxHeight: '200px', overflow: 'auto' }}>
                  <div className="flex flex-col">
                    <FormControlLabel
                      control={
                        <Checkbox
                          size="small"
                          checked={selectedGoalIds.size === filteredGoals.length}
                          indeterminate={selectedGoalIds.size > 0 && selectedGoalIds.size < filteredGoals.length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedGoalIds(new Set(filteredGoals.map((_, idx) => idx.toString())));
                            } else {
                              setSelectedGoalIds(new Set());
                            }
                          }}
                          sx={{ p: 0, mr: 1 }}
                        />
                      }
                      label={<span className="text-sm font-semibold">Select All</span>}
                      sx={{ mb: 1 }}
                    />
                    {filteredGoals.map((goal, idx) => (
                      <FormControlLabel
                        key={idx}
                        control={
                          <Checkbox
                            size="small"
                            checked={selectedGoalIds.has(idx.toString())}
                            onChange={(e) => {
                              const newSet = new Set(selectedGoalIds);
                              if (e.target.checked) {
                                newSet.add(idx.toString());
                              } else {
                                newSet.delete(idx.toString());
                              }
                              setSelectedGoalIds(newSet);
                            }}
                            sx={{ p: 0, mr: 1 }}
                          />
                        }
                        label={<span className="text-sm">{goal.title}</span>}
                      />
                    ))}
                  </div>
                </AccordionDetails>
              </Accordion>

              {/* Additional Context */}
              <div>            
                <RichTextEditor 
                    id="additional-context"
                    label="Additional context" 
                    value={additionalContext} 
                    onChange={setAdditionalContext}
                    placeholder="Add any additional context to the summary generation"
                  />
              </div>

              {/* Response Length */}
              <div>
                <TextField
                  id="response-length"
                  type="number"
                  label="Response length (words)"
                  value={responseLength}
                  onChange={(e) => setResponseLength(Number(e.target.value))}
                  placeholder="Modify the length of the generated summary"
                  fullWidth
                />
              </div>
              {error && (
                <div className="h-full w-full gap-2 bg-gray-10 dark:bg-gray-90 justify-center items-center">
                  <h2 className='text-lg font-bold'>Error!</h2> 
                  <p className='text-red-500 h-1/2 overflow-auto p-4 mt-4 mb-4 items-start'>{error}</p>
                </div>
              )}
              
            <div>
              <div className="flex justify-end space-x-4">
                <button onClick={closeGenerateModal} className="btn-secondary">
                  Cancel
                </button>
                <button onClick={handleGenerateWithParams} className="btn-primary">
                  Generate
                </button>
              </div>
            </div>
        </div>
        )}
        {summary && (
        <div className="flex flex-col gap-4">
          <SummaryCard
            id={summaryId}
            className="bg-transparent dark:bg-transparent" // Pass className prop
            scope={selectedScope}
            title={generateSummaryTitle(selectedScope, selectedRange)}
            content={summary}
            type={summaryType || ''}
            format={'content'}
            created_at={new Date().toISOString()}
            handleDelete={handleDeleteSummary}
            handleEdit={() => setIsEditorOpen(true)}
            onToggleSelect={() => {}} // Dummy handler - selection not needed in modal
          />

         
        {/* {isGenerating && (
          <div className="w-full bg-gray-10 dark:bg-gray-90 flex justify-center items-center my-4">
            <div className="loader"><LoadingSpinner variant='mui' /></div>
            <span className="ml-2">Regenerating summary...</span>
          </div>
        )} */}
        <div className="flex gap-4 justify-end">    
        {!isGenerating && (
          
          <button onClick={handleGenerate} className="btn-primary w-auto self-end">
            <RefreshCcw className='mr-4 w-5 h-5' /> Regenerate Summary
          </button>

        )}
        <button onClick={closeGenerateModal} className="btn-secondary self-end" title="Close summary generation modal" aria-label="Close summary generation modal">
          Close
        </button>
        </div>
        </div>
      )}
        </div>
      </Modal>
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

      <Tooltip title="Generate Summary" placement="top" arrow>
        <button onClick={openGenerateModal} className="btn-primary gap-2 flex w-auto">
          <SparklesIcon className="w-5 h-5" /> 
          <span className="hidden md:inline text-nowrap">Generate Summary</span>
        </button>
      </Tooltip>

    </div>
  );
};

export default SummaryGenerator;

