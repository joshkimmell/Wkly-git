import { Handler } from '@netlify/functions';
import OpenAI from 'openai';
import dotenv from 'dotenv';

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


// Define the expected structure of a step
interface Step {
  title: string;
  description: string;
  category: string;
  week_start: string;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    // Log raw incoming body for debugging (helps catch unexpected shapes)
    console.debug('[generatePlan] raw event.body:', event.body);
    // Try to parse JSON, then fall back to urlencoded or raw body
    let input: string | undefined;
    try {
      const parsed = JSON.parse(event.body || '{}');
      input = parsed?.input;
      console.debug('[generatePlan] parsed JSON body:', parsed);
    } catch (e) {
      // not JSON; try URLSearchParams
      try {
        const params = new URLSearchParams(event.body || '');
        if (params.has('input')) input = params.get('input') || undefined;
        else input = (event.body || '').trim() || undefined;
        console.debug('[generatePlan] parsed urlencoded/raw body, input:', input);
      } catch (ee) {
        console.warn('[generatePlan] Failed to parse non-JSON body');
      }
    }

    // Make sure OpenAI key is available
    if (!process.env.OPENAI_API_KEY) {
      console.error('[generatePlan] OPENAI_API_KEY is missing');
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Server misconfiguration: missing OpenAI API key.' }),
      };
    }

    if (!input) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Input is required.' }),
      };
    }

    // Call OpenAI API to generate a stepped plan
    // Updated the prompt to exclude `week_start` and `category` fields
    const prompt = `Create a detailed, actionable plan based on the following goal prompt: "${input}". The plan should include multiple steps, and each step should have the following fields in JSON format:
    [
      {
        "title": "Step 1: step.title",
        "description": "step.description"
      }
    ]
    Ensure the response is a valid JSON array and nothing else.`;

    let response: any;
    try {
      response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a helpful assistant that is good at breaking large goals into steps and determines the timeframe for each step, then generates JSON responses only.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 500,
        // Set temperature to 1 since some models only support the default value
        temperature: 1,
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

    // Log the raw response from OpenAI
    console.log('Raw OpenAI response:', generatedText);

    // Check if the response is truncated
    if (!generatedText.trim().endsWith(']')) {
      console.error('Truncated OpenAI response detected:', generatedText);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Truncated OpenAI response.', response: 'Try refreshing plan.' + generatedText }),
      };
    }

    // Preprocess the response to remove code block markers
    const cleanText = generatedText.replace(/^```json\n|```$/g, '').trim();

    // Parse the response into a structured format (assuming JSON-like output)
    let steps: Step[];
    try {
      steps = JSON.parse(cleanText);

      // Validate required fields in each step
      // Updated validation to exclude `week_start` and `category`
      const isValid = steps.every((step: Step) =>
        step.title &&
        step.description
      );

      if (!isValid) {
        console.error('Validation failed for OpenAI response:', steps);
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Title and description are required in each step.', response: steps }),
        };
      }

      // Validate and transform each step to ensure proper formatting
      steps = steps.map((step, index) => {
        let title = step.title;

        // Ensure title is a string
        if (typeof title !== 'string') {
          console.warn(`Invalid title format at step ${index + 1}:`, title);
          title = JSON.stringify(title); // Fallback to stringifying the title
        }

        // Prepend step number if not already present
        const stepNumberPattern = /^Step \d+: /;
        if (!stepNumberPattern.test(title)) {
          title = `Step ${index + 1}: ${title}`;
        }

        return {
          ...step,
          title,
        };
      });
    } catch (error) {
      console.error('Failed to parse OpenAI response:', cleanText); // Log the invalid response
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to parse OpenAI response.', response: cleanText }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ result: steps }),
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