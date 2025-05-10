"use strict";
// # Assisted by watsonx Code Assistant 
// # watsonx Code Assistant did not check whether this code suggestion might be similar to third party code.
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWeeklySummary = void 0;
const openai_1 = __importDefault(require("openai"));
const openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY, // Ensure this is loaded
});
const model = process.env.OPENAI_MODEL || 'o4-mini';
const getWeeklySummary = async (req, res) => {
    const { goals, accomplishments } = req.body;
    if (!goals || !accomplishments) {
        res.status(400).json({ error: 'Goals and accomplishments are required.' });
        return;
    }
    try {
        const prompt = `
      Summarize the following weekly goals and accomplishments into a concise, friendly report:
      
      Goals:
      ${goals.join('\n')}

      Accomplishments:  
      ${accomplishments.join('\n')}
    `;
        const response = await openai.chat.completions.create({
            model: model || 'o4-mini',
            // prompt: prompt,
            messages: [{ role: 'user', content: prompt }],
            stream: false,
            max_tokens: 150,
            temperature: 0.7,
        });
        const summary = response.choices?.[0]?.message?.content?.trim() || 'No summary available.';
        res.json({ summary });
    }
    catch (error) {
        console.error('Error generating summary:', error.response?.data || error.message);
        res.status(500).json({
            error: 'Failed to generate summary.',
            details: error.response?.data || error.message,
        });
    }
};
exports.getWeeklySummary = getWeeklySummary;
