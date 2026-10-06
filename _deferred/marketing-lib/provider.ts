import type { LeadSearchInput, ResearchResult } from './types';

export interface LeadResearchProvider {
  readonly name: string;
  searchBusinesses(input: LeadSearchInput): Promise<ResearchResult[]>;
}

/**
 * Provider-neutral HTTP adapter. The external service is deliberately kept
 * outside the application so it can be replaced without changing CRM code.
 * The endpoint must accept { query, targetType, location, limit, filters }
 * and return { results: ResearchResult[] }.
 */
export class TavilyLeadResearchProvider implements LeadResearchProvider {
  readonly name = 'tavily-web-search';

  async searchBusinesses(input: LeadSearchInput): Promise<ResearchResult[]> {
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) throw new Error('Lead research provider is not configured. Set TAVILY_API_KEY or LEAD_RESEARCH_API_URL.');
    const query = `${input.targetType.replaceAll('_', ' ')} ${input.location} ${input.description}`;
    const response = await fetch(process.env.TAVILY_API_URL || 'https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: apiKey, query, search_depth: 'advanced', max_results: Math.min(input.requestedCount, 100), include_answer: false, include_raw_content: false }),
      cache: 'no-store',
    });
    if (!response.ok) throw new Error(`Lead research provider returned ${response.status}.`);
    const data = await response.json() as { results?: Array<{ title?: string; url?: string; content?: string }> };
    return (data.results || []).map((r, index) => ({ name: r.title || `Research result ${index + 1}`, source: 'tavily', sourceUrl: r.url, raw: { title: r.title, url: r.url, content: r.content } }));
  }
}

export class HttpLeadResearchProvider implements LeadResearchProvider {
  readonly name = process.env.LEAD_RESEARCH_PROVIDER_NAME || 'http-search-provider';

  async searchBusinesses(input: LeadSearchInput): Promise<ResearchResult[]> {
    const endpoint = process.env.LEAD_RESEARCH_API_URL;
    if (!endpoint) throw new Error('Lead research provider is not configured. Set LEAD_RESEARCH_API_URL.');

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.LEAD_RESEARCH_API_KEY ? { Authorization: `Bearer ${process.env.LEAD_RESEARCH_API_KEY}` } : {}),
      },
      body: JSON.stringify({
        query: input.description,
        targetType: input.targetType,
        location: input.location,
        limit: input.requestedCount,
        filters: input.filters,
        requiredFields: input.requiredFields,
      }),
      cache: 'no-store',
    });

    if (!response.ok) throw new Error(`Lead research provider returned ${response.status}.`);
    const data = await response.json() as { results?: ResearchResult[] };
    return Array.isArray(data.results) ? data.results : [];
  }
}

export function getLeadResearchProvider(): LeadResearchProvider {
  if (process.env.LEAD_RESEARCH_API_URL) return new HttpLeadResearchProvider();
  return new TavilyLeadResearchProvider();
}
