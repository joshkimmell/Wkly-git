import express from 'express';
import {
  getSummaries,
  createSummary,
  updateSummary,
  deleteSummary,
  getGoals,
  createGoal,
  deleteGoal,
  // generateSummary,
  generateWeeklySummary,
} from '../controllers/summariesController.js';
import { Request, Response } from 'express-serve-static-core';
import { ParsedQs } from 'qs';
import supabase from '../lib/supabaseClient.js';

const router = express.Router();

// Route to fetch goals
router.get('/goals', async (req, res, next) => {
  console.log('Request Query:', req.query); // Log the request query
  
  try {
    await getGoals(req, res);
  } catch (error) {
    next(error);
  }
});

// Route to create a new goal
router.post('/goals', async (req, res, next) => {
  try {
    await createGoal(req, res);
  } catch (error) {
    next(error);
  }
});

// Route to delete a goal by ID
router.delete('/goals/:goal_id', async (req, res, next) => {
  try {
    await deleteGoal(req, res);
  } catch (error) {
    next(error);
  }
});

// Route to fetch all summaries
router.get('/', async (req, res, next) => {
  try {
    await getSummaries(req, res);
  } catch (error) {
    next(error); // Pass errors to the error-handling middleware
  }
});

// Route to create a new summary
router.post('/', async (req, res, next) => {
  try {
    await createSummary(req, res);
  } catch (error) {
    next(error);
  }
});

// Route to update a summary by ID
router.put('/:summary_id', async (req, res, next) => {
  try {
    await updateSummary(req, res);
  } catch (error) {
    next(error);
  }
});

// Route to delete a summary by ID
router.delete('/:summary_id', async (req, res, next) => {
  try {
    await deleteSummary(req, res);
  } catch (error) {
    next(error);
  }
});

// Route to generate a weekly summary
router.post('/generate', async (req, res, next) => {
  try {
    await generateWeeklySummary(req, res);
  } catch (error) {
    next(error);
  }
});

export default router;

// async function deleteGoal(
//   req: Request<{ goal_id: string }, any, any, ParsedQs, Record<string, any>>,
//   res: Response<any, Record<string, any>, number>
// ) {
//   const { goal_id } = req.params;

//   try {
//     const { data, error } = await supabase
//       .from('goals')
//       .delete()
//       .eq('id', goal_id) as { data: { id: string }[] | null, error: any };

//     if (error) {
//       console.error('Error deleting goal:', error);
//       return res.status(500).json({ error: 'Failed to delete goal' });
//     }

//     if (!data || data.length === 0) {
//       return res.status(404).json({ error: 'Goal not found' });
//     }

//     res.status(200).json({ message: 'Goal deleted successfully', data });
//   } catch (err) {
//     console.error('Unexpected error:', err);
//     res.status(500).json({ error: 'An unexpected error occurred' });
//   }
// }
