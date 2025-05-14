// DO NOT USE STATE IN THIS FILE
// This file contains utility functions for handling goals and accomplishments.
// It should not contain any React state or hooks.
// Instead, pass any necessary state and functions as parameters to the functions defined here.
//

import React from "react";
import { Goal, FetchGoalsParams }from "@utils/goalUtils";
import axios from "axios";
import supabase from "@lib/supabase";
import { set } from "lodash";

const backend = (import.meta as any).env.VITE_BACKEND_URL;
export const backendUrl = backend + '/api/summaries';
export const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
export const supabaseKey = (import.meta as any).env.VITE_SUPABASE_KEY;
export const openaiApiKey = (import.meta as any).env.VITE_OPENAI_API_KEY;

const userString = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User is not authenticated');
    return user.id;
    // const resolvedUserId = user.id; // Get the user ID from the authenticated user
    // Fetch and store the user ID asynchronously
};
export const userId = await userString();
console.log('My User ID:', userId); // Log the user ID for debugging


// Fix userId to be a string
// console.log('Backend URL:', backendUrl);
// console.log('User ID:', user.id);


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
        // const { data: { user } } = await supabase.auth.getUser();
        if (!userId) throw new Error('User is not authenticated');
        
        const { error } = await supabase.from('goals').insert({
            ...newGoal,
            user_id: userId,
        });
        if (error) throw new Error(error.message);
        
        await fetchGoals();
        setIsModalOpen(false);
        resetNewGoal();
    } catch (err) {
        handleError(err, setError);
    }
};

// Fetch all goals
// export const fetchGoals = async (weekStart: string) => {
//     if (!userId) throw new Error('User is not authenticated');
  
//     const response = await fetch(`${backendUrl}/goals?user_id=${userId}&week_start=${weekStart}`, {
//       method: 'GET',
//       headers: {
//         'Content-Type': 'application/json',
//         Authorization: `Bearer ${userId}`,
//       },
//     });
  
//     if (!response.ok) {
//       const errorText = await response.text();
//       console.error('Error fetching goals:', errorText);
//       throw new Error('Failed to fetch goals');
//     }
  
//     return response.json();
//   };
    export const fetchGoals = async (weekStart: string): Promise<Goal[]> => {
    if (!userId) throw new Error('User is not authenticated');
  
    const response = await fetch(`${backendUrl}/goals?user_id=${userId}&week_start=${weekStart}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userId}`,
      },
    });
  
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error fetching goals:', errorText);
      throw new Error('Failed to fetch goals');
    }
  
    return response.json();
  };
  
  // Add a new goal
  export const addGoal = async (newGoal: any) => {
    // const { data: { user } } = await supabase.auth.getUser();
    if (!userId) throw new Error('User is not authenticated');
    // const token = userId;
    const response = await fetch(`${backendUrl}/goals?user_id=${userId}}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userId}`,
      },
      body: JSON.stringify(newGoal),
    });
    console.log('User ID:', userId);
  
    if (!response.ok) {
      throw new Error('Failed to add goal');
    }
  
    return response.json();
    console.log('Adding goal with body:', newGoal);
  };
  
  // Delete a goal
  export const deleteGoal = async (goalId: string) => {
    if (!userId) throw new Error('User is not authenticated');
  
    const response = await fetch(`${backendUrl}/goals/${goalId}?user_id=${userId}`, {
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
    const response = await fetch(`${backendUrl}/goals?user_id=${userId}/${goalId}`, {
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
// export const fetchGoals = async (
//     fetchParams: FetchGoalsParams, 
//     // supabase: SupabaseClient<any, "public", any>, 
//     filterGoalsByWeek: (
//         goals: Goal[],
//         selectedWeek: Date,
//         setFilteredGoals: React.Dispatch<React.SetStateAction<any[]>>
//     ) => void, 
//     setGoals: React.Dispatch<React.SetStateAction<any[]>>, 
//     // p1: () => void, 
//     // filter: string, 
//     setFilteredGoals: React.Dispatch<React.SetStateAction<Goal[]>>, 
//     setError: React.Dispatch<React.SetStateAction<string | null>>, 
//     // userId: { userId: any; },      
// ) => {  
//     try {
//         const { data: { session } } = await supabase.auth.getSession();
//         if (!session) throw new Error('User is not authenticated');
//         const { user } = session;
//         if (!user) throw new Error('User is not authenticated');
//         if (!session?.user?.id) throw new Error('User ID is missing.');
//         const { access_token } = session;
//         if (!access_token) throw new Error('Access token is missing');
//         // const { data: { user: { id } } } = await supabase.auth.getUser();
//         // if (!id) throw new Error('User ID is missing');
//         const data = await fetchWithAuth(`${fetchParams.backendUrl}/rest/v1/goals?user_id=${session.user.id}`, session.access_token);
        
//         if(data) {
//             setGoals(data);
//         } else {
//             setGoals([]);
//         };
        
//     } catch (err) {
//         handleError(err, setError);
//     }
// };

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

// export const filterGoalsByWeek = (
//     goals: any[],
//     selectedWeek: Date,
//     setFilteredGoals: React.Dispatch<React.SetStateAction<any[]>>
// ) => {
//     const startOfWeek = new Date(selectedWeek);
//     startOfWeek.setHours(0, 0, 0, 0);
    
//     const endOfWeek = new Date(selectedWeek);
//     endOfWeek.setDate(endOfWeek.getDate() + 6);
//     endOfWeek.setHours(23, 59, 59, 999);
    
//     const filtered = goals.filter((goal) => {
//         const goalDate = new Date(goal.week_start);
//         return goalDate >= startOfWeek && goalDate <= endOfWeek;
//     });
//     setFilteredGoals(filtered);
// };
export const filterGoalsByWeek = (goals: Goal[], selectedWeek: Date): Goal[] => {
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

// export const handleGenerate = async (props: { goals: any[]; accomplishments: any[]; setSummary: React.Dispatch<React.SetStateAction<string>> }) => {
//     const { goals, accomplishments, setSummary } = props; // Destructure props to extract goals, accomplishments, and setSummary

//     try {
//         // Assuming `goals` and `accomplishments` are passed as props or available in the component's state
//         const displayedGoals = goals.map((goal) => `- ${goal.title}: ${goal.description}`);
//         const displayedAccomplishments = accomplishments.map(
//             (accomplishment) => `- ${accomplishment.title}: ${accomplishment.description}`
//         );

//         const response = await axios.post(`${backendUrl}/generate`, {
//             goals: displayedGoals,
//             accomplishments: displayedAccomplishments,
//         });

//         setSummary(response.data.summary);
//     } catch (error) {
//         console.error('Error generating summary:', error);
//     }
// };

export const getWeekStartDate = (date: Date = new Date()): string => {
    const dayOfWeek = date.getDay(); // 0 (Sunday) to 6 (Saturday)
    const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust for Monday as the start of the week
    const weekStart = new Date(date.setDate(diff));
    return weekStart.toISOString().split('T')[0]; // Format as YYYY-MM-DD
};



// export const handleGenerate = async (backendUrl: string, selectedDate: Date): Promise<string> => {
//     try {
//         const weekStart = getWeekStartDate(selectedDate); // Get the start date of the selected week

//         if (!backendUrl) {
//             throw new Error('Backend URL is not defined. Please set VITE_BACKEND_URL in your .env file.');
//         }

//         // Fetch goals from Supabase
//         const { data: goalsData, error: goalsError } = await supabase
//             .from('goals')
//             .select('title, description, category')
//             .eq('week_start', weekStart); // Filter by the selected week's start date

//         if (goalsError) {
//             throw new Error(`Error fetching goals: ${goalsError.message}`);
//         }

//         // Fetch accomplishments from Supabase
//         const { data: accomplishmentsData, error: accomplishmentsError } = await supabase
//             .from('accomplishments')
//             .select('title, description, impact')
//             .eq('week_start', weekStart); // Filter by the selected week's start date

//         if (accomplishmentsError) {
//             throw new Error(`Error fetching accomplishments: ${accomplishmentsError.message}`);
//         }

//         // Format the data for the backend
//         const formattedGoals: string[] = goalsData?.map(
//             (goal: { title: string; description: string; category: string }) =>
//                 `(${goal.category}) ${goal.title}: ${goal.description}`
//         ) || [];
//         const accomplishments: string[] = accomplishmentsData?.map(
//             (accomplishment: { title: string; description: string; impact: string }) =>
//                 `${accomplishment.title}: ${accomplishment.description}<br/>Impact: ${accomplishment.impact}`
//         ) || [];

//         // Retrieve the authenticated user
//         // const user = await supabase.auth.getUser();
//         const { data: { user } } = await supabase.auth.getUser();
//         if (!user) throw new Error('User is not authenticated');
        
//         const user_id = user.id;

//         // Send a POST request to the backend
//         const response = await axios.post(`${backendUrl}/generate?user_id=${user_id}&week_start=${weekStart}`, {
//             goals: formattedGoals,
//             accomplishments,
//         });

//         return response.data.summary; // Return the generated summary
//     } catch (error) {
//         console.error('Error generating summary:', error);
//         throw error;
//     }
// };

// export const generateSummary = async (
//     filteredGoals: any[],
//     setSummary: React.Dispatch<React.SetStateAction<string>>,
//     setError: React.Dispatch<React.SetStateAction<string | null>>
// ) => {
//     try {
//         const { data: { user } } = await supabase.auth.getUser();
//         if (!user) throw new Error('User is not authenticated');
        
//         const user_id = user.id;
//         const response = await fetch(`${backendUrl}/generate?user_id=${user_id}`, {
//             method: 'POST',
//             headers: { 'Content-Type': 'application/json' },
//             body: JSON.stringify({
//                 goals: filteredGoals.map((goal) => `- ${goal.title}: ${goal.description}`),
//                 accomplishments: filteredGoals
//                 .flatMap((goal) => goal.accomplishments || [])
//                 .map((accomplishment) => `- ${accomplishment.title}: ${accomplishment.description}`),
//             }),
//         });
//         if (!response.ok) {
//             const errorData = await response.json();
//             throw new Error(errorData.error || 'Failed to generate summary');
//         }
//         const data = await response.json();
//         setSummary(data.summary);
//     } catch (err) {
//         handleError(err, setError);
//     }
// };

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
    // const backendUrl = backend + '/api/summaries';
    try {
    const response = await fetch(`${backendUrl}/generate`/*?user_id=${userId}&week_start=${weekStart}*/, {
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

export function setSummary(summary: string) {
    console.log("Generated Summary:", summary);
    // This function could be expanded to update a state or perform other actions
    // For now, it simply logs the summary to the console
}
export function setGoals(_data: any) {
    throw new Error("Function not implemented.");
}

