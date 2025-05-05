// import dotenv from 'dotenv';
// const supabaseEnvKey = process.env.SUPABASE_KEY; // Ensure this is set in your environment variables
// const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL; // Ensure this is set in your environment variables
const supabaseKey = (import.meta as any).env.VITE_SUPABASE_KEY; // Ensure this is set in your environment variables
const backendUrl = (import.meta as any).env.VITE_BACKEND_URL; // Ensure this is set in your environment variables

export async function addGoal(goalData: any) {
    // const response = await fetch(`${supabaseUrl}/rest/v1/goals`, {
    const response = await fetch(`${backendUrl}/rest/v1/goals`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}` // Add the Supabase JWT token
        },
        body: JSON.stringify(goalData)
    });

    if (!response.ok) {
        throw new Error(`Error adding goal: ${response.statusText}`);
    }

    return await response.json();
}

