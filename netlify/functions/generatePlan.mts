import { Handler } from '@netlify/functions';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config({ path: '/Users/joshkimmell/Documents/GitHub/Wkly-git/.env' });

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Debug log to verify the API key
console.log('Loaded API Key:', process.env.OPENAI_API_KEY);

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
    const { input } = JSON.parse(event.body || '{}');

    if (!input) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Input is required.' }),
      };
    }

    // Call OpenAI API to generate a stepped plan
    const prompt = `Create a detailed, actionable plan based on the following goal: "${input}". The plan should include multiple steps, and each step should have the following fields in JSON format:
    [
      {
        "title": "Step title",
        "description": "Step description",
        "category": "Step category",
        "week_start": "YYYY-MM-DD"
      }
    ]
    Ensure the response is a valid JSON array and nothing else.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a helpful assistant that generates JSON responses only.' },
        { role: 'user', content: prompt },
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    const generatedText = response.choices[0].message?.content;

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
        body: JSON.stringify({ error: 'Truncated OpenAI response.', response: generatedText }),
      };
    }

    // Preprocess the response to remove code block markers
    const cleanText = generatedText.replace(/^```json\n|```$/g, '').trim();

    // Parse the response into a structured format (assuming JSON-like output)
    let steps: Step[];
    try {
      steps = JSON.parse(cleanText);

      // Validate required fields in each step
      const isValid = steps.every((step: Step) =>
        step.title &&
        step.description &&
        step.category &&
        step.week_start
      );

      if (!isValid) {
        console.error('Validation failed for OpenAI response:', steps);
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'All fields are required in each step.', response: steps }),
        };
      }
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