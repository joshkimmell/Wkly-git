import { Handler } from '@netlify/functions';
import OpenAI from 'openai';
import supabase from './lib/supabase';
import { requireAuth } from './lib/auth';

const CATEGORIES = [
  'Productivity', 'Self-Awareness', 'Relationships', 'Achievement',
  'Wellness', 'Identity', 'Mindfulness', 'Growth',
  'Self-Discovery', 'Wealth', 'Daily Ritual', 'Philosophy',
  'Satire', 'Time Management', 'Optimism', 'Corporate Ennui',
  'Manifestation', 'Self-Care', 'Efficiency',
];

const SYSTEM_PROMPT = `You are "The Vibe Guru", a witty, warm writer who crafts funny daily affirmations that genuinely uplift people.
Your affirmations are clever and laugh-out-loud funny — like a fortune cookie written by a comedian who actually likes people.
They poke gentle fun at productivity culture, modern life, and self-help clichés, but ALWAYS leave the reader feeling capable, valued, and optimistic.

Rules:
- Write exactly ONE affirmation (1-3 sentences, max 200 characters ideal, 300 max).
- It must be funny AND genuinely positive — humor is the delivery, encouragement is the message.
- It should feel quotable — something you'd screenshot and send to a friend to cheer them up.
- NEVER lean into existential dread, nihilism, hopelessness, or the idea that effort is pointless.
- Avoid slurs, explicit content, or punching down.
- Do NOT wrap in quotation marks — just the raw text.
- Respond with ONLY valid JSON: {"text": "...", "category": "..."}
- The category MUST be one of the provided list.`;

async function generateAffirmation(recentTexts: string[]): Promise<{ text: string; category: string }> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];

  const avoidClause = recentTexts.length
    ? `\n\nAvoid these themes/phrases already used recently:\n${recentTexts.slice(0, 5).map(t => `- "${t.slice(0, 80)}"`).join('\n')}`
    : '';

  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Generate a humorous daily affirmation in the category "${category}".${avoidClause}\n\nRespond with ONLY JSON: {"text": "...", "category": "..."}`,
      },
    ],
    max_tokens: 300,
    temperature: 0.9,
  });

  const raw = response.choices?.[0]?.message?.content?.trim() || '';
  // Strip markdown code fences if present
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

  try {
    const parsed = JSON.parse(cleaned);
    if (!parsed.text || typeof parsed.text !== 'string') throw new Error('Missing text');
    return {
      text: parsed.text.slice(0, 500),
      category: CATEGORIES.includes(parsed.category) ? parsed.category : category,
    };
  } catch {
    // If JSON parsing fails, use the raw text as the affirmation
    if (raw.length > 10 && raw.length < 500) {
      return { text: raw.replace(/^["']|["']$/g, ''), category };
    }
    throw new Error('Failed to parse GPT response');
  }
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'GET') return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };

  const auth = await requireAuth(event);
  if (auth.error) return auth.error;

  try {
    // Use the client's local date if provided, otherwise fall back to UTC
    const dateParam = event.queryStringParameters?.date;
    const today = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : new Date().toISOString().split('T')[0];

    // 1. Check if today already has a featured affirmation
    const { data: existing } = await supabase
      .from('affirmations')
      .select('*')
      .eq('featured_date', today)
      .eq('status', 'approved')
      .limit(1)
      .single();

    if (existing) {
      // Enrich author from submitter profile when missing and not anonymous
      if (!existing.author && !existing.is_anonymous && existing.submitted_by) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username, email')
          .eq('id', existing.submitted_by)
          .maybeSingle();
        if (profile) {
          existing.author = profile.username || profile.email || null;
        }
      }
      return { statusCode: 200, body: JSON.stringify(existing) };
    }

    // 2. No featured affirmation for today — generate one via GPT
    // Grab recent affirmations to avoid repetition
    const { data: recent } = await supabase
      .from('affirmations')
      .select('text')
      .eq('status', 'approved')
      .order('featured_date', { ascending: false, nullsFirst: false })
      .limit(10);

    const recentTexts = (recent || []).map((r: { text: string }) => r.text);
    const generated = await generateAffirmation(recentTexts);

    // 3. Persist the new affirmation so it's stable for the rest of the day
    const { data: inserted, error: insertError } = await supabase
      .from('affirmations')
      .insert({
        text: generated.text,
        category: generated.category,
        author: 'The Vibe Guru',
        status: 'approved',
        is_featured: true,
        featured_date: today,
      })
      .select()
      .single();

    if (insertError || !inserted) {
      console.error('Failed to persist generated affirmation:', insertError);
      // Return the generated content anyway so the user isn't blocked
      return {
        statusCode: 200,
        body: JSON.stringify({
          id: 'generated',
          text: generated.text,
          category: generated.category,
          author: 'The Vibe Guru',
          status: 'approved',
          is_featured: true,
          featured_date: today,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
      };
    }

    return { statusCode: 200, body: JSON.stringify(inserted) };
  } catch (err: any) {
    console.error('Unexpected error getDailyAffirmation:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message || 'Unexpected error' }) };
  }
};
