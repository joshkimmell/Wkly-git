import React, { createContext, useContext, useState } from 'react';
import supabase from '@lib/supabase';
import { handleSubmit, handleDeleteGoal, filterGoalsByWeek } from '@utils/functions';
// import { Categories } from '@components/GoalForm';

interface Goal {
  id: string;
  title: string;
  description: string;
  category: string;
  week_start: string;
  user_id: string;
};
interface GoalsContextProps {
  goals: Goal[];
  filteredGoals: Goal[];
  setFilteredGoals: React.Dispatch<React.SetStateAction<Goal[]>>;
  fetchGoals: () => Promise<void>;
  handleSubmit: typeof handleSubmit;
  handleDeleteGoal: typeof handleDeleteGoal;
  filterGoalsByWeek: typeof filterGoalsByWeek;
  error: string | null;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
};
const GoalsContext = createContext<GoalsContextProps | undefined>(undefined);
export const GoalsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [goals] = useState<Goal[]>([]);
  const [filteredGoals, setFilteredGoals] = useState<Goal[]>([]);
  const [error, setError] = useState<string | null>(null);

  return (
    <GoalsContext.Provider
      value={{
        goals,
        filteredGoals,
        setFilteredGoals,
        fetchGoals: async () => {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
              throw new Error('User is not authenticated');
            }
            // const userId = session.user.id;
          
            
          } catch (err) {
            console.error('Error fetching goals:', err);
            setError(err instanceof Error ? err.message : 'An unknown error occurred');
          }
        },
        handleSubmit,
        handleDeleteGoal,
        filterGoalsByWeek,
        error,
        setError,
      }}
    >
      {children}
    </GoalsContext.Provider>
  );
};
export const useGoalsContext = () => {
  const context = useContext(GoalsContext);
  if (!context) {
    throw new Error('useGoalsContext must be used within a GoalsProvider');
  }
  return context;
};