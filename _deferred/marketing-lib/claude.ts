import type { ResearchResult } from './types';

export type LeadEnrichment = {
  name: string;
  contactName?: string;
  category?: string;
  website?: string;
  email?: string;
  phone?: string;
  instagram?: string;
  facebook?: string;
  linkedin?: string;
  address?: string;
  city?: string;
  country?: string;
  score?: number;
  summary?: string;
  signals?: string[];
};

export async function enrichWithClaude(results: ResearchResult[], description: string): Promise<LeadEnrichment[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return results.map(normalizeWithoutClaude);
  if (!results.length) return [];

  const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514';
  const payload = results.slice(0, 100).map((r, i) => ({ index: i, ...r }));
  const prompt = `You are New Era's B2B marketing intelligence structuring layer.\n\nUser research brief: ${description}\n\nNormalize the supplied PUBLIC business information only. Do not invent contact details, social accounts, scores, or facts. Preserve null when unknown. Return JSON only as an array with one object per input item, using the same index. Score 0-100 should represent fit for the stated brief based only on available evidence. Include concise signals explaining the score.\n\nInput:\n${JSON.stringify(payload)}`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 12000,
      temperature: 0,
      system: 'Return strict JSON. You are a data normalization and lead qualification assistant, not a source of web facts.',
      messages: [{ role: 'user', content: prompt }],
    }),
    cache: 'no-store',
  });

  if (!response.ok) throw new Error(`Claude returned ${response.status}.`);
  const data = await response.json() as { content?: Array<{ type?: string; text?: string }> };
  const text = data.content?.find((item) => item.type === 'text')?.text || '[]';
  const parsed = JSON.parse(stripCodeFence(text)) as Array<LeadEnrichment & { index?: number }>;
  return results.map((result, index) => parsed.find((item) => item.index === index) || normalizeWithoutClaude(result));
}

function stripCodeFence(value: string) {
  return value.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
}

function normalizeWithoutClaude(result: ResearchResult): LeadEnrichment {
  return {
    name: result.name.trim(), contactName: clean(result.contactName), category: clean(result.category), website: clean(result.website),
    email: clean(result.email)?.toLowerCase(), phone: clean(result.phone), instagram: clean(result.instagram), facebook: clean(result.facebook),
    linkedin: clean(result.linkedin), address: clean(result.address), city: clean(result.city), country: clean(result.country), score: undefined,
    summary: undefined, signals: [],
  };
}

function clean(value?: string) { return value?.trim() || undefined; }
