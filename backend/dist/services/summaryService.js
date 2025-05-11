"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSummaryWithOpenAI = void 0;
const openai_1 = require("openai");
const bottleneck_1 = __importDefault(require("bottleneck"));
// const openai = new OpenAI(openAIConfig);
// export const getSummariesByWeek = async (period: string) => {
//     const now = new Date();
//     let startDate: Date;
//     if (period === 'weekly') {
//         startDate = new Date(now.setDate(now.getDate() - 7));
//     } else if (period === 'quarterly') {
//         startDate = new Date(now.setMonth(now.getMonth() - 3));
//     } else if (period === 'yearly') {
//         startDate = new Date(now.setFullYear(now.getFullYear() - 1));
//     } else {
//         throw new Error('Invalid period');
//     }
//     const { data: summaries, error } = await supabase
//         .from('goals_and_accomplishments')
//         .select('*')
//         .gte('created_at', startDate);
//     if (error) {
//         throw new Error(`Error fetching summaries: ${error.message}`);
//     }
//     return summaries;
// };
const limiter = new bottleneck_1.default({
    maxConcurrent: 1, // Limit to 1 request at a time
    minTime: 1000, // Minimum 1 second between requests
});
const openAIConfig = {
    apiKey: process.env.OPENAI_API_KEY,
    dangerouslyAllowBrowser: true,
    model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
    temperature: 0.7,
    maxTokens: 150,
    frequencyPenalty: 0,
    presencePenalty: 0,
    topP: 1,
    n: 1,
    stream: false,
    stop: null,
};
const openai = new openai_1.OpenAI(openAIConfig);
const generateSummary = async (prompt) => {
    try {
        const response = await openai.chat.completions.create({
            model: openAIConfig.model,
            messages: [
                { role: 'system', content: prompt },
                { role: 'user', content: prompt },
            ],
            store: true,
            max_tokens: openAIConfig.maxTokens,
            temperature: openAIConfig.temperature,
            frequency_penalty: openAIConfig.frequencyPenalty,
            presence_penalty: openAIConfig.presencePenalty,
            top_p: openAIConfig.topP,
            n: openAIConfig.n,
            stream: openAIConfig.stream,
            stop: openAIConfig.stop,
        });
        if ('choices' in response) {
            console.log(response.choices[0]);
            return response.choices[0]?.message?.content?.trim() || 'No summary available.';
        }
        else {
            console.log('Response is a stream and does not contain choices.');
            throw new Error('Response is a stream and does not contain choices.');
        }
    }
    catch (error) {
        console.error('Error generating summary with OpenAI:', error);
        throw new Error('Failed to generate summary.');
    }
};
const generateSummaryWithOpenAI = async (userId, weekStart, goalsWithAccomplishments) => {
    const weekStartDate = new Date(weekStart);
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekStartDate.getDate() + 6); // Set to the end of the week
    const weekStartDateFormatted = weekStartDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });
    const weekEndDateFormatted = weekEndDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });
    // Format the prompt with goals and their child accomplishments
    const prompt = `
    Summarize the following weekly goals and accomplishments into a concise, friendly report. Use the following hierarchy format:

    ${goalsWithAccomplishments
        .map((goal, index) => `
        Goal ${index + 1}: ${goal.title}
        Description: ${goal.description}
        Category: ${goal.category}
        Accomplishments:
        ${goal.accomplishments
        .map((accomplishment, subIndex) => `  ${subIndex + 1}. ${accomplishment.title}: ${accomplishment.description} <br />Impact: ${accomplishment.impact}`)
        .join('\n')}
      `)
        .join('\n')}

    Summary for the week of ${weekStartDateFormatted} to ${weekEndDateFormatted}:
  `;
    try {
        const response = await limiter.schedule(() => generateSummary(prompt));
        console.log(response);
        return response;
    }
    catch (error) {
        console.error('Error generating summary:', error);
        throw new Error('Failed to generate summary.');
    }
};
exports.generateSummaryWithOpenAI = generateSummaryWithOpenAI;
// export const generateSummaryWithOpenAI = async (
//     apiKey: string,
//     goals: string[], 
//     accomplishments: string[]
// ) => {
//     const openai = new OpenAI({
//         apiKey: process.env.OPENAI_API_KEY,
//         dangerouslyAllowBrowser: true,
//     });
//     const model = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
//     const prompt = `
//         Summarize the following weekly goals and accomplishments into a concise, friendly report. Use the following hierarchy format:
//         Goal 1:
//             - Accomplishment 1
//             - Accomplishment 2
//         Goal 2:
//             - Accomplishment 1
//             - Accomplishment 2
//         Goals and Accomplishments:
//         ${goals.map((goal, index) => {
//             const relatedAccomplishments = accomplishments
//                 .filter(accomplishment => accomplishment.includes(goal)) // Adjust this logic if needed
//                 .map(accomplishment => `|_ ${accomplishment}`)
//                 .join('\n');
//             return `${index + 1}. ${goal}\n${relatedAccomplishments}`;
//         }).join('\n\n')}
//     `;
//     try {
//         const response = await openai.chat.completions.create({
//             model: model,
//             messages: [
//                 { role: 'system', content: prompt },
//                 { role: 'user', content: prompt },
//             ],
//             store: true,
//             max_tokens: 150,
//             temperature: 0.7,
//         });
//         console.log(response.choices[0]);
//         return response.choices[0]?.message?.content?.trim() || 'No summary available.';
//     } catch (error) {
//         console.error('Error generating summary with OpenAI:', error);
//         throw new Error('Failed to generate summary.');
//     }
// };
