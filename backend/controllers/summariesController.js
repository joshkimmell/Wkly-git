"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateWeeklySummary = exports.deleteSummary = exports.updateSummary = exports.createSummary = exports.getSummaries = exports.createGoal = exports.getGoals = void 0;
var supabaseClient_js_1 = require("../lib/supabaseClient.js");
// Fetch all goals for a specific user
var getGoals = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var user_id, _a, data, error, error_1;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                user_id = req.query.user_id;
                if (!user_id) {
                    return [2 /*return*/, res.status(400).json({ error: 'User ID is required.' })];
                }
                _b.label = 1;
            case 1:
                _b.trys.push([1, 3, , 4]);
                return [4 /*yield*/, supabaseClient_js_1.supabase
                        .from('goals') // Ensure this matches your table name
                        .select('*')
                        .eq('user_id', user_id)];
            case 2:
                _a = _b.sent(), data = _a.data, error = _a.error;
                if (error) {
                    console.error('Error fetching goals from Supabase:', error);
                    return [2 /*return*/, res.status(500).json({ error: 'Failed to fetch goals.' })];
                }
                // Return the fetched goals
                res.status(200).json(data);
                return [3 /*break*/, 4];
            case 3:
                error_1 = _b.sent();
                console.error('Unexpected error in /goals route:', error_1);
                res.status(500).json({ error: 'An unexpected error occurred.' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); };
exports.getGoals = getGoals;
// Create a goal for a specific user
var createGoal = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, title, description, category, week_start, user_id, _b, data, error, error_2;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _a = req.body, title = _a.title, description = _a.description, category = _a.category, week_start = _a.week_start, user_id = _a.user_id;
                if (!title || !description || !category || !week_start || !user_id) {
                    return [2 /*return*/, res.status(400).json({ error: 'All fields are required.' })];
                }
                _c.label = 1;
            case 1:
                _c.trys.push([1, 3, , 4]);
                return [4 /*yield*/, supabaseClient_js_1.supabase
                        .from('goals') // Ensure this matches your table name
                        .insert([{ title: title, description: description, category: category, week_start: week_start, user_id: user_id }])];
            case 2:
                _b = _c.sent(), data = _b.data, error = _b.error;
                if (error) {
                    console.error('Error inserting goal into Supabase:', error); // Log the error
                    return [2 /*return*/, res.status(500).json({ error: 'Failed to create goal.' })];
                }
                res.status(201).json(data);
                return [3 /*break*/, 4];
            case 3:
                error_2 = _c.sent();
                console.error('Unexpected error adding goal:', error_2); // Log unexpected errors
                res.status(500).json({ error: 'An unexpected error occurred.' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); };
exports.createGoal = createGoal;
// Fetch all summaries for a specific user
var getSummaries = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var user_id, _a, data, error, error_3;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                user_id = req.query.user_id;
                if (!user_id) {
                    return [2 /*return*/, res.status(400).json({ error: 'User ID is required.' })];
                }
                _b.label = 1;
            case 1:
                _b.trys.push([1, 3, , 4]);
                return [4 /*yield*/, supabaseClient_js_1.supabase
                        .from('summaries')
                        .select('*')
                        .eq('user_id', user_id)];
            case 2:
                _a = _b.sent(), data = _a.data, error = _a.error;
                if (error)
                    throw error;
                res.status(200).json(data);
                return [3 /*break*/, 4];
            case 3:
                error_3 = _b.sent();
                console.error('Error fetching summaries:', error_3);
                res.status(500).json({ error: 'Failed to fetch summaries.' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); };
exports.getSummaries = getSummaries;
// Create a new summary
var createSummary = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, user_id, summary_text, goal_id, accomplishment_id, _b, data, error, error_4;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _a = req.body, user_id = _a.user_id, summary_text = _a.summary_text, goal_id = _a.goal_id, accomplishment_id = _a.accomplishment_id;
                if (!user_id || !summary_text) {
                    return [2 /*return*/, res.status(400).json({ error: 'User ID and summary_text are required.' })];
                }
                _c.label = 1;
            case 1:
                _c.trys.push([1, 3, , 4]);
                return [4 /*yield*/, supabaseClient_js_1.supabase
                        .from('summaries')
                        .insert([
                        {
                            user_id: user_id,
                            summary_text: summary_text,
                            goal_id: goal_id || null, // Optional goal reference
                            accomplishment_id: accomplishment_id || null, // Optional accomplishment reference
                        },
                    ])];
            case 2:
                _b = _c.sent(), data = _b.data, error = _b.error;
                if (error)
                    throw error;
                res.status(201).json(data);
                return [3 /*break*/, 4];
            case 3:
                error_4 = _c.sent();
                console.error('Error creating summary:', error_4);
                res.status(500).json({ error: 'Failed to create summary.' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); };
exports.createSummary = createSummary;
// Update an existing summary
var updateSummary = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var summary_id, summary_text, _a, data, error, error_5;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                summary_id = req.params.summary_id;
                summary_text = req.body.summary_text;
                if (!summary_id || !summary_text) {
                    return [2 /*return*/, res.status(400).json({ error: 'Summary ID and summary_text are required.' })];
                }
                _b.label = 1;
            case 1:
                _b.trys.push([1, 3, , 4]);
                return [4 /*yield*/, supabaseClient_js_1.supabase
                        .from('summaries')
                        .update({ summary_text: summary_text })
                        .eq('summary_id', summary_id)];
            case 2:
                _a = _b.sent(), data = _a.data, error = _a.error;
                if (error)
                    throw error;
                res.status(200).json(data);
                return [3 /*break*/, 4];
            case 3:
                error_5 = _b.sent();
                console.error('Error updating summary:', error_5);
                res.status(500).json({ error: 'Failed to update summary.' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); };
exports.updateSummary = updateSummary;
// Delete a summary
var deleteSummary = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var summary_id, _a, data, error, error_6;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                summary_id = req.params.summary_id;
                if (!summary_id) {
                    return [2 /*return*/, res.status(400).json({ error: 'Summary ID is required.' })];
                }
                _b.label = 1;
            case 1:
                _b.trys.push([1, 3, , 4]);
                return [4 /*yield*/, supabaseClient_js_1.supabase
                        .from('summaries')
                        .delete()
                        .eq('summary_id', summary_id)];
            case 2:
                _a = _b.sent(), data = _a.data, error = _a.error;
                if (error)
                    throw error;
                res.status(200).json(data);
                return [3 /*break*/, 4];
            case 3:
                error_6 = _b.sent();
                console.error('Error deleting summary:', error_6);
                res.status(500).json({ error: 'Failed to delete summary.' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); };
exports.deleteSummary = deleteSummary;
// Generate a weekly summary based on goals and accomplishments
var generateWeeklySummary = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, goals, accomplishments, summary;
    return __generator(this, function (_b) {
        _a = req.body, goals = _a.goals, accomplishments = _a.accomplishments;
        if (!goals || !accomplishments) {
            return [2 /*return*/, res.status(400).json({ error: 'Goals and accomplishments are required.' })];
        }
        try {
            summary = "\n      Weekly Summary:\n      Goals: ".concat(goals.join(', '), "\n      Accomplishments: ").concat(accomplishments.join(', '), "\n    ");
            res.status(200).json({ summary: summary });
        }
        catch (error) {
            console.error('Error generating summary:', error);
            res.status(500).json({ error: 'Failed to generate summary.' });
        }
        return [2 /*return*/];
    });
}); };
exports.generateWeeklySummary = generateWeeklySummary;
