import { Handler } from '@netlify/functions';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config({ path: '/.env' });

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
    const { input } = JSON.parse(event.body || '{}');

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

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a helpful assistant that is good at breaking large goals into steps and determines the timeframe for each step, then generates JSON responses only.' },
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