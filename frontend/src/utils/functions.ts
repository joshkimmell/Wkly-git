// DO NOT USE STATE IN THIS FILE
// This file contains utility functions for handling goals and accomplishments.
// It should not contain any React state or hooks.
// Instead, pass any necessary state and functions as parameters to the functions defined here.
//

import React from "react";
// import { Goal, FetchGoalsParams }from "@utils/goalUtils";
import { Goal } from "@utils/goalUtils";
// import axios from "axios";
import supabase from "@lib/supabase";
// import { set } from "lodash";

const backend = '/.netlify/functions';
export const backendUrl = backend + '/api/summaries';
export const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
export const supabaseKey = (import.meta as any).env.VITE_SUPABASE_KEY;
export const openaiApiKey = (import.meta as any).env.VITE_OPENAI_API_KEY;


export const handleError = (error: any, setError: React.Dispatch<React.SetStateAction<string | null>>) => {
    console.error(error);
    setError(error instanceof Error ? error.message : 'An unknown error occurred');
};

export const fetchWithAuth = async (url: string, userId: string) => {
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${userId}`,
            'Content-Type': 'application/json',
        },
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch');
    }
    return await response.json();
};
// export const fetchWithAuth = async <T>(url: string, token: string): Promise<T> => {
//     try {
//       const response = await fetch(url, {
//           method: 'GET',
//           headers: {
//               Authorization: `Bearer ${token}`,
//               'Content-Type': 'application/json',
//           },
//       });
//         if (!response.ok) {
//             let errorMessage = `HTTP error! status: ${response.status}`;
//              try {
//                  const errorData = await response.clone().json();
//                  errorMessage = errorData.error || errorMessage;
//              } catch (parseError) {
//                 // If parsing as JSON fails, include response text in error
//                 try {
//                     const responseText = await response.clone().text();
//                     errorMessage = `${errorMessage} - ${responseText}`;
//                 } catch (textError) {
//                     errorMessage = `${errorMessage} - Could not parse response text`;
//                 }
//              }

//             throw new Error(errorMessage);
//         }
        
//        const contentType = response.headers.get("content-type");
//        if (contentType && contentType.includes("application/json")) {
//             return await response.json();
//         } else {
//             const responseText = await response.text();
//             throw new Error(`Expected JSON response, but received: ${contentType || 'no content-type'} - ${responseText}`);
//         }

//     }  catch (error: any) {
//           console.error('Error fetching data:', error);
//           throw new Error(`Failed to fetch: ${error.message}`);
//     }
// };


export const handleSignIn = async (email: string, password: string, setError: React.Dispatch<React.SetStateAction<string | null>>) => {
    try {
        const { data: { session }, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (error) throw new Error(error.message);
        return session;
    } catch (err) {
        handleError(err, setError);
    }
};
export const handleSignOut = async (setError: React.Dispatch<React.SetStateAction<string | null>>) => {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw new Error(error.message);
        return true;
    } catch (err) {
        handleError(err, setError);
    }
};


export const handleSubmit = async (
    event: React.FormEvent,
    supabase: any,
    newGoal: Omit<any, 'id'>,
    fetchGoals: () => Promise<void>,
    setIsModalOpen: React.Dispatch<React.SetStateAction<boolean>>,
    resetNewGoal: () => void,
    setError: React.Dispatch<React.SetStateAction<string | null>>
) => {
    event.preventDefault();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User is not authenticated');
      const userId = user.id;
        
      const { error } = await supabase.from('goals').insert({
          ...newGoal,
          user_id: userId,
      });
      if (error) throw new Error(error.message);
      
      setIsModalOpen(false);
      resetNewGoal();
      await fetchGoals();
    } catch (err) {
        handleError(err, setError);
    }
};

// Fetch all goals
export const fetchGoals = async (weekStart: string): Promise<Goal[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User is not authenticated');
  const userId = user.id;

  const response = await fetch(`${backend}/getGoals?user_id=${userId}&week_start=${weekStart}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userId}`,
    },
  });
  // const text = await response.text();
  // console.log(text); // See what you actually got
  // const data = JSON.parse(text); // Only if it's valid JSON
  // console.log('Response data:', data); // Log the parsed data

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Error fetching goals:', errorText);
    throw new Error('Failed to fetch goals');
  }

  // return response.json();
  const goals = await response.json();
  // Sort by created date ascending
  goals.sort((a: { created_at: string | number | Date; }, b: { created_at: string | number | Date; }) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  console.log('Fetched goals:', goals);
  return goals;
};

// Add a new goal
export const addGoal = async (newGoal: any) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User is not authenticated');
  const userId = user.id;

  // Ensure user_id is included in the body if your backend expects it
  const goalToSend = { ...newGoal, user_id: userId };

  console.log('addGoal request:', goalToSend);

  const response = await fetch(`${backend}/createGoal?user_id=${userId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userId}`,
    },
    body: JSON.stringify(goalToSend),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Error adding goal:', errorText);
    throw new Error('Failed to add goal');
  }

  return response.json();
};
// export const addGoal = async (newGoal: any) => {
//   const { data: { user } } = await supabase.auth.getUser();
//   if (!user) throw new Error('User is not authenticated');
//   const userId = user.id;

//   const response = await fetch(`${backendUrl}/goals?user_id=${userId}`, {
//     method: 'POST',
//     headers: {
//       'Content-Type': 'application/json',
//       Authorization: `Bearer ${userId}`,
//     },
//     body: JSON.stringify(newGoal),
//   });

//   if (!response.ok) {
//     throw new Error('Failed to add goal');
//   }

//   console.log('addGoal request:', newGoal);
//   return response.json();
// };

// Delete a goal
export const deleteGoal = async (goalId: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User is not authenticated');
  const userId = user.id;

  const response = await fetch(`${backend}/deleteGoal/${goalId}?user_id=${userId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userId}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to delete goal');
  }

  return response.json();
};

// Update a goal
export const updateGoal = async (goalId: string, updatedGoal: any) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User is not authenticated');
  const userId = user.id;

  const response = await fetch(`${backend}/updateGoal/${goalId}?user_id=${userId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userId}`,
    },
    body: JSON.stringify(updatedGoal),
  });

  if (!response.ok) {
    throw new Error('Failed to update goal');
  }

  return response.json();
};                    

export const handleDeleteGoal = async (
    supabase: any,
    goalId: string,
    _setFilteredGoals: React.Dispatch<React.SetStateAction<Goal[]>>,
    fetchGoals: () => Promise<void>,
    setError: React.Dispatch<React.SetStateAction<string | null>>
) => {
    try {
        const { error } = await supabase.from('goals').delete().eq('id', goalId);
        if (error) throw new Error(error.message);
        
        await fetchGoals();
    } catch (err) {
        handleError(err, setError);
    }
};

export const filterGoalsByWeek = (goals: Goal[], selectedWeek: string | Date): Goal[] => {
  const startOfWeek = new Date(selectedWeek);
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(selectedWeek);
  endOfWeek.setDate(endOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  return goals.filter((goal) => {
    const goalDate = new Date(goal.week_start);
    return goalDate >= startOfWeek && goalDate <= endOfWeek;
  });
};

export const getWeekStartDate = (date: Date = new Date()): string => {
  const d = new Date(date);
  const day = d.getDay();
  // Calculate how many days to subtract to get to Monday (1)
  const diff = d.getDate() - ((day === 0 ? 6 : day - 1));
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split('T')[0]; // Format as YYYY-MM-DD
};

export const handleGenerate = async (
  // id: string,  
  userId: string, 
  weekStart: string, 
  goalsWithAccomplishments: {
      title: string;
      description: string;
      category: string;
      accomplishments: { title: string; description: string; impact: string; }[];
    }[]
) => {
    try {
    const response = await fetch(`${backend}/generateSummary`/*?user_id=${userId}&week_start=${weekStart}*/, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`, // Pass the API key here
      },
      body: JSON.stringify({ 
        // summary_id: id, 
        user_id: userId, 
        week_start: weekStart, 
        goalsWithAccomplishments, 
    }),
});

    console.log('Request body:',{
        // summary_id: id,
        user_id: userId,
        week_start: weekStart,
        goalsWithAccomplishments,
      });

    if (!response.ok) {
      throw new Error('Failed to generate summary');
    }

    const data = await response.json();
    return data.summary;
  } catch (error) {
    console.error('Error generating summary:', error);
    throw error;
  }
};

// export const saveSummary = async (newId: string, summaryContent: string, summaryType: string = 'AI') => {
//     try {
//       const { data: { user } } = await supabase.auth.getUser();
//       if (!user) throw new Error('User is not authenticated');
  
//       const userId = user.id;
//       // const weekStart = getWeekStartDate(selectedWeek); // Get Monday as YYYY-MM-DD
  
//       const requestBody = {
//         summary_id: newId, // Generate a unique ID for the summary
//         user_id: userId,
//         // week_start: weekStart,
//         content: summaryContent,
//         summary_type: summaryType, // Use the provided summaryType
//       };
  
//       console.log('Request body:', requestBody);
  
//       const { error } = await supabase.from('summaries').insert(requestBody);
  
//       if (error) {
//         console.error('Error saving summary:', error.message);
//         throw new Error('Failed to save summary');
//       }
  
//       console.log('Summary saved successfully');
//     } catch (error) {
//       console.error('Error saving summary:', error);
//     }
//   };


export const saveSummary = async (
  setLocalSummaryId: (id: string) => void,
  summaryContent: string,
  summaryType: string,
  selectedWeek: Date
) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User is not authenticated');

    const userId = user.id;
    const weekStart = getWeekStartDate(selectedWeek);

    const requestBody = {
      user_id: userId,
      week_start: weekStart,
      content: summaryContent,
      summary_type: summaryType,
    };

    const { data, error } = await supabase
      .from('summaries')
      .insert(requestBody)
      .select('summary_id')
      .single();

    if (error) {
      console.error('Supabase error:', error); // <--- log the actual error
      throw new Error('Failed to save summary');
    }
    setLocalSummaryId(data.summary_id); // <-- Set the actual ID from the backend
    return data; // Return the inserted row (including id)
  } catch (error) {
    throw error;
  }
};

export const deleteSummary = async (summary_id: string) =>
{
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User is not authenticated');
      const userId = user.id;
      // const summaryId = summary_id; // Assuming summary_id is passed as a parameter
      // const weekStart = selectedWeek.toISOString().split('T')[0];

      // Delete the summary for this user and week
      const { error } = await supabase
        .from('summaries')
        .delete()
        .match({ summary_id, user_id: userId });

      if (error) {
        console.error('Error deleting summary:', error.message);
        throw new Error('Failed to delete summary');
      }

      // setSummary(null); // Remove summary from local state
      // setIsEditorOpen(false); // Close editor if open
      console.log('Summary deleted successfully');
    } catch (error) {
      console.error('Error deleting summary:', error);
    }
}

export function setSummary(summary: string) {
    console.log("Generated Summary:", summary);
    // This function could be expanded to update a state or perform other actions
    // For now, it simply logs the summary to the console
}
export function setGoals(_data: any) {
    throw new Error("Function not implemented.");
}

