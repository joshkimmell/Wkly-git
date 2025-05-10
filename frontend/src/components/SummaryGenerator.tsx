// SummaryGenerator.tsx
// This component allows users to generate summaries based on a selected period (weekly, quarterly, yearly).

import React, { useState } from 'react';
import { handleGenerate, fetchGoals, getWeekStartDate } from '@utils/functions';
import supabase from '@lib/supabase';

interface SummaryGeneratorProps {
  selectedWeek: Date; // Add the selectedWeek prop to the type definition
}

const SummaryGenerator: React.FC<SummaryGeneratorProps> = ({ selectedWeek }) => {
  const [summary, setSummary] = useState<string | null>(null);


  const handleGenerateClick = async () => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User is not authenticated');
        
        const userId = user.id;
        const weekStart = getWeekStartDate(selectedWeek);

        // Fetch goals
        const goalsResponse = await fetchGoals(userId, weekStart);
        const goals = goalsResponse.goals || []; // Ensure goals is an array

        // Fetch accomplishments
        const accomplishmentsResponse = await fetchGoals(userId, weekStart); // Replace with a proper fetchAccomplishments function if needed
        const accomplishments = accomplishmentsResponse.accomplishments || []; // Ensure accomplishments is an array

        // Generate summary
        const generatedSummary = await handleGenerate(userId, weekStart, goals, accomplishments);
        setSummary(generatedSummary);
    } catch (error) {
        console.error('Error generating summary:', error);
    }

    console.log('Selected week:', selectedWeek);
    console.log('Generated summary:', summary);
        // const goals = await fetchGoals(userId, weekStart)
        //     .then((response) => response.json())
        //     .then((data) => data.goals || [])
        //     .catch((error) => {
        //         console.error('Error fetching goals:', error);
        //         return [];
        //     });
        // const accomplishments = await fetchGoals(userId, weekStart)
        //     .then((response) => response.json())
        //     .then((data) => data.accomplishments || [])
        //     .catch((error) => {
        //         console.error('Error fetching accomplishments:', error);
        //         return [];
        //     });
        // const generatedSummary = await handleGenerate(userId, weekStart, goals, accomplishments);
        // setSummary(generatedSummary);
        // } catch (error) {
        // console.error('Error generating summary:', error);
        // }
        // console.log('Selected week:', selectedWeek);
        // console.log('Generated summary:', summary);
    };

  return (
    <div>
        {/* <h2>Generate Weekly Summary</h2> */}
        <button 
            onClick={handleGenerateClick}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
            Generate
        </button>
      {summary && (
        <div className="mt-4 p-4 border rounded-md bg-gray-50">
          <h3 className="text-lg font-medium text-gray-900">Generated Summary</h3>
          <p className="mt-2 text-gray-700">{summary}</p>
        </div>
      )}   
    </div>
  );
};

export default SummaryGenerator;