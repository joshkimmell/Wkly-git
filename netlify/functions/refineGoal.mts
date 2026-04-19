import { Handler } from '@netlify/functions';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import { requireAuth, withCors, getUserTier, checkDailyUsageLimit, incrementDailyUsage, tierLimitResponse } from './lib/auth';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const handler = withCors(async (event) => {
  const auth = await requireAuth(event);
  if (auth.error) return auth.error;
  const { userId } = auth;

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  // ── Tier check: free users limited to 3 goal refinements per day ──
  const { limits } = await getUserTier(userId);
  if (limits.goal_refinements_per_day !== null) {
    const withinLimit = await checkDailyUsageLimit(userId, 'goal_refinement', limits.goal_refinements_per_day);
    if (!withinLimit) {
      return tierLimitResponse(
        `Free plan allows ${limits.goal_refinements_per_day} goal refinements per day. Upgrade for unlimited.`
      );
    }
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { draft_goal } = body;

    if (!draft_goal) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'draft_goal is required.' }),
      };
    }

    if (!process.env.OPENAI_API_KEY) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Server misconfiguration: missing OpenAI API key.' }),
      };
    }

    const prompt = `You are an assistant helping a user define a clear, achievable goal. 

The user has provided this draft goal:
"${draft_goal}"

Your task:
1. Analyze the goal for clarity, specificity, and achievability
2. Suggest a refined version that is:
   - Concise (one clear sentence)
   - Specific and measurable
   - Achievable and realistic
   - Time-bound if appropriate

Respond with a JSON object containing:
{
  "refined_title": "A concise title for the goal (max 100 characters)",
  "refined_description": "A clear description of what success looks like (2-3 sentences)",
  "feedback": "Brief explanation of what was improved and why (1-2 sentences)"
}

Ensure the response is valid JSON only.`;

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      messages: [
        { 
          role: 'system', 
          content: 'You are a goal-setting expert who helps people create clear, achievable goals. Always respond with valid JSON only.' 
        },
        { role: 'user', content: prompt },
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    const generatedText = response?.choices?.[0]?.message?.content;

    if (!generatedText) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'No response from OpenAI.' }),
      };
    }

    // Clean and parse the response
    const cleanText = generatedText.replace(/^```json\n|```$/g, '').trim();
    
    try {
      const result = JSON.parse(cleanText);
      
      // Validate the response structure
      if (!result.refined_title || !result.refined_description) {
        throw new Error('Invalid response structure');
      }

      await incrementDailyUsage(userId, 'goal_refinement');

      return {
        statusCode: 200,
        body: JSON.stringify(result),
      };
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', cleanText);
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          error: 'Failed to parse AI response.', 
          raw: cleanText 
        }),
      };
    }
  } catch (error) {
    console.error('Error in refineGoal function:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to refine goal.' }),
    };
  }
});
