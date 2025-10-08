import { Handler } from '@netlify/functions';
import supabase from './lib/supabase';

interface CategoryRequestBody {
  name: string;
  user_id: string;
}

interface Category {
  name: string;
  user_id: string | null;
}

interface HandlerResponse {
  statusCode: number;
  body: string;
}

export const handler: Handler = async (event): Promise<HandlerResponse> => {
  const { name, user_id }: CategoryRequestBody = JSON.parse(event.body as string);

  // Check if the category already exists
  const { data: existingCategory, error: fetchError }: { data: Category | null; error: any } = await supabase
    .from('categories')
    .select('name, user_id')
    .eq('name', name)
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') {
    // Ignore "No rows found" error (PGRST116), as it means the category doesn't exist
    return {
      statusCode: 500,
      body: JSON.stringify({ error: fetchError.message }),
    };
  }

  if (existingCategory) {
    // Check if the user_id is already associated with the category
    if (existingCategory.user_id === user_id) {
      return {
        statusCode: 200,
        body: JSON.stringify({ message: `Category '${name}' already exists with the correct user_id.` }),
      };
    }

    if (!existingCategory.user_id || existingCategory.user_id !== user_id) {
      // Update the category to include the user_id
      const { error: updateError } = await supabase
        .from('categories')
        .update({ user_id })
        .eq('name', name);

      if (updateError) {
        return {
          statusCode: 500,
          body: JSON.stringify({ error: updateError.message }),
        };
      }

      return {
        statusCode: 200,
        body: JSON.stringify({ message: `Category '${name}' already exists and user_id updated.` }),
      };
    }
  }

  // Insert the new category
  const { error }: { error: any } = await supabase
    .from('categories')
    .insert({ name, user_id });

  if (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Category added successfully.' }),
  };
};