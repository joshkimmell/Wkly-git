"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var cors_1 = require("cors");
var dotenv = require("dotenv");
var summariesRoutes_js_1 = require("./routes/summariesRoutes.js");
dotenv.config();
var app = (0, express_1.default)();
var port = process.env.PORT || 3001;
app.use((0, cors_1.default)());
app.use(express_1.default.json()); // Middleware to parse JSON request bodies
// Register summaries routes
app.use('/api/summaries', summariesRoutes_js_1.default);
// Error-handling middleware
var errorHandler = function (err, req, res, next) {
    console.error(err.stack);
    res.status(500).json({ error: 'An unexpected error occurred.' });
};
app.use(errorHandler);
// Start the server
app.listen(port, function () {
    console.log("\u2705 Backend server running on http://localhost:".concat(port));
});
