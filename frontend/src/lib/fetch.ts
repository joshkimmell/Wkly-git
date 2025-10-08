// import dotenv from 'dotenv';
// const supabaseEnvKey = process.env.SUPABASE_KEY; // Ensure this is set in your environment variables
 const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL; // Ensure this is set in your environment variables
 const supabaseKey = (import.meta as any).env.VITE_SUPABASE_KEY; // Ensure this is set in your environment variables
// const backendUrl = (import.meta as any).env.VITE_BACKEND_URL; // Ensure this is set in your environment variables

// export async function addGoal(goalData: any) {
//     // const response = await fetch(`${supabaseUrl}/rest/v1/goals`, {
//     const response = await fetch(`${backendUrl}/goals?user_id=${goalData.user_id}`, {
//         method: 'POST',
//         headers: {
//             'Content-Type': 'application/json',
//             'Authorization': `Bearer ${supabaseKey}` // Add the Supabase JWT token
//         },
//         body: JSON.stringify(goalData)
//     });

//     console.log('url:', backendUrl);
//     console.log('response:', response); // Log the response for debugging
//     if (!response.ok) {
//         throw new Error(`Error adding goal: ${response.statusText}`);
//     }

//     return await response.json();
// }

export async function fetchCategories(name?: string) {
    const query = name ? `?select=name&name=eq.${encodeURIComponent(name)}` : '';
    const response = await fetch(`${supabaseUrl}/rest/v1/categories${query}`, {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`
        }
    });

    if (!response.ok) {
        throw new Error(`Error fetching categories: ${response.statusText}`);
    }

    return await response.json();
}

export async function fetchCategoriesSimple() {
    const response = await fetch(`${supabaseUrl}/rest/v1/categories`, {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`
        }
    });

    if (!response.ok) {
        throw new Error(`Error fetching categories: ${response.statusText}`);
    }

    return await response.json();
}

// Expose fetchCategoriesSimple for testing in the browser console
(window as any).fetchCategoriesSimple = fetchCategoriesSimple;

