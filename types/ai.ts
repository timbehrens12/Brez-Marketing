// Types for AI-generated insights
export interface Insight {
  title: string;
  description: string;
}

export interface Opportunity {
  title: string;
  description: string;
  nextSteps?: string[];
}

export interface Risk {
  title: string;
  description: string;
}

export interface Recommendation {
  title: string;
  description: string;
  steps?: string[];
}

export interface AIInsights {
  summary: string;
  insights: Insight[];
  opportunities: Opportunity[];
  risks: Risk[];
  recommendations: Recommendation[];
}

// Types for AI-generated marketing recommendations
export interface EmailCampaign {
  title: string;
  subjectLine: string;
  targetAudience: string;
  message: string;
  timing: string;
  expectedOutcome: string;
}

export interface SocialCampaign {
  title: string;
  concept: string;
  platforms: string[];
  contentSuggestions: string[];
  timing: string;
  expectedOutcome: string;
}

export interface ProductRecommendation {
  title: string;
  products: string[];
  approach: string;
  targetAudience: string;
  implementation: string[];
  expectedOutcome: string;
}

export interface PricingRecommendation {
  title: string;
  products: string[];
  strategy: string;
  implementation: string[];
  expectedImpact: string;
}

export interface MarketingRecommendation {
  title: string;
  channel: string;
  targetAudience: string;
  message: string;
  implementation: string[];
  expectedOutcome: string;
}

export type AIRecommendation = 
  | EmailCampaign 
  | SocialCampaign 
  | ProductRecommendation 
  | PricingRecommendation 
  | MarketingRecommendation;

export interface AIRecommendations {
  recommendations: AIRecommendation[];
} 