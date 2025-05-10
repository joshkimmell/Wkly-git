"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv = __importStar(require("dotenv"));
const summariesRoutes_js_1 = __importDefault(require("./routes/summariesRoutes.js"));
dotenv.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 3001;
const backend = process.env.BACKEND_URL || 'http://localhost:3001';
const backendUrl = backend + '/api/summaries';
app.use(express_1.default.json()); // Middleware to parse JSON request bodies
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
app.use((0, cors_1.default)(corsOptions));
// app.use(cors());
// Register summaries routes
app.use('/api/summaries', summariesRoutes_js_1.default);
// app.use(`${backendUrl}`, summariesRoutes);
// Error-handling middleware
const errorHandler = (err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'An unexpected error occurred.' });
};
app.use(errorHandler);
// Start the server
app.listen(port, () => {
    console.log(`✅ Backend server running on http://localhost:${port}`);
});
