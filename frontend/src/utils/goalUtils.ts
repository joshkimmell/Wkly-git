// DO NOT USE STATE IN THIS FILE
// This file contains utility functions for handling goals and accomplishments.
// It should not contain any React state or hooks.
// Instead, pass any necessary state and functions as parameters to the functions defined here.
//

// import React from "react";
import { Session } from "@supabase/auth-helpers-react";
import { SupabaseClient } from "@supabase/supabase-js";


export const Categories = [
    'Technical skills',
    'Business',
    'Eminence',
    'Concepts',
    'Community'
  ] as Array<string>;

export interface FetchGoalsParams {
    backendUrl: string;
    supabase: SupabaseClient;
    session: Session | null;
}
export interface Accomplishment {
    id: string;
    title: string;
    description: string;
    impact: string;
    category: string;
    goal_id: string;
    user_id: string;
    created_at: string;
  }
  export interface Goal {
    id: string;
    title: string;
    description: string;
    category: string;
    week_start: string;
    user_id: string;
    created_at: string;
  };
  export interface Summary {
    id: string;
    title: string;
    content: string;
    type: string;
    week_start: string;
    user_id: string;
    created_at: string;
  };


