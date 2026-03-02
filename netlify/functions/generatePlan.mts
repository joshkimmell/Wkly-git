import { Handler } from '@netlify/functions';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import { requireAuth } from './lib/auth';

// Load .env from working directory if present (use default behaviour)
dotenv.config();

// Log environment diagnostics (masked key only) to help local debugging — do not log full secrets
try {
  const nodeEnv = process.env.NODE_ENV || 'undefined';
  const cwd = process.cwd();
  const rawKey = process.env.OPENAI_API_KEY || '';
  const masked = rawKey ? `${rawKey.slice(0,4)}...${rawKey.slice(-4)}` : '(not set)';
  console.debug('[generatePlan] env diagnostics:', { nodeEnv, cwd, openaiKeyPresent: !!rawKey, openaiKeyMasked: rawKey ? masked : '(not set)' });
} catch (e) {
  console.debug('[generatePlan] env diagnostics failed to read env');
}

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Define the expected structure of a task
interface Task {
  title: string;
  description: string;
  suggested_date?: string; // Relative timing like "Week 1", "Day 1-3", etc.
  estimated_duration?: string; // e.g., "2 hours", "30 minutes"
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  const auth = await requireAuth(event);
  if (auth.error) return auth.error;

  try {
    // Log raw incoming body for debugging (helps catch unexpected shapes)
    console.debug('[generatePlan] raw event.body:', event.body);
    
    let goalTitle: string | undefined;
    let goalDescription: string | undefined;

    try {
      const parsed = JSON.parse(event.body || '{}');
      goalTitle = parsed?.title;
      goalDescription = parsed?.description;
      console.debug('[generatePlan] parsed JSON body:', parsed);
    } catch (e) {
      console.warn('[generatePlan] Failed to parse body as JSON');
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid request body.' }),
      };
    }

    // Make sure OpenAI key is available
    if (!process.env.OPENAI_API_KEY) {
      console.error('[generatePlan] OPENAI_API_KEY is missing');
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Server misconfiguration: missing OpenAI API key.' }),
      };
    }

    if (!goalTitle || !goalDescription) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Both title and description are required.' }),
      };
    }

    // Call OpenAI API to generate tasks for the goal
    const prompt = `You are a planning assistant helping a user break down a goal into actionable tasks.

Goal Title: "${goalTitle}"
Goal Description: "${goalDescription}"

Your task:
1. Identify 3-7 specific, actionable tasks needed to achieve this goal
2. Order tasks logically (dependencies, prerequisites first)
3. For each task, suggest realistic timing and duration
4. Keep tasks focused and achievable

Respond with a JSON array of tasks:
[
  {
    "title": "Task title (clear action, max 100 chars)",
    "description": "What needs to be done and why (2-3 sentences)",
    "suggested_date": "Relative timing (e.g., 'Week 1', 'Days 1-3', 'After Task 1')",
    "estimated_duration": "How long it might take (e.g., '2 hours', '1 day', '1 week')"
  }
]

Ensure the response is a valid JSON array only.`;

    let response: any;
    try {
      response = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are a planning expert who breaks goals into clear, actionable tasks with realistic timelines. Always respond with valid JSON only.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 1000,
        temperature: 0.7,
      });
    } catch (openaiErr) {
      // Log the full error server-side for debugging (do not return raw error to client)
      console.error('OpenAI API error (server-side):', openaiErr);
      return {
        statusCode: 500,
        // Return a generic message to avoid leaking secrets in responses
        body: JSON.stringify({ error: 'OpenAI API error. Check server logs for details.' }),
      };
    }

    const generatedText = response?.choices?.[0]?.message?.content || response?.choices?.[0]?.text || undefined;

    console.log('OpenAI Response:', generatedText); // Log the response for debugging

    // Check if the response from OpenAI is null or undefined
    if (!generatedText) {
      console.error('OpenAI response is null or undefined');
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'OpenAI response is null or undefined.' }),
      };
    }

    // Preprocess the response to remove code block markers
    const cleanText = generatedText.replace(/^```json\n|```$/g, '').trim();

    // Parse the response into a structured format
    let tasks: Task[];
    try {
      tasks = JSON.parse(cleanText);

      // Validate required fields in each task
      const isValid = Array.isArray(tasks) && tasks.every((task: Task) =>
        task.title &&
        task.description
      );

      if (!isValid) {
        console.error('Validation failed for OpenAI response:', tasks);
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Title and description are required in each task.', response: tasks }),
        };
      }

      // Clean up and validate each task
      tasks = tasks.map((task, index) => {
        let title = task.title;

        // Ensure title is a string
        if (typeof title !== 'string') {
          console.warn(`Invalid title format at task ${index + 1}:`, title);
          title = JSON.stringify(title); // Fallback to stringifying the title
        }

        return {
          ...task,
          title,
        };
      });
    } catch (error) {
      console.error('Failed to parse OpenAI response:', cleanText);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to parse OpenAI response.', response: cleanText }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ tasks }),
    };
  } catch (error) {
    // Log detailed error information for debugging
    if (error instanceof Error) {
      console.error('Error in generatePlan function:', error.message, error.stack);
    } else {
      console.error('Error in generatePlan function:', error);
    }
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to generate plan.' }),
    };
  }
};