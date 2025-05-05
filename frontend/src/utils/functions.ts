// DO NOT USE STATE IN THIS FILE
// This file contains utility functions for handling goals and accomplishments.
// It should not contain any React state or hooks.
// Instead, pass any necessary state and functions as parameters to the functions defined here.
//

import React from "react";
// import { Session } from "@supabase/auth-helpers-react";
// import { SupabaseClient } from "@supabase/supabase-js";
import { Goal, FetchGoalsParams }from "@utils/goalUtils";
import { supabase } from "@lib/supabase";
// import { useState } from "react";
// import { Goal } from "@/components/GoalForm";
// import { useAuth } from "@hooks/useAuth";

export const backendUrl = (import.meta as any).env.VITE_BACKEND_URL;
export const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
export const supabaseKey = (import.meta as any).env.VITE_SUPABASE_KEY;
console.log('Backend URL:', backendUrl);
// console.log('Supabase URL:', supabaseUrl);


export const handleError = (error: any, setError: React.Dispatch<React.SetStateAction<string | null>>) => {
    console.error(error);
    setError(error instanceof Error ? error.message : 'An unknown error occurred');
};

export const fetchWithAuth = async (url: string, token: string) => {
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`,
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
        
        const { error } = await supabase.from('goals').insert({
            ...newGoal,
            user_id: user.id,
        });
        if (error) throw new Error(error.message);
        
        await fetchGoals();
        setIsModalOpen(false);
        resetNewGoal();
    } catch (err) {
        handleError(err, setError);
    }
};

                    
export const fetchGoals = async (
    fetchParams: FetchGoalsParams, 
    // supabase: SupabaseClient<any, "public", any>, 
    _filterGoalsByWeek: (
        goals: Goal[],
        selectedWeek: Date,
        setFilteredGoals: React.Dispatch<React.SetStateAction<any[]>>
    ) => void, 
    setGoals: React.Dispatch<React.SetStateAction<any[]>>, 
    // p1: () => void, 
    // filter: string, 
    _setFilteredGoals: React.Dispatch<React.SetStateAction<Goal[]>>, 
    setError: React.Dispatch<React.SetStateAction<string | null>>, 
    // userId: { userId: any; },      
) => {  
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('User is not authenticated');
        const { user } = session;
        if (!user) throw new Error('User is not authenticated');
        if (!session?.user?.id) throw new Error('User ID is missing.');
        const { access_token } = session;
        if (!access_token) throw new Error('Access token is missing');
        // const { data: { user: { id } } } = await supabase.auth.getUser();
        // if (!id) throw new Error('User ID is missing');
        const data = await fetchWithAuth(`${fetchParams.backendUrl}/rest/v1/goals?user_id=${session.user.id}`, session.access_token);
        
        if(data) {
            setGoals(data);
        } else {
            setGoals([]);
        };
        
    } catch (err) {
        handleError(err, setError);
    }
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
export const filterGoalsByWeek = (
    goals: any[],
    selectedWeek: Date,
    setFilteredGoals: React.Dispatch<React.SetStateAction<any[]>>
) => {
    const startOfWeek = new Date(selectedWeek);
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(selectedWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    
    const filtered = goals.filter((goal) => {
        const goalDate = new Date(goal.week_start);
        return goalDate >= startOfWeek && goalDate <= endOfWeek;
    });
    setFilteredGoals(filtered);
};
export const generateSummary = async (
    filteredGoals: any[],
    setSummary: React.Dispatch<React.SetStateAction<string>>,
    setError: React.Dispatch<React.SetStateAction<string | null>>
) => {
    try {
        const response = await fetch('/api/summaries/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                goals: filteredGoals.map((goal) => `- ${goal.title}: ${goal.description}`),
                accomplishments: filteredGoals
                .flatMap((goal) => goal.accomplishments || [])
                .map((accomplishment) => `- ${accomplishment.title}: ${accomplishment.description}`),
            }),
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to generate summary');
        }
        const data = await response.json();
        setSummary(data.summary);
    } catch (err) {
        handleError(err, setError);
    }
};

export function setGoals(_data: any) {
    throw new Error("Function not implemented.");
}

