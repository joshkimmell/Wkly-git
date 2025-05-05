import express, { Express, Request, Response, ErrorRequestHandler} from 'express';
import cors, { CorsOptions } from 'cors'
import * as dotenv from 'dotenv';
import summariesRoutes from './routes/summariesRoutes.js';


dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json()); // Middleware to parse JSON request bodies

// Register summaries routes
app.use('/api/summaries', summariesRoutes);

// Error-handling middleware
const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'An unexpected error occurred.' });
};

app.use(errorHandler);

// Start the server
app.listen(port, () => {
  console.log(`✅ Backend server running on http://localhost:${port}`);
});