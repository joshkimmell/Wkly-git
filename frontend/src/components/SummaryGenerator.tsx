// SummaryGenerator.tsx
// This component allows users to generate summaries based on a selected period (weekly, quarterly, yearly).

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown'; // Import react-markdown
import { handleGenerate } from '@utils/functions';
import supabase from '@lib/supabase';
// import openEditorModal from '@components/SummaryEditor'; // Import the function to open the modal
import SummaryEditor from '@components/SummaryEditor';
import Modal from 'react-modal';
import { Edit } from 'lucide-react';

interface SummaryGeneratorProps {
    selectedWeek: Date;
    filteredGoals: { title: string; description: string; category: string; accomplishments?: string[] }[]; // Add filteredGoals as a prop
//   filteredGoals: { title: string; description: string; category: string; accomplishments?: string[] }[]; // Add filteredGoals as a prop
}

const SummaryGenerator: React.FC<SummaryGeneratorProps> = ({ selectedWeek, filteredGoals }) => {
  const [summary, setSummary] = useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false); // Modal state
  const openEditor= () => setIsEditorOpen(true); // Open modal function
  const closeEditor = () => setIsEditorOpen(false); // Close modal function

  const handleGenerateClick = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User is not authenticated');

      const userId = user.id;
      const weekStart = selectedWeek.toISOString().split('T')[0];

      // Combine goals with their child accomplishments
      const goalsWithAccomplishments = filteredGoals.map(goal => ({
        title: goal.title,
        description: goal.description,
        category: goal.category || 'Technical skills', // Add a default category or derive it dynamically
        accomplishments: (goal.accomplishments || []).map(accomplishment => ({
          title: accomplishment, // Map string to title
          description: accomplishment, // Use the same string as description
          impact: 'Medium', // Add a default impact or derive it dynamically
        })),
      }));

      // Generate summary
    //   const goalsAsStrings = goalsWithAccomplishments.map(goal => `${goal.title}: ${goal.description} - Accomplishments: ${goal.accomplishments.join(', ')}`);
      const generatedSummary = await handleGenerate(userId, weekStart, goalsWithAccomplishments);
      setSummary(generatedSummary);
    } catch (error) {
      console.error('Error generating summary:', error);
    }
  };

  const handleOpenEditor = () => {
    // Open the modal to add a new goal
    // You can pass any necessary props to the modal here
    openEditor();
  };
  const handleCloseEditor = () => {
    // Open the modal to add a new goal
    // You can pass any necessary props to the modal here
    closeEditor();
  };

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
            onClick={handleOpenEditor}
            className="text-blue-600 hover:text-blue-800 ml-2"
            aria-activedescendant='Edit'
            aria-label="Edit Summary"
            title="Edit Summary"
            role="button"
            >
            <Edit className="w-5 h-5" />
          </button>
          <ReactMarkdown>{summary}</ReactMarkdown>
        </div>
      )}
    
    {/* Add Goal Modal */}
    {isEditorOpen && (
      <Modal
        isOpen={isEditorOpen}
        onRequestClose={handleCloseEditor}
        className="fixed inset-0 flex items-center justify-center z-50"
        overlayClassName="fixed inset-0 bg-gray-500 bg-opacity-75"
      >
        <div className="bg-white rounded-lg shadow-lg p-6 w-96">
          <SummaryEditor
            summaryId="new"
            initialContent={summary || ''}
            onRequestClose={closeEditor} // Pass the close function to the editor
          />
        </div>
      </Modal>
    )}
    </div>
  );
};

export default SummaryGenerator;