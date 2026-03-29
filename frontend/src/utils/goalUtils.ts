// DO NOT USE STATE IN THIS FILE
// This file contains utility functions for handling goals and wins.
// It should not contain any React state or hooks.
// Instead, pass any necessary state and functions as parameters to the functions defined here.
//

// import React from "react";
import { Session } from "@supabase/auth-helpers-react";
import { SupabaseClient } from "@supabase/supabase-js";
// import supabase from '@lib/supabase';



export interface FetchGoalsParams {
  backendUrl: string;
  supabase: SupabaseClient;
  session: Session | null;
}
// export interface Win {
//   id: string;
//   title: string;
//   description: string;
//   impact: string;
//   goal_id: string;
//   user_id: string;
//   created_at: string;
// }


export interface Win {
  id: string;
  title: string;
  description?: string;
  impact?: string;
  goal_id: string;
  user_id: string;
  created_at: string;
  week_start: string;
}
export interface Goal {
  id: string;
  title: string;
  description: string;
  category: string;
  week_start: string;
  user_id: string;
  created_at: string;
  status?: 'Not started' | 'In progress' | 'Blocked' | 'Done' | 'On hold';
  status_notes?: string | null;
  status_set_at?: string | null;
  is_archived?: boolean;
};
// export interface Summary {
//   id: string;
//   scope: string;
//   title: string;
//   content: string;
//   type: string;
//   // format: string;
//   week_start: string;
//   user_id: string;
//   created_at: string;
// };
export interface Summary {
  id: string;
  scope: string;
  title: string;
  description: string;
  content: string;
  type: string;
  week_start: string;
  user_id: string;
  created_at: string;
}
export interface Category {
  id: string;
  name: string;
};

export interface Task {
  id: string;
  goal_id: string;
  user_id: string;
  title: string;
  description?: string;
  status: 'Not started' | 'In progress' | 'Blocked' | 'On hold' | 'Done';
  scheduled_date?: string; // ISO date string
  scheduled_time?: string; // HH:MM format
  reminder_enabled: boolean;
  reminder_datetime?: string; // ISO datetime string
  order_index: number;
  created_at: string;
  updated_at?: string;
  notes?: string; // User notes for the task
  closing_rationale?: string; // Rationale for marking as Done
  goal?: { // Optional goal data for filtering
    id: string;
    category?: string;
    title?: string;
  };
};

/**
 * Calculate goal completion percentage based on its child tasks.
 * Returns 0-100 representing the percentage of tasks that are done.
 */
export function calculateGoalCompletion(tasks: Task[]): number {
  if (!tasks || tasks.length === 0) {
    return 0;
  }

  const doneCount = tasks.filter(task => task.status === 'Done').length;
  return Math.round((doneCount / tasks.length) * 100);
}

/**
 * Get task status breakdown for a goal.
 */
export function getTaskStatusBreakdown(tasks: Task[]): Record<string, number> {
  const breakdown = {
    'Not started': 0,
    'In progress': 0,
    'Blocked': 0,
    'On hold': 0,
    'Done': 0,
  };

  tasks.forEach(task => {
    breakdown[task.status]++;
  });

  return breakdown;
}
