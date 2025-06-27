import { Handler } from '@netlify/functions';
import supabase from './lib/supabase';

export const handler: Handler = async (event) => {
  try {
    const { name } = JSON.parse(event.body || '{}');

    if (!name) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Name is required.' }),
      };
    }

    // Get the authenticated user's ID from the request headers
    const userId = event.headers['authorization']?.replace('Bearer ', '');

    if (!userId) {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'User not authenticated.' }),
      };
    }

    // Insert the new category with the user_id and auto-generate cat_id
    const { data, error } = await supabase
      .from('categories')
      .insert({ name, user_id: userId })
      .select('cat_id, name, user_id')
      .single();

    if (error) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: error.message }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Unexpected error occurred.' }),
    };
  }
};