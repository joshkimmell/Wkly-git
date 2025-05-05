import express from 'express';
import { getSummaries, createSummary, updateSummary, deleteSummary, getGoals, createGoal, generateWeeklySummary, } from '../controllers/summariesController.js';
// Initialize Supabase client
// const supabase = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');
const router = express.Router();
// Route to fetch goals
router.get('/goals', async (req, res, next) => {
    console.log('Request Query:', req.query); // Log the request query
    try {
        await getGoals(req, res);
    }
    catch (error) {
        next(error);
    }
});
// Route to create a new goal
router.post('/goals', async (req, res, next) => {
    try {
        await createGoal(req, res);
    }
    catch (error) {
        next(error);
    }
});
// Route to fetch all summaries
router.get('/', async (req, res, next) => {
    try {
        await getSummaries(req, res);
    }
    catch (error) {
        next(error); // Pass errors to the error-handling middleware
    }
});
// Route to create a new summary
router.post('/', async (req, res, next) => {
    try {
        await createSummary(req, res);
    }
    catch (error) {
        next(error);
    }
});
// Route to update a summary by ID
router.put('/:summary_id', async (req, res, next) => {
    try {
        await updateSummary(req, res);
    }
    catch (error) {
        next(error);
    }
});
// Route to delete a summary by ID
router.delete('/:summary_id', async (req, res, next) => {
    try {
        await deleteSummary(req, res);
    }
    catch (error) {
        next(error);
    }
});
// Route to generate a weekly summary
router.post('/generate', async (req, res, next) => {
    try {
        await generateWeeklySummary(req, res);
    }
    catch (error) {
        next(error);
    }
});
export default router;
