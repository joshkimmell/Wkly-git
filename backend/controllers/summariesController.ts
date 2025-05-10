import { Request, Response } from 'express';
import supabase from '../lib/supabaseClient.js';
import { generateSummaryWithOpenAI } from '../services/summaryService';
import { title } from 'process';
import { OpenAI } from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY, // Ensure you set this environment variable
});
// const openai = new OpenAI(openAIConfig);


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
    console.log('Request Body:', req.body);
};

export const getGoalsByWeek = async (req: Request, res: Response) => {
  const { user_id, week_start } = req.query;

  if (!user_id || !week_start) {
    return res.status(400).json({ error: 'Missing required parameters: user_id or week_start' });
  }

  try {
    const { data: goals, error } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', user_id)
      .eq('week_start', week_start);

    if (error) {
      throw new Error(`Error fetching goals: ${error.message}`);
    }

    res.status(200).json({ goals });
  } catch (error) {
    console.error('Error fetching goals:', error);
    res.status(500).json({ error: 'Failed to fetch goals' });
  }
  console.log('Request Body:', req.body);
};

export const getAccomplishmentsByWeek = async (req: Request, res: Response) => {
  const { user_id, week_start } = req.query;

  if (!user_id || !week_start) {
    return res.status(400).json({ error: 'Missing required parameters: user_id or week_start' });
  }

  try {
    const { data: accomplishments, error } = await supabase
      .from('accomplishments')
      .select('*')
      .eq('user_id', user_id)
      .eq('week_start', week_start);

    if (error) {
      throw new Error(`Error fetching accomplishments: ${error.message}`);
    }

    res.status(200).json({ accomplishments });
  } catch (error) {
    console.error('Error fetching accomplishments:', error);
    res.status(500).json({ error: 'Failed to fetch accomplishments' });
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
  const { user_id, title, content, goal_id, accomplishment_id } = req.body;

  if (!user_id || !content) {
    return res.status(400).json({ error: 'User ID and summary_text are required.' });
  }

  try {
    const { data, error } = await supabase
      .from('summaries')
      .insert([
        {
          user_id,
          // summary_text,
          title,
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
  
  const { title } = req.body;
  if (!summary_id || !summary_text) {
    return res.status(400).json({ error: 'Summary ID and summary_text are required.' });
  }

  try {
    const { data, error } = await supabase
      .from('summaries')
      .update({ summary_text, title })
      .eq('summary_id', summary_id);

    if (error) throw error;

    res.status(200).json(data);
  } catch (error) {
    console.error('Error updating summary:', error);
    res.status(500).json({ error: 'Failed to update summary.' });
  }
};



//   if (!summary_id || !summary_text) {
//     return res.status(400).json({ error: 'Summary ID and summary_text are required.' });
//   }

//   try {
//     const { data, error } = await supabase
//       .from('summaries')
//       .update({ summary_text })
//       .eq('summary_id', summary_id);

//     if (error) throw error;

//     res.status(200).json(data);
//   } catch (error) {
//     console.error('Error updating summary:', error);
//     res.status(500).json({ error: 'Failed to update summary.' });
//   }
// };

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
// export const generateWeeklySummary = async (req: Request, res: Response) => {
//   const apiKey = req.headers.authorization?.split(' ')[1]; // Extract API key from Authorization header

//   if (!apiKey) {
//       return res.status(401).json({ error: 'Missing API key' });
//   }

//   const { goals, accomplishments } = req.body;

//   if (!goals || !accomplishments) {
//       return res.status(400).json({ error: 'Missing required fields: goals or accomplishments' });
//   }

//   try {
//       const summary = await generateSummaryWithOpenAI(apiKey, goals, accomplishments);
//       res.status(200).json({ summary });
//   } catch (error) {
//       console.error('Error generating summary:', error);
//       res.status(500).json({ error: 'Failed to generate summary' });
//   }
// };

export const generateWeeklySummary = async (req: Request, res: Response) => {
  console.log('Request Body:', req.body); // Log the request body for debugging

  const { user_id, week_start, goals, accomplishments } = req.body;

  if (!user_id || !week_start || !goals || !accomplishments) {
    console.error('Missing required fields:', { user_id, week_start, goals, accomplishments });
    return res.status(400).json({ error: 'Missing required fields: user_id, week_start, goals, or accomplishments' });
  }

  try {
    // Your logic to generate the summary
    const summary = `Generated summary for user ${user_id} for the week starting ${week_start}`;
    res.status(200).json({ summary });
  } catch (error) {
    console.error('Error generating summary:', error);
    res.status(500).json({ error: 'Failed to generate summary' });
  }
};

export const generateSummary = async (req: Request, res: Response) => {
  console.log('Request Body:', req.body); // Log the request body

  const { user_id, week_start, goals, accomplishments } = req.body;

  if (!user_id || !week_start || !goals || !accomplishments) {
    return res.status(400).json({ error: 'Missing required fields: user_id, week_start, goals, or accomplishments' });
  }

  try {
    // Fetch goals for the user filtered by week_start
    const { data: goals, error: goalsError } = await supabase
      .from('goals')
      .select('id, title, description, category')
      .eq('user_id', user_id)
      .eq('week_start', week_start);

    if (goalsError) {
      console.error('Error fetching goals from Supabase:', goalsError);
      return res.status(500).json({ error: 'Failed to fetch goals.' });
    }

    // Fetch accomplishments for the user filtered by week_start
    const { data: accomplishments, error: accomplishmentsError } = await supabase
      .from('accomplishments')
      .select('id, title, description, impact')
      .eq('user_id', user_id)
      .eq('week_start', week_start);

    if (accomplishmentsError) {
      console.error('Error fetching accomplishments from Supabase:', accomplishmentsError);
      return res.status(500).json({ error: 'Failed to fetch accomplishments.' });
    }

    // Format goals and accomplishments for the OpenAI prompt
    const goalsList = goals.map((goal: any) => `Title: ${goal.title}, Description: ${goal.description}, Category: ${goal.category}`).join('\n');
    const accomplishmentsList = accomplishments.map((accomplishment: any) => `Title: ${accomplishment.title}, Description: ${accomplishment.description}, Impact: ${accomplishment.impact}`).join('\n');
    const model = process.env.OPENAI_MODEL || 'o4-mini';

    const prompt = `
        Summarize the following goals and accomplishments into a concise, friendly report:

        Goals:
        ${goalsList}

        Accomplishments:
        ${accomplishmentsList}
    `;

    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: model || 'o4-mini',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: prompt },
      ],
      store: true,
      max_tokens: 150,
      temperature: 0.7,
    });

    const summary = response.choices[0]?.message?.content?.trim() || 'No summary available.';

    // Store the generated summary in the Supabase "summaries" table
    const { data: summaryData, error: summaryError } = await supabase
      .from('summaries')
      .insert([
        {
          user_id,
          week_start,
          title: `Weekly Summary for ${week_start}`,
          content: summary,
          goals: goals.map((goal: any) => goal.id), // Store goal IDs for reference
          accomplishments: accomplishments.map((accomplishment: any) => accomplishment.id), // Store accomplishment IDs for reference
        },
      ]);

    if (summaryError) {
      console.error('Error storing summary in Supabase:', summaryError);
      return res.status(500).json({ error: 'Failed to store summary.' });
    }

    res.status(200).json({ summary, summaryData });
  } catch (error) {
    console.error('Error generating summary with OpenAI:', error);
    res.status(500).json({ error: 'Failed to generate summary.' });
  }
};