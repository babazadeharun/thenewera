export type LeadSearchInput = {
  targetType: string;
  location: string;
  description: string;
  requestedCount: number;
  requiredFields: string[];
  filters: string[];
};

export type ResearchResult = {
  externalId?: string;
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
  source?: string;
  sourceUrl?: string;
  raw?: unknown;
};
