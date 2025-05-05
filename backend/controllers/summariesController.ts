import { Request, Response } from 'express';
import { supabase } from '../lib/supabaseClient.js';

// Fetch all goals for a specific user
export const getGoals = async (req: Request, res: Response) => {
    const { user_id } = req.query;

    if (!user_id) {
        return res.status(400).json({ error: 'User ID is required.' });
    }

    try {
        // Query the goals table for the specified user
        const { data, error } = await supabase
            .from('goals') // Ensure this matches your table name
            .select('*')
            .eq('user_id', user_id);

        if (error) {
            console.error('Error fetching goals from Supabase:', error);
            return res.status(500).json({ error: 'Failed to fetch goals.' });
        }

        // Return the fetched goals
        res.status(200).json(data);
    } catch (error) {
        console.error('Unexpected error in /goals route:', error);
        res.status(500).json({ error: 'An unexpected error occurred.' });
    }
};

// Create a goal for a specific user
export const createGoal = async (req: Request, res: Response) => {
    const { title, description, category, week_start, user_id } = req.body;
    
    if (!title || !description || !category || !week_start || !user_id) {
        return res.status(400).json({ error: 'All fields are required.' });
    }
    
    try {
        const { data, error } = await supabase
        .from('goals') // Ensure this matches your table name
        .insert([{ title, description, category, week_start, user_id }]);
        
        if (error) {
            console.error('Error inserting goal into Supabase:', error); // Log the error
            return res.status(500).json({ error: 'Failed to create goal.' });
        }
        
        res.status(201).json(data);
    } catch (error) {
        console.error('Unexpected error adding goal:', error); // Log unexpected errors
        res.status(500).json({ error: 'An unexpected error occurred.' });
    }
    // const { user_id, title, description, category, week_start, goal_id } = req.body;
    
    // if (!user_id) {
    //     return res.status(400).json({ error: 'User ID is required.' });
    // }
    
    // try {
    //     // const response = await fetch(`${supabaseUrl}/rest/v1/goals`, {
    // const { data, error } = await supabase
    //   .from('goals')
    //   .insert([
    //     {
    //         user_id,
    //         title,
    //         description,
    //         category,
    //         week_start,
    //         goal_id: goal_id || null, // Optional goal reference
    //     },
    //   ]);
    //     if (error) throw error;
    
    //     res.status(201).json(data);
    //   } catch (error) {
    //     console.error('Error creating goal:', error);
    //     res.status(500).json({ error: 'Failed to create goal.' });
    //   }
    // };
};  


// Fetch all summaries for a specific user
export const getSummaries = async (req: Request, res: Response) => {
  const { user_id } = req.query;

  if (!user_id) {
    return res.status(400).json({ error: 'User ID is required.' });
  }

  try {
    const { data, error } = await supabase
      .from('summaries')
      .select('*')
      .eq('user_id', user_id);

    if (error) throw error;
    
    res.status(200).json(data);
} catch (error) {
    console.error('Error fetching summaries:', error);
    res.status(500).json({ error: 'Failed to fetch summaries.' });
}
};

// Create a new summary
export const createSummary = async (req: Request, res: Response) => {
  const { user_id, summary_text, goal_id, accomplishment_id } = req.body;

  if (!user_id || !summary_text) {
    return res.status(400).json({ error: 'User ID and summary_text are required.' });
  }

  try {
    const { data, error } = await supabase
      .from('summaries')
      .insert([
        {
          user_id,
          summary_text,
          goal_id: goal_id || null, // Optional goal reference
          accomplishment_id: accomplishment_id || null, // Optional accomplishment reference
        },
      ]);

    if (error) throw error;

    res.status(201).json(data);
  } catch (error) {
    console.error('Error creating summary:', error);
    res.status(500).json({ error: 'Failed to create summary.' });
  }
};

// Update an existing summary
export const updateSummary = async (req: Request, res: Response) => {
  const { summary_id } = req.params;
  const { summary_text } = req.body;

  if (!summary_id || !summary_text) {
    return res.status(400).json({ error: 'Summary ID and summary_text are required.' });
  }

  try {
    const { data, error } = await supabase
      .from('summaries')
      .update({ summary_text })
      .eq('summary_id', summary_id);

    if (error) throw error;

    res.status(200).json(data);
  } catch (error) {
    console.error('Error updating summary:', error);
    res.status(500).json({ error: 'Failed to update summary.' });
  }
};

// Delete a summary
export const deleteSummary = async (req: Request, res: Response) => {
  const { summary_id } = req.params;

  if (!summary_id) {
    return res.status(400).json({ error: 'Summary ID is required.' });
  }

  try {
    const { data, error } = await supabase
      .from('summaries')
      .delete()
      .eq('summary_id', summary_id);

    if (error) throw error;

    res.status(200).json(data);
  } catch (error) {
    console.error('Error deleting summary:', error);
    res.status(500).json({ error: 'Failed to delete summary.' });
  }
};

// Generate a weekly summary based on goals and accomplishments
export const generateWeeklySummary = async (req: Request, res: Response) => {
  const { goals, accomplishments } = req.body;

  if (!goals || !accomplishments) {
    return res.status(400).json({ error: 'Goals and accomplishments are required.' });
  }

  try {
    // Example logic for generating a summary
    const summary = `
      Weekly Summary:
      Goals: ${goals.join(', ')}
      Accomplishments: ${accomplishments.join(', ')}
    `;

    res.status(200).json({ summary });
  } catch (error) {
    console.error('Error generating summary:', error);
    res.status(500).json({ error: 'Failed to generate summary.' });
  }
};