# New Era — AI Lead Finder / Marketing Intelligence

## What was added

- `/admin/marketing`
- `/admin/marketing/search`
- `/admin/marketing/leads`
- `/admin/marketing/leads/[id]`
- `/admin/marketing/searches`
- `/admin/marketing/campaigns`
- `/admin/marketing/settings`
- Admin navigation entry for Marketing / AI Lead Finder
- Prisma models: `LeadSearch`, `Lead`, `LeadResearchItem`
- Server-side role guard for `ADMIN` and `SUPER_ADMIN`
- Provider abstraction via `LeadResearchProvider`
- Built-in Tavily web-search adapter plus configurable HTTP provider
- Claude normalization / qualification layer
- Server-side normalization and SHA-256 duplicate keys
- Search job status and progress persisted in PostgreSQL

## Environment

Configure server-side only:

```env
TAVILY_API_KEY=
TAVILY_API_URL=https://api.tavily.com/search
LEAD_RESEARCH_API_URL=
LEAD_RESEARCH_API_KEY=
LEAD_RESEARCH_PROVIDER_NAME=
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=
```

If `LEAD_RESEARCH_API_URL` is set, the configurable HTTP provider is used. Otherwise the Tavily adapter is used.

The HTTP provider contract is:

```json
{
  "query": "...",
  "targetType": "BEAUTY_SALON",
  "location": "Baku",
  "limit": 100,
  "filters": [],
  "requiredFields": []
}
```

Response:

```json
{
  "results": [
    {
      "name": "Business name",
      "website": "https://example.com",
      "email": "public@example.com",
      "phone": "+994...",
      "instagram": "https://instagram.com/...",
      "source": "provider",
      "sourceUrl": "https://...",
      "raw": {}
    }
  ]
}
```

## Database

Migration:

`prisma/migrations/20261002153000_add_marketing_intelligence/migration.sql`

Run in the target environment with the normal project migration flow:

```bash
npx prisma migrate deploy
npx prisma generate
npm run build
```

No existing Events tables or business logic are changed by this feature.

## Data policy

The feature is designed around public business information. It does not implement login bypasses, CAPTCHA bypasses, private-account access, private-message collection, or access-control circumvention. Provider terms, robots rules, API restrictions and rate limits remain the responsibility of the configured research provider.
