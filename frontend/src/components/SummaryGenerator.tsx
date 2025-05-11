// SummaryGenerator.tsx
// This component allows users to generate summaries based on a selected period (weekly, quarterly, yearly).

import React, { useState } from 'react';
import { handleGenerate } from '@utils/functions';
import supabase from '@lib/supabase';

interface SummaryGeneratorProps {
    selectedWeek: Date;
    filteredGoals: { title: string; description: string; category: string; accomplishments?: string[] }[]; // Add filteredGoals as a prop
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

  return (
    <div>
      <button
        onClick={handleGenerateClick}
        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
      >
        Generate Summary
      </button>
      {summary && <p className="mt-4">{summary}</p>}
    </div>
  );
};

export default SummaryGenerator;