import { Handler } from '@netlify/functions';
import supabase from './lib/supabase';

exports.handler = async (event) => {
  try {
    const { user_id, scope } = event.queryStringParameters;

    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Missing environment variables");
    }

    const supabase = require('@supabase/supabase-js').createClient(supabaseUrl, serviceRoleKey);

    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', user_id)
      .eq('scope', scope);

    if (error) {
      console.error("Error fetching goals:", error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Failed to fetch goals" }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };
  } catch (error) {
    console.error("Error in getAllGoals function:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};

// export const handler: Handler = async (event) => {
//   const user_id = event.queryStringParameters?.user_id;
//   const week_start = event.queryStringParameters?.week_start;

  
//   if (!user_id) {
//     return {
//       statusCode: 400,
//       body: JSON.stringify({ error: 'User ID is required.' }),
//     };
//   }
  
//   try {
//     let query = supabase.from('goals').select('*').eq('user_id', user_id);
//     if (week_start) query = query.eq('week_start', week_start);
    
//     const { data, error } = await query.order('created_at', { ascending: true });
    
//     if (error) {
//       console.error('Error fetching goals:', error);
//       return {
//         statusCode: 500,
//         headers: {
//           'Access-Control-Allow-Origin': '*',
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({ error: 'Failed to fetch goals.' }),
//       };
//     }
//     if (!data || data.length === 0) {
//       return {
//         statusCode: 404,
//         headers: {
//           'Access-Control-Allow-Origin': '*',
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({ error: 'No goals found for the specified user.' }),
//       };
//     }
//     return {
//       statusCode: 200,
//       headers: {
//         'Access-Control-Allow-Origin': '*', // Or specify the allowed origin
//         'Content-Type': 'application/json',
//       },
//       body: JSON.stringify(data),
//     };
//   } catch (error) {
//     return {
//       statusCode: 500,
//       headers: {
//           'Access-Control-Allow-Origin': '*',
//           'Content-Type': 'application/json',
//         },
//       body: JSON.stringify({ error: 'An unexpected error occurred.' }),
//     };
//   }
// };