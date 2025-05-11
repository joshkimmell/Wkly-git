"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateWeeklySummary = exports.deleteSummary = exports.updateSummary = exports.createSummary = exports.getSummaries = exports.deleteGoal = exports.createGoal = exports.getAccomplishmentsByWeek = exports.getGoalsByWeek = exports.getGoals = void 0;
const supabaseClient_js_1 = __importDefault(require("../lib/supabaseClient.js"));
const summaryService_1 = require("../services/summaryService");
const openai_1 = require("openai");
const openai = new openai_1.OpenAI({
    apiKey: process.env.OPENAI_API_KEY, // Ensure you set this environment variable
});
// const openai = new OpenAI(openAIConfig);
// Fetch all goals for a specific user
const getGoals = async (req, res) => {
    const { user_id } = req.query;
    if (!user_id) {
        return res.status(400).json({ error: 'User ID is required.' });
    }
    try {
        // Query the goals table for the specified user
        const { data, error } = await supabaseClient_js_1.default
            .from('goals') // Ensure this matches your table name
            .select('*')
            .eq('user_id', user_id);
        if (error) {
            console.error('Error fetching goals from Supabase:', error);
            return res.status(500).json({ error: 'Failed to fetch goals.' });
        }
        // Return the fetched goals
        res.status(200).json(data);
    }
    catch (error) {
        console.error('Unexpected error in /goals route:', error);
        res.status(500).json({ error: 'An unexpected error occurred.' });
    }
    console.log('Request Body:', req.body);
};
exports.getGoals = getGoals;
const getGoalsByWeek = async (req, res) => {
    const { user_id, week_start } = req.query;
    if (!user_id || !week_start) {
        return res.status(400).json({ error: 'Missing required parameters: user_id or week_start' });
    }
    try {
        const { data: goals, error } = await supabaseClient_js_1.default
            .from('goals')
            .select('*')
            .eq('user_id', user_id)
            .eq('week_start', week_start);
        if (error) {
            throw new Error(`Error fetching goals: ${error.message}`);
        }
        res.status(200).json({ goals });
    }
    catch (error) {
        console.error('Error fetching goals:', error);
        res.status(500).json({ error: 'Failed to fetch goals' });
    }
    console.log('Request Body:', req.body);
};
exports.getGoalsByWeek = getGoalsByWeek;
const getAccomplishmentsByWeek = async (req, res) => {
    const { user_id, week_start } = req.query;
    if (!user_id || !week_start) {
        return res.status(400).json({ error: 'Missing required parameters: user_id or week_start' });
    }
    try {
        const { data: accomplishments, error } = await supabaseClient_js_1.default
            .from('accomplishments')
            .select('*')
            .eq('user_id', user_id)
            .eq('week_start', week_start);
        if (error) {
            throw new Error(`Error fetching accomplishments: ${error.message}`);
        }
        res.status(200).json({ accomplishments });
    }
    catch (error) {
        console.error('Error fetching accomplishments:', error);
        res.status(500).json({ error: 'Failed to fetch accomplishments' });
    }
};
exports.getAccomplishmentsByWeek = getAccomplishmentsByWeek;
// Create a goal for a specific user
const createGoal = async (req, res) => {
    const { title, description, category, week_start, user_id } = req.body;
    if (!title || !description || !category || !week_start || !user_id) {
        return res.status(400).json({ error: 'All fields are required.' });
    }
    try {
        const { data, error } = await supabaseClient_js_1.default
            .from('goals') // Ensure this matches your table name
            .insert([{ title, description, category, week_start, user_id }]);
        if (error) {
            console.error('Error inserting goal into Supabase:', error); // Log the error
            return res.status(500).json({ error: 'Failed to create goal.' });
        }
        res.status(201).json(data);
    }
    catch (error) {
        console.error('Unexpected error adding goal:', error); // Log unexpected errors
        res.status(500).json({ error: 'An unexpected error occurred.' });
    }
};
exports.createGoal = createGoal;
// Delete a goal for a specific user
const deleteGoal = async (req, res) => {
    const { goal_id } = req.params; // Extract goal_id from the URL path
    const { user_id } = req.query; // Extract user_id from the query string
    if (!goal_id) {
        return res.status(400).json({ error: 'Goal ID is required.' });
    }
    if (!user_id) {
        return res.status(400).json({ error: 'User ID is required.' });
    }
    try {
        // Delete related accomplishments first
        const { error: accomplishmentsError } = await supabaseClient_js_1.default
            .from('accomplishments')
            .delete()
            .eq('goal_id', goal_id);
        if (accomplishmentsError) {
            console.error('Error deleting related accomplishments:', accomplishmentsError);
            return res.status(500).json({ error: 'Failed to delete related accomplishments.' });
        }
        // Delete the goal
        const { error: goalError } = await supabaseClient_js_1.default
            .from('goals')
            .delete()
            .eq('id', goal_id)
            .eq('user_id', user_id);
        if (goalError) {
            console.error('Error deleting goal:', goalError);
            return res.status(500).json({ error: 'Failed to delete goal.' });
        }
        res.status(200).json({ message: 'Goal and related accomplishments deleted successfully.' });
    }
    catch (err) {
        console.error('Unexpected error deleting goal:', err);
        res.status(500).json({ error: 'An unexpected error occurred.' });
    }
};
exports.deleteGoal = deleteGoal;
// Fetch all summaries for a specific user
const getSummaries = async (req, res) => {
    const { user_id } = req.query;
    if (!user_id) {
        return res.status(400).json({ error: 'User ID is required.' });
    }
    try {
        const { data, error } = await supabaseClient_js_1.default
            .from('summaries')
            .select('*')
            .eq('user_id', user_id);
        if (error)
            throw error;
        res.status(200).json(data);
    }
    catch (error) {
        console.error('Error fetching summaries:', error);
        res.status(500).json({ error: 'Failed to fetch summaries.' });
    }
};
exports.getSummaries = getSummaries;
// Create a new summary
const createSummary = async (req, res) => {
    const { user_id, title, content, goal_id, accomplishment_id } = req.body;
    if (!user_id || !content) {
        return res.status(400).json({ error: 'User ID and summary_text are required.' });
    }
    try {
        const { data, error } = await supabaseClient_js_1.default
            .from('summaries')
            .insert([
            {
                user_id,
                // summary_text,
                title,
                goal_id: goal_id || null, // Optional goal reference
                accomplishment_id: accomplishment_id || null, // Optional accomplishment reference
            },
        ]);
        if (error)
            throw error;
        res.status(201).json(data);
    }
    catch (error) {
        console.error('Error creating summary:', error);
        res.status(500).json({ error: 'Failed to create summary.' });
    }
};
exports.createSummary = createSummary;
// Update an existing summary
const updateSummary = async (req, res) => {
    const { summary_id } = req.params;
    const { summary_text } = req.body;
    const { title } = req.body;
    if (!summary_id || !summary_text) {
        return res.status(400).json({ error: 'Summary ID and summary_text are required.' });
    }
    try {
        const { data, error } = await supabaseClient_js_1.default
            .from('summaries')
            .update({ summary_text, title })
            .eq('summary_id', summary_id);
        if (error)
            throw error;
        res.status(200).json(data);
    }
    catch (error) {
        console.error('Error updating summary:', error);
        res.status(500).json({ error: 'Failed to update summary.' });
    }
};
exports.updateSummary = updateSummary;
// Delete a summary
const deleteSummary = async (req, res) => {
    const { summary_id } = req.params;
    if (!summary_id) {
        return res.status(400).json({ error: 'Summary ID is required.' });
    }
    try {
        const { data, error } = await supabaseClient_js_1.default
            .from('summaries')
            .delete()
            .eq('summary_id', summary_id);
        if (error)
            throw error;
        res.status(200).json(data);
    }
    catch (error) {
        console.error('Error deleting summary:', error);
        res.status(500).json({ error: 'Failed to delete summary.' });
    }
};
exports.deleteSummary = deleteSummary;
// Generate a weekly summary using OpenAI
const generateWeeklySummary = async (req, res) => {
    const { user_id, week_start, goalsWithAccomplishments } = req.body;
    if (!user_id || !week_start || !goalsWithAccomplishments) {
        return res.status(400).json({ error: 'Missing required fields: user_id, week_start, or goalsWithAccomplishments' });
    }
    try {
        const summary = await (0, summaryService_1.generateSummaryWithOpenAI)(user_id, week_start, goalsWithAccomplishments);
        res.status(200).json({ summary });
    }
    catch (error) {
        console.error('Error generating summary:', error);
        res.status(500).json({ error: 'Failed to generate summary' });
    }
};
exports.generateWeeklySummary = generateWeeklySummary;
