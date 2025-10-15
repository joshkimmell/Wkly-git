// DO NOT USE STATE IN THIS FILE
// This file contains utility functions for handling goals and accomplishments.
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
export interface Accomplishment {
  id: string;
  title: string;
  description: string;
  impact: string;
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
  scope: string;
  title: string;
  content: string;
  type: string;
  // format: string;
  week_start: string;
  user_id: string;
  created_at: string;
};
export interface Category {
  // id: string;
  name: string;
};

