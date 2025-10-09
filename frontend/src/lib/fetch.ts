// const supabaseUrl = import.meta.env.VITE_SUPABASE_URL; // Ensure this is set in your environment variables
// const supabaseKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY; // Ensure this is set in your environment variables
// 
// export async function fetchCategories(name?: string) {
//     const query = name ? `?select=name&name=eq.${encodeURIComponent(name)}` : '';
//     console.log('Fetching categories with query:', query); // Debug log for query
//     console.log('Authorization Header:', `Bearer ${supabaseKey}`); // Debug log for Authorization header
// 
//     const response = await fetch(`${supabaseUrl}/rest/v1/categories${query}`, {
//         method: 'GET',
//         headers: {
//             'Accept': 'application/json',
//             'Authorization': `Bearer ${supabaseKey}`
//         }
//     });
// 
//     if (!response.ok) {
//         throw new Error(`Error fetching categories: ${response.statusText}`);
//     }
// 
//     return await response.json();
// }

