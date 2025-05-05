import express from 'express';
import { getWeeklySummary } from './weeklySummaryController.js';
const router = express.Router();
router.post('/', getWeeklySummary);
export default router;
