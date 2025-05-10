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
exports.generateSummaryWithOpenAI = exports.getSummariesByPeriod = void 0;
var supabaseClient_js_1 = require("../lib/supabaseClient.js");
var openai_1 = require("openai");
var openai = new openai_1.OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});
// const openai = new OpenAI(openAIConfig);
var getSummariesByPeriod = function (period) { return __awaiter(void 0, void 0, void 0, function () {
    var now, startDate, _a, summaries, error;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                now = new Date();
                if (period === 'weekly') {
                    startDate = new Date(now.setDate(now.getDate() - 7));
                }
                else if (period === 'quarterly') {
                    startDate = new Date(now.setMonth(now.getMonth() - 3));
                }
                else if (period === 'yearly') {
                    startDate = new Date(now.setFullYear(now.getFullYear() - 1));
                }
                else {
                    throw new Error('Invalid period');
                }
                return [4 /*yield*/, supabaseClient_js_1.supabase
                        .from('goals_and_accomplishments')
                        .select('*')
                        .gte('created_at', startDate)];
            case 1:
                _a = _b.sent(), summaries = _a.data, error = _a.error;
                if (error) {
                    throw new Error("Error fetching summaries: ".concat(error.message));
                }
                return [2 /*return*/, summaries];
        }
    });
}); };
exports.getSummariesByPeriod = getSummariesByPeriod;
var generateSummaryWithOpenAI = function (goals, accomplishments) { return __awaiter(void 0, void 0, void 0, function () {
    var prompt, response, error_1;
    var _a, _b, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                prompt = "\n        Summarize the following weekly goals and accomplishments into a concise, friendly report. Use the following hierarchy format:\n\n        Goal 1:\n            - Accomplishment 1\n            - Accomplishment 2\n\n        Goal 2:\n            - Accomplishment 1\n            - Accomplishment 2\n\n        Goals and Accomplishments:\n        ".concat(goals.map(function (goal, index) {
                    var relatedAccomplishments = accomplishments
                        .filter(function (accomplishment) { return accomplishment.includes(goal); }) // Adjust this logic if needed
                        .map(function (accomplishment) { return "|_ ".concat(accomplishment); })
                        .join('\n');
                    return "".concat(index + 1, ". ").concat(goal, "\n").concat(relatedAccomplishments);
                }).join('\n\n'), "\n    ");
                _d.label = 1;
            case 1:
                _d.trys.push([1, 3, , 4]);
                return [4 /*yield*/, openai.chat.completions.create({
                        model: 'gpt-3.5-turbo',
                        messages: [
                            { role: 'system', content: 'You are a helpful assistant.' },
                            { role: 'user', content: prompt },
                        ],
                        max_tokens: 150,
                        temperature: 0.7,
                    })];
            case 2:
                response = _d.sent();
                return [2 /*return*/, ((_c = (_b = (_a = response.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) === null || _c === void 0 ? void 0 : _c.trim()) || 'No summary available.'];
            case 3:
                error_1 = _d.sent();
                console.error('Error generating summary with OpenAI:', error_1);
                throw new Error('Failed to generate summary.');
            case 4: return [2 /*return*/];
        }
    });
}); };
exports.generateSummaryWithOpenAI = generateSummaryWithOpenAI;
