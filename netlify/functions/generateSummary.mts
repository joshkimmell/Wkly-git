import { Handler } from '@netlify/functions';
import { OpenAI } from 'openai';
import Bottleneck from 'bottleneck';

const limiter = new Bottleneck({
  maxConcurrent: 1,
  minTime: 1000,
});

const openAIConfig = {
  apiKey: process.env.OPENAI_API_KEY,
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

const openai = new OpenAI(openAIConfig);

const generateSummary = async (prompt: string) => {
  try {
    const response = await openai.chat.completions.create({
      model: openAIConfig.model,
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: prompt },
      ],
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
  try {
    const { user_id, week_start, goalsWithAccomplishments } = JSON.parse(event.body || '{}');

    if (!user_id || !week_start || !goalsWithAccomplishments) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields.' }),
      };
    }

    const weekStartDate = new Date(week_start);
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekStartDate.getDate() + 6);

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

    const prompt = `
      Summarize the following goals with their accomplishments into a concise self-reflection no more than 480 characters. Format for use with ReactQuill.
      Do not include the goals or accomplishments list in the summary. Instead, focus on the overall progress and impact of the goals and accomplishments.
      ${goalsWithAccomplishments
        .map(
          (goal: any, index: number) => `
        Goal ${index + 1}: ${goal.title}
        Description: ${goal.description}
        Category: ${goal.category}
        Accomplishments:
        ${goal.accomplishments
          .map(
            (accomplishment: any, subIndex: number) =>
              `  ${subIndex + 1}. ${accomplishment.title}: ${accomplishment.description} <br />Impact: ${accomplishment.impact}`
          )
          .join('\n')}
        `
        )
        .join('\n\n')}    

      'Weekly Reflection for ${weekStartDateFormatted} to ${weekEndDateFormatted}'  
    `;

    const summary = await limiter.schedule(() => generateSummary(prompt));

    return {
      statusCode: 200,
      body: JSON.stringify({ summary }),
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Failed to generate summary.' }),
    };
  }
};