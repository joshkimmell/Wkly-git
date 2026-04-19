import { Handler } from '@netlify/functions';
import OpenAI from 'openai';
import { requireAuth, withCors, getUserTier, tierLimitResponse } from './lib/auth';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface SuggestedTask {
  title: string;
  description: string;
}

interface SuggestedLink {
  label: string;
  url: string;
  reason: string;
}

export const handler = withCors(async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  const auth = await requireAuth(event);
  if (auth.error) return auth.error;
  const { userId } = auth;

  // ── Tier check: free users cannot use AI focus chat ──
  const { tier, limits } = await getUserTier(userId);
  if (tier === 'free') {
    return tierLimitResponse('AI Focus Chat is a paid feature. Upgrade to access it.');
  }

  if (!process.env.OPENAI_API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Missing OpenAI API key' }) };
  }

  let body: any;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body' }) };
  }

  const {
    taskTitle,
    taskDescription,
    goalTitle,
    messages = [],
  }: {
    taskTitle: string;
    taskDescription?: string;
    goalTitle?: string;
    messages: ChatMessage[];
  } = body;

  if (!taskTitle) {
    return { statusCode: 400, body: JSON.stringify({ error: 'taskTitle is required' }) };
  }

  const systemPrompt = `You are a focused, practical work assistant helping a user complete a specific task.

Task: "${taskTitle}"${taskDescription ? `\nTask description: "${taskDescription}"` : ''}${goalTitle ? `\nPart of goal: "${goalTitle}"` : ''}

Your role:
- Help the user think through, plan, and execute this specific task
- Answer questions about approaches, tools, or techniques relevant to this task
- Suggest concrete next steps when the user is stuck
- Recommend helpful external resources (tutorials, docs, tools) with real URLs when relevant
- Identify related sub-tasks the user might want to capture
- Be concise and action-oriented — the user is in focus mode, not research mode

When you have suggestions for additional tasks the user should capture, include them in a JSON block at the END of your response, like this:
<SUGGESTIONS>
{
  "tasks": [{"title": "Task title", "description": "Brief description"}],
  "links": [{"label": "Resource name", "url": "https://...", "reason": "Why this is helpful"}]
}
</SUGGESTIONS>

Only include the SUGGESTIONS block when you have genuinely relevant suggestions. Keep the block after your conversational response.`;

  const openaiMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ];

  try {
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      messages: openaiMessages,
      max_tokens: 1000,
      temperature: 0.7,
    });

    const fullContent = response.choices[0]?.message?.content || '';

    // Parse out the SUGGESTIONS block if present
    const suggestionsMatch = fullContent.match(/<SUGGESTIONS>([\s\S]*?)<\/SUGGESTIONS>/);
    const conversationalText = fullContent.replace(/<SUGGESTIONS>[\s\S]*?<\/SUGGESTIONS>/, '').trim();

    let suggestedTasks: SuggestedTask[] = [];
    let suggestedLinks: SuggestedLink[] = [];

    if (suggestionsMatch) {
      try {
        const parsed = JSON.parse(suggestionsMatch[1].trim());
        suggestedTasks = Array.isArray(parsed.tasks) ? parsed.tasks : [];
        suggestedLinks = Array.isArray(parsed.links) ? parsed.links : [];
      } catch {
        // ignore parse failures — suggestions are optional
      }
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: conversationalText,
        suggestedTasks,
        suggestedLinks,
      }),
    };
  } catch (err: any) {
    console.error('[focusChat] OpenAI error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'AI request failed' }) };
  }
});
