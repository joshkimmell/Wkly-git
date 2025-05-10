// # Assisted by watsonx Code Assistant 
// # watsonx Code Assistant did not check whether this code suggestion might be similar to third party code.

import { Request, Response } from 'express';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Ensure this is loaded
});
const model = process.env.OPENAI_MODEL || 'o4-mini';

export const getWeeklySummary = async (
  req: Request<{}, {}, { goals: string[]; accomplishments: string[] }>,
  res: Response
): Promise<void> => {
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
  } catch (error: any) {
    console.error('Error generating summary:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Failed to generate summary.',
      details: error.response?.data || error.message,
    });
  }
};
