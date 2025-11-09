import { Handler } from '@netlify/functions';
import { OpenAI } from 'openai';
import dotenv from 'dotenv';

// Load local .env for netlify dev
dotenv.config();

// Log environment diagnostics (masked key only) to help local debugging — do not log full secrets
try {
  const nodeEnv = process.env.NODE_ENV || 'undefined';
  const cwd = process.cwd();
  const rawKey = process.env.OPENAI_API_KEY || '';
  const masked = rawKey ? `${rawKey.slice(0,4)}...${rawKey.slice(-4)}` : '(not set)';
  console.debug('[generateSummary] env diagnostics:', { nodeEnv, cwd, openaiKeyPresent: !!rawKey, openaiKeyMasked: rawKey ? masked : '(not set)' });
} catch (e) {
  console.debug('[generateSummary] env diagnostics failed to read env');
}
import Bottleneck from 'bottleneck';

const limiter = new Bottleneck({
  maxConcurrent: 1,
  minTime: 1000,
});

const openAIConfig = {
  model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
  // Some models only accept the default temperature (1). Use 1 to avoid unsupported value errors.
  temperature: 1,
  maxTokens: 1500,
  frequencyPenalty: 0,
  presencePenalty: 0,
  topP: 1,
  n: 1,
  stream: false,
  stop: null,
};

// Initialize OpenAI client only with the API key to avoid passing unrelated fields
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const generateSummary = async (prompt: string) => {
  try {
    // Ensure API key is present
    if (!process.env.OPENAI_API_KEY) {
      console.error('[generateSummary] OPENAI_API_KEY is missing');
      throw new Error('Server misconfiguration: missing OpenAI API key.');
    }

    let response: any;
    try {
        // Log request parameters (non-secret) to aid in debugging intermittent failures
        try {
          console.debug('[generateSummary] OpenAI request params:', {
            model: openAIConfig.model,
            temperature: openAIConfig.temperature,
            max_completion_tokens: openAIConfig.maxTokens,
            top_p: openAIConfig.topP,
            n: openAIConfig.n,
          });
        } catch (e) { /* ignore */ }

        response = await openai.chat.completions.create({
          model: openAIConfig.model,
          messages: [
            { role: 'system', content: prompt },
            { role: 'user', content: prompt },
          ],
          // Use `max_completion_tokens` for models that do not accept `max_tokens`.
          max_completion_tokens: openAIConfig.maxTokens,
          temperature: openAIConfig.temperature,
          frequency_penalty: openAIConfig.frequencyPenalty,
          presence_penalty: openAIConfig.presencePenalty,
          top_p: openAIConfig.topP,
          n: openAIConfig.n,
          stream: openAIConfig.stream,
          stop: openAIConfig.stop,
        });
    } catch (openaiErr) {
      console.error('OpenAI API error (server-side):', openaiErr);
      // Do not expose OpenAI error details to the client (may contain sensitive info)
      throw new Error('OpenAI API error. Check server logs for details.');
    }

    if ('choices' in response) {
      return response.choices[0]?.message?.content?.trim() || 'No summary available.';
    } else {
      throw new Error('Response is a stream and does not contain choices.');
    }
  } catch (error) {
    console.error('Error generating summary with OpenAI:', error);
    throw new Error('Failed to generate summary.');
  }
};

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    const parsedBody = JSON.parse(event.body || '{}');
    const { summary_id, user_id, week_start, goalsWithAccomplishments, summaryTitle, scope } = parsedBody;

    // Defensive server-side logging to help debug mismatches between client and server.
    try {
      console.debug('[generateSummary] incoming payload preview:', {
        summary_id,
        user_id_present: !!user_id,
        week_start,
        summaryTitle_preview: typeof summaryTitle === 'string' ? summaryTitle.slice(0, 200) : null,
        goals_count: Array.isArray(goalsWithAccomplishments) ? goalsWithAccomplishments.length : 0,
        scope,
      });
    } catch (e) {
      // ignore logging errors
    }
    
    // Validate required fields
    if (!summary_id || !user_id || !week_start || !goalsWithAccomplishments || !summaryTitle || !scope) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: 'Missing required fields.',
          missingFields: {
            summary_id: !summary_id,
            scope: !scope,
            summaryTitle: !summaryTitle,
            user_id: !user_id,
            week_start: !week_start,
            goalsWithAccomplishments: !goalsWithAccomplishments,
          }, 
        }),
      };
    }
    
    
    // Parse week_start into a Date object
    const startDate = new Date(week_start);

    if (isNaN(startDate.getTime())) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid date.' }),
      };
    }

    // Format the date
    // Format the date based on the scope
    const formattedDate =
      scope === 'week'
        ? startDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) // e.g., June 5, 2025
        : scope === 'month'
        ? startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) // e.g., June 2025
        : scope === 'year'
        ? `${startDate.getFullYear()}` // e.g., 2025
        : ''; // Fallback for unexpected scope values

    // Build the prompt using summaryTitle
    const prompt = `
      Summarize the following goals with their accomplishments into a concise self-reflection defaulting to no more than 480 characters. Format for use with ReactQuill.
      Do not include the goals or accomplishments list in the summary. Instead, focus on the overall progress and impact of the goals and accomplishments. 
      Title: ${summaryTitle}
      ${goalsWithAccomplishments
        .map((goal: any, index: number) => {
          const accomplishmentsText = goal.accomplishments
            .map((accomplishment: any, subIndex: number) =>
              `  ${subIndex + 1}. ${accomplishment.title}: ${accomplishment.description} <br />Impact: ${accomplishment.impact}`
            )
            .join('\n');

          const statusLine = goal.status ? `Status: ${goal.status}${goal.status_set_at ? ` (set on ${new Date(goal.status_set_at).toLocaleString()})` : ''}` : 'Status: Not provided';
          const notesLine = goal.status_notes ? `Status notes: ${goal.status_notes}` : '';

          return `
          Goal ${index + 1}: ${goal.title}
          Description: ${goal.description}
          Category: ${goal.category}
          ${statusLine}
          ${notesLine}
          Accomplishments:
          ${accomplishmentsText}
          `;
        })
        .join('\n\n')}    

      Reflection for ${scope}: ${formattedDate}:
    `;


    const summary = await limiter.schedule(() => generateSummary(prompt));

    return {
      statusCode: 200,
      body: JSON.stringify({ summary, summary_id }),
    };
  } catch (error: any) {
    console.error('Error in generateSummary function:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to generate summary.' }),
    };
  }
};