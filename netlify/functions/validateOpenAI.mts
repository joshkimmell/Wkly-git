import { Handler } from '@netlify/functions';
import dotenv from 'dotenv';

// Load local .env when running netlify dev
dotenv.config();

// Dev-only endpoint to validate OpenAI API key without exposing the key
export const handler: Handler = async (event) => {
  // Disallow in production to avoid accidental exposure
  if ((process.env.NODE_ENV || '').toLowerCase() === 'production') {
    return {
      statusCode: 403,
      body: JSON.stringify({ valid: false, message: 'validateOpenAI is disabled in production.' }),
    };
  }

  try {
    const key = process.env.OPENAI_API_KEY;
    if (!key) {
      return {
        statusCode: 200,
        body: JSON.stringify({ valid: false, message: 'OPENAI_API_KEY not set in environment.' }),
      };
    }

    // Call OpenAI models endpoint to validate the key (do not forward response body to client)
    const resp = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: { Authorization: `Bearer ${key}` },
    });

    if (resp.ok) {
      return {
        statusCode: 200,
        body: JSON.stringify({ valid: true }),
      };
    }

    // Non-200 from OpenAI means key invalid or unauthorized
    return {
      statusCode: 200,
      body: JSON.stringify({ valid: false, status: resp.status, message: 'OpenAI reported an authentication error.' }),
    };
  } catch (err: any) {
    console.error('validateOpenAI error (server-side):', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ valid: false, message: 'Server error during validation.' }),
    };
  }
};
