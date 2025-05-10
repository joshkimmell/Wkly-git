import express, { ErrorRequestHandler} from 'express';
import cors from 'cors'
import * as dotenv from 'dotenv';
import summariesRoutes from './routes/summariesRoutes.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;
const backend = process.env.BACKEND_URL || 'http://localhost:3001';
const backendUrl = backend + '/api/summaries';

app.use(express.json()); // Middleware to parse JSON request bodies
// app.use(express.urlencoded({ extended: true })); // Middleware to parse URL-encoded request bodies
// Middleware to enable CORS
// This allows your frontend to make requests to the backend
// without being blocked by the browser's same-origin policy.
// You can customize the CORS options as needed.
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173', // Replace with your frontend URL
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true, // Allow credentials (cookies, authorization headers, etc.)
  optionsSuccessStatus: 200 // For legacy browser support
};
// Enable CORS with the specified options
app.use(cors(corsOptions));
// app.use(cors());

// Register summaries routes
app.use('/api/summaries', summariesRoutes);
// app.use(`${backendUrl}`, summariesRoutes);

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