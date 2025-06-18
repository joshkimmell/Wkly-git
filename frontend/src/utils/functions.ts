import React from "react";
import { Goal, Summary } from "@utils/goalUtils";
import supabase from "@lib/supabase";
import { notifyError, notifySuccess } from "@components/ToastyNotification";
import { v4 as uuidv4 } from "uuid";

const baseUrl = import.meta.env.DEV ? 'http://localhost:8888' : ''; // Use localhost for dev, empty for production
const backend = '/api';
// export const backendUrl = backend + '/api/summaries';
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


export const fetchAllGoals = async (): Promise<Goal[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User is not authenticated');
  const userId = user.id;

  const response = await fetch(`${baseUrl}${backend}/getAllGoals?user_id=${userId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userId}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Error fetching all goals:', errorText);
    throw new Error('Failed to fetch all goals');
  }

  const goals = await response.json();
  // Sort by created date ascending
  goals.sort((a: { created_at: string | number | Date }, b: { created_at: string | number | Date }) =>
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  // console.log('Fetched all goals:', goals);
  // // console.log('Request Query Parameters:', response.body);
  // // console.log('User ID:', userId);
  return goals;
};

export const indexDataByScope = <T extends { week_start: string }>(
  data: T[],
  scope: 'week' | 'month' | 'year'
): Record<string, T[]> => {
  const indexedData: Record<string, T[]> = {};

  data.forEach((item) => {
    const itemDate = new Date(item.week_start);
    let key: string;

    switch (scope) {
      case 'week':
        key = item.week_start; // Use the exact week_start date
        break;
      case 'month':
        key = `${itemDate.getFullYear()}-${String(itemDate.getMonth() + 1).padStart(2, '0')}`; // Format as YYYY-MM
        break;
      case 'year':
        key = `${itemDate.getFullYear()}`; // Use the year
        break;
      default:
        throw new Error('Invalid scope');
    }

    if (!indexedData[key]) {
      indexedData[key] = [];
    }
    indexedData[key].push(item);
  });

  return indexedData;
};

export const getPagesFromIndexedData = <T>( indexedData: Record<string, T[]> ): string[] => {
  return Object.keys(indexedData).sort(); // Sort keys to ensure chronological order
};

// Fetch all goals indexed by week, month, or year

export const fetchAllGoalsIndexed = async (
  scope: 'week' | 'month' | 'year'
): Promise<{ indexedGoals: Record<string, Goal[]>; pages: string[] }> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User is not authenticated');
  const userId = user.id;

  try {
    // const response = await fetch(`${baseUrl}${backend}/getAllGoals?user_id=${userId}&scope=${scope}`);
    const response = await fetch(`/api/getAllGoals?user_id=${userId}&scope=${scope}`);
    if (!response.ok) {
      const errorText = await response.text(); // Read the body once for error logging
      console.error('Error fetching all goals:', errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('Invalid response format: Expected JSON');
    }

    const goals: Goal[] = await response.json(); // Read the body once for JSON parsing
    // // console.log('Fetched all goals:', goals);

    // Sort goals by created date descending
    goals.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Index goals by the selected scope
    const indexedGoals = indexDataByScope(goals, scope);

    // Get pages sorted in descending order
    const pages = Object.keys(indexedGoals).sort((a, b) => (a > b ? -1 : 1));

    console.log('Indexed goals:', indexedGoals);
    console.log('Pages:', pages);
    return { indexedGoals, pages };
  } catch (error) {
    console.error('Error in fetchAllGoalsIndexed:', error);
    throw error;
  }
};
// export const fetchAllGoalsIndexed = async ( scope: 'week' | 'month' | 'year'
// ): Promise<{ indexedGoals: Record<string, Goal[]>; pages: string[] }> => {
//   const { data: { user } } = await supabase.auth.getUser();
//   if (!user) throw new Error('User is not authenticated');
//   const userId = user.id;
  
//   try {
//     const response = await fetch(`/api/getAllGoals?user_id=${userId}&scope=${scope}`);
//     if (!response.ok) {
//       throw new Error(`HTTP error! status: ${response.status}`);
//     }

//     const data = await response.json();
//     return data;
//   } catch (error) {
//     console.error("Error in fetchAllGoalsIndexed:", error);
//     throw error;
//   }
// };

// Add a new goal
export const addGoal = async (newGoal: any) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User is not authenticated');
  const userId = user.id;

  // Ensure user_id is included in the body if your backend expects it
  const goalToSend = { ...newGoal, user_id: userId };

  // // console.log('addGoal request:', goalToSend);

  const response = await fetch(`${baseUrl}${backend}/createGoal?user_id=${userId}`, {
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
    notifyError('Failed to add goal');
    throw new Error('Failed to add goal');
  }

  notifySuccess('Goal added successfully!');
  return response.json();
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
// Set goals in the local state or perform any other action
export function setGoals(_data: any) {
    throw new Error("Function not implemented.");
}
// Delete a goal

export const deleteGoal = async (goalId: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User is not authenticated');
  const userId = user.id;

  const response = await fetch(`${baseUrl}${backend}/deleteGoal?goal_id=${goalId}&user_id=${userId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userId}`,
    },
  });

  if (!response.ok) {
    notifyError('Failed to delete goal');
    throw new Error('Failed to delete goal');
  }
  notifySuccess('Goal deleted successfully!');
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

// Update a goal
export const updateGoal = async (goalId: string, updatedGoal: any) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User is not authenticated');
  const userId = user.id;

  const response = await fetch(`${baseUrl}${backend}/updateGoal/${goalId}?user_id=${userId}`, {
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

// Filter goals by week
// export const filterGoalsByWeek = (goals: Goal[], selectedWeek: string | Date): Goal[] => {
//   const startOfWeek = new Date(selectedWeek);
//   startOfWeek.setHours(0, 0, 0, 0);

//   const endOfWeek = new Date(selectedWeek);
//   endOfWeek.setDate(endOfWeek.getDate() + 6);
//   endOfWeek.setHours(23, 59, 59, 999);

//   return goals.filter((goal) => {
//     const goalDate = new Date(goal.week_start);
//     return goalDate >= startOfWeek && goalDate <= endOfWeek;
//   });
// };

export const filterGoalsByWeek = (goals: Goal[], selectedWeek: Date) => {
  const weekStart = new Date(selectedWeek);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Get the start of the week (Sunday)
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6); // Get the end of the week (Saturday)

  return goals.filter((goal) => {
    const goalDate = new Date(goal.week_start);
    return goalDate >= weekStart && goalDate <= weekEnd;
  });
};

// Get the start date of the week (Monday)
export const getWeekStartDate = (date: Date = new Date()): string => {
  if (isNaN(date.getTime())) {
    console.error('Invalid date passed to getWeekStartDate:', date);
    return new Date().toISOString().split('T')[0]; // Fallback to current date
  }
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - (day === 0 ? 6 : day - 1); // Adjust when day is Sunday (0)
  d.setDate(diff);
  return d.toISOString().split('T')[0]; // Format as YYYY-MM-DD
};

// export const getMonday = (date: Date): string => {
//   const day = date.getDay(); // Get the day of the week (0 = Sunday, 1 = Monday, etc.)
//   const diff = day === 0 ? -6 : 1 - day; // Calculate the difference to the previous Monday
//   const monday = new Date(date);
//   monday.setDate(date.getDate() + diff); // Adjust the date to the previous Monday
//   return monday.toISOString().split('T')[0]; // Return the date in YYYY-MM-DD format
// };

export const filterGoalsByMonth = (goals: Goal[], selectedDate: Date) => {
  const month = selectedDate.getMonth();
  const year = selectedDate.getFullYear();

  return goals.filter((goal) => {
    const goalDate = new Date(goal.week_start);
    return goalDate.getMonth() === month && goalDate.getFullYear() === year;
  });
};


export const filterGoalsByYear = (goals: Goal[], selectedDate: Date) => {
  const year = selectedDate.getFullYear();

  return goals.filter((goal) => {
    const goalDate = new Date(goal.week_start);
    return goalDate.getFullYear() === year;
  });
};

// Generate a summary using OpenAI
export const handleGenerate = async (
  id: string,  
  scope: 'week' | 'month' | 'year', // Add scope to the parameters
  title: string,
  userId: string, 
  weekStart: string, 
  goalsWithAccomplishments: {
      title: string;
      description: string;
      category: string;
      accomplishments: { title: string; description: string; impact: string; }[];
    }[],
) => {
    try {
      // Generate a new UUID if no summary_id is provided
      const summaryId = id || uuidv4();

      console.log('Request body:', {
        summary_id: summaryId,
        scope,
        summaryTitle: title,
        user_id: userId,
        week_start: weekStart,
        goalsWithAccomplishments,
      });
      
      const response = await fetch(`${baseUrl}${backend}/generateSummary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          summary_id: summaryId,
          scope,
          summaryTitle: title, 
          user_id: userId, 
          week_start: weekStart, 
          goalsWithAccomplishments, 
        }),
      });
      
      notifySuccess(`{Summary for ${scope} generated successfully!}`); // Notify success
      // // console.log('Response status:', response.status); // Log the response status
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error generating summary:', errorText);
        notifyError('Failed to generate summary'); // Notify error
        throw new Error('Failed to generate summary');
      }
      
      const data = await response.json();
      return data.summary;
    } catch (error) {
      console.error('Error generating summary:', error);
      throw error;
    }
  };

// Save a summary to the database
export const saveSummary = async (
  setLocalSummaryId: (id: string) => void,
  summaryTitle: string,
  summaryContent: string,
  summaryType: string,
  selectedRange: Date
) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User is not authenticated');

    const userId = user.id;
    const weekStart = getWeekStartDate(selectedRange);

    const requestBody = {
      user_id: userId,
      title: summaryTitle,
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
      notifyError('Failed to save summary'); // Notify error
      throw new Error('Failed to save summary');
    }
    setLocalSummaryId(data.summary_id); // <-- Set the actual ID from the backend
    notifySuccess('Summary saved successfully!'); // Notify success
    return data; // Return the inserted row (including id)
  } catch (error) {
    throw error;
  }
};

// Fetch summaries for a user
// Fetch all goals
export const fetchSummaries = async (userId: string, id: string): Promise<Summary[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User is not authenticated');


  const response = await fetch(`${baseUrl}${backend}/getSummaries?user_id=${userId}&summary_id=${id}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userId}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Error fetching summaries:', errorText);
    throw new Error('Failed to fetch summaries');
  }

  // return response.json();
  const summaries = await response.json();
  // Sort by created date ascending
  summaries.sort((a: { created_at: string | number | Date; }, b: { created_at: string | number | Date; }) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  // console.log('Fetched summaries:', summaries);
  return summaries;
};

// Add a new summary
export const createSummary = async (newSummary: any) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User is not authenticated');
  const userId = user.id;

  // Ensure user_id is included in the body if your backend expects it
  const summaryToSend = { ...newSummary, user_id: userId };

  // console.log('addSummary request:', summaryToSend);

  const response = await fetch(`${baseUrl}${backend}/createSummary?user_id=${userId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userId}`,
    },
    body: JSON.stringify(summaryToSend),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Error adding summary:', errorText);
    throw new Error('Failed to add summary');
  }

  return response.json();
};

// Delete a summary
export const deleteSummary = async (summary_id: string) => {
  if (!summary_id) {
    throw new Error('No summary ID provided');
  }
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
    // console.log('Summary deleted successfully');
    notifySuccess('Summary deleted successfully!'); 
  } catch (error) {
    console.error('Error deleting summary:', error);
    notifyError('Failed to delete summary');
  }
}

// Set the summary in the local state or perform any other action
export function setSummary(content: string, title: string, type: string) {
    // console.log("Generated Summary:", content, title, type);
    // This function could be expanded to update a state or perform other actions
    // For now, it simply logs the summary to the console
}



